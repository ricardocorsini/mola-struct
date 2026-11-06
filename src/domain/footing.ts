import type { Foundation, Layer, Project } from "./model";
import { intervals, layerAt } from "./profile";

/** Alpha for E=alpha K_E N (TQS 3828, tables 5.8/5.9). Not Aoki–Velloso alpha. */
export function teixeiraAlpha(l: Layer): number {
  const a = l.teixeiraAlpha ?? { sand: 3, silt: 5, clay: 7, fill: 0 }[l.soil];
  if (!(a > 0))
    throw new Error(
      `Teixeira–Godoy: informe αTG para ${l.name}. Aterro não tem associação automática.`,
    );
  return a;
}

/** Homogeneous half-space parameters, or an explicitly requested 2B equivalent. */
export function continuumParameters(p: Project, f: Foundation) {
  if (f.footingSoil !== "equivalent") {
    // At a layer interface the footing bears on the material immediately BELOW it.
    const l = p.layers.find((l) => l.bottom > f.depth + 1e-9);
    if (!l) throw new Error("Descreva o solo abaixo da base da sapata.");
    return { e: l.e, nu: l.nu, soil: l.name };
  }
  const h = 2 * Math.min(f.capX, f.capY);
  let inverse = 0,
    nu = 0;
  for (const [a, b] of intervals(p, f.depth, f.depth + h)) {
    const l = layerAt(p, (a + b) / 2);
    inverse += (b - a) / l.e;
    nu += (b - a) * l.nu;
  }
  return { e: h / inverse, nu: nu / h, soil: "E harmônico / ν médio em 2B" };
}

/** FEMA 273 Fig. 4-2: uncorrected k0. Our X spans capX; Y spans capY.
 * Match moments of area about OUR axes rather than copying the drawing's B/L axes.
 * No shape/embedment factors, passive resistance, damping or unilateral contact.
 */
export function halfspaceSprings(
  x: number,
  y: number,
  eMpa: number,
  nu: number,
) {
  if (
    ![x, y, eMpa].every((v) => Number.isFinite(v) && v > 0) ||
    !Number.isFinite(nu) ||
    nu < 0 ||
    nu > 0.49
  )
    throw new Error("Geometria ou parâmetros do meio contínuo inválidos.");
  const area = x * y,
    ix = (x * y ** 3) / 12,
    iy = (y * x ** 3) / 12;
  const rt = Math.sqrt(area / Math.PI),
    rx = ((4 * ix) / Math.PI) ** 0.25,
    ry = ((4 * iy) / Math.PI) ** 0.25,
    rz = ((2 * (ix + iy)) / Math.PI) ** 0.25,
    g = (eMpa * 1000) / (2 * (1 + nu));
  const kh = (8 * g * rt) / (2 - nu),
    kz = (4 * g * rt) / (1 - nu);
  return {
    area,
    g,
    rt,
    rx,
    ry,
    rz,
    kv: kz / area,
    diagonal: [
      kh,
      kh,
      kz,
      (8 * g * rx ** 3) / (3 * (1 - nu)),
      (8 * g * ry ** 3) / (3 * (1 - nu)),
      (16 * g * rz ** 3) / 3,
    ],
  };
}
