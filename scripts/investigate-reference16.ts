import { mkdirSync, writeFileSync } from "node:fs";
import { calculate } from "../src/domain/engine";
import { reference16, reference16Project } from "../src/domain/benchmark16";
import { twoPileRotationAudit } from "../src/domain/rotationAudit";
import { TF } from "../src/domain/methods";
import { reportPdf } from "../src/files";

const p = reference16Project(),
  f = p.foundations[0],
  base = calculate(p, f);
const audit = twoPileRotationAudit(f, base);
if (!audit.available) throw new Error(audit.reason);
function experiment(label: string, project = p, foundation = f) {
  const r = calculate(project, foundation),
    d = twoPileRotationAudit(foundation, r);
  if (!d.available) throw new Error(`${label}: ${d.reason}`);
  return {
    label,
    kz: d.kz,
    fullRy: d.fullRy,
    axialRy: d.axialRy,
    localRy: d.localRy,
    kzDifferencePercent: (d.kz / reference16.kz - 1) * 100,
    fullRyDifferencePercent: d.fullDifferencePercent,
    axialRyDifferencePercent: d.axialDifferencePercent,
    settlement: r.settlement,
    shaft: r.shaft! / TF,
    point: r.point! / TF,
  };
}
const data = {
  description:
    "Investigação numérica do caso externo. Decomposição algébrica e ensaios de hipóteses; não são validação das rigidezes, calibração ou alterações do motor ativo.",
  reference: reference16,
  baseline: audit,
  experiments: {
    mesh: [16, 32, 64].flatMap((segments) =>
      [8, 16, 32].map((integration) =>
        experiment(`ne=${segments}; ng=${integration}`, p, {
          ...f,
          segments,
          integration,
        }),
      ),
    ),
    kh: [0.01, 0.1, 1, 10].map((factor) =>
      experiment(`kh × ${factor}`, {
        ...p,
        layers: p.layers.map((l) => ({ ...l, kh: l.kh * factor })),
      }),
    ),
    transfer: [0, 0.25, base.point! / base.ultimate!, 0.75, 1].map(
      (tipFraction) =>
        experiment(`βp=${tipFraction}`, p, {
          ...f,
          transfer: "manual",
          tipFraction,
        }),
    ),
    ec: [26, 28, 30, 32].map((ec) =>
      experiment(`Ec=${ec} GPa`, p, { ...f, ec }),
    ),
    soil: [0.00980665, 0.0980665, 1, 10].map((factor) =>
      experiment(`E × ${factor}`, {
        ...p,
        layers: p.layers.map((l) => ({ ...l, e: l.e * factor })),
      }),
    ),
    baseDepth: [20, 40, 100, 200].map((bedrock) =>
      experiment(`Base=${bedrock} m`, {
        ...p,
        bedrock,
        layers: [
          ...p.layers.slice(0, 3),
          { ...p.layers[3], bottom: Math.max(100, bedrock) },
        ],
      }),
    ),
  },
};
mkdirSync("examples", { recursive: true });
writeFileSync(
  "examples/referencia-16m-investigacao.json",
  JSON.stringify(data, null, 2) + "\n",
);
if (process.argv.includes("--pdf"))
  writeFileSync("examples/B16-memoria.pdf", await reportPdf(p, f, base));
console.log(
  `Rotation decomposition and ${Object.values(data.experiments).reduce((sum, rows) => sum + rows.length, 0)} controlled numerical experiments generated.`,
);
