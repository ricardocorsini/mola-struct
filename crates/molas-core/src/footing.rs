//! FEMA 273 Fig. 4-2 uncorrected k0. cap_x spans X, cap_y spans Y.
use super::*;
pub fn teixeira_alpha(l: &Layer) -> Result<f64, String> {
    let a = l.teixeira_alpha.unwrap_or(match l.soil.as_str() {
        "sand" => 3.,
        "silt" => 5.,
        "clay" => 7.,
        _ => 0.,
    });
    if !positive(a) {
        return Err("Teixeira–Godoy: informe αTG para este solo".into());
    }
    Ok(a)
}
pub fn springs(x: f64, y: f64, e: f64, nu: f64) -> Result<Matrix, String> {
    if ![x, y, e].iter().all(|v| positive(*v)) || !(0.0..=0.49).contains(&nu) {
        return Err("Parâmetros do semiespaço inválidos".into());
    }
    let area = x * y;
    let ix = x * y.powi(3) / 12.;
    let iy = y * x.powi(3) / 12.;
    let rt = (area / PI).sqrt();
    let rx = (4. * ix / PI).powf(0.25);
    let ry = (4. * iy / PI).powf(0.25);
    let rz = (2. * (ix + iy) / PI).powf(0.25);
    let g = e * 1000. / (2. * (1. + nu));
    let diag = [
        8. * g * rt / (2. - nu),
        8. * g * rt / (2. - nu),
        4. * g * rt / (1. - nu),
        8. * g * rx.powi(3) / (3. * (1. - nu)),
        8. * g * ry.powi(3) / (3. * (1. - nu)),
        16. * g * rz.powi(3) / 3.,
    ];
    let mut out = zeros(6);
    for i in 0..6 {
        out[i][i] = diag[i];
    }
    Ok(out)
}
pub fn halfspace(input: &Input) -> Result<Matrix, String> {
    let f = &input.foundation;
    let (e, nu) = if f.footing_soil == "equivalent" {
        let h = 2. * f.cap_x.min(f.cap_y);
        let mut top = 0.;
        let mut inverse = 0.;
        let mut n = 0.;
        for l in &input.layers {
            let a = f.depth.max(top);
            let b = (f.depth + h).min(l.bottom);
            if b > a {
                inverse += (b - a) / l.e;
                n += (b - a) * l.nu;
            }
            top = l.bottom;
        }
        (h / inverse, n / h)
    } else {
        let l = input
            .layers
            .iter()
            .find(|l| l.bottom > f.depth + 1e-9)
            .ok_or("Descreva o solo abaixo da base")?;
        (l.e, l.nu)
    };
    springs(f.cap_x, f.cap_y, e, nu)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn independent_square_and_axes() {
        let k = springs(1., 1., 12.25, 0.35).unwrap();
        assert!((k[2][2] / 9.80665 - 1606.3).abs() < 0.05);
        assert!((k[3][3] / 9.80665 - 352.9).abs() < 0.05);
        let a = springs(2., 4., 12.25, 0.35).unwrap();
        let b = springs(4., 2., 12.25, 0.35).unwrap();
        assert!((a[3][3] - b[4][4]).abs() < 1e-8);
        assert!(a[3][3] > a[4][4]);
        assert!(springs(0., 1., 12., 0.35).is_err());
    }
}
