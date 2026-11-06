//! Static linear foundation stiffness. Internal units: kN, m, rad.
//! Experimental models; no normative approval is implied.
mod methods;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
pub type Matrix = Vec<Vec<f64>>;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Foundation {
    pub kind: String,
    pub count: usize,
    pub diameter: f64,
    pub length: f64,
    pub spacing_x: f64,
    pub spacing_y: f64,
    pub cap_x: f64,
    pub cap_y: f64,
    pub depth: f64,
    pub ec: f64,
    pub concrete_nu: f64,
    pub efficiency: f64,
    pub segments: usize,
    pub n: f64,
    pub hx: f64,
    pub hy: f64,
    pub mx: f64,
    pub my: f64,
    pub mz: f64,
    #[serde(default = "winkler")]
    pub pile_method: String,
    #[serde(default = "fixed")]
    pub head_connection: String,
    #[serde(default = "elastic")]
    pub footing_method: String,
    #[serde(default = "manual")]
    pub modulus_source: String,
    #[serde(default = "aoki_factor_default")]
    pub aoki_factor: f64,
    #[serde(default = "manual")]
    pub transfer: String,
    #[serde(default = "one")]
    pub f1: f64,
    #[serde(default = "one")]
    pub f2: f64,
    #[serde(default = "one")]
    pub randolph_rho: f64,
    #[serde(default = "ratio")]
    pub horizontal_ratio: f64,
    #[serde(default = "kv_default")]
    pub kv_input: f64,
    #[serde(default = "pressure_default")]
    pub allowable_pressure: f64,
    #[serde(default = "integration_default")]
    pub integration: usize,
    #[serde(default = "half")]
    pub tip_fraction: f64,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Layer {
    pub bottom: f64,
    pub e: f64,
    pub nu: f64,
    pub kh: f64,
    pub shaft_k: f64,
    pub base_k: f64,
    #[serde(default)]
    pub alpha: f64,
    #[serde(default = "one")]
    pub k: f64,
    #[serde(default = "schmertmann_default")]
    pub schmertmann_k: f64,
}
fn winkler() -> String {
    "winkler".into()
}
fn fixed() -> String {
    "fixed".into()
}
fn elastic() -> String {
    "elastic".into()
}
fn manual() -> String {
    "manual".into()
}
fn one() -> f64 {
    1.
}
fn half() -> f64 {
    0.5
}
fn ratio() -> f64 {
    0.3
}
fn kv_default() -> f64 {
    30000.
}
fn pressure_default() -> f64 {
    200.
}
fn integration_default() -> usize {
    16
}
fn schmertmann_default() -> f64 {
    0.9
}
fn aoki_factor_default() -> f64 {
    6.
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Spt {
    pub depth: f64,
    pub n: f64,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Input {
    pub foundation: Foundation,
    pub layers: Vec<Layer>,
    #[serde(default)]
    pub spt: Vec<Spt>,
    #[serde(default)]
    pub bedrock: f64,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Output {
    pub matrix: Matrix,
    pub displacement: Vec<f64>,
}
fn zeros(n: usize) -> Matrix {
    vec![vec![0.; n]; n]
}

pub fn solve(a: &Matrix, b: &[f64]) -> Result<Vec<f64>, String> {
    let n = b.len();
    if a.len() != n || a.iter().any(|r| r.len() != n) {
        return Err("Dimensões da matriz inválidas".into());
    }
    let mut m = a.clone();
    for i in 0..n {
        m[i].push(b[i]);
    }
    for c in 0..n {
        let mut pivot = c;
        for i in c + 1..n {
            if m[i][c].abs() > m[pivot][c].abs() {
                pivot = i;
            }
        }
        if !m[pivot][c].is_finite() || m[pivot][c].abs() < 1e-12 {
            return Err("Matriz singular".into());
        }
        m.swap(c, pivot);
        let row = m[c].clone();
        for i in c + 1..n {
            let ratio = m[i][c] / row[c];
            if ratio == 0. {
                continue;
            }
            for j in c..=n {
                m[i][j] -= ratio * row[j];
            }
        }
    }
    let mut x = vec![0.; n];
    for i in (0..n).rev() {
        let mut v = m[i][n];
        for j in i + 1..n {
            v -= m[i][j] * x[j];
        }
        x[i] = v / m[i][i];
    }
    if x.iter().any(|v| !v.is_finite()) {
        return Err("Resultado não finito".into());
    }
    Ok(x)
}
// Only exact zero rows/columns are released; never regularize or discard weak stiffness.
fn solve_supported(k: &Matrix, forces: &[f64]) -> Result<Vec<f64>, String> {
    let free: Vec<usize> = (0..forces.len())
        .filter(|&i| k[i].iter().all(|&v| v == 0.) && k.iter().all(|r| r[i] == 0.))
        .collect();
    let names = ["ux", "uy", "uz", "θx", "θy", "θz"];
    for &i in &free {
        if forces[i] != 0. {
            return Err(format!(
                "Sem rigidez em {}: ação incompatível com a fundação isolada",
                names[i]
            ));
        }
    }
    let supported: Vec<usize> = (0..forces.len()).filter(|i| !free.contains(i)).collect();
    let reduced: Matrix = supported
        .iter()
        .map(|&i| supported.iter().map(|&j| k[i][j]).collect())
        .collect();
    let load: Vec<f64> = supported.iter().map(|&i| forces[i]).collect();
    let solution = solve(&reduced, &load)?;
    let mut displacement = vec![0.; forces.len()];
    for (j, &i) in supported.iter().enumerate() {
        displacement[i] = solution[j];
    }
    Ok(displacement)
}
fn layer_at(layers: &[Layer], z: f64) -> &Layer {
    layers
        .iter()
        .find(|l| z <= l.bottom + 1e-9)
        .unwrap_or_else(|| layers.last().expect("validated layers"))
}
fn positive(v: f64) -> bool {
    v.is_finite() && v > 0.
}
fn validate(input: &Input) -> Result<(), String> {
    let f = &input.foundation;
    if f.head_connection != "fixed" && f.head_connection != "pinned" {
        return Err("Ligação estaca–bloco desconhecida".into());
    }
    if f.kind != "pile" && f.kind != "footing" {
        return Err("Tipo de fundação desconhecido".into());
    }
    if ![
        f.diameter,
        f.length,
        f.spacing_x,
        f.spacing_y,
        f.cap_x,
        f.cap_y,
        f.ec,
        f.efficiency,
    ]
    .iter()
    .all(|v| positive(*v))
        || f.efficiency > 1.
        || !f.depth.is_finite()
        || f.depth < 0.
        || !(8..=64).contains(&f.segments)
        || !(1..=4).contains(&f.count)
        || !(0.0..=0.45).contains(&f.concrete_nu)
    {
        return Err("Parâmetros de fundação inválidos".into());
    }
    if ![f.n, f.hx, f.hy, f.mx, f.my, f.mz]
        .iter()
        .all(|v| v.is_finite())
        || f.n < 0.
    {
        return Err("Ações inválidas".into());
    }
    if input.layers.is_empty() {
        return Err("Perfil de solo vazio".into());
    }
    let mut top = 0.;
    for l in &input.layers {
        if ![l.bottom, l.e, l.kh, l.shaft_k, l.base_k]
            .iter()
            .all(|v| positive(*v))
            || l.bottom <= top
            || !(0.0..=0.49).contains(&l.nu)
        {
            return Err("Camadas inválidas".into());
        }
        top = l.bottom;
    }
    if !matches!(f.pile_method.as_str(), "winkler" | "randolph" | "mindlin")
        || !matches!(
            f.footing_method.as_str(),
            "elastic" | "winkler" | "safe" | "mindlin"
        )
        || !matches!(f.modulus_source.as_str(), "manual" | "spt" | "aoki")
        || ![3., 4., 6.].contains(&f.aoki_factor)
        || (f.kind == "footing" && f.modulus_source == "aoki")
        || !matches!(f.transfer.as_str(), "manual" | "capacity-ratio")
        || !(8..=32).contains(&f.integration)
        || !(0.0..=1.0).contains(&f.tip_fraction)
        || !positive(f.horizontal_ratio)
        || f.horizontal_ratio > 1.
        || !positive(f.randolph_rho)
        || f.randolph_rho > 1.
        || !positive(f.kv_input)
        || !positive(f.allowable_pressure)
        || !positive(f.f1)
        || !positive(f.f2)
    {
        return Err("Método ou parâmetros inválidos".into());
    }
    let mindlin = if f.kind == "pile" {
        f.pile_method == "mindlin"
    } else {
        f.footing_method == "mindlin"
    };
    let base = if f.kind == "pile" {
        f.depth + f.length
    } else {
        f.depth
    };
    if mindlin && (!positive(input.bedrock) || input.bedrock <= base || input.bedrock > top + 1e-8)
    {
        return Err("Base rígida ou cobertura de camadas inválida".into());
    }
    let requires_spt =
        f.modulus_source != "manual" || (f.kind == "pile" && f.pile_method == "mindlin");
    if requires_spt {
        let mut previous = 0.;
        for s in &input.spt {
            if !positive(s.depth)
                || s.depth <= previous
                || !s.n.is_finite()
                || !(0.0..=100.0).contains(&s.n)
            {
                return Err("SPT inválido".into());
            }
            previous = s.depth;
        }
        let end = if f.modulus_source != "manual" {
            if mindlin {
                input.bedrock
            } else if f.kind == "footing" {
                f.depth + 2. * f.cap_x.min(f.cap_y)
            } else {
                base
            }
        } else {
            base
        };
        let end = if f.modulus_source != "manual" {
            layer_at(&input.layers, end).bottom
        } else {
            end
        };
        if previous < end {
            return Err("SPT insuficiente".into());
        }
        if input.layers.iter().any(|l| {
            !positive(l.k) || !l.alpha.is_finite() || l.alpha < 0. || !positive(l.schmertmann_k)
        }) {
            return Err("Parâmetros de solo inválidos".into());
        }
    }
    let required = if f.kind == "pile" {
        f.depth + f.length
    } else {
        f.depth + 2. * f.cap_x.min(f.cap_y)
    };
    if required > top + 1e-8 {
        return Err("Perfil de solo insuficiente".into());
    }
    Ok(())
}
pub fn positions(f: &Foundation) -> Vec<(f64, f64)> {
    let x = f.spacing_x / 2.;
    let y = f.spacing_y / 2.;
    match f.count {
        1 => vec![(0., 0.)],
        2 => vec![(-x, 0.), (x, 0.)],
        3 => vec![(-x, -y * 2. / 3.), (x, -y * 2. / 3.), (0., y * 4. / 3.)],
        _ => vec![(-x, -y), (x, -y), (x, y), (-x, y)],
    }
}
fn lateral(input: &Input) -> Result<Matrix, String> {
    let f = &input.foundation;
    let n = f.segments;
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
        let kh = layer_at(&input.layers, f.depth + (e as f64 + 0.5) * l).kh * f.diameter;
        for i in 0..4 {
            for j in 0..4 {
                k[2 * e + i][2 * e + j] += ei / l.powi(3) * beam[i][j] + kh * l / 420. * soil[i][j];
            }
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
fn bar(input: &Input, torsion: bool) -> Result<f64, String> {
    let f = &input.foundation;
    let n = f.segments;
    let l = f.length / n as f64;
    let r = f.diameter / 2.;
    let area = PI * r * r;
    let ea = if torsion {
        f.ec * 1e6 / (2. * (1. + f.concrete_nu)) * PI * r.powi(4) / 2.
    } else {
        f.ec * 1e6 * area
    };
    let mut k = zeros(n + 1);
    for e in 0..n {
        let layer = layer_at(&input.layers, f.depth + (e as f64 + 0.5) * l);
        let ks = layer.shaft_k * 2. * PI * r * if torsion { r * r } else { 1. };
        k[e][e] += ea / l + ks * l / 3.;
        k[e + 1][e + 1] += ea / l + ks * l / 3.;
        k[e][e + 1] += -ea / l + ks * l / 6.;
        k[e + 1][e] += -ea / l + ks * l / 6.;
    }
    if !torsion {
        k[n][n] += area * layer_at(&input.layers, f.depth + f.length).base_k;
    }
    let mut force = vec![0.; n + 1];
    force[0] = 1.;
    Ok(1. / solve(&k, &force)?[0])
}
pub fn stiffness(input: &Input) -> Result<Output, String> {
    validate(input)?;
    let effective = methods::effective(input)?;
    let input = &effective;
    let f = &input.foundation;
    let mut matrix = zeros(6);
    if f.kind == "pile" {
        let mut lateral = lateral(input)?;
        if f.head_connection == "pinned" {
            let horizontal = lateral[0][0] - lateral[0][1] * lateral[1][0] / lateral[1][1];
            if !horizontal.is_finite() || horizontal <= 0. {
                return Err("Rigidez lateral condensada não positiva".into());
            }
            lateral = vec![vec![horizontal, 0.], vec![0., 0.]];
        }
        let mut local = zeros(6);
        local[0][0] = lateral[0][0];
        local[1][1] = lateral[0][0];
        local[2][2] = bar(input, false)?;
        local[3][3] = lateral[1][1];
        local[4][4] = lateral[1][1];
        local[5][5] = bar(input, true)?;
        local[0][4] = -lateral[0][1];
        local[4][0] = -lateral[0][1];
        local[1][3] = lateral[0][1];
        local[3][1] = lateral[0][1];
        for (x, y) in positions(f) {
            let t = [
                [1., 0., 0., 0., 0., -y],
                [0., 1., 0., 0., 0., x],
                [0., 0., 1., y, -x, 0.],
                [0., 0., 0., 1., 0., 0.],
                [0., 0., 0., 0., 1., 0.],
                [0., 0., 0., 0., 0., 1.],
            ];
            for i in 0..6 {
                for j in 0..6 {
                    for a in 0..6 {
                        for b in 0..6 {
                            matrix[i][j] += t[a][i] * local[a][b] * t[b][j] * f.efficiency;
                        }
                    }
                }
            }
        }
    } else {
        let area = f.cap_x * f.cap_y;
        let b = f.cap_x.min(f.cap_y);
        let end = f.depth + 2. * b;
        let mut top = 0.;
        let mut inve = 0.;
        let mut nu = 0.;
        for l in &input.layers {
            let a = f.depth.max(top);
            let z = end.min(l.bottom);
            if z > a {
                inve += (z - a) / l.e;
                nu += (z - a) * l.nu;
            }
            top = l.bottom;
        }
        let e = 2. * b / inve;
        nu /= 2. * b;
        let g = e * 1000. / (2. * (1. + nu));
        let radius = (area / PI).sqrt();
        let kz = 4. * g * radius / (1. - nu);
        let kh = 8. * g * radius / (2. - nu);
        let kv = kz / area;
        let ix = f.cap_x * f.cap_y.powi(3) / 12.;
        let iy = f.cap_y * f.cap_x.powi(3) / 12.;
        let diag = [kh, kh, kz, kv * ix, kv * iy, kh / area * (ix + iy)];
        for i in 0..6 {
            matrix[i][i] = diag[i];
        }
    }
    methods::apply(input, &mut matrix)?;
    if matrix.iter().flatten().any(|v| !v.is_finite()) {
        return Err("Rigidez não finita".into());
    }
    let displacement = solve_supported(&matrix, &[f.hx, f.hy, -f.n, f.mx, f.my, f.mz])?;
    Ok(Output {
        matrix,
        displacement,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pivoted_solver() {
        assert_eq!(
            solve(&vec![vec![0., 2.], vec![1., 3.]], &[4., 7.]).unwrap(),
            vec![1., 2.]
        );
    }
    #[test]
    fn reject_singular() {
        assert!(solve(&vec![vec![0.; 2]; 2], &[1., 1.]).is_err());
    }
    #[test]
    fn unloaded_release_is_not_a_support() {
        let k = vec![vec![1e-8, 0.], vec![0., 0.]];
        assert_eq!(solve_supported(&k, &[1e-8, 0.]).unwrap(), vec![1., 0.]);
        assert!(solve_supported(&k, &[0., 1e-14]).is_err());
        assert!(solve_supported(&vec![vec![1., 1.], vec![1., 1.]], &[0., 0.]).is_err());
    }
    #[test]
    fn pinned_single_pile_rejects_unbalanced_moment() {
        let cases: Vec<serde_json::Value> =
            serde_json::from_str(include_str!("../tests/parity.json")).unwrap();
        let mut input: Input = serde_json::from_value(cases[0]["input"].clone()).unwrap();
        input.foundation.head_connection = "pinned".into();
        input.foundation.count = 1;
        input.foundation.mx = 0.;
        input.foundation.my = 0.;
        let out = stiffness(&input).unwrap();
        assert!(out.matrix[3].iter().all(|&v| v == 0.));
        assert!(out.matrix[4].iter().all(|&v| v == 0.));
        input.foundation.mx = 1.;
        assert!(stiffness(&input).unwrap_err().contains("θx"));
        input.foundation.mx = 0.;
        input.foundation.my = 1.;
        assert!(stiffness(&input).unwrap_err().contains("θy"));
    }
    #[test]
    fn shared_parity_fixtures() {
        #[derive(Deserialize)]
        struct Fixture {
            input: Input,
            expected: Output,
        }
        let cases: Vec<Fixture> =
            serde_json::from_str(include_str!("../tests/parity.json")).unwrap();
        assert!(cases.len() >= 5);
        for case in cases {
            let out = stiffness(&case.input).unwrap();
            for i in 0..6 {
                for j in 0..6 {
                    let a = out.matrix[i][j];
                    let b = case.expected.matrix[i][j];
                    assert!(
                        (a - b).abs() <= 1e-8 * b.abs().max(1.),
                        "matrix {i},{j}: {a} != {b}"
                    );
                }
                assert!((out.displacement[i] - case.expected.displacement[i]).abs() < 1e-9);
            }
        }
    }
}
