//! Horizontal line reaction modules, in kN/m². Defaults preserve legacy manual kh.
use super::{layer_at, positive, solve, zeros, Foundation, Input, Layer, Matrix};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Options {
    pub source: String,
    pub table_version: String,
    pub depth_reference: String,
    pub discretization: String,
    pub nodal_step: f64,
    pub interpolation: String,
    pub m_table_source: String,
    pub clay_table: Vec<[f64; 2]>,
    pub granular_table: Vec<[f64; 2]>,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            source: "manual".into(),
            table_version: "tqs-3829".into(),
            depth_reference: "ground".into(),
            discretization: "consistent".into(),
            nodal_step: 1.,
            interpolation: "linear".into(),
            m_table_source: "tqs".into(),
            clay_table: {
                let mut t = table(true);
                t.push([100., 900.]);
                t
            },
            granular_table: table(false),
        }
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(default, rename_all = "camelCase")]
pub struct LayerCrh {
    pub preset: String,
    pub k: Option<f64>,
    pub nh_dry: Option<f64>,
    pub nh_wet: Option<f64>,
    pub family: String,
}
impl Default for LayerCrh {
    fn default() -> Self {
        Self {
            preset: "unset".into(),
            k: None,
            nh_dry: None,
            nh_wet: None,
            family: "soil".into(),
        }
    }
}
fn table(clay: bool) -> Vec<[f64; 2]> {
    if clay {
        vec![
            [0., 25.],
            [1., 75.],
            [3., 150.],
            [6., 300.],
            [12., 500.],
            [22., 700.],
            [30., 900.],
        ]
    } else {
        vec![
            [1., 150.],
            [7., 300.],
            [20., 500.],
            [40., 800.],
            [50., 1500.],
        ]
    }
}
pub fn validate(f: &Foundation) -> Result<(), String> {
    let c = &f.lateral;
    if !["manual", "terzaghi", "tietz"].contains(&c.source.as_str())
        || !["tqs-3829", "tqs-3836"].contains(&c.table_version.as_str())
        || !["ground", "cap"].contains(&c.depth_reference.as_str())
        || !["consistent", "nodal"].contains(&c.discretization.as_str())
        || !["linear", "lower", "upper"].contains(&c.interpolation.as_str())
        || !["tqs", "custom"].contains(&c.m_table_source.as_str())
        || !positive(c.nodal_step)
        || c.nodal_step < 0.1
    {
        return Err("Configuração CRH inválida".into());
    }
    Ok(())
}
enum Coeff {
    K(f64),
    Nh(Option<f64>, Option<f64>),
}
fn coefficients(l: &Layer, f: &Foundation) -> Result<Coeff, String> {
    let custom = l.crh.clone().unwrap_or_default();
    if custom.preset == "custom-k" {
        return custom
            .k
            .filter(|v| positive(*v))
            .map(Coeff::K)
            .ok_or("K personalizado não informado".into());
    }
    if custom.preset == "custom-nh" {
        return Ok(Coeff::Nh(custom.nh_dry, custom.nh_wet));
    }
    let old = f.lateral.table_version == "tqs-3829";
    let k = match custom.preset.as_str() {
        "clay-medium" => Some((8., 800.)),
        "clay-stiff" => Some((50., 5000.)),
        "clay-very-stiff" => Some((100., 10000.)),
        "clay-hard" => Some((195., 19500.)),
        _ => None,
    };
    if let Some((a, b)) = k {
        return Ok(Coeff::K(if old { a * 98.0665 } else { b }));
    }
    let (a, b, c, d) = match custom.preset.as_str() {
        "sand-loose" => (0.26, 0.15, Some(2600.), Some(1500.)),
        "sand-medium" => (0.8, 0.5, Some(8000.), Some(5000.)),
        "sand-dense" => (2., 1.25, Some(20000.), Some(12500.)),
        "clay-very-soft" => (0.06, 0.06, None, Some(550.)),
        "clay-soft" => (0.08, 0.08, None, None),
        "silt-very-loose" => (0.055, 0.055, None, Some(200.)),
        _ => return Err("Associe as camadas aos coeficientes K/nh".into()),
    };
    if old {
        Ok(Coeff::Nh(Some(a * 9806.65), Some(b * 9806.65)))
    } else if c.is_none() && d.is_none() {
        Err("Coeficiente não publicado na tabela TQS 3836".into())
    } else {
        Ok(Coeff::Nh(c, d))
    }
}
fn m_value(n: f64, t: &[[f64; 2]], policy: &str, clay: bool, custom: bool) -> Result<f64, String> {
    if t.len() < 2
        || t.len() > 20
        || t.iter().enumerate().any(|(i, [a, m])| {
            !a.is_finite()
                || *a < 0.
                || *a > 100.
                || a.fract() != 0.
                || !positive(*m)
                || (i > 0 && *a <= t[i - 1][0])
        })
    {
        return Err("Tabela m inválida".into());
    }
    if n < t[0][0] || n > t[t.len() - 1][0] {
        if clay && !custom && n > t[t.len() - 1][0] {
            return Ok(t[t.len() - 1][1]);
        }
        return Err("NSPT fora da tabela m; sem extrapolação".into());
    }
    for (i, [b, v]) in t.iter().enumerate() {
        if n == *b {
            return Ok(*v);
        }
        if n < *b {
            let [a, u] = t[i - 1];
            return Ok(if policy == "lower" {
                u
            } else if policy == "upper" {
                *v
            } else {
                u + (n - a) / (*b - a) * (*v - u)
            });
        }
    }
    Err("NSPT inválido".into())
}
pub fn line(input: &Input, depth: f64) -> Result<f64, String> {
    let f = &input.foundation;
    let c = &f.lateral;
    let l = layer_at(&input.layers, depth);
    if f.pile_method == "randolph" || c.source == "manual" {
        return Ok(l.kh * f.diameter);
    }
    let z = if c.depth_reference == "cap" {
        depth - f.depth
    } else {
        depth
    };
    if z < 0. {
        return Err("Profundidade negativa no CRH".into());
    }
    if c.source == "terzaghi" {
        return match coefficients(l, f)? {
            Coeff::K(k) => Ok(k),
            Coeff::Nh(dry, wet) => {
                let v = if depth < input.water { dry } else { wet };
                v.filter(|v| positive(*v))
                    .map(|v| v * z)
                    .ok_or("nh seco/submerso não informado".into())
            }
        };
    }
    let family = l.crh.as_ref().map(|v| v.family.as_str()).unwrap_or("soil");
    if family == "soil" && l.soil != "clay" && l.soil != "sand" {
        return Err("Escolha a família SPT/m".into());
    }
    if !["soil", "clay", "granular"].contains(&family) {
        return Err("Família SPT/m inválida".into());
    }
    let clay = if family == "soil" {
        l.soil == "clay"
    } else {
        family == "clay"
    };
    let n = input
        .spt
        .iter()
        .find(|s| depth <= s.depth + 1e-9)
        .ok_or("Sondagem insuficiente para CRH")?
        .n;
    let custom = c.m_table_source == "custom";
    let t = if custom {
        if clay {
            c.clay_table.clone()
        } else {
            c.granular_table.clone()
        }
    } else {
        table(clay)
    };
    Ok(m_value(n, &t, &c.interpolation, clay, custom)? * 9.80665 * z * f.diameter)
}
pub fn head(input: &Input) -> Result<Matrix, String> {
    let f = &input.foundation;
    let nodal = f.pile_method != "randolph" && f.lateral.discretization == "nodal";
    let n = if nodal {
        (f.length / f.lateral.nodal_step).ceil().max(2.) as usize
    } else {
        f.segments
    };
    if n > 128 {
        return Err("Malha lateral nodal excede 128 trechos".into());
    }
    let l = f.length / n as f64;
    let ei = f.ec * 1e6 * PI * f.diameter.powi(4) / 64.;
    let mut k = zeros(2 * (n + 1));
    let beam = [
        [12., 6. * l, -12., 6. * l],
        [6. * l, 4. * l * l, -6. * l, 2. * l * l],
        [-12., -6. * l, 12., -6. * l],
        [6. * l, 2. * l * l, -6. * l, 4. * l * l],
    ];
    let soil = [
        [156., 22. * l, 54., -13. * l],
        [22. * l, 4. * l * l, 13. * l, -3. * l * l],
        [54., 13. * l, 156., -22. * l],
        [-13. * l, -3. * l * l, -22. * l, 4. * l * l],
    ];
    for e in 0..n {
        let kh = if nodal {
            0.
        } else {
            line(input, f.depth + (e as f64 + 0.5) * l)?
        };
        for i in 0..4 {
            for j in 0..4 {
                k[2 * e + i][2 * e + j] += ei / l.powi(3) * beam[i][j] + kh * l / 420. * soil[i][j];
            }
        }
    }
    if nodal {
        for i in 1..=n {
            k[2 * i][2 * i] += line(input, f.depth + i as f64 * l)? * l;
        }
    }
    let mut force = vec![0.; k.len()];
    force[0] = 1.;
    let c0 = solve(&k, &force)?;
    force[0] = 0.;
    force[1] = 1.;
    let c1 = solve(&k, &force)?;
    let det = c0[0] * c1[1] - c1[0] * c0[1];
    Ok(vec![
        vec![c1[1] / det, -c1[0] / det],
        vec![-c0[1] / det, c0[0] / det],
    ])
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn table_bounds_and_between_point_rules() {
        let t = table(true);
        assert_eq!(m_value(4., &t, "lower", true, false).unwrap(), 150.);
        assert_eq!(m_value(4., &t, "linear", true, false).unwrap(), 200.);
        assert_eq!(m_value(4., &t, "upper", true, false).unwrap(), 300.);
        assert_eq!(m_value(35., &t, "linear", true, false).unwrap(), 900.);
        assert!(m_value(35., &t, "linear", true, true).is_err());
        assert!(m_value(0., &table(false), "linear", false, false).is_err());
    }
    #[test]
    fn reference_units_and_missing_dry_value() {
        let cases: Vec<serde_json::Value> =
            serde_json::from_str(include_str!("../tests/parity.json")).unwrap();
        let mut input: Input = serde_json::from_value(cases[0]["input"].clone()).unwrap();
        input.foundation.lateral.source = "terzaghi".into();
        input.foundation.lateral.table_version = "tqs-3829".into();
        for l in &mut input.layers {
            l.crh = Some(LayerCrh {
                preset: "clay-medium".into(),
                ..Default::default()
            });
        }
        assert!((line(&input, 1.5).unwrap() - 784.532).abs() < 1e-10);
        input.foundation.lateral.table_version = "tqs-3836".into();
        assert_eq!(line(&input, 1.5).unwrap(), 800.);
        input.layers[0].crh.as_mut().unwrap().preset = "silt-very-loose".into();
        input.water = 100.;
        assert!(line(&input, 1.5).is_err());
        input.water = 0.;
        assert_eq!(line(&input, 1.5).unwrap(), 300.);
    }
}
