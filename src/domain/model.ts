import { z } from "zod";
import { defaultMTable } from "./crhCatalog";

const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();
const mPoint = z.tuple([z.number().int().min(0).max(100), positive]);
export const lateralSchema = z.object({
  source: z.enum(["manual", "terzaghi", "tietz"]).default("manual"),
  tableVersion: z.enum(["tqs-3829", "tqs-3836"]).default("tqs-3829"),
  depthReference: z.enum(["ground", "cap"]).default("ground"),
  discretization: z.enum(["consistent", "nodal"]).default("consistent"),
  nodalStep: positive.min(0.1).default(1),
  interpolation: z.enum(["lower", "linear", "upper"]).default("linear"),
  mTableSource: z.enum(["tqs", "custom"]).default("tqs"),
  clayTable: z
    .array(mPoint)
    .min(2)
    .max(20)
    .default(() => [...defaultMTable("clay"), [100, 900] as [number, number]]),
  granularTable: z
    .array(mPoint)
    .min(2)
    .max(20)
    .default(() => defaultMTable("granular")),
});
export const defaultLateral = () => lateralSchema.parse({});
export type LateralOptions = z.infer<typeof lateralSchema>;
export const layerCrhSchema = z.object({
  preset: z.string().default("unset"),
  k: positive.nullable().default(null),
  nhDry: positive.nullable().default(null),
  nhWet: positive.nullable().default(null),
  family: z.enum(["soil", "clay", "granular"]).default("soil"),
});
export const defaultLayerCrh = () => layerCrhSchema.parse({});
export const layerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  bottom: positive,
  soil: z.enum(["sand", "silt", "clay", "fill"]),
  e: positive,
  nu: z.number().min(0).max(0.49),
  gamma: positive,
  gammaSat: positive,
  phi: z.number().min(0).max(45),
  cohesion: nonnegative,
  alpha: nonnegative,
  k: positive,
  kh: positive,
  crh: layerCrhSchema.optional(),
  shaftK: positive,
  baseK: positive,
  schmertmannK: positive.default(0.9),
  teixeiraAlpha: positive.optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export const verificationSchema = z.object({
  serviceConfirmed: z.boolean().default(false),
  serviceReference: z.string().default(""),
  settlementLimit: positive.nullable().default(null),
  horizontalLimit: positive.nullable().default(null),
  rotationLimit: positive.nullable().default(null),
  limitsReference: z.string().default(""),
  ultimateBasis: z.enum(["unset", "characteristic", "design"]).default("unset"),
  ultimateReference: z.string().default(""),
  ultimateN: nonnegative.default(0),
  ultimateHx: z.number().finite().default(0),
  ultimateHy: z.number().finite().default(0),
  ultimateMx: z.number().finite().default(0),
  ultimateMy: z.number().finite().default(0),
  ultimateMz: z.number().finite().default(0),
  selfWeightIncluded: z.boolean().default(false),
  geotechnicalBasisConfirmed: z.boolean().default(false),
  soilRegime: z
    .enum(["unset", "drained-effective", "undrained-total"])
    .default("unset"),
  geotechnicalReference: z.string().default(""),
  pileType: z
    .enum(["unspecified", "driven", "cfa", "bored-fluid", "other"])
    .default("unspecified"),
  toeProcedure: z
    .enum(["unconfirmed", "ignored", "minimum", "special"])
    .default("unconfirmed"),
  executionReference: z.string().default(""),
  pileSafety: positive.default(2),
});
export const defaultVerification = () => verificationSchema.parse({});
export type Verification = z.infer<typeof verificationSchema>;
export const foundationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.enum(["pile", "footing"]),
  count: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  diameter: positive,
  length: positive,
  spacingX: positive,
  spacingY: positive,
  capX: positive,
  capY: positive,
  height: positive,
  depth: nonnegative,
  fck: positive,
  ec: positive,
  concreteNu: z.number().min(0).max(0.45),
  f1: positive,
  f2: positive,
  n: nonnegative,
  hx: z.number().finite(),
  hy: z.number().finite(),
  mx: z.number().finite(),
  my: z.number().finite(),
  mz: z.number().finite(),
  efficiency: z.number().positive().max(1),
  segments: z.number().int().min(8).max(64),
  safety: positive,
  sptFactor: positive,
  pileMethod: z.enum(["winkler", "randolph", "mindlin"]).default("winkler"),
  headConnection: z.enum(["fixed", "pinned"]).default("fixed"),
  lateral: lateralSchema.optional(),
  footingMethod: z
    .enum(["elastic", "halfspace", "winkler", "safe", "mindlin"])
    .default("elastic"),
  footingSoil: z.enum(["support", "equivalent"]).optional(),
  modulusSource: z
    .enum(["manual", "spt", "aoki", "teixeira"])
    .default("manual"),
  aokiFactor: z.union([z.literal(3), z.literal(4), z.literal(6)]).default(6),
  horizontalRatio: positive.max(1).default(0.3),
  kvInput: positive.default(30000),
  allowablePressure: positive.default(200),
  randolphRho: positive.max(1).default(1),
  integration: z.number().int().min(8).max(32).default(16),
  transfer: z.enum(["capacity-ratio", "manual"]).default("capacity-ratio"),
  tipFraction: z.number().min(0).max(1).default(0.5),
  verification: verificationSchema.prefault({}),
});
export const projectSchema = z.object({
  format: z.literal("molasstruct"),
  version: z.union([z.literal(1), z.literal(2)]),
  name: z.string().min(1),
  author: z.string(),
  notes: z.string(),
  water: nonnegative,
  bedrock: positive,
  borehole: z.string().min(1),
  spt: z
    .array(z.object({ depth: positive, n: z.number().int().min(0).max(100) }))
    .min(1)
    .max(500),
  layers: z.array(layerSchema).min(1).max(100),
  foundations: z.array(foundationSchema).min(1).max(100),
  benchmark: z
    .object({
      id: z.enum(["pile-16m-20261106", "footings-fema273-20261106"]),
      foundationId: z.string().min(1),
    })
    .optional(),
});
export type Layer = z.infer<typeof layerSchema>;
export type Foundation = z.infer<typeof foundationSchema>;
export type Project = z.infer<typeof projectSchema>;
/** V2 prevents old applications from silently dropping CRH settings and using manual kh. */
export const serializeProject = (p: Project) =>
  JSON.stringify({ ...p, version: 2 }, null, 2);
