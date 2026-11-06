/** Numerical facts from TQS 3829 / 3836. Internal K: kN/m²; nh: kN/m³; m: tf/m⁴. */
export type CrhVersion = "tqs-3829" | "tqs-3836";
export type CrhCoefficients =
  | { law: "k"; k: number }
  | { law: "nh"; dry: number | null; wet: number | null };
export const crhPresets = [
  {
    id: "clay-medium",
    label: "Argila pré-adensada · média",
    law: "k",
    old: 8,
    modern: 800,
  },
  {
    id: "clay-stiff",
    label: "Argila pré-adensada · rija",
    law: "k",
    old: 50,
    modern: 5000,
  },
  {
    id: "clay-very-stiff",
    label: "Argila pré-adensada · muito rija",
    law: "k",
    old: 100,
    modern: 10000,
  },
  {
    id: "clay-hard",
    label: "Argila pré-adensada · dura",
    law: "k",
    old: 195,
    modern: 19500,
  },
  {
    id: "sand-loose",
    label: "Areia · fofa",
    law: "nh",
    oldDry: 0.26,
    oldWet: 0.15,
    dry: 2600,
    wet: 1500,
  },
  {
    id: "sand-medium",
    label: "Areia · medianamente compacta",
    law: "nh",
    oldDry: 0.8,
    oldWet: 0.5,
    dry: 8000,
    wet: 5000,
  },
  {
    id: "sand-dense",
    label: "Areia · compacta",
    law: "nh",
    oldDry: 2,
    oldWet: 1.25,
    dry: 20000,
    wet: 12500,
  },
  {
    id: "clay-very-soft",
    label: "Argila normalmente adensada · muito mole",
    law: "nh",
    oldDry: 0.06,
    oldWet: 0.06,
    dry: null,
    wet: 550,
  },
  {
    id: "clay-soft",
    label: "Argila normalmente adensada · mole",
    law: "nh",
    oldDry: 0.08,
    oldWet: 0.08,
    dry: null,
    wet: null,
  },
  {
    id: "silt-very-loose",
    label: "Silte · muito fofo",
    law: "nh",
    oldDry: 0.055,
    oldWet: 0.055,
    dry: null,
    wet: 200,
  },
] as const;
export function presetCoefficients(
  id: string,
  version: CrhVersion,
): CrhCoefficients {
  const p = crhPresets.find((p) => p.id === id);
  if (!p)
    throw new Error(
      "Associe as camadas a um coeficiente K/nh na aba Reação horizontal da sondagem.",
    );
  if (p.law === "k")
    return { law: "k", k: version === "tqs-3829" ? p.old * 98.0665 : p.modern };
  const dry = version === "tqs-3829" ? p.oldDry * 9806.65 : p.dry,
    wet = version === "tqs-3829" ? p.oldWet * 9806.65 : p.wet;
  if (dry === null && wet === null)
    throw new Error(
      `Coeficiente não publicado na tabela ${version}: ${p.label}. Selecione outra referência ou informe valores personalizados.`,
    );
  return { law: "nh", dry, wet };
}
export const defaultMTable = (
  family: "clay" | "granular",
): [number, number][] =>
  (family === "clay"
    ? [
        [0, 25],
        [1, 75],
        [3, 150],
        [6, 300],
        [12, 500],
        [22, 700],
        [30, 900],
      ]
    : [
        [1, 150],
        [7, 300],
        [20, 500],
        [40, 800],
        [50, 1500],
      ]) as [number, number][];
