import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculate } from "../src/domain/engine";
import { parseProject } from "../src/domain/model";
const fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/opensees-winkler.json", import.meta.url),
    "utf8",
  ),
);
describe("referência numérica independente OpenSees, Winkler linear", () => {
  for (const testCase of fixture.cases) {
    it(`compara as 36 entradas da matriz: ${testCase.id}`, () => {
      const p = parseProject(JSON.stringify(testCase.input.project));
      const r = calculate(p, p.foundations[0]);
      expect(r.valid).toBe(true);
      const reference = testCase.reference.at(-1).matrix;
      let maxError = 0;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) {
          const scale = Math.sqrt(r.matrix[i][i] * r.matrix[j][j]);
          maxError = Math.max(
            maxError,
            Math.abs(reference[i][j] - r.matrix[i][j]) / scale,
          );
        }
      expect(maxError).toBeLessThan(
        fixture.provenance.numericalToleranceNormalized,
      );
    });
  }
});
