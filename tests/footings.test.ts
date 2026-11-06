import { describe, it, expect } from "vitest";
import { calculate } from "../src/domain/engine";
import {
  continuumParameters,
  halfspaceSprings,
  teixeiraAlpha,
} from "../src/domain/footing";
import { effectiveProfile, TF, methodNarrative } from "../src/domain/methods";
import {
  footingBenchmarkTable,
  footingReference,
  footingReferenceProject,
} from "../src/domain/benchmarkFootings";
import {
  parseProject,
  serializeProject,
  defaultFoundation,
} from "../src/domain/model";
import { matrixCsv } from "../src/files";

describe("sapatas · meio contínuo FEMA 273 e Teixeira–Godoy", () => {
  it.each(footingReference)(
    "reproduz os seis GDL do print para %i cm",
    (cm, kh, kz, kr, kt) => {
      const p = footingReferenceProject(),
        f = p.foundations.find((f) => f.id === `S${cm}`)!,
        r = calculate(p, f);
      expect(r.valid).toBe(true);
      expect(r.e).toBeCloseTo(12.25, 12);
      expect(r.nu).toBe(0.35);
      [kh, kh, kz, kr, kr, kt].forEach((v, i) => {
        expect(Math.abs(r.diagonal[i] / TF - v)).toBeLessThan(0.05);
        expect((r.diagonal[i] / TF).toFixed(1)).toBe(v.toFixed(1));
      });
      expect(r.settlement).toBeCloseTo(10000 / (r.diagonal[2] / TF), 10);
      expect(
        r.matrix.every((row, i) => row.every((v, j) => i === j || v === 0)),
      ).toBe(true);
    },
  );
  it("usa Es não arredondado: explica a última casa do print", () => {
    const p = footingReferenceProject(),
      f = p.foundations.at(-1)!;
    const full = calculate(p, f).diagonal[5] / TF;
    p.layers[0].e = (1249.15 * TF) / 1000;
    const rounded =
      calculate(p, { ...f, modulusSource: "manual" }).diagonal[5] / TF;
    expect(full.toFixed(1)).toBe("2675.3");
    expect(rounded.toFixed(1)).toBe("2675.2");
    expect(Math.abs(full - rounded) / full).toBeLessThan(0.000003);
  });
  it("retângulo troca corretamente rotações X/Y e mantém translações/torção", () => {
    const a = halfspaceSprings(2, 4, 12.25, 0.35),
      b = halfspaceSprings(4, 2, 12.25, 0.35);
    [0, 1, 2, 5].forEach((i) =>
      expect(a.diagonal[i]).toBeCloseTo(b.diagonal[i], 10),
    );
    expect(a.diagonal[3]).toBeCloseTo(b.diagonal[4], 10);
    expect(a.diagonal[4]).toBeCloseTo(b.diagonal[3], 10);
    expect(a.diagonal[3] / a.diagonal[4]).toBeCloseTo(2 ** 1.5, 12);
    expect(a.rx).not.toBe(a.ry);
  });
  it("rigidezes escalam com E e com dimensão linear ou cúbica", () => {
    const a = halfspaceSprings(1, 1.5, 12, 0.35),
      e = halfspaceSprings(1, 1.5, 24, 0.35),
      d = halfspaceSprings(2, 3, 12, 0.35);
    a.diagonal.forEach((v, i) => {
      expect(e.diagonal[i] / v).toBeCloseTo(2, 12);
      expect(d.diagonal[i] / v).toBeCloseTo(i < 3 ? 2 : 8, 12);
    });
    expect(d.kv / a.kv).toBeCloseTo(0.5, 12);
  });
  it("fatores de embutimento permanecem unitários e rigidez independe da carga", () => {
    const p = footingReferenceProject(),
      f = p.foundations[4],
      a = calculate(p, f),
      b = calculate(p, {
        ...f,
        depth: 2,
        n: 20 * TF,
        hx: 5,
        hy: 7,
        mx: 2,
        my: 3,
        mz: 4,
      });
    expect(b.valid).toBe(true);
    expect(b.matrix).toEqual(a.matrix);
    const loads = [5, 7, -20 * TF, 2, 3, 4];
    b.matrix.forEach((row, i) =>
      expect(row.reduce((s, v, j) => s + v * b.displacement[j], 0)).toBeCloseTo(
        loads[i],
        10,
      ),
    );
  });
  it("apoio sobre interface usa camada inferior; homogeneização é explícita", () => {
    const p = footingReferenceProject(),
      f = { ...p.foundations[4], depth: 1, modulusSource: "manual" as const };
    p.layers = [
      { ...p.layers[0], bottom: 1, e: 5, nu: 0.2 },
      { ...p.layers[0], id: "baixo", bottom: 50, e: 20, nu: 0.4 },
    ];
    expect(continuumParameters(p, f)).toMatchObject({ e: 20, nu: 0.4 });
    const a = calculate(p, f);
    expect(a.e).toBe(20);
    const c = continuumParameters(p, {
      ...f,
      depth: 0,
      footingSoil: "equivalent",
    });
    expect(c.e).toBeCloseTo(8, 12);
    expect(c.nu).toBeCloseTo(0.3, 12);
    expect(calculate(p, { ...f, depth: 0 }).e).toBe(5);
  });
  it("correlação TG é específica, personalizável e separada dos coeficientes de capacidade", () => {
    const p = footingReferenceProject(),
      f = p.foundations[4],
      l = p.layers[0];
    expect(effectiveProfile(p, f).layers[0].e).toBeCloseTo(12.25, 12);
    expect(
      effectiveProfile(p, { ...f, modulusSource: "spt" }).layers[0].e,
    ).toBeCloseTo(7.35, 12);
    p.layers[0] = { ...l, alpha: 0.99, k: 2000, teixeiraAlpha: 4 };
    expect(effectiveProfile(p, f).layers[0].e).toBeCloseTo(9.8, 12);
    expect(
      teixeiraAlpha({ ...l, teixeiraAlpha: undefined, soil: "sand" }),
    ).toBe(3);
    expect(
      teixeiraAlpha({ ...l, teixeiraAlpha: undefined, soil: "clay" }),
    ).toBe(7);
    expect(() =>
      teixeiraAlpha({ ...l, teixeiraAlpha: undefined, soil: "fill" }),
    ).toThrow();
    expect(teixeiraAlpha({ ...l, soil: "fill", teixeiraAlpha: 6 })).toBe(6);
    expect(
      calculate(p, { ...defaultFoundation(), modulusSource: "teixeira" }).valid,
    ).toBe(false);
  });
  it("NSPT médio ponderado respeita intervalos não inteiros", () => {
    const p = footingReferenceProject(),
      f = p.foundations[4];
    p.layers[0].bottom = 2.5;
    p.spt = [
      { depth: 1, n: 4 },
      { depth: 3, n: 10 },
    ];
    expect(effectiveProfile(p, f).layers[0].e).toBeCloseTo(
      (5 * 0.35 * (4 + 1.5 * 10)) / 2.5,
      12,
    );
  });
  it("distingue rotações contínuas do legado Winkler, preservando as translações", () => {
    const p = footingReferenceProject(),
      f = p.foundations[4],
      a = calculate(p, f),
      b = calculate(p, { ...f, footingMethod: "elastic" });
    [0, 1, 2].forEach((i) =>
      expect(a.diagonal[i]).toBeCloseTo(b.diagonal[i], 10),
    );
    expect(a.diagonal[3] / b.diagonal[3]).toBeGreaterThan(2.6);
    expect(a.diagonal[5] / b.diagonal[5]).toBeGreaterThan(2);
    expect(a.notices.some((n) => n.message.includes("punção rígido"))).toBe(
      true,
    );
  });
  it("salva seletores, parâmetros, memória e CSV sem perder precisão", () => {
    const p = footingReferenceProject(),
      f = p.foundations[4],
      q = parseProject(serializeProject(p)),
      r = calculate(q, q.foundations[4]);
    expect(q.foundations[4].footingMethod).toBe("halfspace");
    expect(q.layers[0].teixeiraAlpha).toBe(5);
    expect(r.matrix).toEqual(calculate(p, f).matrix);
    expect(matrixCsv(f, r)).toContain("FEMA 273");
    expect(matrixCsv(f, r)).toContain("rθx");
    expect(methodNarrative(f).join(" ")).toContain("Teixeira–Godoy");
    expect(footingBenchmarkTable(q).every((row) => row.match)).toBe(true);
    q.layers[0].teixeiraAlpha = 3;
    expect(footingBenchmarkTable(q).every((row) => !row.match)).toBe(true);
  });
  it("Mindlin–Steinbrenner também admite TG, com Kz crescente com E", () => {
    const p = footingReferenceProject(),
      f = { ...p.foundations[4], footingMethod: "mindlin" as const },
      a = calculate(p, f);
    p.layers[0].teixeiraAlpha = 10;
    const b = calculate(p, f);
    expect(a.valid).toBe(true);
    expect(b.diagonal[2] / a.diagonal[2]).toBeCloseTo(2, 11);
  });
  it("bloqueia parâmetros não físicos em vez de ajustar silenciosamente", () => {
    expect(() => halfspaceSprings(1, 0, 12, 0.35)).toThrow();
    expect(() => halfspaceSprings(1, 1, NaN, 0.35)).toThrow();
    expect(() => halfspaceSprings(1, 1, 12, 0.5)).toThrow();
  });
});
