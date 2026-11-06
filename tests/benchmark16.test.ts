import { describe, expect, it } from "vitest";
import { calculate } from "../src/domain/engine";
import {
  axialContribution,
  axialDiagnostics,
  concreteSensitivity16,
  initialModuli16,
  reference16,
  reference16Comparison,
  reference16Project,
  referenceInputDifferences,
} from "../src/domain/benchmark16";
import {
  aokiInitialModulus,
  effectiveProfile,
  TF,
} from "../src/domain/methods";
import {
  defaultFoundation,
  exampleProject,
  parseProject,
} from "../src/domain/model";
import { reviewFoundation } from "../src/domain/nbr6122";

describe("referência externa: duas estacas Ø30 cm, ponta a 16 m", () => {
  it("preserva os 20 registros, N11=17 e as unidades transcritas", () => {
    const p = reference16Project(),
      f = p.foundations[0];
    expect(p.spt.map((s) => s.n)).toEqual([
      6, 3, 4, 5, 6, 6, 8, 9, 12, 14, 17, 15, 12, 12, 22, 35, 35, 36, 38, 40,
    ]);
    expect(f.depth + f.length).toBe(16);
    expect(f.n / TF).toBeCloseTo(40, 12);
    expect(p.layers.slice(0, 3).map((l) => l.k / TF)).toEqual([70, 22, 33]);
    expect(p.layers.map((l) => l.e)).toEqual([140, 88, 370, 370]);
    expect(effectiveProfile(p, f)).toBe(p);
    expect(referenceInputDifferences(p, f)).toEqual([]);
  });
  it("confere RL, RP e Ru independentes na precisão de 0,1 tf do print", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      r = calculate(p, f);
    expect(r.valid).toBe(true);
    // Hand integration: ΣN = 13 (0–3), 77 (3–11), 96 (11–16); Np=35.
    const rl =
      ((Math.PI * 0.3) / 4) *
      (0.024 * 70 * 13 + 0.04 * 22 * 77 + 0.03 * 33 * 96);
    const rp = (((Math.PI * 0.3 ** 2) / 4) * 33 * 35) / 2;
    expect(r.shaft! / TF).toBeCloseTo(rl, 10);
    expect(r.point! / TF).toBeCloseTo(rp, 10);
    expect(
      [r.shaft!, r.point!, r.ultimate!].map((v) => (v / TF).toFixed(1)),
    ).toEqual(["43.5", "40.8", "84.3"]);
    expect(
      reference16Comparison(p, f, r)
        .slice(0, 3)
        .map((row) => row.status),
    ).toEqual(["match", "match", "match"]);
  });
  it("mantém as rigidezes como não confirmadas e distingue o recalque deduzido", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      r = calculate(p, f);
    const rows = reference16Comparison(p, f, r);
    expect(rows.slice(3).every((row) => row.status === "conditional")).toBe(
      true,
    );
    expect(rows.find((row) => row.id === "kz")!.expected).toBe(21538.54);
    expect(rows.find((row) => row.id === "kz")!.differencePercent).toBeCloseTo(
      5.5639187,
      5,
    );
    expect(rows.find((row) => row.id === "settlement")!.expected).toBeCloseTo(
      (40 / 21538.54) * 1000,
      12,
    );
    expect(reference16.rx).toBe(0);
    expect(reference16.ry / reference16.kz).toBeCloseTo(0.9 ** 2 / 4, 4);
  });
  it("detecta alterações no SPT e aplica N11 somente ao fuste correspondente", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      a = calculate(p, f);
    p.spt[10].n = 16;
    const b = calculate(p, f);
    expect((a.shaft! - b.shaft!) / TF).toBeCloseTo(
      (Math.PI * 0.3 * 0.04 * 22) / 4,
      10,
    );
    expect(a.point).toBe(b.point);
    expect(referenceInputDifferences(p, f).join(" ")).toContain("NSPT(11)");
  });
  it("Ec altera a rigidez e o recalque, preservando a capacidade", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      a = calculate(p, f),
      b = calculate(p, { ...f, ec: 26 });
    expect(b.diagonal[2]).toBeLessThan(a.diagonal[2]);
    expect(b.settlement).toBeGreaterThan(a.settlement);
    expect(b.ultimate).toBe(a.ultimate);
    const study = concreteSensitivity16(p, f);
    expect(study.map((s) => s.ec)).toEqual([26, 28, 30, 32]);
    expect(study.every((s) => s.valid)).toBe(true);
  });
  it("não prolonga solo nem SPT silenciosamente até o indeslocável de 100 m", () => {
    const p = reference16Project(),
      f = p.foundations[0];
    p.layers.pop();
    const missing = calculate(p, f);
    expect(missing.valid).toBe(false);
    expect(missing.notices.some((n) => n.message.includes("100.00 m"))).toBe(
      true,
    );
    expect(
      reference16Comparison(p, f, missing).every(
        (row) => row.status === "blocked",
      ),
    ).toBe(true);
    const complete = reference16Project();
    const noSpt = calculate(complete, { ...f, modulusSource: "aoki" });
    expect(noSpt.valid).toBe(false);
    expect(
      noSpt.notices.some((n) => n.message.includes("SPT até 100.00 m")),
    ).toBe(true);
  });
  it("separa a contribuição BᵀC⁻¹B sem alterar a matriz ativa", () => {
    const f = { ...defaultFoundation(), spacingX: 0.9 };
    const c = [
        [0.01, 0.002],
        [0.002, 0.01],
      ],
      copy = structuredClone(c);
    const group = axialContribution(f, c),
      independent = axialContribution(f, c, true);
    expect(group[0][0]).toBeCloseTo(2 / 0.012, 10);
    expect(group[1][1]).toBe(0);
    expect(group[2][2]).toBeCloseTo((2 * 0.45 ** 2) / 0.008, 10);
    expect(independent[0][0]).toBeCloseTo(200, 10);
    expect(independent[2][2] / independent[0][0]).toBeCloseTo(0.2025, 12);
    expect(c).toEqual(copy);
    const p = reference16Project(),
      r = calculate(p, p.foundations[0]),
      matrix = structuredClone(r.matrix);
    expect(axialDiagnostics(p.foundations[0], r)).toHaveLength(2);
    expect(r.matrix).toEqual(matrix);
  });
});

