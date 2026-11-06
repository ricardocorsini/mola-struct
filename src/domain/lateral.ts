import {
  defaultMTable,
  presetCoefficients,
  type CrhCoefficients,
} from "./crhCatalog";
import {
  lateralOptions,
  type Foundation,
  type Layer,
  type Project,
  fmt,
} from "./model";
import { layerAt, sptAt } from "./profile";
export const hasLateralModel = (f: Foundation) =>
  f.kind === "pile" && f.pileMethod !== "randolph";
export function layerCoefficients(l: Layer, f: Foundation): CrhCoefficients {
  const c = l.crh;
  if (c?.preset === "custom-k") {
    if (!(c.k !== null && c.k > 0))
      throw new Error(`Informe K personalizado na camada ${l.name}.`);
    return { law: "k", k: c.k };
  }
  if (c?.preset === "custom-nh")
    return { law: "nh", dry: c.nhDry, wet: c.nhWet };
  return presetCoefficients(
    c?.preset ?? "unset",
    lateralOptions(f).tableVersion,
  );
}
export function interpolateM(
  n: number,
  table: [number, number][],
  policy: "lower" | "linear" | "upper",
  clay: boolean,
  custom = false,
): number {
  if (
    table.length < 2 ||
    table.some(
      ([a, m], i) =>
        !Number.isFinite(a) ||
        !Number.isFinite(m) ||
        m <= 0 ||
        (i > 0 && a <= table[i - 1][0]),
    )
  )
    throw new Error(
      "Tabela m inválida: NSPT deve ser estritamente crescente e m positivo.",
    );
  if (n < table[0][0] || n > table.at(-1)![0]) {
    if (clay && !custom && n > table.at(-1)![0]) return table.at(-1)![1]; // hard clay row >30
    throw new Error(
      "NSPT fora da faixa da tabela m; sem extrapolação. Edite a tabela ou escolha outra correlação.",
    );
  }
  for (let i = 0; i < table.length; i++) {
    const [b, v] = table[i];
    if (n === b) return v;
    if (n < b) {
      const [a, u] = table[i - 1];
      return policy === "lower"
        ? u
        : policy === "upper"
          ? v
          : u + ((n - a) / (b - a)) * (v - u);
    }
  }
  throw new Error("NSPT inválido na tabela m.");
}
/** Returns line reaction/displacement, kN/m². Manual kh is pressure/displacement. */
export function lateralLaw(
  p: Project,
  f: Foundation,
): (depth: number) => number {
  const cfg = lateralOptions(f);
  if (!hasLateralModel(f) || cfg.source === "manual")
    return (z) => layerAt(p, z).kh * f.diameter;
  return (depth) => {
    const l = layerAt(p, depth),
      z = cfg.depthReference === "cap" ? depth - f.depth : depth;
    if (z < 0)
      throw new Error("Profundidade negativa na correlação horizontal.");
    if (cfg.source === "terzaghi") {
      const c = layerCoefficients(l, f);
      if (c.law === "k") return c.k;
      const value = depth < p.water ? c.dry : c.wet;
      if (value === null || !(value > 0))
        throw new Error(
          `nh ${depth < p.water ? "seco" : "submerso"} não informado na camada ${l.name}. A tabela não fornece esse valor; personalize ou escolha outra referência.`,
        );
      return value * z;
    }
    const family = l.crh?.family ?? "soil";
    const clay = family === "soil" ? l.soil === "clay" : family === "clay";
    if (family === "soil" && l.soil !== "clay" && l.soil !== "sand")
      throw new Error(
        `Escolha a família SPT/m da camada ${l.name} na aba Reação horizontal da sondagem.`,
      );
    const table =
      cfg.mTableSource === "custom"
        ? clay
          ? cfg.clayTable
          : cfg.granularTable
        : defaultMTable(clay ? "clay" : "granular");
    const m = interpolateM(
      sptAt(p, depth),
      table,
      cfg.interpolation,
      clay,
      cfg.mTableSource === "custom",
    );
    return m * 9.80665 * z * f.diameter;
  };
}
export function lateralSummary(f: Foundation): string {
  if (!hasLateralModel(f))
    return f.kind === "pile"
      ? "Randolph simplificado: Kh=μh Kz; seleção CRH não se aplica."
      : "Sapata: modelo horizontal definido pelo método da base.";
  const c = lateralOptions(f);
  const source =
    c.source === "manual"
      ? "kh manual por camada"
      : c.source === "terzaghi"
        ? `K/nh · ${c.tableVersion}`
        : `SPT/m Tietz · tabela ${c.mTableSource === "custom" ? "personalizada" : "TQS 3829/3836"} · regra ${c.interpolation}`;
  return `${source}; ${c.discretization === "consistent" ? `${f.segments} elementos com reação consistente` : `molas nodais, passo máximo ${c.nodalStep} m (mínimo 2 / máximo 128 trechos)`}; z a partir ${c.depthReference === "ground" ? "do terreno" : "da base do bloco"}.`;
}
export function lateralEntries(p: Project, f: Foundation): [string, string][] {
  const rows: [string, string][] = [
    ["Modelo de reação horizontal", lateralSummary(f)],
  ];
  if (!hasLateralModel(f)) return rows;
  const c = lateralOptions(f);
  for (const l of p.layers) {
    let description = "";
    if (c.source === "manual") description = `kh=${fmt(l.kh, 4)} kN/m³`;
    else if (c.source === "tietz")
      description = `Família m: ${l.crh?.family === "clay" ? "argiloso" : l.crh?.family === "granular" ? "granular" : l.soil === "clay" ? "argiloso (tipo declarado)" : l.soil === "sand" ? "granular (tipo declarado)" : "associação pendente"}`;
    else
      try {
        const v = layerCoefficients(l, f);
        description =
          `${l.crh?.preset ?? "não associado"} · ` +
          (v.law === "k"
            ? `K=${fmt(v.k, 4)} kN/m²`
            : `nh seco=${v.dry === null ? "não publicado/informado" : fmt(v.dry, 4)}; nh submerso=${v.wet === null ? "não publicado/informado" : fmt(v.wet, 4)} kN/m³`);
      } catch (e) {
        description = e instanceof Error ? e.message : "Associação pendente";
      }
    rows.push([`CRH · ${l.name}`, description]);
  }
  if (c.source === "tietz")
    for (const family of ["clay", "granular"] as const) {
      const t =
        c.mTableSource === "tqs"
          ? defaultMTable(family)
          : family === "clay"
            ? c.clayTable
            : c.granularTable;
      rows.push([
        `Tabela m · ${family === "clay" ? "argiloso" : "granular"}`,
        t.map(([n, m]) => `${n} → ${fmt(m, 4)}`).join("; ") +
          " · NSPT → m em tf/m⁴",
      ]);
    }
  return rows;
}