export const lateralOptions = (f: Foundation): LateralOptions =>
  f.lateral ?? defaultLateral();
export const headConnectionLabel = (f: Foundation) =>
  f.headConnection === "pinned" ? "Rotulada em X e Y" : "Rígida à flexão";
export const uid = () => crypto.randomUUID();
export const soilNames = {
  sand: "Areia",
  silt: "Silte",
  clay: "Argila",
  fill: "Aterro",
};
export const fmt = (n: number, decimals = 2) =>
  Number.isFinite(n)
    ? n.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "—";
export function pilePositions(f: Foundation): [number, number][] {
  const x = f.spacingX / 2,
    y = f.spacingY / 2;
  if (f.count === 1) return [[0, 0]];
  if (f.count === 2)
    return [
      [-x, 0],
      [x, 0],
    ];
  if (f.count === 3)
    return [
      [-x, (-y * 2) / 3],
      [x, (-y * 2) / 3],
      [0, (y * 4) / 3],
    ];
  return [
    [-x, -y],
    [x, -y],
    [x, y],
    [-x, y],
  ];
}
export const defaultFoundation = (
  id = "F01",
  kind: "pile" | "footing" = "pile",
): Foundation => ({
  id,
  name: id,
  kind,
  count: 2,
  diameter: 0.4,
  length: 8,
  spacingX: 1.2,
  spacingY: 1.2,
  capX: 2.2,
  capY: 1.2,
  height: 0.65,
  depth: 1,
  fck: 25,
  ec: 30,
  concreteNu: 0.2,
  f1: 1.75,
  f2: 3.5,
  n: 500,
  hx: 15,
  hy: 0,
  mx: 0,
  my: 30,
  mz: 0,
  efficiency: 1,
  segments: 24,
  safety: 3,
  sptFactor: 20,
  pileMethod: "winkler",
  headConnection: "fixed",
  footingMethod: "elastic",
  modulusSource: "manual",
  aokiFactor: 6,
  horizontalRatio: 0.3,
  kvInput: 30000,
  allowablePressure: 200,
  randolphRho: 1,
  integration: 16,
  transfer: "capacity-ratio",
  tipFraction: 0.5,
  verification: defaultVerification(),
});
export const exampleProject = (): Project => ({
  format: "molasstruct",
  version: 1,
  name: "Edifício Horizonte",
  author: "",
  notes:
    "Estudo comparativo de rigidez das fundações. Dados de demonstração, sem vínculo com uma obra real.",
  water: 3,
  bedrock: 20,
  borehole: "SP-01",
  spt: [4, 6, 10, 12, 20, 26, 32, 38, 38, 40, 42, 45, 48, 50, 50, 50].map(
    (n, i) => ({ depth: i + 1, n }),
  ),
  layers: [
    {
      id: "L1",
      name: "Areia siltosa",
      bottom: 5,
      soil: "sand",
      e: 18,
      schmertmannK: 0.7,
      nu: 0.3,
      gamma: 18,
      gammaSat: 20,
      phi: 30,
      cohesion: 0,
      alpha: 0.02,
      k: 800,
      kh: 18000,
      shaftK: 16000,
      baseK: 100000,
      color: "#D1B994",
    },
    {
      id: "L2",
      name: "Areia compacta",
      bottom: 10,
      soil: "sand",
      e: 45,
      schmertmannK: 0.9,
      nu: 0.28,
      gamma: 19,
      gammaSat: 21,
      phi: 35,
      cohesion: 0,
      alpha: 0.014,
      k: 1000,
      kh: 40000,
      shaftK: 30000,
      baseK: 180000,
      color: "#A79980",
    },
    {
      id: "L3",
      name: "Silte arenoso",
      bottom: 16,
      soil: "silt",
      e: 60,
      schmertmannK: 0.45,
      nu: 0.32,
      gamma: 19,
      gammaSat: 21,
      phi: 32,
      cohesion: 10,
      alpha: 0.022,
      k: 550,
      kh: 55000,
      shaftK: 40000,
      baseK: 220000,
      color: "#7D8B84",
    },
  ],
  foundations: [
    defaultFoundation(),
    {
      ...defaultFoundation("F02"),
      count: 4,
      capX: 2.2,
      capY: 2.2,
      n: 900,
      my: 50,
    },
    {
      ...defaultFoundation("S01", "footing"),
      capX: 2.4,
      capY: 1.8,
      height: 0.6,
      depth: 1.5,
      n: 400,
      hx: 0,
      my: 0,
    },
  ],
});
export function parseProject(text: string): Project {
  return projectSchema.parse(JSON.parse(text));
}
export function clone<T>(x: T): T {
  return structuredClone(x);
}
/** Dedicated numerical demonstration, separate from projects made by users. */
export function methodologyProject(): Project {
  const p = exampleProject();
  p.name = "Comparação de metodologias";
  p.bedrock = 16;
  p.notes =
    "Dados fictícios. Mesma geometria por família para comparar hipóteses de rigidez. Métodos têm alcances diferentes; não constituem validação por comparação entre si.";
  const pile = defaultFoundation();
  const footing = { ...p.foundations[2] };
  p.foundations = [
    ...(["winkler", "randolph", "mindlin"] as const).map((pileMethod, i) => ({
      ...pile,
      id: `M${i + 1}`,
      name: ["M1 · Winkler", "M2 · Randolph TQS", "M3 · Mindlin grupo"][i],
      pileMethod,
    })),
    ...(["elastic", "winkler", "safe", "mindlin"] as const).map(
      (footingMethod, i) => ({
        ...footing,
        id: `S${i + 1}`,
        name: [
          "S1 · Disco equivalente",
          "S2 · kv informado",
          "S3 · SAFE/Morrison",
          "S4 · Mindlin centro",
        ][i],
        footingMethod,
      }),
    ),
  ];
  return p;
}
/** Illustrative review inputs, not evidence of an actual project or field test. */
export function normativeExampleProject(): Project {
  const p = methodologyProject();
  p.name = "NBR 6122 — conferência parcial fictícia";
  p.notes =
    "Exemplo didático com dados, combinações e limites fictícios. As declarações de exemplo não são ensaios nem prova de conformidade de uma obra.";
  const verification: Verification = {
    ...defaultVerification(),
    serviceConfirmed: true,
    serviceReference:
      "Combinação característica de serviço FICTÍCIA para demonstração",
    settlementLimit: 15,
    horizontalLimit: 5,
    rotationLimit: 3,
    limitsReference:
      "Limites FICTÍCIOS; substituir pelos critérios justificados da obra",
    ultimateBasis: "characteristic",
    ultimateReference: "Combinação característica de ELU FICTÍCIA",
    ultimateN: 600,
    ultimateMy: 50,
    selfWeightIncluded: true,
    geotechnicalBasisConfirmed: true,
    soilRegime: "drained-effective",
    geotechnicalReference:
      "Declaração FICTÍCIA para demonstrar o fluxo; sem ensaios de obra",
    pileType: "cfa",
    toeProcedure: "minimum",
    executionReference:
      "Declaração executiva FICTÍCIA; não corresponde a comprovante",
    pileSafety: 2,
  };
  p.foundations = [
    {
      ...p.foundations[2],
      id: "N01",
      name: "N01 · CFA / Mindlin",
      verification,
    },
    {
      ...p.foundations[3],
      id: "N02",
      name: "N02 · Sapata / ELS e ELU",
      verification: {
        ...verification,
        ultimateN: 450,
        ultimateMy: 30,
        pileType: "unspecified",
        toeProcedure: "unconfirmed",
      },
    },
  ];
  return p;
}