describe("E0 inicial de Aoki (1984), fatores da foto", () => {
  it("converte K em kPa/golpe para E0 em MPa nos fatores 6/4/3", () => {
    expect(aokiInitialModulus(700, 10, 6)).toBe(42);
    expect(aokiInitialModulus(700, 10, 4)).toBe(28);
    expect(aokiInitialModulus(700, 10, 3)).toBe(21);
    const table = initialModuli16(reference16Project());
    expect(table[0].mean).toBeCloseTo(13 / 3, 12);
    expect(table[0].driven).toBeCloseTo((6 * 70 * TF * 13) / 3 / 1000, 12);
    expect(table.map((t) => t.manual)).toEqual([140, 88, 370]);
  });
  it("usa K_AV e média por espessura, sem usar K_E nem sobrescrever E manual", () => {
    const p = exampleProject(),
      f = { ...defaultFoundation(), modulusSource: "aoki" as const };
    p.layers = [{ ...p.layers[0], bottom: 4, k: 700, schmertmannK: 999 }];
    p.spt = [
      { depth: 1, n: 4 },
      { depth: 4, n: 8 },
    ];
    const oldE = p.layers[0].e;
    expect(effectiveProfile(p, f).layers[0].e).toBeCloseTo(
      (6 * 700 * (4 + 3 * 8)) / 4 / 1000,
      12,
    );
    p.layers[0].schmertmannK = 0.1;
    expect(effectiveProfile(p, f).layers[0].e).toBeCloseTo(29.4, 12);
    expect(p.layers[0].e).toBe(oldE);
  });
  it("bloqueia sapata, fator inválido e E0 nulo", () => {
    const p = exampleProject();
    p.bedrock = 16;
    expect(
      calculate(p, {
        ...defaultFoundation("S", "footing"),
        modulusSource: "aoki",
      }).valid,
    ).toBe(false);
    const raw = JSON.parse(JSON.stringify(p));
    raw.foundations[0].aokiFactor = 5;
    expect(() => parseProject(JSON.stringify(raw))).toThrow();
    p.spt.forEach((s) => (s.n = 0));
    expect(
      calculate(p, { ...defaultFoundation(), modulusSource: "aoki" }).valid,
    ).toBe(false);
  });
  it("preserva projetos antigos e verifica a coerência com o tipo executivo declarado", () => {
    const p = exampleProject(),
      raw = JSON.parse(JSON.stringify(p));
    raw.foundations.forEach(
      (f: Record<string, unknown>) => delete f.aokiFactor,
    );
    const old = parseProject(JSON.stringify(raw));
    expect(old.foundations[0].aokiFactor).toBe(6);
    expect(calculate(old, old.foundations[0]).matrix).toEqual(
      calculate(p, p.foundations[0]).matrix,
    );
    p.bedrock = 16;
    const f = { ...defaultFoundation(), modulusSource: "aoki" as const };
    f.verification = { ...f.verification, pileType: "cfa" };
    expect(
      reviewFoundation(f, calculate(p, f)).items.find(
        (i) => i.id === "aoki-source",
      )!.status,
    ).toBe("fail");
    const matching = { ...f, aokiFactor: 4 as const };
    expect(
      reviewFoundation(matching, calculate(p, matching)).items.find(
        (i) => i.id === "aoki-source",
      )!.status,
    ).toBe("declared");
  });
});
