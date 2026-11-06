import type { Calculation } from "./engine";
import { pilePositions, type Foundation } from "./model";
import { solve, type Matrix } from "./matrix";
import { axialContribution, reference16 } from "./benchmark16";
import { TF } from "./methods";

/** Scalar stiffness after releasing selected coordinates at zero conjugate force.
 * Other coordinates remain fixed. Uses Kqq-Kqf Kff^-1 Kfq in the original SI units.
 */
export function condensedScalar(k: Matrix, q: number, free: number[]): number {
  if (free.includes(q) || new Set(free).size !== free.length)
    throw new Error("Graus de liberdade de condensação inválidos.");
  if (free.length === 0) return k[q][q];
  const response = solve(
    free.map((i) => free.map((j) => k[i][j])),
    free.map((i) => k[i][q]),
  );
  return k[q][q] - free.reduce((sum, i, j) => sum + k[q][i] * response[j], 0);
}

/** Exact decomposition for this symmetric two-pile model. Diagnostic only.
 * Does not infer the reference software's method or modify the active matrix.
 */
export function twoPileRotationAudit(f: Foundation, r: Calculation) {
  const unavailable = (reason: string) => ({
    available: false as const,
    reason,
  });
  if (!r.valid) return unavailable("Cálculo inválido: revise as entradas.");
  if (
    f.kind !== "pile" ||
    f.count !== 2 ||
    f.pileMethod !== "mindlin" ||
    !r.verticalCompliance
  )
    return unavailable(
      "A decomposição requer duas estacas idênticas em X e a flexibilidade vertical Mindlin.",
    );
  const positions = pilePositions(f),
    c = r.verticalCompliance;
  if (
    positions.some(([, y]) => Math.abs(y) > 1e-10) ||
    c.length !== 2 ||
    c.some((row) => row.length !== 2)
  )
    return unavailable(
      "Arranjo ou dimensão da flexibilidade incompatível com a fórmula de duas estacas em X.",
    );
  const close = (a: number, b: number) =>
    Math.abs(a - b) <= 1e-8 * Math.max(Math.abs(a), Math.abs(b), 1e-15);
  if (!close(c[0][0], c[1][1]) || !close(c[0][1], c[1][0]))
    return unavailable(
      "A fórmula modal requer flexibilidades próprias iguais e reciprocidade.",
    );
  const a = c[0][0],
    b = c[0][1],
    spacing = Math.abs(positions[0][0] - positions[1][0]);
  if (!(a + b > 0 && a - b > 0))
    return unavailable("Flexibilidade modal não positiva.");
  const armSquared = spacing ** 2 / 4,
    referenceArmSquared = reference16.spacing ** 2 / 4;
  const axial = axialContribution(f, c),
    axialRy = axial[2][2] / TF,
    kz = r.diagonal[2] / TF;
  const fullRy = r.diagonal[4] / TF,
    localRy = fullRy - axialRy;
  const sameKzRy = kz * armSquared,
    independentKz = (2 * f.efficiency) / a / TF;
  const independentRy = (f.efficiency * spacing ** 2) / (2 * a) / TF;
  const referenceClosure =
    reference16.kz * referenceArmSquared - reference16.ry;
  const terms = [
    {
      id: "reference-closure",
      label: "Fechamento Kz·s²/4 do print",
      value: referenceClosure,
    },
    {
      id: "geometry",
      label: "Geometria alterada em relação ao print",
      value: reference16.kz * (armSquared - referenceArmSquared),
    },
    {
      id: "vertical-level",
      label: "Diferença de Kz com o mesmo braço",
      value: (kz - reference16.kz) * armSquared,
    },
    {
      id: "interaction-mode",
      label: "Interação: modo de rotação versus translação",
      value: axialRy - sameKzRy,
    },
    { id: "local-bending", label: "Flexão local das estacas", value: localRy },
  ];
  const lateralFreeRy = condensedScalar(r.matrix, 4, [0]) / TF;
  // Release pile-head moments, rather than merely zeroing cap diagonal terms.
  // For two identical piles in X, local rotational stiffness is summed before condensation.
  const pinnedHorizontal =
    localRy > 0
      ? (r.matrix[0][0] - r.matrix[0][4] ** 2 / (localRy * TF)) / TF
      : null;
  return {
    available: true as const,
    spacing,
    armSquared,
    selfCompliance: a,
    mutualCompliance: b,
    interactionRatio: b / a,
    commonCompliance: a + b,
    oppositeCompliance: a - b,
    predictedKz: (2 * f.efficiency) / (a + b) / TF,
    predictedAxialRy: (f.efficiency * spacing ** 2) / (2 * (a - b)) / TF,
    kz,
    fullRy,
    axialRy,
    localRy,
    sameKzRy,
    independentKz,
    independentRy,
    normalizedAxialRy: reference16.kz * (axialRy / kz),
    normalizedModePremiumPercent: (axialRy / kz / armSquared - 1) * 100,
    axialDifferencePercent: (axialRy / reference16.ry - 1) * 100,
    fullDifferencePercent: (fullRy / reference16.ry - 1) * 100,
    bendingShareOfGap:
      Math.abs(fullRy - reference16.ry) > 1e-12
        ? localRy / (fullRy - reference16.ry)
        : null,
    referenceClosure,
    referenceRoundingBound: 0.005 * (1 + referenceArmSquared),
    terms,
    reconstructed: reference16.ry + terms.reduce((sum, t) => sum + t.value, 0),
    boundaryCases: [
      { id: "fixed-x", label: "Modelo ativo · ux impedido", ry: fullRy },
      {
        id: "free-x",
        label: "Modelo ativo · Hx=0, ux livre",
        ry: lateralFreeRy,
      },
      {
        id: "pinned",
        label: "Topos articulados · axial com interação (diagnóstico)",
        ry: axialRy,
      },
      {
        id: "independent",
        label: "Topos articulados · axial sem interação (diagnóstico)",
        ry: independentRy,
      },
    ],
    pinnedHorizontal,
    horizontalFreeRotation: condensedScalar(r.matrix, 0, [4]) / TF,
  };
}
