/** Partial verification against the user-provided NBR 6122:2022.
 * No table of universal spring coefficients, certification or complete design is implied.
 * Stiffness is unchanged. ELU actions are independent of the service vector.
 */
import { pilePositions, type Foundation, type Verification } from "./model";
import { solve, solveSupported, dofNames } from "./matrix";
import type { Calculation } from "./engine";
export type ReviewStatus = "pass" | "fail" | "pending" | "na" | "declared";
export type ReviewItem = {
  id: string;
  title: string;
  clause: string;
  status: ReviewStatus;
  message: string;
  value?: number;
  limit?: number;
  unit?: string;
};
export type NbrReview = {
  standard: "ABNT NBR 6122:2022";
  outcome: "blocked" | "inconsistent" | "partial";
  items: ReviewItem[];
  metrics: { label: string; value: number; unit: string }[];
};
export const reviewLabels: Record<ReviewStatus, string> = {
  pass: "Critério atendido",
  fail: "Não atendido",
  pending: "Pendente",
  na: "Não aplicável",
  declared: "Declarado pelo usuário",
};
export type ToeResistance = {
  point: number;
  confirmed: boolean;
  message: string;
};
/** This is an ELU resistance convention, never an automatic t-z/q-z calibration. */
export function toeResistance(
  v: Verification,
  shaft: number,
  point: number,
): ToeResistance {
  if (v.pileType === "unspecified")
    return {
      point: 0,
      confirmed: false,
      message:
        "Informe tipo executivo e evidência da condição de ponta. Aoki–Velloso bruto não é carga admissível.",
    };
  if (v.toeProcedure === "ignored")
    return {
      point: 0,
      confirmed: true,
      message:
        "Parcela de ponta desconsiderada no ELU por opção explícita; não altera a transferência usada nas molas.",
    };
  if (v.pileType === "cfa" || v.pileType === "bored-fluid") {
    if (v.toeProcedure === "minimum")
      return {
        point: Math.min(point, shaft),
        confirmed: true,
        message:
          "Contato efetivo e procedimentos mínimos declarados: Rp considerado limitado a Rℓ (8.2.1.2; Anexo J, J.3.2).",
      };
    if (v.toeProcedure === "special" && v.pileType === "bored-fluid")
      return {
        point: 0,
        confirmed: false,
        message:
          "A exceção de 8.2.1.2 depende dos procedimentos especiais do Anexo J.3.3 (ponta em rocha). O modelo SPT atual não verifica rocha nem esses procedimentos: ponta sem limitação não liberada nesta conferência.",
      };
    return {
      point: 0,
      confirmed: false,
      message:
        "Contato não comprovado ou exceção incompatível com o tipo. Exceção de procedimentos especiais não foi estendida à hélice contínua. Referência conservadora com Rp=0.",
    };
  }
  if (v.toeProcedure === "minimum")
    return {
      point,
      confirmed: true,
      message:
        "Ponta Aoki–Velloso considerada para tipo declarado; técnica executiva, parâmetros F1/F2 e domínio do método exigem justificativa específica.",
    };
  return {
    point: 0,
    confirmed: false,
    message:
      "Declare a consideração da ponta e a justificativa executiva, ou opte explicitamente por desconsiderá-la.",
  };
}
export function serviceResponse(f: Foundation, r: Calculation) {
  const u = r.displacement;
  const vertical =
    f.kind === "pile"
      ? Math.max(
          ...pilePositions(f).map(([x, y]) =>
            Math.abs(u[2] + y * u[3] - x * u[4]),
          ),
        ) * 1000
      : Math.abs(u[2]) * 1000;
  return {
    vertical,
    horizontal: Math.hypot(u[0], u[1]) * 1000,
    rotation: Math.hypot(u[3], u[4], u[5]) * 1000,
  };
}
export function reviewFoundation(f: Foundation, r: Calculation): NbrReview {
  const v = f.verification,
    items: ReviewItem[] = [],
    metrics: NbrReview["metrics"] = [];
  const add = (
    id: string,
    title: string,
    clause: string,
    status: ReviewStatus,
    message: string,
    extra: Partial<ReviewItem> = {},
  ) => items.push({ id, title, clause, status, message, ...extra });
  const metric = (label: string, value: number, unit: string) =>
    metrics.push({ label, value, unit });
  const result = (outcome: NbrReview["outcome"]): NbrReview => ({
    standard: "ABNT NBR 6122:2022",
    outcome,
    items,
    metrics,
  });
  if (!r.valid) {
    add(
      "numerical",
      "Resultado numérico",
      "6.1",
      "pending",
      "Entradas ou solução inválidas: nenhum critério numérico foi liberado.",
    );
    return result("blocked");
  }
  add(
    "scope",
    "Alcance da conferência",
    "6.1; 6.2",
    "pending",
    "Conferência parcial de um modelo local. Não substitui projeto geotécnico/estrutural, combinações da NBR 8681, ensaios, execução e desempenho da obra.",
  );
  const serviceReady = v.serviceConfirmed && !!v.serviceReference.trim();
  const ultimateReady =
    v.ultimateBasis !== "unset" && !!v.ultimateReference.trim();
  const groundReady =
    v.geotechnicalBasisConfirmed && !!v.geotechnicalReference.trim();
  add(
    "service-case",
    "Identificação das ações de ELS",
    "5.1; 6.2.2.1",
    serviceReady ? "declared" : "pending",
    serviceReady
      ? `Vetor principal declarado como característico de serviço: ${v.serviceReference}`
      : "Confirme a origem e a combinação característica do vetor principal. Não se usam automaticamente as ações de ELU em ELS.",
  );
  add(
    "ultimate-case",
    "Identificação das ações de ELU",
    "5.1; 6.2.1",
    ultimateReady ? "declared" : "pending",
    ultimateReady
      ? `Vetor separado de ELU: ${v.ultimateBasis === "design" ? "valores de cálculo, sem nova majoração" : "valores característicos / segurança global"}. ${v.ultimateReference}`
      : "Informe combinação ELU em vetor separado e identifique se os valores são característicos ou de cálculo.",
  );
  add(
    "self-weight",
    "Peso próprio",
    "5.6",
    v.selfWeightIncluded ? "declared" : "pending",
    v.selfWeightIncluded
      ? "O usuário declara peso próprio do bloco/sapata incluído nos vetores aplicáveis. Nenhuma parcela foi somada automaticamente."
      : "Confirme o peso próprio incluído nas ações. A alternativa mínima da norma é 5% da parcela vertical permanente, não 5% de N total; o programa não conhece essa decomposição.",
  );
  add(
    "ground",
    "Base geotécnica e domínio do método",
    "4; 6.1.1; 7.2; 7.3; 8.2.2",
    groundReady ? "declared" : "pending",
    groundReady
      ? `Domínio e parâmetros declarados pelo projetista: ${v.geotechnicalReference}`
      : "Faltam rastreabilidade de ensaios, parâmetros característicos, regime de drenagem, domínio regional e efeitos da instalação. A norma não calibra E, kh, kt ou kp.",
  );
  const service = serviceResponse(f, r),
    limitsReady = !!v.limitsReference.trim();
  const limit = (
    id: string,
    title: string,
    value: number,
    bound: number | null,
    unit: string,
  ) => {
    const supplied = bound !== null;
    const status: ReviewStatus =
      !supplied || !serviceReady || !limitsReady
        ? "pending"
        : value <= bound + 1e-9
          ? "pass"
          : "fail";
    add(
      id,
      title,
      "6.2.2.1; 6.2.2.2",
      status,
      !supplied
        ? "Limite não informado. A NBR 6122 não fornece um limite universal para este deslocamento."
        : !serviceReady || !limitsReady
          ? "Há limite informado, mas faltam confirmação das ações ELS e justificativa do limite para a obra."
          : `Comparação do efeito previsto com limite justificado: ${v.limitsReference}. É um critério parcial do modelo.`,
      { value, limit: bound ?? undefined, unit },
    );
  };
  limit(
    "settlement",
    f.kind === "pile"
      ? "Deslocamento vertical absoluto máximo nos topos"
      : "Deslocamento vertical absoluto no centro",
    service.vertical,
    v.settlementLimit,
    "mm",
  );
  limit(
    "horizontal",
    "Translação horizontal resultante",
    service.horizontal,
    v.horizontalLimit,
    "mm",
  );
  if (r.freeDofs.length)
    add(
      "rotation",
      "Rotação resultante (X, Y, Z)",
      "6.2.2.1; 6.2.2.2",
      "pending",
      `Rotação indeterminada em ${r.freeDofs.map((i) => dofNames[i]).join(", ")}. O zero de referência do solver não permite verificar o limite. Inclua as restrições da estrutura para determinar a rotação.`,
    );
  else
    limit(
      "rotation",
      "Rotação resultante (X, Y, Z)",
      service.rotation,
      v.rotationLimit,
      "mrad",
    );
  add(
    "long-term",
    "Diferenciais, tempo e vizinhança",
    "6.2.2.2; 7.4; 8.2.2",
    "pending",
    "Não modelados adensamento, fluência, expansão, colapso ou recalques diferenciais da estrutura. As fundações do projeto podem ser alternativas de estudo; não são automaticamente apoios simultâneos de uma edificação.",
  );
  if (f.modulusSource === "aoki") {
    const expected =
      v.pileType === "driven"
        ? 6
        : v.pileType === "cfa"
          ? 4
          : v.pileType === "bored-fluid"
            ? 3
            : null;
    add(
      "aoki-source",
      "Coerência da correlação E0 com a execução",
      "8.2.2",
      expected === null
        ? "pending"
        : f.aokiFactor === expected
          ? "declared"
          : "fail",
      "Os fatores 6/4/3 são da correlação de Aoki (1984), não fatores impostos pela NBR. Confira a execução e o domínio da correlação; E0 não inclui atualização de Es por tensão.",
      { value: f.aokiFactor, limit: expected ?? undefined, unit: "—" },
    );
  }
  if (f.kind === "footing") {
    add(
      "soil-regime",
      "Regime da análise de capacidade",
      "7.3.2",
      v.soilRegime === "drained-effective" ? "declared" : "pending",
      v.soilRegime === "drained-effective"
        ? "Parâmetros efetivos/drenados declarados. O módulo Vésic usa pesos específicos efetivos com o nível d’água."
        : "A rotina Vésic atual usa tensões efetivas. Análise não drenada em tensões totais não está implementada; informe e justifique o regime antes de concluir a comparação.",
    );
    const b = Math.min(f.capX, f.capY);
    add(
      "dimension",
      "Dimensão mínima em planta",
      "7.7.1",
      b >= 0.6 ? "pass" : "fail",
      "Critério geométrico para sapata isolada. Não foi aplicado indevidamente a bloco de coroamento sobre estacas.",
      { value: b, limit: 0.6, unit: "m" },
    );
    add(
      "boundary",
      "Profundidade, divisa e estabilidade",
      "7.7.2; 6.2.1",
      "pending",
      "Sem informação de divisas, fundações vizinhas, declividade, flutuação, deslizamento e tombamento; não verificados.",
    );
    if (v.ultimateBasis === "characteristic")
      add(
        "footing-factor",
        "Fator global — capacidade analítica sem provas de carga",
        "6.2.1.1.1; Tabela 1",
        f.safety >= 3 ? "pass" : "fail",
        "Para a situação sem provas de carga implementada: FSg mínimo 3. A redução com ensaios não está automatizada. Fator efetivo da conferência nunca menor que 3.",
        { value: f.safety, limit: 3, unit: "—" },
      );
    if (ultimateReady) {
      const area = f.capX * f.capY,
        ix = (f.capX * f.capY ** 3) / 12,
        iy = (f.capY * f.capX ** 3) / 12;
      const delta =
        (Math.abs(v.ultimateMx) * f.capY) / (2 * ix) +
        (Math.abs(v.ultimateMy) * f.capX) / (2 * iy);
      const qMin = v.ultimateN / area - delta,
        qMax = v.ultimateN / area + delta;
      metric("qmin ELU — distribuição bilateral", qMin, "kPa");
      metric("qmax ELU — distribuição bilateral", qMax, "kPa");
      const contact = qMin >= -1e-9 && v.ultimateN > 0;
      add(
        "contact",
        "Solo sem resistência à tração",
        "7.6.2",
        contact ? "pass" : v.ultimateN > 0 ? "fail" : "pending",
        contact
          ? "Distribuição toda comprimida. Acomp/A=1 satisfaz o mínimo do regime escolhido."
          : "A distribuição bilateral não permite concluir a área de contato real. Resolver contato unilateral; não descartar pressões negativas para inventar Acomp/A.",
        { value: qMin, limit: 0, unit: "kPa" },
      );
      add(
        "compressed-area",
        "Área comprimida mínima",
        "7.6.2",
        contact ? "pass" : "pending",
        `Mínimo ${v.ultimateBasis === "characteristic" ? "2/3 para ações características" : "1/2 para ações de cálculo"}. ${contact ? "Contato integral conferido no modelo." : "Área efetiva não calculada enquanto houver levantamento ou ausência de compressão."}`,
        contact
          ? {
              value: 1,
              limit: v.ultimateBasis === "characteristic" ? 2 / 3 : 0.5,
              unit: "Acomp/A",
            }
          : {},
      );
      const divisor =
          v.ultimateBasis === "design" ? 2.15 : Math.max(3, f.safety),
        capacity = (r.qUltimate ?? 0) / divisor;
      metric(
        v.ultimateBasis === "design"
          ? "Tensão resistente de referência (γm=2,15)"
          : "Tensão admissível de referência (FSg≥3)",
        capacity,
        "kPa",
      );
      const supported =
        contact &&
        groundReady &&
        v.soilRegime === "drained-effective" &&
        v.ultimateMx === 0 &&
        v.ultimateMy === 0 &&
        v.ultimateHx === 0 &&
        v.ultimateHy === 0;
      add(
        "compression",
        "Comparação parcial de pressão máxima",
        "6.2.1.1.1; 7.3.2; 7.6.2",
        !supported ? "pending" : qMax <= capacity ? "pass" : "fail",
        "Vésic permanece uma aproximação com fatores de inclinação, profundidade e outros unitários. Comparação restrita às hipóteses declaradas; cargas horizontais, momentos de tombamento, regime não drenado e perda de contato impedem esta conferência. Valores de cálculo não recebem majoração adicional.",
        { value: qMax, limit: capacity, unit: "kPa" },
      );
      if (v.ultimateHx !== 0 || v.ultimateHy !== 0)
        add(
          "horizontal-ultimate",
          "Inclinação e resistência horizontal",
          "7.2; 7.6.3",
          "pending",
          "Kh=μhKz é rigidez; μh não é um coeficiente de resistência ao deslizamento. Resistência passiva e cisalhamento não foram dimensionados.",
        );
    }
  } else {
    const toe = toeResistance(v, r.shaft ?? 0, r.point ?? 0);
    const executionReady = toe.confirmed && !!v.executionReference.trim();
    add(
      "toe",
      "Processo executivo e parcela de ponta no ELU",
      "8.2.1.2; Anexos J/N",
      executionReady ? "declared" : "pending",
      `${toe.message} ${v.executionReference}`,
    );
    metric("RP Aoki–Velloso bruto", r.point ?? 0, "kN/estaca");
    metric("RP considerado na conferência ELU", toe.point, "kN/estaca");
    const divisor =
      v.ultimateBasis === "design" ? 1.4 : Math.max(2, v.pileSafety);
    const resistance = ((r.shaft ?? 0) + toe.point) / divisor;
    metric(
      v.ultimateBasis === "design"
        ? "Resistência de referência por estaca (γm=1,4)"
        : "Carga admissível de referência por estaca (FSg≥2)",
      resistance,
      "kN/estaca",
    );
    if (v.ultimateBasis === "characteristic")
      add(
        "pile-factor",
        "Fator global — método semiempírico sem tratamento regional",
        "6.2.1.2.1",
        v.pileSafety >= 2 ? "pass" : "fail",
        "FSg mínimo 2 na via simples implementada. Não confundir F1/F2 de Aoki–Velloso com FSg. Reduções por provas de carga ou fatores ξ não são aplicadas sem seus dados e condições.",
        { value: v.pileSafety, limit: 2, unit: "—" },
      );
    if (ultimateReady) {
      try {
        const u = solveSupported(r.matrix, [
          v.ultimateHx,
          v.ultimateHy,
          -v.ultimateN,
          v.ultimateMx,
          v.ultimateMy,
          v.ultimateMz,
        ]);
        const head = pilePositions(f).map(
          ([x, y]) => -(u[2] + y * u[3] - x * u[4]),
        );
        const reactions = r.verticalCompliance
          ? solve(r.verticalCompliance, head).map((n) => n * f.efficiency)
          : head.map((d) => (d * r.diagonal[2]) / f.count);
        const maximum = Math.max(...reactions),
          minimum = Math.min(...reactions);
        metric("Maior compressão em estaca — ELU", maximum, "kN");
        metric("Menor reação axial — ELU", minimum, "kN");
        add(
          "compression",
          "Comparação parcial de compressão por estaca",
          "6.2.1.2.1; 8.2.1.2",
          !groundReady || !executionReady
            ? "pending"
            : maximum <= resistance
              ? "pass"
              : "fail",
          "Usa as reações da matriz global com o vetor ELU separado, não N/n quando há momentos. Não verifica resistência estrutural da estaca ou resistência última do grupo.",
          { value: maximum, limit: resistance, unit: "kN" },
        );
        add(
          "tension",
          "Tração nas estacas",
          "8.4.1",
          minimum < -1e-8 ? "pending" : "na",
          minimum < -1e-8
            ? "Há reação de tração: resistência de arrancamento/aderência e ligação com bloco não foram verificadas."
            : "Sem reação axial de tração neste vetor ELU.",
          { value: minimum, unit: "kN" },
        );
      } catch (error) {
        add(
          "ultimate-equilibrium",
          "Equilíbrio do vetor ELU",
          "6.1; 6.2.1",
          "fail",
          error instanceof Error
            ? error.message
            : "Vetor ELU incompatível com a rigidez da fundação isolada.",
        );
      }
    }
    if (f.pileMethod === "mindlin") {
      const beta =
        r.details.find((d) => d.label === "Fração de carga na ponta")?.value ??
        0;
      const ignored =
        v.toeProcedure === "ignored" ||
        ((v.pileType === "cfa" || v.pileType === "bored-fluid") &&
          v.toeProcedure === "unconfirmed");
      add(
        "transfer",
        "Coerência entre ponta e transferência do modelo",
        "8.2.1.2; 8.2.2",
        ignored && beta > 1e-10 ? "fail" : "pending",
        ignored && beta > 1e-10
          ? "O modelo de recalque ainda transfere carga à ponta embora ela esteja desconsiderada/não assegurada no ELU. Revise a transferência (por exemplo, βp=0) e calibre em ensaio. A conferência de capacidade não altera as molas silenciosamente."
          : "Frações fixas de carga e coeficientes do solo exigem calibração. Limitação de RP no ELU não define por si só a mobilização no ELS.",
        { value: beta, unit: "—" },
      );
    }
    if (f.count > 1)
      add(
        "group",
        "Resistência e recalque de grupo",
        "8.3",
        "pending",
        f.pileMethod === "mindlin"
          ? "Interação elástica vertical incluída. Falta verificar a capacidade da sapata hipotética na camada de suporte; η de rigidez não realiza essa verificação."
          : "Molas independentes não representam interação vertical do grupo. Falta análise de recalque do grupo e capacidade da sapata hipotética.",
      );
    add(
      "pile-other",
      "Atrito negativo, esforços transversais e estrutura",
      "5.8; 8.4; 8.6",
      "pending",
      "Sem dimensionamento para atrito negativo, efeito de carregamento lateral do terreno, capacidade flexional e ligação estaca–bloco.",
    );
  }
  if (
    (f.kind === "pile" && f.pileMethod === "mindlin") ||
    (f.kind === "footing" && f.footingMethod === "mindlin")
  )
    add(
      "rigid-base",
      "Justificativa da base indeslocável",
      "6.1.1; 7.2; 8.2.2",
      "pending",
      "A profundidade de deslocamento nulo é hipótese geotécnica do modelo. Recusa no SPT não comprova essa condição. Justifique a cota e estude a sensibilidade dos recalques.",
    );
  add(
    "interaction",
    "Interação fundação–estrutura global",
    "5.5",
    "pending",
    "Molas locais não executam a análise global da edificação. Avaliar obrigatoriedade, sensibilidade e redistribuição dos esforços com o modelo estrutural.",
  );
  return result(
    items.some((i) => i.status === "fail") ? "inconsistent" : "partial",
  );
}
/** Human-readable persisted inputs for both the screen report and PDF. */
export function verificationEntries(f: Foundation): [string, string][] {
  const v = f.verification,
    number = (n: number | null, unit: string) =>
      n === null ? "Não informado" : `${n} ${unit}`,
    yes = (b: boolean) => (b ? "Declarado" : "Não declarado");
  return [
    ["Ações principais confirmadas como ELS", yes(v.serviceConfirmed)],
    ["Origem da combinação de serviço", v.serviceReference || "Não informada"],
    ["Limite vertical absoluto", number(v.settlementLimit, "mm")],
    ["Limite horizontal resultante", number(v.horizontalLimit, "mm")],
    ["Limite de rotação resultante", number(v.rotationLimit, "mrad")],
    ["Justificativa dos limites", v.limitsReference || "Não informada"],
    [
      "Regime de ELU",
      {
        unset: "Não informado",
        characteristic: "Valores característicos / segurança global",
        design: "Valores de cálculo / coeficiente de resistência",
      }[v.ultimateBasis],
    ],
    ["Origem da combinação última", v.ultimateReference || "Não informada"],
    [
      "Vetor ELU (N, Hx, Hy)",
      `${v.ultimateN}; ${v.ultimateHx}; ${v.ultimateHy} kN`,
    ],
    [
      "Vetor ELU (Mx, My, Mz)",
      `${v.ultimateMx}; ${v.ultimateMy}; ${v.ultimateMz} kN·m`,
    ],
    ["Peso próprio incluído", yes(v.selfWeightIncluded)],
    [
      "Domínio e parâmetros geotécnicos conferidos pelo usuário",
      yes(v.geotechnicalBasisConfirmed),
    ],
    ["Base geotécnica", v.geotechnicalReference || "Não informada"],
    [
      "Regime da capacidade da sapata",
      {
        unset: "Não informado",
        "drained-effective": "Drenado / tensões efetivas",
        "undrained-total": "Não drenado / tensões totais (não implementado)",
      }[v.soilRegime],
    ],
    ...(f.kind === "pile"
      ? ([
          [
            "Tipo executivo",
            {
              unspecified: "Não informado",
              driven: "Cravada",
              cfa: "Hélice contínua",
              "bored-fluid": "Escavada com fluido",
              other: "Outro — justificar",
            }[v.pileType],
          ],
          [
            "Condição de ponta no ELU",
            {
              unconfirmed: "Sem comprovação",
              ignored: "Desconsiderada",
              minimum: "Procedimento aplicável declarado",
              special: "Procedimentos especiais — Anexo J",
            }[v.toeProcedure],
          ],
          ["Evidência executiva", v.executionReference || "Não informada"],
          ["FSg de compressão adotado", String(v.pileSafety)],
        ] as [string, string][])
      : ([["FSg de compressão adotado", String(f.safety)]] as [
          string,
          string,
        ][])),
  ];
}
