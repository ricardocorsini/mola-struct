/** Controlled CRH study, NOT an application preset or a reproduction of SISEs.
 * TQS 3829: K [kgf/cm²], nh [kgf/cm³], m [tf/m⁴]. The app's kh is kN/m³.
 * Transcribed numeric facts from the user-provided document; no third-party code.
 */
import { calculate, type Calculation } from "../../src/domain/engine";
import { TF } from "../../src/domain/methods";
import type { Foundation, Project } from "../../src/domain/model";
import { layerAt, sptAt } from "../../src/domain/profile";
import { solve, zeros, type Matrix } from "../../src/domain/matrix";

export const CRH_SOURCE =
  "https://docs.tqs.com.br/Docs/Details?id=3829&language=pt-br";
export const PILE_SOURCE =
  "https://docs.tqs.com.br/Docs/Details?id=3836&language=pt-br";
export const KGF_CM2_TO_KN_M2 = 98.0665;
export const KGF_CM3_TO_KN_M3 = 9806.65;
export const clayK3829 = [
  { id: "medium", name: "Média", k: 8 },
  { id: "stiff", name: "Rija", k: 50 },
  { id: "very-stiff", name: "Muito rija", k: 100 },
  { id: "hard", name: "Dura", k: 195 },
] as const;
export const nh3829 = [
  { id: "loose-sand", name: "Areia fofa", dry: 0.26, wet: 0.15 },
  {
    id: "medium-sand",
    name: "Areia medianamente compacta",
    dry: 0.8,
    wet: 0.5,
  },
  { id: "dense-sand", name: "Areia compacta", dry: 2, wet: 1.25 },
  { id: "very-soft-clay", name: "Argila muito mole", dry: 0.06, wet: 0.06 },
  { id: "soft-clay", name: "Argila mole", dry: 0.08, wet: 0.08 },
  {
    id: "very-loose-silt",
    name: "Silte muito mole fofo",
    dry: 0.055,
    wet: 0.055,
  },
] as const;
// The granular source table mixes soil labels. It is retained as a material-family
// table; do not infer geological material or OCR from these labels or NSPT alone.
export const tietzM = {
  clay: [
    [0, 25],
    [1, 75],
    [3, 150],
    [6, 300],
    [12, 500],
    [22, 700],
    [30, 900],
  ],
  granular: [
    [1, 150],
    [7, 300],
    [20, 500],
    [40, 800],
    [50, 1500],
  ],
} as const;
export type TablePolicy = "lower" | "linear" | "upper";
export type LineReaction = (depth: number) => number; // kN/m² = (force/length)/displacement

/** Table ordinates are known; the between-row rule is an explicit study assumption.
 * Clay 900 applies above 30 as explicitly stated by TQS 3836; no granular extrapolation.
 */
export function tietzValue(
  n: number,
  family: keyof typeof tietzM,
  policy: TablePolicy,
): number {
  const table = tietzM[family];
  if (
    !Number.isFinite(n) ||
    n < table[0][0] ||
    (family === "granular" && n > table.at(-1)![0])
  )
    throw new Error(
      "SPT fora da tabela adotada no diagnóstico; sem extrapolação granular.",
    );
  if (n >= table.at(-1)![0]) return table.at(-1)![1];
  if (n === table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [upperN, upperM] = table[i],
      [lowerN, lowerM] = table[i - 1];
    if (n === upperN) return upperM;
    if (n < upperN)
      return policy === "lower"
        ? lowerM
        : policy === "upper"
          ? upperM
          : lowerM + ((n - lowerN) / (upperN - lowerN)) * (upperM - lowerM);
  }
  throw new Error("Tabela inválida.");
}

export function tietzLineReaction(
  p: Project,
  f: Foundation,
  policy: TablePolicy,
): LineReaction {
  if (f.kind !== "pile") throw new Error("O estudo SPT/m é para estacas.");
  if (
    p.spt.at(-1)!.depth < f.depth + f.length ||
    p.layers.at(-1)!.bottom < f.depth + f.length
  )
    throw new Error(
      "Perfil ou SPT insuficiente para o estudo CRH; sem extrapolação.",
    );
  return (depth) => {
    const soil = layerAt(p, depth).soil;
    if (soil !== "clay" && soil !== "sand")
      throw new Error(
        "Escolha explícita da família SPT/m é necessária para este solo.",
      );
    // This case uses depth from ground level; D=0 in the 16 m reference.
    return (
      tietzValue(
        sptAt(p, depth),
        soil === "clay" ? "clay" : "granular",
        policy,
      ) *
      TF *
      depth *
      f.diameter
    );
  };
}

