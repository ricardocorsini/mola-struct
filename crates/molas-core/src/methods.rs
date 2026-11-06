use super::*;
fn intervals(input: &Input, a: f64, b: f64) -> Vec<(f64, f64)> {
    let mut bounds = vec![a, b];
    bounds.extend(input.layers.iter().map(|l| l.bottom));
    bounds.extend(input.spt.iter().map(|s| s.depth));
    bounds.retain(|z| *z >= a && *z <= b);
    bounds.sort_by(|a, b| a.total_cmp(b));
    bounds.dedup();
    bounds.windows(2).map(|v| (v[0], v[1])).collect()
}
fn spt(input: &Input, z: f64) -> f64 {
    input
        .spt
        .iter()
        .find(|s| z <= s.depth + 1e-9)
        .or_else(|| input.spt.last())
        .map_or(0., |s| s.n)
}
pub fn effective(input: &Input) -> Result<Input, String> {
    let mut out = input.clone();
    if input.foundation.modulus_source == "manual" {
        return Ok(out);
    }
    let mut top = 0.;
    for l in &mut out.layers {
        let a = top;
        top = l.bottom;
        let end = l.bottom.min(input.spt.last().ok_or("SPT vazio")?.depth);
        if end <= a {
            continue;
        }
        let sum: f64 = intervals(input, a, end)
            .iter()
            .map(|(u, v)| (v - u) * spt(input, (u + v) / 2.))
            .sum();
        l.e = if input.foundation.modulus_source == "aoki" {
            input.foundation.aoki_factor * l.k * sum / (end - a) / 1000.
        } else {
            3. * l.schmertmann_k * sum / (end - a)
        };
        if !positive(l.e) {
            return Err("Correlação SPT: módulo nulo".into());
        }
    }
    Ok(out)
}
pub fn mindlin(r: f64, z: f64, c: f64, e: f64, nu: f64) -> f64 {
    let r1 = r.hypot(z - c);
    let r2 = r.hypot(z + c);
    let a = 3. - 4. * nu;
    (1. + nu) / (8. * PI * e * (1. - nu))
        * (a / r1
            + (8. * (1. - nu).powi(2) - a) / r2
            + (z - c).powi(2) / r1.powi(3)
            + (a * (z + c).powi(2) - 2. * c * z) / r2.powi(3)
            + 6. * c * z * (z + c).powi(2) / r2.powi(5))
}
fn gauss(n: usize) -> Vec<(f64, f64)> {
    let mut out = Vec::new();
    for i in 0..n {
        let mut z = (PI * (i as f64 + 0.75) / (n as f64 + 0.5)).cos();
        let mut derivative = 0.;
        for _ in 0..32 {
            let mut p1 = 1.;
            let mut p2 = 0.;
            for j in 1..=n {
                let p3 = p2;
                p2 = p1;
                p1 = ((2 * j - 1) as f64 * z * p2 - (j - 1) as f64 * p3) / j as f64;
            }
            derivative = n as f64 * (z * p1 - p2) / (z * z - 1.);
            let next = z - p1 / derivative;
            if (next - z).abs() < 1e-15 {
                z = next;
                break;
            }
            z = next;
        }
        out.push(((1. + z) / 2., 1. / ((1. - z * z) * derivative * derivative)));
    }
    out
}
fn layered(input: &Input, r: f64, c: f64, base: f64) -> f64 {
    let mut top = 0.;
    let mut total = 0.;
    for l in &input.layers {
        let a = base.max(top);
        let b = input.bedrock.min(l.bottom);
        top = l.bottom;
        if b > a {
            total += mindlin(r, a, c, l.e * 1000., l.nu) - mindlin(r, b, c, l.e * 1000., l.nu)
        }
    }
    total
}
fn capacity(input: &Input) -> (f64, f64) {
    let f = &input.foundation;
    let toe = f.depth + f.length;
    let shaft: f64 = intervals(input, f.depth, toe)
        .iter()
        .map(|(a, b)| {
            let l = layer_at(&input.layers, (a + b) / 2.);
            PI * f.diameter * l.alpha * l.k * spt(input, (a + b) / 2.) * (b - a) / f.f2
        })
        .sum();
    let point =
        PI * f.diameter.powi(2) / 4. * layer_at(&input.layers, toe).k * spt(input, toe) / f.f1;
    (shaft, point)
}
fn compliance(input: &Input) -> Result<Matrix, String> {
    let f = &input.foundation;
    let (shaft, point) = capacity(input);
    let total = shaft + point;
    let tip = if f.transfer == "manual" {
        f.tip_fraction
    } else {
        point / total
    };
    if !tip.is_finite() {
        return Err("Transferência de carga indefinida".into());
    }
    if shaft <= 0. && tip < 1. {
        return Err("Sem resistência de fuste".into());
    }
    let toe = f.depth + f.length;
    let radius = f.diameter / 2.;
    let angles = 2 * f.integration;
    let mut bounds: Vec<f64> = intervals(input, f.depth, toe)
        .iter()
        .flat_map(|(a, b)| [*a, *b])
        .collect();
    bounds.extend((1..f.segments).map(|i| f.depth + i as f64 * f.length / f.segments as f64));
    bounds.sort_by(|a, b| a.total_cmp(b));
    bounds.dedup();
    let mut sources: Vec<(f64, f64, f64, f64)> = Vec::new();
    let mut elastic = 0.;
    let mut cumulative = 0.;
    for v in bounds.windows(2) {
        let (a, b) = (v[0], v[1]);
        let c = (a + b) / 2.;
        let l = layer_at(&input.layers, c);
        let resistance = PI * f.diameter * l.alpha * l.k * spt(input, c) * (b - a) / f.f2;
        let fraction = if shaft > 0. {
            (1. - tip) * resistance / shaft
        } else {
            0.
        };
        elastic += (b - a) * (1. - cumulative - fraction / 2.) / (f.ec * 1e6 * PI * radius.powi(2));
        cumulative += fraction;
        for k in 0..angles {
            let angle = 2. * PI * (k as f64 + 0.5) / angles as f64;
            sources.push((
                radius * angle.cos(),
                radius * angle.sin(),
                c,
                fraction / angles as f64,
            ));
        }
    }
    for (u, w) in gauss(f.integration) {
        for k in 0..angles {
            let angle = 2. * PI * (k as f64 + 0.5) / angles as f64;
            sources.push((
                radius * u * angle.cos(),
                radius * u * angle.sin(),
                toe,
                tip * 2. * u * w / angles as f64,
            ));
        }
    }
    let pos = positions(f);
    let mut c = zeros(f.count);
    for i in 0..f.count {
        for j in i..f.count {
            let dx = pos[i].0 - pos[j].0;
            let dy = pos[i].1 - pos[j].1;
            let soil: f64 = sources
                .iter()
                .map(|(x, y, z, q)| q * layered(input, (dx - x).hypot(dy - y), *z, toe))
                .sum();
            c[i][j] = soil + if i == j { elastic } else { 0. };
            c[j][i] = c[i][j];
        }
    }
    let mut lower = zeros(f.count);
    for i in 0..f.count {
        for j in 0..=i {
            let mut v = c[i][j];
            for k in 0..j {
                v -= lower[i][k] * lower[j][k]
            }
            if i == j {
                if !(v > 0.) {
                    return Err("Flexibilidade Mindlin não positiva".into());
                }
                lower[i][j] = v.sqrt()
            } else {
                lower[i][j] = v / lower[j][j]
            }
        }
    }
    Ok(c)
}
fn randolph(input: &Input) -> Result<f64, String> {
    let f = &input.foundation;
    let mut e = 0.;
    let mut nu = 0.;
    for (a, b) in intervals(input, f.depth, f.depth + f.length) {
        let l = layer_at(&input.layers, (a + b) / 2.);
        e += (b - a) * l.e;
        nu += (b - a) * l.nu;
    }
    e /= f.length;
    nu /= f.length;
    let g = e * 1000. / (2. * (1. + nu));
    let r = f.diameter / 2.;
    let rho = f.randolph_rho;
    let zeta = (2.5 * f.length * rho * (1. - nu) / r).ln();
    if !(zeta > 0.) {
        return Err("Raio de influência Randolph inválido".into());
    }
    let mu_l = (2. * g / (zeta * f.ec * 1e6)).sqrt() * f.length / r;
    Ok(2. * PI * f.length * g * rho / zeta * (mu_l.tanh() / mu_l))
}
fn replace_axial(
    matrix: &mut Matrix,
    f: &Foundation,
    c: &Matrix,
    legacy: f64,
) -> Result<(), String> {
    let b: Vec<[f64; 6]> = positions(f)
        .iter()
        .map(|(x, y)| [0., 0., 1., *y, -x, 0.])
        .collect();
    for col in 0..f.count {
        let mut unit = vec![0.; f.count];
        unit[col] = 1.;
        let inverse = solve(c, &unit)?;
        for row in 0..f.count {
            for i in 0..6 {
                for j in 0..6 {
                    matrix[i][j] += f.efficiency * b[row][i] * inverse[row] * b[col][j]
                }
            }
        }
    }
    if legacy != 0. {
        for bi in b {
            for i in 0..6 {
                for j in 0..6 {
                    matrix[i][j] -= f.efficiency * bi[i] * legacy * bi[j]
                }
            }
        }
    }
    Ok(())
}
pub fn apply(input: &Input, matrix: &mut Matrix) -> Result<(), String> {
    let f = &input.foundation;
    if f.kind == "pile" {
        if f.pile_method == "winkler" {
            return Ok(());
        }
        if f.pile_method == "mindlin" {
            let c = compliance(input)?;
            replace_axial(matrix, f, &c, bar(input, false)?)?;
        } else {
            let axial = randolph(input)?;
            let pos = positions(f);
            let horizontal_legacy = matrix[0][0] / f.count as f64;
            let torsion = matrix[5][5]
                + pos
                    .iter()
                    .map(|(x, y)| {
                        (f.efficiency * f.horizontal_ratio * axial - horizontal_legacy)
                            * (x * x + y * y)
                    })
                    .sum::<f64>();
            *matrix = zeros(6);
            matrix[0][0] = f.efficiency * f.count as f64 * f.horizontal_ratio * axial;
            matrix[1][1] = matrix[0][0];
            matrix[5][5] = torsion;
            let bending = (if f.head_connection == "pinned" {
                0.
            } else {
                1.5 * f.ec * 1e6 * PI * f.diameter.powi(4) / 64. / f.length
            }) * f.count as f64
                * f.efficiency;
            if pos.iter().all(|(_, y)| y.abs() < 1e-10) {
                matrix[3][3] = bending
            }
            if pos.iter().all(|(x, _)| x.abs() < 1e-10) {
                matrix[4][4] = bending
            }
            let mut c = zeros(f.count);
            for i in 0..f.count {
                c[i][i] = 1. / axial;
            }
            replace_axial(matrix, f, &c, 0.)?;
        }
    } else {
        if f.footing_method == "elastic" {
            return Ok(());
        }
        let area = f.cap_x * f.cap_y;
        let mut kv = f.kv_input;
        if f.footing_method == "safe" {
            let s = f.allowable_pressure / 98.0665;
            if !(0.25 - 1e-10..=4. + 1e-10).contains(&s) {
                return Err("σadm fora da faixa SAFE".into());
            }
            kv = (-0.0257 * s.powi(4) + 0.2294 * s.powi(3) - 0.6517 * s.powi(2)
                + 2.5467 * s
                + 0.1083)
                * 9806.65;
        }
        if f.footing_method == "mindlin" {
            let quad = gauss(f.integration);
            let a = f.cap_x / 2.;
            let b = f.cap_y / 2.;
            let mut sum = 0.;
            for (u, wu) in &quad {
                for (v, wv) in &quad {
                    sum += wu
                        * wv
                        * u
                        * (layered(input, (a * u).hypot(b * u * v), f.depth, f.depth)
                            + layered(input, (a * u * v).hypot(b * u), f.depth, f.depth));
                }
            }
            if !(sum > 0.) {
                return Err("Flexibilidade da sapata não positiva".into());
            }
            kv = 1. / sum / area;
        }
        let kz = kv * area;
        let kh = f.horizontal_ratio * kz;
        let ix = f.cap_x * f.cap_y.powi(3) / 12.;
        let iy = f.cap_y * f.cap_x.powi(3) / 12.;
        *matrix = zeros(6);
        for (i, v) in [kh, kh, kz, kv * ix, kv * iy, kh / area * (ix + iy)]
            .iter()
            .enumerate()
        {
            matrix[i][i] = *v
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn boussinesq_limit() {
        let r = 2.;
        let nu = 0.3;
        let e = 20000.;
        assert!((mindlin(r, 0., 0., e, nu) - (1. - nu * nu) / (PI * e * r)).abs() < 1e-14);
    }
}
