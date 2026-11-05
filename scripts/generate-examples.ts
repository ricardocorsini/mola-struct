import { mkdirSync, writeFileSync } from "node:fs";
import { calculate } from "../src/domain/engine";
import { defaultFoundation, exampleProject } from "../src/domain/model";
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
const fixtures = variants.map((f) => {
  const r = calculate(p, f);
  if (!r.valid) throw new Error("Invalid fixture " + f.id);
  return {
    input: { foundation: f, layers: p.layers },
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
