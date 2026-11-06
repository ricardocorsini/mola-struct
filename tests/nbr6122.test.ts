import { describe, it, expect } from "vitest";
import { calculate } from "../src/domain/engine";
import {
  defaultFoundation,
  defaultVerification,
  exampleProject,
  parseProject,
  type Foundation,
  type Verification,
} from "../src/domain/model";
import {
  reviewFoundation,
  toeResistance,
  serviceResponse,
} from "../src/domain/nbr6122";
const p = () => ({ ...exampleProject(), bedrock: 16 });
const v = (): Verification => ({
  ...defaultVerification(),
  serviceConfirmed: true,
  serviceReference: "ELS de teste, característica",
  limitsReference: "Limites fictícios para testar o algoritmo",
  settlementLimit: 50,
  horizontalLimit: 5,
  rotationLimit: 5,
  ultimateBasis: "characteristic",
  ultimateReference: "ELU de teste, característico",
  ultimateN: 400,
  selfWeightIncluded: true,
  geotechnicalBasisConfirmed: true,
  soilRegime: "drained-effective",
  geotechnicalReference: "Parâmetros fictícios de teste",
  pileType: "driven",
  toeProcedure: "minimum",
  executionReference: "Simulação de declaração para teste",
});
const f = (kind: "pile" | "footing" = "pile"): Foundation => ({
  ...defaultFoundation("T", kind),
  capX: 2,
  capY: 2,
  hx: 0,
  my: 0,
  verification: v(),
});
const review = (foundation: Foundation) =>
  reviewFoundation(foundation, calculate(p(), foundation));
const item = (foundation: Foundation, id: string) =>
  review(foundation).items.find((i) => i.id === id)!;
