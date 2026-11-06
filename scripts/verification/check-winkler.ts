import { readFileSync } from "node:fs";
const cases = JSON.parse(readFileSync("tmp/verification/input.json", "utf8"));
const independent = JSON.parse(
  readFileSync("tmp/verification/opensees-results.json", "utf8"),
);
for (const c of cases) {
  const reference = independent.cases.find(
    (r: { id: string }) => r.id === c.id,
  );
  if (!reference || reference.reference.length !== 3)
    throw new Error("Missing independent case " + c.id);
  const rows = reference.reference;
  const error = rows.at(-1).maxNormalizedEntryError;
  if (!(error < 0.005))
    throw new Error(`${c.id}: matrix discrepancy ${error}, limit 0.005`);
  if (!(rows.at(-1).maxNormalizedEntryError < rows[0].maxNormalizedEntryError))
    throw new Error("No mesh improvement: " + c.id);
  console.log(
    `${c.id}: normalized matrix error ${(error * 100).toFixed(5)}%; numerical verification only.`,
  );
}
