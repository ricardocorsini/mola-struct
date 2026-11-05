import { describe, it, expect } from "vitest";
import { calculate } from "../src/domain/engine";
import {
  defaultFoundation,
  exampleProject,
  parseProject,
  type Foundation,
} from "../src/domain/model";
import {
  mindlinVertical,
  footingCompliance,
  effectiveProfile,
  randolphAxial,
  safeKv,
  TF,
} from "../src/domain/methods";
function soil() {
  const p = exampleProject();
  p.bedrock = 16;
  return p;
}
function uniform() {
  const p = soil();
  p.layers = [{ ...p.layers[0], bottom: 1e8 }];
  p.bedrock = 1e8;
  return p;
}
const pile = (): Foundation => ({
  ...defaultFoundation(),
  pileMethod: "mindlin",
  hx: 0,
  my: 0,
});
describe("fontes TQS, Mindlin e Steinbrenner", () => {
  it("Mindlin recupera Boussinesq em superfície e em profundidade", () => {
    const e = 20000,
      nu = 0.3;
    for (const [r, z] of [
      [2, 0],
      [2, 3],
      [0, 3],
    ]) {
      const R = Math.hypot(r, z),
        exact =
          ((1 + nu) / (2 * Math.PI * e)) *
          ((2 * (1 - nu)) / R + (z * z) / R ** 3);
      expect(mindlinVertical(r, z, 0, e, nu)).toBeCloseTo(exact, 14);
    }
  });
  it("núcleo homogêneo satisfaz reciprocidade e proporcionalidade 1/E", () => {
    expect(mindlinVertical(2, 4, 7, 20000, 0.3)).toBeCloseTo(
      mindlinVertical(2, 7, 4, 20000, 0.3),
      14,
    );
    expect(mindlinVertical(2, 4, 7, 40000, 0.3) * 2).toBeCloseTo(
      mindlinVertical(2, 4, 7, 20000, 0.3),
      14,
    );
    expect(() => mindlinVertical(0, 3, 3, 20000, 0.3)).toThrow();
  });
  it("sapata retangular superficial coincide com integração analítica de Boussinesq", () => {
    const p = uniform(),
      f = {
        ...defaultFoundation("S", "footing"),
        footingMethod: "mindlin" as const,
        depth: 0,
        capX: 2,
        capY: 4,
      };
    const a = f.capX / 2,
      b = f.capY / 2,
      l = p.layers[0];
    const exact =
      (((1 - l.nu * l.nu) / (Math.PI * l.e * 1000)) *
        (a * Math.asinh(b / a) + b * Math.asinh(a / b))) /
      (a * b);
    expect(Math.abs(footingCompliance(p, f) / exact - 1)).toBeLessThan(1e-7);
  });
  it("Steinbrenner telescopa em camadas idênticas e base mais rasa reduz recalque", () => {
    const p = uniform(),
      f = {
        ...defaultFoundation("S", "footing"),
        footingMethod: "mindlin" as const,
        depth: 1,
      };
    p.bedrock = 16;
    p.layers[0].bottom = 16;
    const a = footingCompliance(p, f),
      l = p.layers[0];
    p.layers = [
      { ...l, bottom: 3 },
      { ...l, bottom: 7 },
      { ...l, bottom: 16 },
    ];
    expect(footingCompliance(p, f)).toBeCloseTo(a, 13);
    p.bedrock = 8;
    expect(footingCompliance(p, f)).toBeLessThan(a);
  });
  it("encurtamento EA é exato quando toda a carga segue para a ponta", () => {
    const p = soil(),
      f = {
        ...pile(),
        transfer: "manual" as const,
        tipFraction: 1,
        count: 1 as const,
      };
    const r = calculate(p, f);
    expect(r.valid).toBe(true);
    const c = r.details.find((v) => v.label.startsWith("Encurtamento"))!.value;
    expect(c).toBeCloseTo(
      f.length / ((f.ec * 1e6 * Math.PI * f.diameter ** 2) / 4),
      14,
    );
  });
  it("grupo Mindlin tem flexibilidade mútua, simetria e equilíbrio para 1 a 4 estacas", () => {
    const p = soil();
    for (const count of [1, 2, 3, 4] as const) {
      const f = {
        ...pile(),
        count,
        capY: 3,
        hx: 12,
        hy: 5,
        mx: 3,
        my: 10,
        mz: 2,
      };
      const r = calculate(p, f);
      expect(r.valid, r.notices.map((n) => n.message).join("\n")).toBe(true);
      const forces = [f.hx, f.hy, -f.n, f.mx, f.my, f.mz];
      for (let i = 0; i < 6; i++) {
        expect(
          r.matrix[i].reduce((s, k, j) => s + k * r.displacement[j], 0),
        ).toBeCloseTo(forces[i], 6);
        for (let j = 0; j < 6; j++)
          expect(r.matrix[i][j]).toBeCloseTo(r.matrix[j][i], 7);
      }
      expect(r.pileForces.reduce((a, b) => a + b, 0)).toBeCloseTo(f.n, 6);
      if (count > 1) expect(r.verticalCompliance![0][1]).toBeGreaterThan(0);
    }
    const single = calculate(p, { ...pile(), count: 1 }),
      two = calculate(p, pile());
    expect(two.diagonal[2]).toBeLessThan(2 * single.diagonal[2]);
  });
  it("integração Mindlin converge com refinamento e é independente da amplitude de carga", () => {
    const p = soil(),
      f = pile();
    const a = calculate(p, { ...f, integration: 8, segments: 32 }),
      b = calculate(p, { ...f, integration: 16, segments: 64 }),
      c = calculate(p, { ...f, integration: 32, segments: 64 });
    expect(a.valid && b.valid && c.valid).toBe(true);
    expect(Math.abs(b.diagonal[2] / c.diagonal[2] - 1)).toBeLessThan(0.005);
    expect(Math.abs(a.diagonal[2] / c.diagonal[2] - 1)).toBeLessThan(0.02);
    const twice = calculate(p, { ...f, n: 2 * f.n });
    expect(twice.diagonal[2]).toBeCloseTo(calculate(p, f).diagonal[2], 8);
    expect(twice.settlement).toBeCloseTo(2 * calculate(p, f).settlement, 8);
  });
  it("reproduz as capacidades do print em tf, sem calibrar rigidezes para coincidir", () => {
    const p = soil();
    p.spt = [4, 6, 10, 12, 20, 39, 38, 38, 38, 38].map((n, i) => ({
      depth: i + 1,
      n,
    }));
    p.layers = [
      { ...p.layers[0], bottom: 5, alpha: 0.014, k: 100 * TF },
      { ...p.layers[0], bottom: 10, alpha: 0.01, k: 100 * TF },
    ];
    const f = {
      ...defaultFoundation(),
      diameter: 0.25,
      depth: 0,
      length: 5,
      f1: 4.2,
      f2: 3.9,
    };
    const r = calculate(p, f);
    expect(r.valid).toBe(true);
    expect((r.shaft! / TF).toFixed(1)).toBe("14.7");
    expect((r.point! / TF).toFixed(1)).toBe("23.4");
    expect((r.ultimate! / TF).toFixed(1)).toBe("38.0");
  });
  it("Randolph simplificado reproduz a expressão publicada e o braço do grupo de 2 estacas", () => {
    const p = uniform(),
      f = {
        ...defaultFoundation(),
        pileMethod: "randolph" as const,
        hx: 0,
        my: 0,
      },
      l = p.layers[0];
    const G = (l.e * 1000) / (2 * (1 + l.nu)),
      radius = f.diameter / 2,
      zeta = Math.log((2.5 * f.length * (1 - l.nu)) / radius),
      m = (Math.sqrt((2 * G) / (zeta * f.ec * 1e6)) * f.length) / radius;
    const expected = (((2 * Math.PI * f.length * G) / zeta) * Math.tanh(m)) / m;
    expect(randolphAxial(p, f).axial).toBeCloseTo(expected, 7);
    const r = calculate(p, f);
    expect(r.valid).toBe(true);
    expect(r.diagonal[2]).toBeCloseTo(2 * expected, 7);
    expect(r.diagonal[0]).toBeCloseTo(f.horizontalRatio * r.diagonal[2], 7);
    expect(r.diagonal[4]).toBeCloseTo((r.diagonal[2] * f.spacingX ** 2) / 4, 7);
    expect(r.diagonal[3]).toBeCloseTo(
      (2 * 1.5 * f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64 / f.length,
      7,
    );
  });
  it("SAFE converte kgf/cm² e kgf/cm³ e bloqueia extrapolação", () => {
    const expected = (-0.0257 + 0.2294 - 0.6517 + 2.5467 + 0.1083) * 9806.65;
    expect(safeKv(98.0665)).toBeCloseTo(expected, 7);
    expect(() => safeKv(20)).toThrow();
    expect(() => safeKv(400)).toThrow();
    const p = soil(),
      f = {
        ...defaultFoundation("S", "footing"),
        footingMethod: "safe" as const,
        allowablePressure: 98.0665,
      };
    const r = calculate(p, f);
    expect(r.valid).toBe(true);
    expect(r.diagonal[2]).toBeCloseTo(expected * f.capX * f.capY, 7);
  });
  it("SPT usa K_E independente de K Aoki e preserva E manual", () => {
    const p = soil();
    p.layers = [{ ...p.layers[0], bottom: 4, schmertmannK: 0.7 }];
    p.spt = [
      { depth: 1, n: 4 },
      { depth: 4, n: 8 },
    ];
    const f = defaultFoundation();
    expect(effectiveProfile(p, f)).toBe(p);
    const e = effectiveProfile(p, { ...f, modulusSource: "spt" }).layers[0].e;
    expect(e).toBeCloseTo((3 * 0.7 * (4 + 3 * 8)) / 4, 12);
    p.layers[0].k *= 5;
    expect(
      effectiveProfile(p, { ...f, modulusSource: "spt" }).layers[0].e,
    ).toBe(e);
  });
  it("bloqueia camada ausente sob ponta, fração sem fuste e E SPT nulo", () => {
    const p = exampleProject(),
      f = pile();
    expect(calculate(p, f).valid).toBe(false);
    p.bedrock = 16;
    p.layers.forEach((l) => (l.alpha = 0));
    expect(
      calculate(p, { ...f, transfer: "manual", tipFraction: 0.5 }).valid,
    ).toBe(false);
    p.spt.forEach((s) => (s.n = 0));
    expect(calculate(p, { ...f, modulusSource: "spt" }).valid).toBe(false);
  });
  it("arquivos v1 sem novos campos mantêm os métodos legados e importam novos seletores", () => {
    const p = exampleProject(),
      raw = JSON.parse(JSON.stringify(p));
    for (const f of raw.foundations)
      for (const key of [
        "pileMethod",
        "footingMethod",
        "modulusSource",
        "horizontalRatio",
        "kvInput",
        "allowablePressure",
        "randolphRho",
        "integration",
        "transfer",
        "tipFraction",
      ])
        delete f[key];
    for (const l of raw.layers) delete l.schmertmannK;
    const old = parseProject(JSON.stringify(raw));
    expect(old.foundations[0].pileMethod).toBe("winkler");
    expect(old.foundations[2].footingMethod).toBe("elastic");
    expect(calculate(old, old.foundations[0]).matrix).toEqual(
      calculate(p, p.foundations[0]).matrix,
    );
    p.foundations[0] = pile();
    expect(parseProject(JSON.stringify(p)).foundations[0].pileMethod).toBe(
      "mindlin",
    );
  });
});
