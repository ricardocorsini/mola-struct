import { describe, it, expect } from "vitest";
import {
  calculate,
  connectedLateralHead,
  lateralHead,
} from "../src/domain/engine";
import { reference16Project } from "../src/domain/benchmark16";
import { TF } from "../src/domain/methods";
import { layerAt } from "../src/domain/profile";
import {
  tietzValue,
  tietzLineReaction,
  sampledLateralProfile,
  nodalLateralHead,
  KGF_CM2_TO_KN_M2,
  KGF_CM3_TO_KN_M3,
  type TablePolicy,
} from "../scripts/diagnostics/tqs-crh";

describe("estudo dos coeficientes horizontais TQS, sem alterar o modelo ativo", () => {
  it("separa módulo de linha, pressão/deslocamento e mola nodal nas conversões CGS/SI", () => {
    // One kgf/cm² over one m² is 10,000 kgf; one kgf/cm³ is 1,000 tf/m³.
    expect(KGF_CM2_TO_KN_M2).toBeCloseTo((10000 * 9.80665) / 1000, 12);
    expect(KGF_CM3_TO_KN_M3).toBeCloseTo(1000 * TF, 12);
    const diameter = 0.3,
      length = 1,
      displacement = 0.001;
    const lineModule = 8 * KGF_CM2_TO_KN_M2,
      pressureCoefficient = lineModule / diameter;
    expect(pressureCoefficient * diameter * length * displacement).toBeCloseTo(
      lineModule * length * displacement,
      12,
    );
  });
  it("confere pontos tabelados e mantém distintas as três hipóteses entre linhas", () => {
    for (const policy of ["lower", "linear", "upper"] as const) {
      expect(tietzValue(6, "clay", policy)).toBe(300);
      expect(tietzValue(40, "granular", policy)).toBe(800);
      expect(tietzValue(35, "clay", policy)).toBe(900);
    }
    expect(tietzValue(4, "clay", "lower")).toBe(150);
    expect(tietzValue(4, "clay", "linear")).toBe(200);
    expect(tietzValue(4, "clay", "upper")).toBe(300);
    expect(() => tietzValue(0, "granular", "linear")).toThrow();
    expect(() => tietzValue(51, "granular", "linear")).toThrow();
  });
  it("a adaptação amostrada recompõe o caso manual e não altera o projeto de origem", () => {
    const p = reference16Project(),
      copy = structuredClone(p),
      f = p.foundations[0],
      base = calculate(p, f);
    const q = sampledLateralProfile(p, f, (z) => layerAt(p, z).kh * f.diameter),
      r = calculate(q, f);
    expect(r.valid).toBe(true);
    r.matrix.forEach((row, i) =>
      row.forEach((v, j) => expect(v).toBeCloseTo(base.matrix[i][j], 7)),
    );
    expect(p).toEqual(copy);
  });
  it("muda Kh sem trocar E, ν, Aoki–Velloso ou o bloco axial com topos rotulados", () => {
    const p = reference16Project(),
      f = { ...p.foundations[0], headConnection: "pinned" as const },
      base = calculate(p, f);
    for (const policy of ["lower", "linear", "upper"] as TablePolicy[]) {
      const q = sampledLateralProfile(p, f, tietzLineReaction(p, f, policy)),
        r = calculate(q, f);
      expect(r.valid).toBe(true);
      expect(r.diagonal[0]).toBeLessThan(base.diagonal[0]);
      expect(r.diagonal[2]).toBeCloseTo(base.diagonal[2], 8);
      expect(r.diagonal[4]).toBeCloseTo(base.diagonal[4], 8);
      expect(r.diagonal[3]).toBe(0);
      expect(r.shaft!).toBeCloseTo(base.shaft!, 9);
      expect(r.point!).toBeCloseTo(base.point!, 9);
      r.verticalCompliance!.forEach((row, i) =>
        row.forEach((v, j) =>
          expect(Math.abs(v / base.verticalCompliance![i][j] - 1)).toBeLessThan(
            1e-12,
          ),
        ),
      );
    }
  });
  it("fecha a unidade da lei SPT/m por cálculos manuais nas primeiras camadas", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      law = tietzLineReaction(p, f, "linear");
    // At z=1, N=6 in sand: m=275 tf/m⁴; at z=4, N=5 in clay: m=250.
    expect(law(1)).toBeCloseTo(275 * TF * 1 * 0.3, 10);
    expect(law(4)).toBeCloseTo(250 * TF * 4 * 0.3, 10);
    expect(law(16)).toBeCloseTo(900 * TF * 16 * 0.3, 10);
  });
  it("o modelo nodal refinado converge à solução analítica Winkler de reação uniforme", () => {
    const p = reference16Project(),
      f = { ...p.foundations[0], headConnection: "pinned" as const },
      lineModule = 5400;
    const ei = (f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64,
      beta = (lineModule / (4 * ei)) ** 0.25,
      exact = 2 * ei * beta ** 3;
    const coarse = connectedLateralHead(
      nodalLateralHead(p, f, () => lineModule, 16, "trapezoidal"),
      f,
    )[0][0];
    const fine = connectedLateralHead(
      nodalLateralHead(p, f, () => lineModule, 128, "trapezoidal"),
      f,
    )[0][0];
    expect(Math.abs(fine / exact - 1)).toBeLessThan(0.005);
    expect(Math.abs(fine / exact - 1)).toBeLessThan(
      Math.abs(coarse / exact - 1),
    );
    const homogeneous = {
      ...p,
      layers: [{ ...p.layers[0], bottom: 100, kh: lineModule / f.diameter }],
    };
    const consistent = connectedLateralHead(
      lateralHead(homogeneous, f),
      f,
    )[0][0];
    expect(Math.abs(consistent / exact - 1)).toBeLessThan(0.001);
  });
  it("distingue a malha nodal de 1 m da formulação consistente e bloqueia estudos incompletos", () => {
    const p = reference16Project(),
      f = { ...p.foundations[0], headConnection: "pinned" as const },
      law = tietzLineReaction(p, f, "linear");
    const node =
      (connectedLateralHead(nodalLateralHead(p, f, law, 16), f)[0][0] *
        f.count) /
      TF;
    const consistent =
      calculate(sampledLateralProfile(p, f, law), f).diagonal[0] / TF;
    expect(node).toBeGreaterThan(168.92);
    expect(node).toBeLessThan(consistent);
    expect(consistent).toBeGreaterThan(180);
    expect(consistent).toBeLessThan(185);
    expect(() => nodalLateralHead(p, { ...f, depth: 1 }, law, 16)).toThrow();
    expect(() => sampledLateralProfile(p, f, () => -1)).toThrow();
    const shortSoil = { ...p, layers: [{ ...p.layers[0], bottom: 3 }] };
    expect(() => sampledLateralProfile(shortSoil, f, law)).toThrow();
    expect(() =>
      tietzLineReaction({ ...p, spt: p.spt.slice(0, 3) }, f, "linear"),
    ).toThrow();
    const silt = {
      ...p,
      layers: p.layers.map((l) => ({ ...l, soil: "silt" as const })),
    };
    expect(() => tietzLineReaction(silt, f, "linear")(1)).toThrow();
  });
});
