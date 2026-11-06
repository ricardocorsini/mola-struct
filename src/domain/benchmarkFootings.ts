import { calculate } from "./engine";
import {
  defaultFoundation,
  exampleProject,
  type Foundation,
  type Project,
} from "./model";
import { TF } from "./methods";

/** Independently transcribed user screenshot. Translations tf/m; rotations tf·m/rad. */
export const footingReference = [
  [60, 759.3, 963.8, 76.2, 99.1],
  [70, 885.9, 1124.4, 121.0, 157.3],
  [80, 1012.4, 1285.0, 180.7, 234.9],
  [90, 1139.0, 1445.7, 257.2, 334.4],
  [100, 1265.6, 1606.3, 352.9, 458.7],
  [110, 1392.1, 1766.9, 469.7, 610.6],
  [120, 1518.7, 1927.5, 609.7, 792.7],
  [130, 1645.2, 2088.2, 775.2, 1007.8],
  [140, 1771.8, 2248.8, 968.3, 1258.7],
  [150, 1898.3, 2409.4, 1190.9, 1548.2],
  [160, 2024.9, 2570.1, 1445.3, 1878.9],
  [170, 2151.5, 2730.7, 1733.6, 2253.7],
  [180, 2278.0, 2891.3, 2057.9, 2675.3],
] as const;
export const FOOTING_BENCHMARK_ID = "footings-fema273-20261106";
export function footingReferenceProject(): Project {
  const p = exampleProject();
  p.version = 2;
  p.name = "Sapatas · referência FEMA 273";
  p.notes =
    "Print do usuário: silte NSPT=7, ν=0,35. E=5×0,35×7=12,25 MPa (1.249,15 tf/m² arredondado). Semiespaço homogêneo; α=β=1. D=0 e N=10 tf são hipóteses do exemplo, não fornecidas no print. Capacidade não validada por essa tabela.";
  p.bedrock = 50;
  p.water = 50;
  p.borehole = "SP-REF-SILTE";
  p.spt = Array.from({ length: 50 }, (_, i) => ({ depth: i + 1, n: 7 }));
  p.layers = [
    {
      ...p.layers[0],
      id: "silte",
      name: "Silte · NSPT 7",
      bottom: 50,
      soil: "silt",
      e: 12.25,
      nu: 0.35,
      schmertmannK: 0.35,
      teixeiraAlpha: 5,
    },
  ];
  p.foundations = footingReference.map(([cm]) => ({
    ...defaultFoundation(`S${cm}`, "footing"),
    capX: cm / 100,
    capY: cm / 100,
    depth: 0,
    height: 0.4,
    n: 10 * TF,
    hx: 0,
    hy: 0,
    mx: 0,
    my: 0,
    mz: 0,
    footingMethod: "halfspace",
    footingSoil: "support",
    modulusSource: "teixeira",
  }));
  p.benchmark = { id: FOOTING_BENCHMARK_ID, foundationId: "S100" };
  return p;
}
export function hasFootingReference(p: Project, f: Foundation): boolean {
  return p.benchmark?.id === FOOTING_BENCHMARK_ID && f.kind === "footing";
}
export function footingBenchmarkTable(p: Project) {
  return footingReference.map(([cm, ...expected]) => {
    const f = p.foundations.find((f) => f.id === `S${cm}`),
      r = f ? calculate(p, f) : null;
    const actual = r?.valid
      ? [
          r.diagonal[0] / TF,
          r.diagonal[2] / TF,
          r.diagonal[3] / TF,
          r.diagonal[5] / TF,
        ]
      : null;
    const delta = actual
      ? Math.max(...expected.map((v, i) => Math.abs(actual[i] - v)))
      : null;
    const match =
      !!f &&
      f.capX === cm / 100 &&
      f.capY === cm / 100 &&
      f.footingMethod === "halfspace" &&
      !!r?.valid &&
      delta !== null &&
      delta <= 0.0500001;
    return { cm, expected, actual, delta, match };
  });
}
