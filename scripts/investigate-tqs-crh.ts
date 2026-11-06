import { mkdirSync, writeFileSync } from "node:fs";
import {
  calculate,
  connectedLateralHead,
  ENGINE_VERSION,
} from "../src/domain/engine";
import { reference16, reference16Project } from "../src/domain/benchmark16";
import { TF } from "../src/domain/methods";
import { layerAt, sptAt } from "../src/domain/profile";
import {
  CRH_SOURCE,
  PILE_SOURCE,
  clayK3829,
  nh3829,
  tietzM,
  tietzValue,
  tietzLineReaction,
  evaluateLaw,
  nodalLateralHead,
  sampledLateralProfile,
  summarize,
  KGF_CM2_TO_KN_M2,
  KGF_CM3_TO_KN_M3,
  type TablePolicy,
} from "./diagnostics/tqs-crh";

const p = reference16Project(),
  f = p.foundations[0];
const percentage = (actual: number, reference: number) =>
  (actual / reference - 1) * 100;
const baseline = Object.fromEntries(
  (["fixed", "pinned"] as const).map((headConnection) => [
    headConnection,
    summarize(calculate(p, { ...f, headConnection })),
  ]),
);
const policies: TablePolicy[] = ["lower", "linear", "upper"];
const spt = policies.map((policy) => ({
  policy,
  result: evaluateLaw(p, f, tietzLineReaction(p, f, policy)),
}));
const nodal = ([16, 32, 64, 128] as const).flatMap((segments) =>
  policies.map((policy) => {
    const k = nodalLateralHead(p, f, tietzLineReaction(p, f, policy), segments);
    return {
      segments,
      interval: f.length / segments,
      policy,
      khFixed: (f.count * f.efficiency * k[0][0]) / TF,
      khPinned:
        (f.count *
          f.efficiency *
          connectedLateralHead(k, { ...f, headConnection: "pinned" })[0][0]) /
        TF,
    };
  }),
);
const convergence = ([16, 32, 64] as const).map((segments) => ({
  segments,
  ...summarize(
    calculate(
      sampledLateralProfile(
        p,
        { ...f, segments },
        tietzLineReaction(p, f, "linear"),
      ),
      { ...f, segments, headConnection: "pinned" },
    ),
  ),
}));
const byType = nh3829.slice(0, 3).flatMap((sand) =>
  clayK3829.flatMap((clay2) =>
    clayK3829.map((clay3) => ({
      sand: sand.name,
      clay3to11: clay2.name,
      clay11to20: clay3.name,
      result: evaluateLaw(p, f, (z) =>
        z <= 3
          ? (z < p.water ? sand.dry : sand.wet) * KGF_CM3_TO_KN_M3 * z
          : (z <= 11 ? clay2.k : clay3.k) * KGF_CM2_TO_KN_M2,
      ),
    })),
  ),
);
const samples = [0.5, 1, 2, 3, 4, 8, 12, 16].map((depth) => {
  const n = sptAt(p, depth),
    layer = layerAt(p, depth),
    family = layer.soil === "clay" ? "clay" : "granular",
    m = tietzValue(n, family, "linear");
  return {
    depth,
    n,
    soil: layer.soil,
    m,
    currentKh: layer.kh,
    tietzKh: m * TF * depth,
    currentLine: layer.kh * f.diameter,
    tietzLine: m * TF * depth * f.diameter,
  };
});
const snapshot = {
  sourceEngineVersion: ENGINE_VERSION,
  inputProject: p,
  description:
    "Estudo controlado de CRH: compara hipóteses, não valida parâmetros nem reproduz o algoritmo do TQS ou da calculadora do print. O app não é alterado pelo estudo.",
  sources: [
    { url: CRH_SOURCE, providedPdf: "3829.pdf", pages: 4 },
    { url: PILE_SOURCE },
  ],
  units: {
    diagonal: ["tf/m", "tf/m", "tf/m", "tf·m/rad", "tf·m/rad", "tf·m/rad"],
    kh: "kN/m³",
    lineReaction: "kN/m²",
    m: "tf/m⁴",
    settlement: "mm",
  },
  assumptions: [
    "Mesmo caso de 16 m, Ø0,30 m, Ec=30 GPa, E/ν, RL/RP, interação e transferência vertical; só a lei de reação horizontal é substituída.",
    "SPT/m: tabelas idênticas nas páginas 3829/3836; interpolação linear ou degrau inferior/superior são hipóteses separadas, pois não se conhece a regra da calculadora do print.",
    "A referência da origem do método SPT/m são tubulões com cerca de 1 m ou mais. TQS 3836 o apresenta para estacas, mas ressalva a comprovação para solos brasileiros e simplificações. Ø0,30 m é extrapolação de domínio, sem validação por esse ensaio.",
    "No caso estudado D=0. A profundidade z é contada do terreno; a generalização para bloco enterrado requer escolher a referência e considerar o trecho de solo atuante.",
    "Por tipo de solo: camada de areia pode ser fofa/mediana/compacta; as argilas foram ensaiadas como pré-adensadas com todas as consistências. Essas condições não constam no print e não são inferidas somente do SPT.",
    "Molas nodais: k_i=m z_i d Δl, pesos Δl inteiros na ponta, sem mola no nó de cota zero; viga entre os nós. Isso é uma hipótese de discretização, não uma confirmação do esquema interno do TQS.",
    "3829 e 3836 contêm diferenças de tabela, arredondamento e unidades; um preset genérico 'TQS' não identifica todas as convenções. Não houve ajuste de Ec, solo ou coeficientes para alcançar o alvo.",
  ],
  tables3829: { clayK: clayK3829, nh: nh3829, m: tietzM },
  reference: {
    kx: reference16.kx,
    ky: reference16.ky,
    kz: reference16.kz,
    ry: reference16.ry,
  },
  baseline,
  spt,
  nodal,
  convergence,
  byType,
  samples,
  comparison: {
    linearConsistentKx: convergence.at(-1)!.diagonal[0],
    linearConsistentDifferencePercent: percentage(
      convergence.at(-1)!.diagonal[0],
      reference16.kx,
    ),
    linearNodal1mKx: nodal.find(
      (r) => r.segments === 16 && r.policy === "linear",
    )!.khPinned,
    linearNodal1mDifferencePercent: percentage(
      nodal.find((r) => r.segments === 16 && r.policy === "linear")!.khPinned,
      reference16.kx,
    ),
    unchangedKz: convergence.at(-1)!.diagonal[2],
    unchangedRy: convergence.at(-1)!.diagonal[4],
  },
};
mkdirSync("examples", { recursive: true });
writeFileSync(
  "examples/referencia-16m-crh-tqs.json",
  JSON.stringify(snapshot, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      baseline: baseline.pinned,
      spt: spt.map((r) => ({ policy: r.policy, result: r.result.pinned })),
      nodal1m: nodal.filter((r) => r.segments === 16),
      comparison: snapshot.comparison,
      byTypeCount: byType.length,
      convergence,
    },
    null,
    2,
  ),
);
