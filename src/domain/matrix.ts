export type Matrix = number[][];
export const zeros = (n: number, m = n): Matrix =>
  Array.from({ length: n }, () => Array(m).fill(0));

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
