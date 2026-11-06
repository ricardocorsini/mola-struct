export type Matrix = number[][];
export const zeros = (n: number, m = n): Matrix =>
  Array.from({ length: n }, () => Array(m).fill(0));

export const dofNames = ["ux", "uy", "uz", "θx", "θy", "θz"];

/** Only exact zero rows AND columns are free coordinates. Never discard weak springs. */
export function freeCoordinates(k: Matrix): number[] {
  return k.flatMap((row, i) =>
    row.every((v) => v === 0) && k.every((r) => r[i] === 0) ? [i] : [],
  );
}

/** Solve supported foundation coordinates without adding fictitious stiffness.
 * Free unloaded coordinates use zero as a reference, NOT a determined displacement.
 * Coupled singular modes still fail in solve(); this is not a general pseudoinverse.
 */
export function solveSupported(k: Matrix, forces: number[]): number[] {
  const free = freeCoordinates(k);
  for (const i of free)
    if (forces[i] !== 0)
      throw new Error(
        `Sem rigidez em ${dofNames[i] ?? i}: a ação aplicada nessa direção não pode ser equilibrada pela fundação isolada. Reveja a ligação ou inclua o travamento no modelo estrutural.`,
      );
  const supported = forces.flatMap((_, i) => (free.includes(i) ? [] : [i]));
  const solution = solve(
    supported.map((i) => supported.map((j) => k[i][j])),
    supported.map((i) => forces[i]),
  );
  const displacement = Array(forces.length).fill(0);
  supported.forEach((i, j) => (displacement[i] = solution[j]));
  return displacement;
}

/** Partial-pivot Gaussian solve. All matrices use kN, m, rad; no regularization. */
export function solve(a: Matrix, b: number[]): number[] {
  const n = b.length,
    m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++)
      if (Math.abs(m[i][c]) > Math.abs(m[p][c])) p = i;
    if (!Number.isFinite(m[p][c]) || Math.abs(m[p][c]) < 1e-12)
      throw new Error("Matriz singular: revise os parâmetros de rigidez.");
    [m[c], m[p]] = [m[p], m[c]];
    for (let i = c + 1; i < n; i++) {
      const r = m[i][c] / m[c][c];
      if (r === 0) continue;
      for (let j = c; j <= n; j++) m[i][j] -= r * m[c][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let v = m[i][n];
    for (let j = i + 1; j < n; j++) v -= m[i][j] * x[j];
    x[i] = v / m[i][i];
  }
  return x;
}
