import { reviewFoundation } from "../src/domain/nbr6122";
import {
  reference16,
  reference16Project,
  reference16Comparison,
  referenceInputDifferences,
  benchmarkAssumptions,
  axialDiagnostics,
  concreteSensitivity16,
  initialModuli16,
} from "../src/domain/benchmark16";
import { mkdirSync, writeFileSync } from "node:fs";
import { calculate } from "../src/domain/engine";
import {
  defaultFoundation,
  exampleProject,
  methodologyProject,
  normativeExampleProject,
} from "../src/domain/model";
import {
  geometryDxf,
  matrixCsv,
  reportPdf,
  sectionSvg,
  sptCsv,
} from "../src/files";
const p = exampleProject();
mkdirSync("examples", { recursive: true });
writeFileSync(
  "examples/edificio-horizonte.molas.json",
  JSON.stringify(p, null, 2) + "\n",
);
writeFileSync("examples/SP-01-spt.csv", sptCsv(p));
for (const f of p.foundations) {
  const r = calculate(p, f);
  if (!r.valid) throw new Error("Invalid example " + f.id);
  writeFileSync(`examples/${f.id}-matriz.csv`, matrixCsv(f, r));
  writeFileSync(`examples/${f.id}-corte.svg`, sectionSvg(p, f));
  writeFileSync(`examples/${f.id}-planta.svg`, sectionSvg(p, f, true));
  writeFileSync(`examples/${f.id}-geometria.dxf`, geometryDxf(f));
  writeFileSync(`examples/${f.id}-memoria.pdf`, await reportPdf(p, f, r));
}
const variants = [
  ...p.foundations,
  ...[1, 3].map((count) => ({
    ...defaultFoundation(`N${count}`),
    count: count as 1 | 3,
    capY: 2.5,
  })),
  { ...p.foundations[0], segments: 48, length: 5.5, efficiency: 0.75 },
  { ...p.foundations[2], capX: 1.4, capY: 3, depth: 0.8 },
];
const m = methodologyProject();
writeFileSync(
  "examples/comparacao-metodologias.molas.json",
  JSON.stringify(m, null, 2) + "\n",
);
for (const id of ["M3", "S4"]) {
  const f = m.foundations.find((f) => f.id === id)!;
  const r = calculate(m, f);
  if (!r.valid) throw new Error("Invalid method example " + id);
  writeFileSync(`examples/${id}-memoria.pdf`, await reportPdf(m, f, r));
  writeFileSync(`examples/${id}-matriz.csv`, matrixCsv(f, r));
}
writeFileSync(
  "examples/metodologias-resultados.json",
  JSON.stringify(
    m.foundations.map((f) => ({ id: f.id, ...calculate(m, f) })),
    null,
    2,
  ) + "\n",
);
const extra = [
  ...m.foundations,
  ...([1, 3, 4] as const).flatMap((count) =>
    (["mindlin", "randolph"] as const).map((pileMethod) => ({
      ...m.foundations[0],
      count,
      pileMethod,
      capY: 3,
    })),
  ),
  {
    ...m.foundations[2],
    modulusSource: "spt" as const,
    transfer: "manual" as const,
    tipFraction: 0.25,
    efficiency: 0.8,
    integration: 8,
  },
  {
    ...m.foundations[6],
    modulusSource: "spt" as const,
    capX: 1.8,
    capY: 2.5,
    integration: 24,
  },
];
const cases = [
  ...variants.map((f) => ({ p, f })),
  ...extra.map((f) => ({ p: m, f })),
  ...([3, 4, 6] as const).map((aokiFactor) => ({
    p: m,
    f: { ...m.foundations[2], modulusSource: "aoki" as const, aokiFactor },
  })),
  { p: reference16Project(), f: reference16Project().foundations[0] },
  ...(["winkler", "mindlin", "randolph"] as const).flatMap((pileMethod) =>
    ([1, 2, 3, 4] as const).map((count) => ({
      p: m,
      f: {
        ...m.foundations[0],
        headConnection: "pinned" as const,
        pileMethod,
        count,
        capX: 3,
        capY: 3,
        efficiency: 0.73,
        hx: 15,
        hy: 7,
        mx: count >= 3 ? 15 : 0,
        my: count >= 2 ? 30 : 0,
        mz: 4,
      },
    })),
  ),
  {
    p: reference16Project(),
    f: {
      ...reference16Project().foundations[0],
      headConnection: "pinned" as const,
      my: 9.80665,
    },
  },
];
const fixtures = cases.map(({ p, f }) => {
  const r = calculate(p, f);
  if (!r.valid) throw new Error("Invalid fixture " + f.id);
  return {
    input: { foundation: f, layers: p.layers, spt: p.spt, bedrock: p.bedrock },
    expected: { matrix: r.matrix, displacement: r.displacement },
  };
});
writeFileSync(
  "crates/molas-core/tests/parity.json",
  JSON.stringify(fixtures, null, 2) + "\n",
);
writeFileSync(
  "examples/resultados-esperados.json",
  JSON.stringify(
    p.foundations.map((f) => ({ id: f.id, ...calculate(p, f) })),
    null,
    2,
  ) + "\n",
);
console.log(
  `Examples and ${fixtures.length} shared native fixtures generated.`,
);

