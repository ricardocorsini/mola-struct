import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { calculate } from "../src/domain/engine";
import {
  reference16,
  reference16Project,
  axialContribution,
} from "../src/domain/benchmark16";
import {
  condensedScalar,
  twoPileRotationAudit,
} from "../src/domain/rotationAudit";
import { TF } from "../src/domain/methods";

const project = reference16Project(),
  foundation = project.foundations[0],
  result = calculate(project, foundation);
const baseline = () => {
  const d = twoPileRotationAudit(foundation, result);
  if (!d.available) throw new Error(d.reason);
  return d;
};
describe("investigação da rotação do grupo de duas estacas", () => {
  it("reproduz exatamente os modos comum e oposto pela solução matricial", () => {
    const d = baseline();
    expect(d.predictedKz).toBeCloseTo(result.diagonal[2] / TF, 9);
    expect(d.predictedAxialRy).toBeCloseTo(
      axialContribution(foundation, result.verticalCompliance!)[2][2] / TF,
      9,
    );
    expect(d.axialRy / d.kz).toBeCloseTo(
      (d.armSquared * (1 + d.interactionRatio)) / (1 - d.interactionRatio),
      12,
    );
  });
  it("fecha a diferença sem suprimir flexão ou modificar a matriz ativa", () => {
    const copy = structuredClone(result),
      d = baseline();
    expect(d.axialRy + d.localRy).toBeCloseTo(d.fullRy, 10);
    expect(d.reconstructed).toBeCloseTo(d.fullRy, 10);
    expect(
      d.terms.find((t) => t.id === "interaction-mode")!.value,
    ).toBeGreaterThan(0);
    expect(d.localRy).toBeCloseTo(result.diagonal[3] / TF, 8);
    expect(d.bendingShareOfGap).toBeCloseTo(0.8329403631562892, 10);
    expect(result).toEqual(copy);
    const published = JSON.parse(
      readFileSync(
        new URL("../examples/referencia-16m-comparacao.json", import.meta.url),
        "utf8",
      ),
    );
    expect(result.matrix).toEqual(published.result.matrix);
  });
  it("coincide com duas molas independentes quando C12=0", () => {
    const d = baseline(),
      c = result.verticalCompliance!.map((row, i) =>
        row.map((v, j) => (i === j ? v : 0)),
      );
    const k = axialContribution(foundation, c);
    expect(k[2][2] / k[0][0]).toBeCloseTo(foundation.spacingX ** 2 / 4, 12);
    expect(k[2][2] / TF).toBeCloseTo(d.independentRy, 9);
    expect(k[0][0] / TF).toBeCloseTo(d.independentKz, 9);
  });
  it("distingue liberação de translação da articulação no topo da estaca", () => {
    expect(
      condensedScalar(
        [
          [4, 2],
          [2, 3],
        ],
        1,
        [0],
      ),
    ).toBe(2);
    expect(
      condensedScalar(
        [
          [4, 2],
          [2, 3],
        ],
        0,
        [1],
      ),
    ).toBeCloseTo(8 / 3, 12);
    expect(() =>
      condensedScalar(
        [
          [4, 2],
          [2, 3],
        ],
        0,
        [0],
      ),
    ).toThrow();
    const d = baseline();
    expect(d.boundaryCases.find((t) => t.id === "free-x")!.ry).toBeCloseTo(
      6375.991002920637,
      8,
    );
    expect(d.boundaryCases.find((t) => t.id === "free-x")!.ry).toBeGreaterThan(
      d.axialRy,
    );
    expect(d.pinnedHorizontal!).toBeLessThan(d.horizontalFreeRotation);
    expect(d.pinnedHorizontal!).toBeGreaterThan(reference16.kx);
  });
  it("varia kh sem alterar Kz ou sua contribuição axial ao momento", () => {
    const p = {
      ...project,
      layers: project.layers.map((l) => ({ ...l, kh: l.kh * 0.1 })),
    };
    const r = calculate(p, foundation),
      d = twoPileRotationAudit(foundation, r);
    if (!d.available) throw new Error(d.reason);
    expect(d.kz).toBeCloseTo(baseline().kz, 10);
    expect(d.axialRy).toBeCloseTo(baseline().axialRy, 10);
    expect(d.localRy).toBeLessThan(baseline().localRy);
  });
  it("refinamento 32→64 não explica a diferença para o print", () => {
    const a = calculate(project, {
        ...foundation,
        segments: 32,
        integration: 16,
      }),
      b = result;
    expect(Math.abs(a.diagonal[4] / b.diagonal[4] - 1)).toBeLessThan(0.0003);
    expect(Math.abs(a.diagonal[2] / b.diagonal[2] - 1)).toBeLessThan(0.0004);
  });
  it("não confunde a pequena diferença do fechamento com arredondamento", () => {
    const d = baseline();
    expect(d.referenceClosure).toBeCloseTo(-0.19565, 10);
    expect(Math.abs(d.referenceClosure)).toBeGreaterThan(
      d.referenceRoundingBound,
    );
  });
  it("bloqueia fórmulas de duas estacas fora da sua hipótese geométrica", () => {
    expect(
      twoPileRotationAudit({ ...foundation, count: 3 }, result).available,
    ).toBe(false);
    expect(
      twoPileRotationAudit(foundation, { ...result, valid: false }).available,
    ).toBe(false);
    const c = structuredClone(result.verticalCompliance!);
    c[1][1] *= 1.1;
    expect(
      twoPileRotationAudit(foundation, { ...result, verticalCompliance: c })
        .available,
    ).toBe(false);
  });
});