/** Equivalent piecewise manual profile at EXACTLY the production FE sampling points.
 * All E, nu, AV, kt and kp values are copied from the source. Foundation is unchanged.
 * This is an adapter for an experiment, not a persistent geological subdivision.
 */
export function sampledLateralProfile(
  p: Project,
  f: Foundation,
  lineReaction: LineReaction,
): Project {
  const end = f.depth + f.length;
  if (p.layers.at(-1)!.bottom < end)
    throw new Error("Perfil insuficiente para o estudo CRH.");
  const boundaries = [
    ...new Set([
      0,
      ...p.layers.map((l) => l.bottom),
      ...Array.from(
        { length: f.segments + 1 },
        (_, i) => f.depth + (i * f.length) / f.segments,
      ),
    ]),
  ].sort((a, b) => a - b);
  const layers = boundaries.slice(1).map((bottom, i) => {
    const middle = (bottom + boundaries[i]) / 2,
      original = layerAt(p, middle);
    const kh =
      middle >= f.depth && middle <= end
        ? lineReaction(middle) / f.diameter
        : original.kh;
    if (!(kh > 0) || !Number.isFinite(kh))
      throw new Error("Reação lateral não positiva no ponto de integração.");
    return { ...original, id: `CRH-${i}`, bottom, kh };
  });
  if (layers.length > 100)
    throw new Error("Diagnóstico excede 100 camadas computacionais.");
  return { ...p, layers };
}

/** Separate beam calculation with translational Winkler springs AT the SPT nodes.
 * Endpoint convention (explicit assumption): full interval weight at toe, no spring
 * at the cap. The toe remains free in bending. This is a discretization experiment.
 */
export function nodalLateralHead(
  p: Project,
  f: Foundation,
  lineReaction: LineReaction,
  segments: number,
  endWeights: "spt-nodes" | "trapezoidal" = "spt-nodes",
): Matrix {
  if (f.depth !== 0) throw new Error("O diagnóstico nodal atual requer D=0.");
  if (p.layers.at(-1)!.bottom < f.length)
    throw new Error("Perfil insuficiente para o estudo nodal.");
  if (!Number.isInteger(segments) || segments < 8 || segments > 128)
    throw new Error("Malha nodal fora do estudo.");
  const l = f.length / segments,
    ei = (f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64,
    k = zeros(2 * (segments + 1));
  const beam = [
    [12, 6 * l, -12, 6 * l],
    [6 * l, 4 * l * l, -6 * l, 2 * l * l],
    [-12, -6 * l, 12, -6 * l],
    [6 * l, 2 * l * l, -6 * l, 4 * l * l],
  ];
  for (let e = 0; e < segments; e++)
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        k[2 * e + i][2 * e + j] += (ei / l ** 3) * beam[i][j];
  for (let i = endWeights === "spt-nodes" ? 1 : 0; i <= segments; i++) {
    const response = lineReaction(i * l);
    if (!Number.isFinite(response) || response < 0)
      throw new Error("Reação nodal inválida.");
    const weight =
      endWeights === "trapezoidal" && (i === 0 || i === segments) ? 0.5 : 1;
    k[2 * i][2 * i] += response * l * weight;
  }
  const load = Array(k.length).fill(0);
  load[0] = 1;
  const c0 = solve(k, load);
  load[0] = 0;
  load[1] = 1;
  const c1 = solve(k, load),
    determinant = c0[0] * c1[1] - c1[0] * c0[1];
  return [
    [c1[1] / determinant, -c1[0] / determinant],
    [-c0[1] / determinant, c0[0] / determinant],
  ];
}

export function summarize(r: Calculation) {
  if (!r.valid)
    throw new Error(
      r.notices
        .filter((n) => n.level === "error")
        .map((n) => n.message)
        .join(" "),
    );
  return {
    diagonal: r.diagonal.map((v) => v / TF),
    freeDofs: r.freeDofs,
    settlement: r.settlement,
    capacities: [r.shaft, r.point, r.ultimate].map((v) =>
      v === null ? null : v / TF,
    ),
  };
}

export function evaluateLaw(
  p: Project,
  f: Foundation,
  lineReaction: LineReaction,
) {
  const profile = sampledLateralProfile(p, f, lineReaction);
  return Object.fromEntries(
    (["fixed", "pinned"] as const).map((headConnection) => [
      headConnection,
      summarize(calculate(profile, { ...f, headConnection })),
    ]),
  );
}