const normative = normativeExampleProject();
writeFileSync(
  "examples/nbr6122-conferencia.molas.json",
  JSON.stringify(normative, null, 2) + "\n",
);
writeFileSync(
  "examples/nbr6122-conferencia-resultados.json",
  JSON.stringify(
    normative.foundations.map((f) => ({
      id: f.id,
      ...reviewFoundation(f, calculate(normative, f)),
    })),
    null,
    2,
  ) + "\n",
);
for (const f of normative.foundations)
  writeFileSync(
    `examples/${f.id}-memoria.pdf`,
    await reportPdf(normative, f, calculate(normative, f)),
  );

const reference = reference16Project(),
  foundation = reference.foundations[0],
  result = calculate(reference, foundation);
if (!result.valid) throw new Error("Invalid 16 m benchmark");
writeFileSync(
  "examples/referencia-16m.molas.json",
  JSON.stringify(reference, null, 2) + "\n",
);
writeFileSync("examples/referencia-16m-spt.csv", sptCsv(reference));
writeFileSync("examples/B16-matriz.csv", matrixCsv(foundation, result));
writeFileSync("examples/B16-corte.svg", sectionSvg(reference, foundation));
writeFileSync(
  "examples/B16-planta.svg",
  sectionSvg(reference, foundation, true),
);
writeFileSync(
  "examples/B16-memoria.pdf",
  await reportPdf(reference, foundation, result),
);
writeFileSync(
  "examples/referencia-16m-comparacao.json",
  JSON.stringify(
    {
      description:
        "Capacidades conferidas na precisão do print; rigidezes não confirmadas. As saídas do motor são regressões, não novos valores externos de referência.",
      reference: reference16,
      assumptions: benchmarkAssumptions,
      inputDifferences: referenceInputDifferences(reference, foundation),
      comparison: reference16Comparison(reference, foundation, result),
      axial: axialDiagnostics(foundation, result),
      concreteSensitivity: concreteSensitivity16(reference, foundation),
      initialModuli: initialModuli16(reference),
      result,
    },
    null,
    2,
  ) + "\n",
);

const pinned = structuredClone(reference);
pinned.name = "Referência 16 m · ligação rotulada / momento unitário";
pinned.notes +=
  " Ensaio de ligação: My=1 tf·m superposto a N=40 tf; momentos de topo liberados em X/Y.";
pinned.foundations[0] = {
  ...foundation,
  headConnection: "pinned",
  my: 9.80665,
};
const pinnedFoundation = pinned.foundations[0],
  pinnedResult = calculate(pinned, pinnedFoundation);
if (!pinnedResult.valid) throw new Error("Invalid pinned 16 m benchmark");
writeFileSync(
  "examples/referencia-16m-rotulada.molas.json",
  JSON.stringify(pinned, null, 2) + "\n",
);
writeFileSync(
  "examples/B16-rotulada-matriz.csv",
  matrixCsv(pinnedFoundation, pinnedResult),
);
writeFileSync(
  "examples/B16-rotulada-memoria.pdf",
  await reportPdf(pinned, pinnedFoundation, pinnedResult),
);
writeFileSync(
  "examples/referencia-16m-ligacoes.json",
  JSON.stringify(
    {
      description:
        "Comparação das ligações para N=40 tf e My=1 tf·m. Mesmos parâmetros de solo e geometria; não constitui validação geotécnica contra o print.",
      forceUnit: "tf",
      momentUnit: "tf·m",
      stiffnessUnits: [
        "tf/m",
        "tf/m",
        "tf/m",
        "tf·m/rad",
        "tf·m/rad",
        "tf·m/rad",
      ],
      cases: (["fixed", "pinned"] as const).map((headConnection) => {
        const f = { ...foundation, my: 9.80665, headConnection },
          r = calculate(reference, f);
        return {
          headConnection,
          diagonal: r.diagonal.map((v) => v / 9.80665),
          freeDofs: r.freeDofs,
          pileForces: r.pileForces.map((v) => v / 9.80665),
          pileMoments: r.pileMoments.map((m) => m.map((v) => v / 9.80665)),
          displacement: r.displacement,
        };
      }),
    },
    null,
    2,
  ) + "\n",
);
