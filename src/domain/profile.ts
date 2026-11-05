import type { Project, Layer } from "./model";
export function layerAt(p: Project, z: number): Layer {
  return (
    p.layers.find((l) => z <= l.bottom + 1e-9) ?? p.layers[p.layers.length - 1]
  );
}
export function sptAt(p: Project, z: number): number {
  return (p.spt.find((s) => z <= s.depth + 1e-9) ?? p.spt[p.spt.length - 1]).n;
}
export function intervals(
  p: Project,
  a: number,
  b: number,
): [number, number][] {
  const bounds = [
    a,
    b,
    ...p.layers.map((l) => l.bottom),
    ...p.spt.map((s) => s.depth),
  ]
    .filter((x) => x >= a && x <= b)
    .sort((x, y) => x - y);
  const u = [...new Set(bounds)];
  return u.slice(1).map((v, i) => [u[i], v]);
}
