import { describe, it, expect } from "vitest";
import {
  assemblePileGroup,
  barHead,
  calculate,
  lateralHead,
  parseSpt,
  solve,
  zeros,
} from "../src/domain/engine";
import {
  defaultFoundation,
  exampleProject,
  parseProject,
  pilePositions,
} from "../src/domain/model";
import { geometryDxf, matrixCsv, sectionSvg, sptCsv } from "../src/files";
const homogeneous = () => {
  const p = exampleProject();
  p.layers = [
    { ...p.layers[0], bottom: 30, kh: 18000, shaftK: 16000, baseK: 100000 },
  ];
  p.spt = Array.from({ length: 30 }, (_, i) => ({ depth: i + 1, n: 10 }));
  p.bedrock = 40;
  return p;
};
describe("molas de fundação - referências independentes", () => {
  it("solve usa pivotamento e conserva o equilíbrio", () => {
    expect(
      solve(
        [
          [0, 2],
          [1, 3],
        ],
        [4, 7],
      ),
    ).toEqual([1, 2]);
  });
  it("Aoki–Velloso coincide com integração manual em solo uniforme", () => {
    const p = homogeneous(),
      f = defaultFoundation(),
      r = calculate(p, f);
    const l = p.layers[0];
    expect(r.valid).toBe(true);
    expect(r.shaft).toBeCloseTo(
      (Math.PI * f.diameter * l.alpha * l.k * 10 * f.length) / f.f2,
      8,
    );
    expect(r.point).toBeCloseTo(
      (((Math.PI * f.diameter ** 2) / 4) * l.k * 10) / f.f1,
      8,
    );
  });
  it("capacidade não muda ao variar kh, kt ou kp", () => {
    const p = homogeneous(),
      f = defaultFoundation(),
      a = calculate(p, f);
    p.layers[0].kh *= 2;
    p.layers[0].shaftK *= 2;
    p.layers[0].baseK *= 2;
    const b = calculate(p, f);
    expect(b.ultimate).toBe(a.ultimate);
    expect(b.diagonal[2]).toBeGreaterThan(a.diagonal[2]);
  });
  it("barra axial converge à solução analítica com mola de ponta", () => {
    const p = homogeneous(),
      f = { ...defaultFoundation(), segments: 64 },
      l = p.layers[0],
      ea = (f.ec * 1e6 * Math.PI * f.diameter ** 2) / 4,
      k = l.shaftK * Math.PI * f.diameter,
      lambda = Math.sqrt(k / ea),
      toe = (l.baseK * Math.PI * f.diameter ** 2) / 4,
      a = ea * lambda,
      t = Math.tanh(lambda * f.length);
    const exact = (a * (t + toe / a)) / (1 + (toe / a) * t);
    expect(Math.abs(barHead(p, f) / exact - 1)).toBeLessThan(0.0003);
  });
  it("barra torsional converge à solução analítica de ponta livre", () => {
    const p = homogeneous(),
      f = { ...defaultFoundation(), segments: 64 },
      l = p.layers[0],
      r = f.diameter / 2,
      gj = (((f.ec * 1e6) / (2 * (1 + f.concreteNu))) * Math.PI * r ** 4) / 2,
      k = l.shaftK * 2 * Math.PI * r ** 3,
      lambda = Math.sqrt(k / gj);
    const exact = gj * lambda * Math.tanh(lambda * f.length);
    expect(Math.abs(barHead(p, f, true) / exact - 1)).toBeLessThan(0.0003);
  });
  it("viga longa coincide com solução de Winkler semi-infinita", () => {
    const p = homogeneous(),
      f = { ...defaultFoundation(), length: 16, segments: 64 },
      ei = (f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64,
      beta = ((p.layers[0].kh * f.diameter) / (4 * ei)) ** 0.25,
      k = lateralHead(p, f);
    expect(Math.abs(k[0][0] / (4 * ei * beta ** 3) - 1)).toBeLessThan(0.001);
    expect(Math.abs(k[0][1] / (2 * ei * beta ** 2) - 1)).toBeLessThan(0.001);
    expect(Math.abs(k[1][1] / (2 * ei * beta) - 1)).toBeLessThan(0.001);
  });
  it("matriz de grupo é simétrica, positiva e reproduz o vetor de ações", () => {
    const p = exampleProject(),
      f = p.foundations[1],
      r = calculate(p, f);
    expect(r.valid).toBe(true);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        expect(r.matrix[i][j]).toBeCloseTo(r.matrix[j][i], 7);
    const v = [0.01, -0.02, 0.03, 0.001, -0.002, 0.003];
    let energy = 0;
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++) energy += v[i] * r.matrix[i][j] * v[j];
    expect(energy).toBeGreaterThan(0);
    const force = [f.hx, f.hy, -f.n, f.mx, f.my, f.mz];
    r.matrix.forEach((row, i) =>
      expect(
        row.reduce((sum, k, j) => sum + k * r.displacement[j], 0),
      ).toBeCloseTo(force[i], 6),
    );
    expect(r.pileForces.reduce((a, b) => a + b, 0)).toBeCloseTo(f.n, 6);
  });
  it("mudança de espaçamento soma kz x² à rigidez de rotação", () => {
    const f = defaultFoundation(),
      local = zeros(6);
    local[2][2] = 100;
    local[4][4] = 10;
    const k = assemblePileGroup(f, local);
    expect(k[4][4]).toBeCloseTo(20 + 2 * 100 * (f.spacingX / 2) ** 2, 10);
  });
  it("arranjo triangular tem centroide na origem", () => {
    const pos = pilePositions({ ...defaultFoundation(), count: 3 });
    expect(pos.reduce((a, v) => a + v[0], 0)).toBeCloseTo(0, 10);
    expect(pos.reduce((a, v) => a + v[1], 0)).toBeCloseTo(0, 10);
  });
  it("sapata quadrada tem rotações iguais e Kz analítico do disco de mesma área", () => {
    const p = homogeneous(),
      f = {
        ...defaultFoundation("S", "footing"),
        capX: 2,
        capY: 2,
        hx: 0,
        my: 0,
      },
      r = calculate(p, f),
      l = p.layers[0],
      g = (l.e * 1000) / (2 * (1 + l.nu));
    expect(r.valid).toBe(true);
    expect(r.diagonal[2]).toBeCloseTo(
      (4 * g * Math.sqrt(4 / Math.PI)) / (1 - l.nu),
      7,
    );
    expect(r.diagonal[3]).toBeCloseTo(r.diagonal[4], 10);
    expect(r.settlement).toBeCloseTo((f.n / r.diagonal[2]) * 1000, 8);
  });
  it("Vésic tem limite finito para phi=0 e verifica solução manual", () => {
    const p = homogeneous();
    p.layers[0].phi = 0;
    p.layers[0].cohesion = 50;
    p.water = 30;
    const f = {
        ...defaultFoundation("S", "footing"),
        capX: 2,
        capY: 2,
        hx: 0,
        my: 0,
      },
      r = calculate(p, f),
      nc = Math.PI + 2;
    expect(r.qUltimate).toBeCloseTo(50 * nc * (1 + 1 / nc) + 18 * f.depth, 7);
  });
  it("elevação do NA reduz capacidade Vésic e não altera E informado", () => {
    const p = homogeneous(),
      f = defaultFoundation("S", "footing");
    p.water = 30;
    const dry = calculate(p, f);
    p.water = 0;
    const wet = calculate(p, f);
    expect(wet.qUltimate!).toBeLessThan(dry.qUltimate!);
    expect(wet.diagonal[2]).toBe(dry.diagonal[2]);
  });
  it("bloqueia perfil e SPT insuficientes, sem extrapolar", () => {
    const p = exampleProject(),
      f = { ...defaultFoundation(), length: 22 };
    const r = calculate(p, f);
    expect(r.valid).toBe(false);
    expect(r.notices.some((n) => n.message.includes("insuficient"))).toBe(true);
  });
  it("bloqueia coeficientes não físicos, sobreposição e cotas fora de ordem", () => {
    const p = exampleProject(),
      f = defaultFoundation();
    p.layers[0].nu = 0.5;
    expect(calculate(p, f).valid).toBe(false);
    p.layers[0].nu = 0.3;
    expect(calculate(p, { ...f, spacingX: 0.1 }).valid).toBe(false);
    p.layers[1].bottom = 2;
    expect(calculate(p, f).valid).toBe(false);
  });
  it("sinaliza perda de contato sem aprovar a sapata", () => {
    const p = exampleProject(),
      f = { ...p.foundations[2], my: 1000 };
    const r = calculate(p, f);
    expect(r.qMin!).toBeLessThan(0);
    expect(r.notices.some((n) => n.message.includes("perda de contato"))).toBe(
      true,
    );
  });
  it("identifica tração nas estacas sob momento elevado", () => {
    const p = exampleProject(),
      r = calculate(p, { ...p.foundations[0], my: 3000 });
    expect(r.pileForces.some((n) => n < 0)).toBe(true);
    expect(r.notices.some((n) => n.message.includes("tração"))).toBe(true);
  });
});
describe("contratos de arquivos", () => {
  it("JSON versionado preserva exatamente os dados e rejeita versões desconhecidas", () => {
    const p = exampleProject();
    expect(parseProject(JSON.stringify(p))).toEqual(p);
    expect(() => parseProject(JSON.stringify({ ...p, version: 2 }))).toThrow();
  });
  it("SPT exportado faz round-trip com decimais pt-BR", () => {
    const p = exampleProject();
    p.spt[0].depth = 0.5;
    expect(parseSpt(sptCsv(p))).toEqual(p.spt);
    expect(parseSpt("1\t4\n2\t6")).toEqual([
      { depth: 1, n: 4 },
      { depth: 2, n: 6 },
    ]);
    expect(() => parseSpt("1;4\n1;6")).toThrow();
    expect(() => parseSpt("1;2;3")).toThrow();
  });
  it("CSV preserva seis linhas e termos de acoplamento", () => {
    const p = exampleProject(),
      f = p.foundations[0],
      r = calculate(p, f),
      csv = matrixCsv(f, r);
    expect(csv.split("\r\n")).toHaveLength(8);
    expect(csv).toContain("theta_y");
    expect(csv).toContain(r.matrix[0][4].toFixed(6).replace(".", ","));
  });
  it("SVG e DXF contêm a geometria atual, cotas e identificação", () => {
    const p = exampleProject(),
      f = p.foundations[0];
    expect(sectionSvg(p, f)).toContain("CORTE GEOTÉCNICO");
    expect(sectionSvg(p, f, true)).toContain("PLANTA DE LOCAÇÃO");
    const dxf = geometryDxf(f);
    expect(dxf.match(/\nCIRCLE\n/g)).toHaveLength(f.count);
    expect(dxf).toContain("$INSUNITS\n70\n6");
    expect(dxf.endsWith("0\nEOF\n")).toBe(true);
  });
});
