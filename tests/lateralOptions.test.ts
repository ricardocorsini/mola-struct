import { describe, it, expect } from "vitest";
import { calculate } from "../src/domain/engine";
import { reference16Project } from "../src/domain/benchmark16";
import {
  defaultLateral,
  defaultLayerCrh,
  lateralOptions,
  parseProject,
  type Foundation,
  serializeProject,
} from "../src/domain/model";
import {
  lateralLaw,
  layerCoefficients,
  lateralEntries,
} from "../src/domain/lateral";
import { TF } from "../src/domain/methods";
import { matrixCsv } from "../src/files";
import { defaultMTable } from "../src/domain/crhCatalog";

function reference(source: "manual" | "terzaghi" | "tietz" = "tietz") {
  const p = reference16Project();
  p.layers = p.layers.map((l, i) => ({
    ...l,
    crh: {
      ...defaultLayerCrh(),
      preset: i === 0 ? "sand-loose" : i === 1 ? "clay-medium" : "clay-hard",
    },
  }));
  p.foundations[0] = {
    ...p.foundations[0],
    headConnection: "pinned",
    lateral: { ...defaultLateral(), source },
  };
  return p;
}
describe("configuração de CRH por fundação", () => {
  it("mantém projetos antigos no modo manual consistente", () => {
    const p = reference16Project(),
      old = JSON.parse(JSON.stringify(p));
    old.foundations.forEach((f: Record<string, unknown>) => delete f.lateral);
    const loaded = parseProject(JSON.stringify(old)),
      f = loaded.foundations[0];
    expect(lateralOptions(f).source).toBe("manual");
    expect(lateralOptions(f).discretization).toBe("consistent");
    expect(calculate(loaded, f).matrix).toEqual(
      calculate(p, p.foundations[0]).matrix,
    );
  });
  it("reproduz os dois ensaios publicados de SPT/m pelo motor ativo", () => {
    const p = reference(),
      f = p.foundations[0],
      c = calculate(p, f),
      n = calculate(p, {
        ...f,
        lateral: { ...f.lateral!, discretization: "nodal" },
      });
    expect(c.valid).toBe(true);
    expect(n.valid).toBe(true);
    expect(c.diagonal[0] / TF).toBeCloseTo(182.10293184055845, 7);
    expect(n.diagonal[0] / TF).toBeCloseTo(174.96424197214586, 7);
    expect(n.diagonal[2]).toBe(c.diagonal[2]);
    expect(n.diagonal[4]).toBe(c.diagonal[4]);
    expect(n.diagonal[3]).toBe(0);
    expect(n.freeDofs).toEqual([3]);
  });
  it.each([
    ["lower", 131.94589392101915],
    ["linear", 174.96424197214586],
    ["upper", 195.41668971473416],
  ] as const)(
    "permite escolher regra %s sem mudar o modelo axial",
    (interpolation, expected) => {
      const p = reference(),
        f = p.foundations[0];
      f.lateral = { ...f.lateral!, interpolation, discretization: "nodal" };
      const r = calculate(p, f);
      expect(r.valid).toBe(true);
      expect(r.diagonal[0] / TF).toBeCloseTo(expected, 7);
      expect(r.diagonal[4] / TF).toBeCloseTo(4937.736874722538, 7);
    },
  );
  it("troca a versão K/nh com conversões explícitas, sem alterar capacidade ou Kz", () => {
    const p = reference("terzaghi"),
      f = p.foundations[0],
      a = calculate(p, f);
    const modern = {
        ...f,
        lateral: { ...f.lateral!, tableVersion: "tqs-3836" as const },
      },
      b = calculate(p, modern);
    expect(a.valid).toBe(true);
    expect(b.valid).toBe(true);
    expect(layerCoefficients(p.layers[1], f)).toEqual({ law: "k", k: 784.532 });
    expect(layerCoefficients(p.layers[1], modern)).toEqual({
      law: "k",
      k: 800,
    });
    expect(a.diagonal[0] / TF).toBeCloseTo(330.8759544814863, 7);
    expect(b.diagonal[0]).toBeGreaterThan(a.diagonal[0]);
    expect(b.diagonal[2]).toBe(a.diagonal[2]);
    expect(b.ultimate).toBe(a.ultimate);
  });
  it("respeita seco/submerso e bloqueia valores ausentes na referência", () => {
    const p = reference("terzaghi"),
      f = p.foundations[0];
    f.lateral!.tableVersion = "tqs-3836";
    const wet = calculate({ ...p, water: 0 }, f),
      dry = calculate({ ...p, water: 100 }, f);
    expect(dry.diagonal[0]).toBeGreaterThan(wet.diagonal[0]);
    p.layers[0].crh!.preset = "silt-very-loose";
    expect(calculate(p, f).valid).toBe(false);
    expect(calculate({ ...p, water: 0 }, f).valid).toBe(true);
  });
  it("adota K e nh personalizados sem confundir com kh de pressão/deslocamento", () => {
    const p = reference("terzaghi"),
      f = p.foundations[0];
    p.layers[0].crh = { ...defaultLayerCrh(), preset: "custom-k", k: 1234 };
    expect(lateralLaw(p, f)(1)).toBe(1234);
    p.layers[0].crh = {
      ...defaultLayerCrh(),
      preset: "custom-nh",
      nhDry: 2000,
      nhWet: 500,
    };
    expect(lateralLaw(p, f)(0.5)).toBe(1000);
    expect(lateralLaw(p, f)(2)).toBe(1000);
    expect(calculate(p, f).valid).toBe(true);
  });
  it("mantém a origem z e o nível d'água como escolhas independentes", () => {
    const p = reference(),
      f = { ...p.foundations[0], depth: 1 };
    expect(lateralLaw(p, f)(2)).toBeCloseTo(
      2 *
        lateralLaw(p, {
          ...f,
          lateral: { ...f.lateral!, depthReference: "cap" },
        })(2),
      9,
    );
  });
  it("permite tabela m personalizada, restauração e rejeita extrapolação e pontos repetidos", () => {
    const p = reference(),
      f = p.foundations[0],
      base = calculate(p, f);
    f.lateral = {
      ...f.lateral!,
      mTableSource: "custom",
      clayTable: f.lateral!.clayTable,
      granularTable: f.lateral!.granularTable.map(([n, m]) => [n, 2 * m]),
    };
    expect(calculate(p, f).diagonal[0]).toBeGreaterThan(base.diagonal[0]);
    expect(
      calculate(p, { ...f, lateral: { ...f.lateral!, mTableSource: "tqs" } })
        .diagonal[0],
    ).toBe(base.diagonal[0]);
    f.lateral!.clayTable = defaultMTable("clay");
    expect(calculate(p, f).valid).toBe(false);
    f.lateral!.clayTable = [
      [0, 25],
      [0, 50],
      [100, 900],
    ];
    expect(calculate(p, f).valid).toBe(false);
  });
  it("registra e restaura configurações e associações no JSON, CSV e memória", () => {
    const p = reference("terzaghi"),
      f = p.foundations[0],
      restored = parseProject(serializeProject(p));
    expect(restored.version).toBe(2);
    expect(restored.foundations[0].lateral).toEqual(f.lateral);
    expect(restored.layers[0].crh).toEqual(p.layers[0].crh);
    const rows = lateralEntries(p, f);
    expect(rows.some(([a, b]) => a.includes("CRH") && b.includes("nh"))).toBe(
      true,
    );
    expect(matrixCsv(f, calculate(p, f))).toContain("tqs-3829");
  });
  it("limita a malha e exige associações sem aplicar CRH ao Randolph/sapata", () => {
    const p = reference("terzaghi"),
      f = p.foundations[0];
    p.layers[0].crh!.preset = "unset";
    expect(calculate(p, f).valid).toBe(false);
    expect(calculate(p, { ...f, pileMethod: "randolph" }).valid).toBe(true);
    expect(calculate(p, { ...f, kind: "footing" }).valid).toBe(true);
    expect(
      calculate(p, {
        ...f,
        lateral: {
          ...defaultLateral(),
          discretization: "nodal",
          nodalStep: 0.1,
        },
      }).valid,
    ).toBe(false);
  });
  it("fecha equilíbrio global e momentos de topo para as três fontes e duas malhas", () => {
    for (const source of ["manual", "terzaghi", "tietz"] as const)
      for (const discretization of ["consistent", "nodal"] as const) {
        const p = reference(source),
          f: Foundation = {
            ...p.foundations[0],
            hx: 3,
            hy: 5,
            my: 10,
            mz: 2,
            lateral: { ...p.foundations[0].lateral!, discretization },
          };
        const r = calculate(p, f);
        expect(r.valid).toBe(true);
        const load = [f.hx, f.hy, -f.n, f.mx, f.my, f.mz];
        r.matrix.forEach((row, i) =>
          expect(
            row.reduce((s, k, j) => s + k * r.displacement[j], 0),
          ).toBeCloseTo(load[i], 7),
        );
        expect(r.pileForces[1] - r.pileForces[0]).toBeCloseTo(
          (2 * f.my) / f.spacingX,
          7,
        );
        expect(r.pileMoments).toEqual([
          [0, 0],
          [0, 0],
        ]);
      }
  });
});
