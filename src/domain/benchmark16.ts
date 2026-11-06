import { calculate, type Calculation } from "./engine";
import {
  defaultFoundation,
  exampleProject,
  pilePositions,
  type Foundation,
  type Project,
} from "./model";
import { solve, zeros, type Matrix } from "./matrix";
import { TF, aokiInitialModulus } from "./methods";
export const BENCHMARK_ID = "pile-16m-20261106" as const;
export const reference16 = {
  title: "Print · bloco sobre 2 estacas Ø30 cm, L=16 m",
  spt: [6, 3, 4, 5, 6, 6, 8, 9, 12, 14, 17, 15, 12, 12, 22, 35, 35, 36, 38, 40],
  shaft: 43.5,
  point: 40.8,
  ultimate: 84.3,
  kx: 168.92,
  ky: 168.92,
  kz: 21538.54,
  rx: 0,
  ry: 4361.75,
  totalLoad: 40,
  spacing: 0.9,
};
export const benchmarkAssumptions = [
  "NSPT(11)=17 foi informado pelo usuário e incluído. D=0 e L=16 m representam a ponta a 16 m.",
  "K do print foi convertido de tf/m² por golpe para kPa/golpe; 1 tf = 9,80665 kN. Esta interpretação reproduz as três resistências publicadas.",
  "E=140/88/370 foi interpretado como MPa e ν=0,35. A unidade de E não aparece no print; esta convenção precisa ser confirmada.",
  "O print informa fck=30 MPa, mas não a fórmula nem o valor de Ec. O caso usa Ec=30 GPa como hipótese explícita; o motor não deriva Ec automaticamente de fck.",
  "O perfil mostrado termina em 20 m e a base indeslocável é 100 m. Foi acrescentada uma camada 20–100 m com E e ν iguais aos da última camada, somente como hipótese de ensaio numérico.",
  "kh, kt e kp não constam nos prints. Os valores do projeto de exemplo são ilustrativos; as molas horizontais e a flexão local não estão validadas contra o print.",
  "O caso-base mantém a ligação rígida à flexão das versões anteriores. Em Métodos, selecione Rotulada em X e Y para ensaiar o binário axial sem momentos de topo, conforme o esquema fornecido pelo usuário. A escolha não calibra o solo nem comprova todas as hipóteses do programa externo.",
  "Dimensões do bloco não informadas: 1,50 × 0,60 × 0,65 m apenas para visualização. N=40 tf é aplicado diretamente, sem peso próprio adicional.",
];
export function reference16Project(): Project {
  const p = exampleProject();
  p.name = "Referência 16 m · comparação com print";
  p.water = 1;
  p.bedrock = 100;
  p.borehole = "SP-Ref16";
  p.notes =
    "Caso externo de referência, com hipóteses não confirmadas. " +
    benchmarkAssumptions.join(" ");
  p.spt = reference16.spt.map((n, i) => ({ depth: i + 1, n }));
  const base = p.layers[0];
  p.layers = [
    {
      ...base,
      id: "R1",
      name: "Areia · print",
      soil: "sand",
      bottom: 3,
      alpha: 0.024,
      k: 70 * TF,
      e: 140,
      nu: 0.35,
    },
    {
      ...p.layers[1],
      id: "R2",
      name: "Argila 3–11 m · print",
      soil: "clay",
      bottom: 11,
      alpha: 0.04,
      k: 22 * TF,
      e: 88,
      nu: 0.35,
      color: "#b7a38f",
    },
    {
      ...p.layers[2],
      id: "R3",
      name: "Argila 11–20 m · print",
      soil: "clay",
      bottom: 20,
      alpha: 0.03,
      k: 33 * TF,
      e: 370,
      nu: 0.35,
      color: "#8d9c9a",
    },
    {
      ...p.layers[2],
      id: "R4",
      name: "Continuação 20–100 m · HIPÓTESE",
      soil: "clay",
      bottom: 100,
      alpha: 0.03,
      k: 33 * TF,
      e: 370,
      nu: 0.35,
      color: "#b8c3c2",
    },
  ];
  p.foundations = [
    {
      ...defaultFoundation("B16"),
      name: "B16 · 2 estacas / 16 m",
      count: 2,
      diameter: 0.3,
      length: 16,
      spacingX: 0.9,
      spacingY: 0.9,
      depth: 0,
      capX: 1.5,
      capY: 0.6,
      height: 0.65,
      fck: 30,
      ec: 30,
      f1: 2,
      f2: 4,
      n: 40 * TF,
      hx: 0,
      hy: 0,
      mx: 0,
      my: 0,
      mz: 0,
      pileMethod: "mindlin",
      modulusSource: "manual",
      segments: 64,
      integration: 32,
    },
  ];
  p.benchmark = { id: BENCHMARK_ID, foundationId: "B16" };
  return p;
}
export function hasReference16(p: Project, f: Foundation): boolean {
  return p.benchmark?.id === BENCHMARK_ID && p.benchmark.foundationId === f.id;
}
export type BenchmarkRow = {
  id: string;
  label: string;
  expected: number;
  actual: number | null;
  unit: string;
  differencePercent: number | null;
  status: "match" | "different" | "conditional" | "blocked";
  note: string;
};
export function reference16Comparison(
  p: Project,
  f: Foundation,
  r: Calculation,
): BenchmarkRow[] {
  if (!hasReference16(p, f)) return [];
  const row = (
    id: string,
    label: string,
    expected: number,
    actual: number | null,
    unit: string,
    decimals: number,
    confirmed: boolean,
    note: string,
  ): BenchmarkRow => ({
    id,
    label,
    expected,
    actual: r.valid ? actual : null,
    unit,
    differencePercent:
      r.valid && actual !== null && expected !== 0
        ? (actual / expected - 1) * 100
        : null,
    status:
      !r.valid || actual === null
        ? "blocked"
        : !confirmed
          ? "conditional"
          : Math.abs(actual - expected) <= 0.5 * 10 ** -decimals + 1e-9
            ? "match"
            : "different",
    note,
  });
  return [
    row(
      "shaft",
      "Resistência de fuste por estaca",
      43.5,
      r.shaft === null ? null : r.shaft / TF,
      "tf",
      1,
      true,
      "Conferência na precisão exibida pelo print, sem recalibrar α, K, F1 ou F2.",
    ),
    row(
      "point",
      "Resistência de ponta por estaca",
      40.8,
      r.point === null ? null : r.point / TF,
      "tf",
      1,
      true,
      "Np=35 na ponta a 16 m; K=33 tf/m² por golpe.",
    ),
    row(
      "ultimate",
      "Resistência última por estaca",
      84.3,
      r.ultimate === null ? null : r.ultimate / TF,
      "tf",
      1,
      true,
      "Resultado bruto Aoki–Velloso; não é carga admissível.",
    ),
    ...(
      [
        ["kx", "Kx", 168.92, 0],
        ["ky", "Ky", 168.92, 1],
        ["kz", "Kz global", 21538.54, 2],
        ["rx", "Kθx", 0, 3],
        ["ry", "Kθy", 4361.75, 4],
      ] as const
    ).map(([id, label, expected, i]) =>
      row(
        id,
        label,
        expected,
        r.diagonal[i] / TF,
        i < 3 ? "tf/m" : "tf·m/rad",
        2,
        false,
        i < 2
          ? "kh e condição de cabeça do cálculo de referência não informados; não comparar valores ilustrativos como se fossem os mesmos dados."
          : i === 2
            ? "Ec, transferência, interação entre estacas, discretização e continuação abaixo de 20 m ainda precisam de equivalência."
            : f.headConnection === "pinned"
              ? "Ligação rotulada: momentos locais de topo nulos; rotação pelo braço axial. A interação e os parâmetros verticais ainda diferem das hipóteses do print."
              : "O modelo ativo inclui flexão local Winkler; o print é aproximadamente compatível com rotação somente pelo braço axial. Veja as parcelas abaixo.",
      ),
    ),
    row(
      "settlement",
      "Recalque implícito sob 40 tf",
      (40 / 21538.54) * 1000,
      r.settlement,
      "mm",
      6,
      false,
      "Valor deduzido de N/Kz, não uma medição nem um recalque impresso separadamente.",
    ),
  ];
}
/** Diagnostic contribution only: never replaces the active six-DOF matrix. */
export function axialContribution(
  f: Foundation,
  compliance: Matrix,
  independent = false,
): Matrix {
  const c = compliance.map((row, i) =>
      row.map((v, j) => (independent && i !== j ? 0 : v)),
    ),
    b = pilePositions(f).map(([x, y]) => [1, y, -x]),
    k = zeros(3);
  for (let col = 0; col < f.count; col++) {
    const unit = Array(f.count).fill(0);
    unit[col] = 1;
    const inverse = solve(c, unit);
    for (let row = 0; row < f.count; row++)
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          k[i][j] += f.efficiency * b[row][i] * inverse[row] * b[col][j];
  }
  return k;
}
export function axialDiagnostics(f: Foundation, r: Calculation) {
  if (!r.valid || f.kind !== "pile" || !r.verticalCompliance) return [];
  return [false, true].map((independent) => ({
    label: independent
      ? "Parcela axial · estacas independentes (diagnóstico)"
      : "Parcela axial · interação do modelo ativo",
    diagonal: axialContribution(f, r.verticalCompliance!, independent).map(
      (row, i) => row[i] / TF,
    ),
  }));
}
export function concreteSensitivity16(p: Project, f: Foundation) {
  return [26, 28, 30, 32].map((ec) => {
    const r = calculate(p, { ...f, ec });
    return {
      ec,
      valid: r.valid,
      kz: r.valid ? r.diagonal[2] / TF : null,
      settlement: r.valid ? r.settlement : null,
    };
  });
}
export function initialModuli16(p: Project) {
  let top = 0;
  return p.layers.slice(0, 3).map((l) => {
    const a = top;
    top = l.bottom;
    let weighted = 0,
      previous = 0;
    for (const s of p.spt) {
      const dz = Math.max(
        0,
        Math.min(s.depth, l.bottom) - Math.max(previous, a),
      );
      weighted += dz * s.n;
      previous = s.depth;
    }
    const mean = weighted / (l.bottom - a);
    return {
      layer: l.name,
      mean,
      manual: l.e,
      driven: aokiInitialModulus(l.k, mean, 6),
      cfa: aokiInitialModulus(l.k, mean, 4),
      bored: aokiInitialModulus(l.k, mean, 3),
    };
  });
}
export function referenceInputDifferences(p: Project, f: Foundation): string[] {
  const changes: string[] = [];
  const value = (label: string, actual: number, expected: number) => {
    if (Math.abs(actual - expected) > 1e-8 * Math.max(1, Math.abs(expected)))
      changes.push(`${label}: modelo ${actual}; print ${expected}`);
  };
  if (f.kind !== "pile") changes.push("O print é de bloco sobre estacas.");
  for (const [label, actual, expected] of [
    ["Número de estacas", f.count, 2],
    ["Diâmetro (m)", f.diameter, 0.3],
    ["D (m)", f.depth, 0],
    ["L (m)", f.length, 16],
    ["sx (m)", f.spacingX, 0.9],
    ["sy (m)", f.spacingY, 0.9],
    ["fck (MPa)", f.fck, 30],
    ["F1", f.f1, 2],
    ["F2", f.f2, 4],
    ["N (tf)", f.n / TF, 40],
    ["Nível d’água (m)", p.water, 1],
    ["Base rígida (m)", p.bedrock, 100],
  ] as [string, number, number][])
    value(label, actual, expected);
  reference16.spt.forEach((n, i) => {
    const s = p.spt.find((s) => s.depth === i + 1);
    if (!s) changes.push(`Falta registro SPT na profundidade ${i + 1} m.`);
    else value(`NSPT(${i + 1})`, s.n, n);
  });
  const expected = [
    { bottom: 3, alpha: 0.024, k: 70 * TF, e: 140 },
    { bottom: 11, alpha: 0.04, k: 22 * TF, e: 88 },
    { bottom: 20, alpha: 0.03, k: 33 * TF, e: 370 },
  ];
  expected.forEach((l, i) => {
    const a = p.layers[i];
    if (!a) {
      changes.push(`Falta camada ${i + 1}.`);
      return;
    }
    for (const key of ["bottom", "alpha", "k", "e"] as const)
      value(`Camada ${i + 1} · ${key}`, a[key], l[key]);
    value(`Camada ${i + 1} · ν`, a.nu, 0.35);
  });
  if (f.modulusSource !== "manual")
    changes.push(
      "O caso do print usa os valores E informados; a origem E/E0 do modelo foi alterada.",
    );
  return changes;
}