describe("conferência parcial NBR 6122:2022", () => {
  it("não aprova rotação indeterminada nem vetor ELU com momento em mecanismo", () => {
    const foundation = { ...f(), headConnection: "pinned" as const };
    const initial = review(foundation);
    expect(initial.items.find((i) => i.id === "rotation")!.status).toBe(
      "pending",
    );
    expect(initial.items.find((i) => i.id === "compression")!.status).toBe(
      "pass",
    );
    foundation.verification.ultimateMx = 1;
    const incompatible = review(foundation);
    expect(
      incompatible.items.find((i) => i.id === "ultimate-equilibrium")!.status,
    ).toBe("fail");
    expect(
      incompatible.items.find((i) => i.id === "compression"),
    ).toBeUndefined();
    expect(incompatible.outcome).toBe("inconsistent");
  });
  it("não inventa limite de recalque nem declara conformidade integral", () => {
    const foundation = defaultFoundation(),
      r = review(foundation);
    expect(foundation.verification.settlementLimit).toBeNull();
    expect(r.outcome).toBe("partial");
    expect(r.items.find((i) => i.id === "settlement")!.status).toBe("pending");
    expect(r.items.find((i) => i.id === "ultimate-case")!.status).toBe(
      "pending",
    );
    expect(review(f()).outcome).toBe("partial");
  });
  it("declarações do usuário são diferenciadas dos critérios numéricos", () => {
    expect(item(f(), "service-case").status).toBe("declared");
    expect(item(f(), "ground").status).toBe("declared");
    expect(item(f(), "self-weight").status).toBe("declared");
    expect(item(f(), "settlement").status).toBe("pass");
  });
  it("ELS exige identificação das ações e justificativa do limite", () => {
    const foundation = f();
    foundation.verification.limitsReference = "";
    expect(item(foundation, "settlement").status).toBe("pending");
    foundation.verification.limitsReference = "Critério da obra";
    foundation.verification.serviceConfirmed = false;
    expect(item(foundation, "settlement").status).toBe("pending");
  });
  it("confere ELS em ambos os lados do limite e sinaliza descumprimento", () => {
    const foundation = f("footing"),
      r = calculate(p(), foundation),
      s = serviceResponse(foundation, r);
    foundation.verification.settlementLimit = s.vertical;
    expect(item(foundation, "settlement").status).toBe("pass");
    foundation.verification.settlementLimit = s.vertical / 2;
    expect(item(foundation, "settlement").status).toBe("fail");
    expect(review(foundation).outcome).toBe("inconsistent");
  });
  it("controle vertical de estacas inclui a cinemática da rotação do bloco", () => {
    const foundation = { ...f(), my: 100 };
    const r = calculate(p(), foundation);
    expect(serviceResponse(foundation, r).vertical).toBeGreaterThan(
      Math.abs(r.settlement),
    );
  });
  it("vetores ELS e ELU são independentes e não alteram a matriz de rigidez", () => {
    const foundation = f(),
      a = calculate(p(), foundation);
    foundation.verification.ultimateN = 9999;
    const b = calculate(p(), foundation);
    expect(b.matrix).toEqual(a.matrix);
    expect(b.displacement).toEqual(a.displacement);
    expect(item(foundation, "settlement").value).toBe(
      item(f(), "settlement").value,
    );
    expect(item(foundation, "compression").status).toBe("fail");
  });
  it("não majora novamente as ações ELU de cálculo e usa γm=1,4 para estacas", () => {
    const foundation = f();
    foundation.verification.ultimateBasis = "design";
    const r = calculate(p(), foundation),
      reviewed = reviewFoundation(foundation, r);
    expect(
      reviewed.metrics.find((m) => m.label.includes("Maior compressão"))!.value,
    ).toBeCloseTo(200, 7);
    expect(
      reviewed.metrics.find((m) =>
        m.label.startsWith("Resistência de referência"),
      )!.value,
    ).toBeCloseTo(r.ultimate! / 1.4, 7);
  });
  it("recupera reações de ELU do grupo rígido sob momento, em vez de N/n", () => {
    const foundation = { ...f(), pileMethod: "randolph" as const };
    foundation.verification.ultimateMy = 120;
    const r = review(foundation);
    expect(
      r.metrics.find((m) => m.label.includes("Maior compressão"))!.value,
    ).toBeCloseTo(300, 7);
    expect(
      r.metrics.find((m) => m.label.includes("Menor reação"))!.value,
    ).toBeCloseTo(100, 7);
  });
  it("recupera as mesmas reações para Winkler, Randolph e Mindlin com η", () => {
    for (const pileMethod of ["winkler", "randolph", "mindlin"] as const) {
      const foundation = {
        ...f(),
        pileMethod,
        count: 4 as const,
        capX: 3,
        capY: 3,
        efficiency: 0.8,
        hx: 10,
        my: 30,
      };
      foundation.verification = {
        ...foundation.verification,
        ultimateN: foundation.n,
        ultimateHx: foundation.hx,
        ultimateMy: foundation.my,
      };
      const r = calculate(p(), foundation),
        a = reviewFoundation(foundation, r);
      expect(
        a.metrics.find((m) => m.label.includes("Maior compressão"))!.value,
      ).toBeCloseTo(Math.max(...r.pileForces), 7);
    }
  });
  it("FSg simples de estacas não pode ser reduzido para 1,4 sem dados do método regional", () => {
    const foundation = f();
    foundation.verification.pileSafety = 1.4;
    const a = calculate(p(), foundation),
      r = reviewFoundation(foundation, a);
    expect(r.items.find((i) => i.id === "pile-factor")!.status).toBe("fail");
    expect(
      r.metrics.find((m) => m.label.startsWith("Carga admissível"))!.value,
    ).toBeCloseTo(a.ultimate! / 2, 8);
  });
  it("ponta CFA é limitada ao fuste nos procedimentos mínimos", () => {
    const a = { ...v(), pileType: "cfa" as const };
    expect(toeResistance(a, 1000, 3000).point).toBe(1000);
    expect(toeResistance(a, 1000, 500).point).toBe(500);
  });
  it("ponta ignorada é zero e ponta sem comprovação não é validada", () => {
    const a = { ...v(), pileType: "cfa" as const };
    expect(
      toeResistance({ ...a, toeProcedure: "ignored" }, 1000, 3000),
    ).toMatchObject({ point: 0, confirmed: true });
    expect(
      toeResistance({ ...a, toeProcedure: "unconfirmed" }, 1000, 3000),
    ).toMatchObject({ point: 0, confirmed: false });
  });
  it("não libera a exceção de procedimentos especiais sem modelo e comprovação de ponta em rocha", () => {
    expect(
      toeResistance(
        { ...v(), pileType: "bored-fluid", toeProcedure: "special" },
        1000,
        3000,
      ),
    ).toMatchObject({ point: 0, confirmed: false });
    expect(
      toeResistance(
        { ...v(), pileType: "cfa", toeProcedure: "special" },
        1000,
        3000,
      ),
    ).toMatchObject({ point: 0, confirmed: false });
  });
  it("aplica a limitação de ponta na resistência de ELU, preservando o resultado Aoki bruto", () => {
    const foundation = f(),
      a = calculate(p(), foundation);
    foundation.verification.pileType = "cfa";
    const b = calculate(p(), foundation),
      r = reviewFoundation(foundation, b);
    expect(a.point).toBe(b.point);
    expect(a.matrix).toEqual(b.matrix);
    expect(
      r.metrics.find((m) => m.label.startsWith("Carga admissível"))!.value,
    ).toBeCloseTo((b.shaft! + Math.min(b.point!, b.shaft!)) / 2, 8);
  });
  it("detecta incoerência entre ponta ignorada e transferência positiva em Mindlin", () => {
    const foundation = { ...f(), pileMethod: "mindlin" as const };
    foundation.verification.toeProcedure = "ignored";
    expect(item(foundation, "transfer").status).toBe("fail");
    foundation.transfer = "manual";
    foundation.tipFraction = 0;
    expect(item(foundation, "transfer").status).toBe("pending");
  });
  it("não considera η de rigidez como verificação da capacidade de grupo", () => {
    const foundation = {
      ...f(),
      pileMethod: "mindlin" as const,
      efficiency: 0.5,
    };
    expect(item(foundation, "group").status).toBe("pending");
  });
  it("aplica 60 cm à sapata, sem transferir essa exigência para bloco de coroamento", () => {
    const footing = { ...f("footing"), capX: 0.59 };
    expect(item(footing, "dimension").status).toBe("fail");
    const pile = {
      ...f(),
      count: 1 as const,
      diameter: 0.25,
      capX: 0.5,
      capY: 0.5,
    };
    expect(
      review(pile).items.find((i) => i.id === "dimension"),
    ).toBeUndefined();
  });
  it("sapata analítica usa FSg≥3 ou γm=2,15 segundo o regime", () => {
    const foundation = f("footing"),
      a = calculate(p(), foundation);
    foundation.safety = 2;
    let r = reviewFoundation(foundation, { ...a, qUltimate: 1200 });
    expect(r.items.find((i) => i.id === "footing-factor")!.status).toBe("fail");
    expect(
      r.metrics.find((m) => m.label.startsWith("Tensão admissível"))!.value,
    ).toBe(400);
    foundation.verification.ultimateBasis = "design";
    r = reviewFoundation(foundation, { ...a, qUltimate: 1200 });
    expect(
      r.metrics.find((m) => m.label.startsWith("Tensão resistente"))!.value,
    ).toBeCloseTo(1200 / 2.15, 9);
    expect(r.metrics.find((m) => m.label.startsWith("qmax"))!.value).toBe(100);
  });
  it("contato integral satisfaz a fração mínima em ambos os regimes", () => {
    const foundation = f("footing");
    expect(item(foundation, "compressed-area")).toMatchObject({
      status: "pass",
      value: 1,
      limit: 2 / 3,
    });
    foundation.verification.ultimateBasis = "design";
    expect(item(foundation, "compressed-area")).toMatchObject({
      status: "pass",
      value: 1,
      limit: 0.5,
    });
  });
  it("não inventa área comprimida quando a distribuição bilateral prevê tração", () => {
    const foundation = f("footing");
    foundation.verification.ultimateMy = 300;
    expect(item(foundation, "contact").status).toBe("fail");
    expect(item(foundation, "compressed-area")).toMatchObject({
      status: "pending",
    });
    expect(item(foundation, "compressed-area").value).toBeUndefined();
    expect(item(foundation, "compression").status).toBe("pending");
  });
  it("cargas horizontais não são aprovadas pela mera existência de Kh", () => {
    const foundation = f("footing");
    foundation.verification.ultimateHx = 30;
    expect(item(foundation, "compression").status).toBe("pending");
    expect(item(foundation, "horizontal-ultimate").status).toBe("pending");
  });
  it("tração, ISE global e efeitos de tempo não recebem aprovação", () => {
    const foundation = { ...f(), pileMethod: "randolph" as const };
    foundation.verification.ultimateMy = 1000;
    expect(item(foundation, "tension").status).toBe("pending");
    expect(item(foundation, "interaction").status).toBe("pending");
    expect(item(foundation, "long-term").status).toBe("pending");
  });
  it("resultado inválido bloqueia a conferência e não gera critérios atendidos", () => {
    const foundation = { ...f(), length: 50 },
      r = review(foundation);
    expect(r.outcome).toBe("blocked");
    expect(r.items.some((i) => i.status === "pass")).toBe(false);
    expect(r.metrics).toHaveLength(0);
  });
  it("JSON antigo sem conferência mantém resultados e não herda declarações de conformidade", () => {
    const project = exampleProject(),
      raw = JSON.parse(JSON.stringify(project));
    raw.foundations.forEach(
      (f: Record<string, unknown>) => delete f.verification,
    );
    const loaded = parseProject(JSON.stringify(raw));
    expect(loaded.foundations[0].verification).toEqual(defaultVerification());
    expect(calculate(loaded, loaded.foundations[0]).matrix).toEqual(
      calculate(project, project.foundations[0]).matrix,
    );
    expect(item(loaded.foundations[0], "service-case").status).toBe("pending");
  });
  it("distingue resistência bruta e admissível no caso do print com condição CFA", () => {
    const project = p();
    project.spt = [4, 6, 10, 12, 20, 39, 38, 38, 38, 38].map((n, i) => ({
      depth: i + 1,
      n,
    }));
    project.layers = [
      { ...project.layers[0], bottom: 5, alpha: 0.014, k: 980.665 },
      { ...project.layers[0], bottom: 10, alpha: 0.01, k: 980.665 },
    ];
    const foundation = {
      ...f(),
      diameter: 0.25,
      depth: 0,
      length: 5,
      f1: 4.2,
      f2: 3.9,
    };
    foundation.verification.pileType = "cfa";
    const raw = calculate(project, foundation),
      reviewed = reviewFoundation(foundation, raw);
    expect(raw.ultimate! / 9.80665).toBeCloseTo(38.035711, 5);
    expect(
      reviewed.metrics.find((m) => m.label.startsWith("RP considerado"))!
        .value / 9.80665,
    ).toBeCloseTo(14.660766, 5);
    expect(
      reviewed.metrics.find((m) => m.label.startsWith("Carga admissível"))!
        .value / 9.80665,
    ).toBeCloseTo(14.660766, 5);
  });
  it("não libera capacidade da sapata sem um regime declarado", () => {
    const foundation = f("footing");
    foundation.verification.soilRegime = "unset";
    expect(item(foundation, "soil-regime").status).toBe("pending");
    expect(item(foundation, "compression").status).toBe("pending");
  });
  it("não trata a rotina de tensões efetivas como análise não drenada total", () => {
    const foundation = f("footing");
    foundation.verification.soilRegime = "undrained-total";
    expect(item(foundation, "compression").status).toBe("pending");
    foundation.verification.soilRegime = "drained-effective";
    expect(item(foundation, "soil-regime").status).toBe("declared");
    expect(item(foundation, "compression").status).toBe("pass");
  });
  it("contato integral sob momento não valida os fatores de capacidade excêntrica ausentes", () => {
    const foundation = f("footing");
    foundation.verification.ultimateMy = 10;
    expect(item(foundation, "contact").status).toBe("pass");
    expect(item(foundation, "compression").status).toBe("pending");
  });
});
