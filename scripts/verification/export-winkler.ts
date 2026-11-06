/** Inputs for a separate OpenSees model; runtime engine is unchanged. */
import { mkdirSync, writeFileSync } from "node:fs";
import { calculate } from "../../src/domain/engine";
import { reference16Project } from "../../src/domain/benchmark16";
const original = reference16Project();
const base = original.foundations[0];
const profiles = [
  {
    id: "single-uniform",
    count: 1 as const,
    layers: [{ ...original.layers[0], bottom: 100 }],
    positions: [[0, 0]],
  },
  {
    id: "two-uniform",
    count: 2 as const,
    layers: [{ ...original.layers[0], bottom: 100 }],
    positions: [
      [-0.45, 0],
      [0.45, 0],
    ],
  },
  {
    id: "two-layered",
    count: 2 as const,
    layers: original.layers,
    positions: [
      [-0.45, 0],
      [0.45, 0],
    ],
  },
];
const cases = profiles.map((v) => {
  const f = { ...base, count: v.count, pileMethod: "winkler" as const };
  const p = { ...original, layers: v.layers, foundations: [f] };
  const r = calculate(p, f);
  if (!r.valid) throw new Error(v.id);
  return {
    id: v.id,
    project: p,
    foundation: f,
    positions: v.positions,
    matrix: r.matrix,
  };
});
mkdirSync("tmp/verification", { recursive: true });
writeFileSync(
  "tmp/verification/input.json",
  JSON.stringify(cases, null, 2) + "\n",
);
