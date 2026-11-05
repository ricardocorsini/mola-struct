import {
  foundationSchema,
  pilePositions,
  projectSchema,
  type Foundation,
  type Layer,
  type Project,
} from "./model";

export type Matrix = number[][];
export type Notice = { level: "error" | "warning" | "info"; message: string };
export type Segment = {
  top: number;
  bottom: number;
  n: number;
  layer: string;
  shaft: number;
  point: number;
};
export type Calculation = {
  matrix: Matrix;
  diagonal: number[];
  displacement: number[];
  settlement: number;
  method: string;
  notices: Notice[];
  valid: boolean;
  area: number;
  e: number;
  nu: number;
  shaft: number | null;
  point: number | null;
  ultimate: number | null;
  pileForces: number[];
  qMin: number | null;
  qMax: number | null;
  qUltimate: number | null;
  qReference: number | null;
  qSpt: number | null;
  kv: number;
  segments: Segment[];
  version: string;
};
export const ENGINE_VERSION = "0.1.0-experimental";
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
export function layerAt(p: Project, z: number): Layer {
  return (
    p.layers.find((l) => z <= l.bottom + 1e-9) ?? p.layers[p.layers.length - 1]
  );
}
export function sptAt(p: Project, z: number): number {
  return (p.spt.find((s) => z <= s.depth + 1e-9) ?? p.spt[p.spt.length - 1]).n;
}
function intervals(p: Project, a: number, b: number): [number, number][] {
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
function check(p: Project, f: Foundation): Notice[] {
  const ns: Notice[] = [];
  const err = (message: string) => ns.push({ level: "error", message });
  if (
    !projectSchema.safeParse(p).success ||
    !foundationSchema.safeParse(f).success
  ) {
    err("Há parâmetros inválidos. Revise campos, valores e unidades.");
    return ns;
  }
  if (p.layers.some((l) => l.gammaSat <= 9.81 || l.gammaSat < l.gamma))
    err(
      "Pesos específicos inválidos: γsat deve ser maior que 9,81 kN/m³ e pelo menos igual a γ.",
    );
  if (p.layers.some((l, i) => l.bottom <= (i ? p.layers[i - 1].bottom : 0)))
    err("As cotas finais das camadas devem ser estritamente crescentes.");
  if (p.spt.some((s, i) => s.depth <= (i ? p.spt[i - 1].depth : 0)))
    err("As profundidades SPT devem ser positivas, únicas e crescentes.");
  const required =
    f.kind === "pile"
      ? f.depth + f.length
      : f.depth + 2 * Math.min(f.capX, f.capY);
  if (required > p.layers[p.layers.length - 1].bottom + 1e-8)
    err(
      `Camadas insuficientes: o modelo requer solo descrito até ${required.toFixed(2)} m.`,
    );
  if (required > p.spt[p.spt.length - 1].depth + 1e-8)
    err(
      `Sondagem insuficiente: informe SPT até ${required.toFixed(2)} m. Não há extrapolação.`,
    );
  if (
    f.depth >= p.bedrock ||
    (f.kind === "pile" && f.depth + f.length > p.bedrock)
  )
    err("A fundação ultrapassa a cota impenetrável informada.");
  if (f.kind === "footing" && required > p.bedrock)
    ns.push({
      level: "warning",
      message:
        "Impenetrável dentro da faixa de influência: a aproximação de semiespaço não considera a base rígida.",
    });
  if (f.kind === "pile") {
    const pos = pilePositions(f);
    if (
      pos.some(
        ([x, y]) =>
          Math.abs(x) + f.diameter / 2 > f.capX / 2 ||
          Math.abs(y) + f.diameter / 2 > f.capY / 2,
      )
    )
      err(
        "Há estacas fora do contorno do bloco. Aumente o bloco ou reduza os espaçamentos.",
      );
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++)
        if (
          Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]) < f.diameter
        )
          err("Há sobreposição de estacas.");
    ns.push({
      level: "warning",
      message:
        "Estacas independentes em bloco rígido. Interação entre estacas e contato bloco–solo não modelados; η é um redutor manual da rigidez.",
    });
  }
  ns.push({
    level: "info",
    message:
      "Estimativa experimental linear. E, ν e coeficientes de reação são informados; SPT é usado somente na capacidade Aoki–Velloso e na correlação de tensão.",
  });
  return ns;
}

/** Euler–Bernoulli beam + consistent Winkler matrix; free toe. Returns head [u, slope] stiffness. */
export function lateralHead(p: Project, f: Foundation): Matrix {
  const n = f.segments,
    l = f.length / n,
    ei = (f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64,
    k = zeros(2 * (n + 1));
  const beam = [
    [12, 6 * l, -12, 6 * l],
    [6 * l, 4 * l * l, -6 * l, 2 * l * l],
    [-12, -6 * l, 12, -6 * l],
    [6 * l, 2 * l * l, -6 * l, 4 * l * l],
  ];
  const soil = [
    [156, 22 * l, 54, -13 * l],
    [22 * l, 4 * l * l, 13 * l, -3 * l * l],
    [54, 13 * l, 156, -22 * l],
    [-13 * l, -3 * l * l, -22 * l, 4 * l * l],
  ];
  for (let e = 0; e < n; e++) {
    const kh = layerAt(p, f.depth + (e + 0.5) * l).kh * f.diameter;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        k[2 * e + i][2 * e + j] +=
          (ei / l ** 3) * beam[i][j] + ((kh * l) / 420) * soil[i][j];
  }
  const v = Array(k.length).fill(0);
  v[0] = 1;
  const c0 = solve(k, v);
  v[0] = 0;
  v[1] = 1;
  const c1 = solve(k, v);
  const det = c0[0] * c1[1] - c1[0] * c0[1];
  return [
    [c1[1] / det, -c1[0] / det],
    [-c0[1] / det, c0[0] / det],
  ];
}
/** Axial/torsional elastic bar + distributed interface springs and toe spring. */
export function barHead(p: Project, f: Foundation, torsion = false): number {
  const n = f.segments,
    l = f.length / n,
    r = f.diameter / 2,
    area = Math.PI * r * r;
  const ea = torsion
    ? (((f.ec * 1e6) / (2 * (1 + f.concreteNu))) * Math.PI * r ** 4) / 2
    : f.ec * 1e6 * area;
  const k = zeros(n + 1);
  for (let e = 0; e < n; e++) {
    const layer = layerAt(p, f.depth + (e + 0.5) * l),
      ks = layer.shaftK * 2 * Math.PI * r * (torsion ? r * r : 1);
    k[e][e] += ea / l + (ks * l) / 3;
    k[e + 1][e + 1] += ea / l + (ks * l) / 3;
    k[e][e + 1] += -ea / l + (ks * l) / 6;
    k[e + 1][e] += -ea / l + (ks * l) / 6;
  }
  if (!torsion) k[n][n] += area * layerAt(p, f.depth + f.length).baseK;
  const force = Array(n + 1).fill(0);
  force[0] = 1;
  return 1 / solve(k, force)[0];
}

export function assemblePileGroup(f: Foundation, local: Matrix): Matrix {
  const out = zeros(6);
  for (const [x, y] of pilePositions(f)) {
    const t = [
      [1, 0, 0, 0, 0, -y],
      [0, 1, 0, 0, 0, x],
      [0, 0, 1, y, -x, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ];
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 6; j++)
        for (let a = 0; a < 6; a++)
          for (let b = 0; b < 6; b++)
            out[i][j] += t[a][i] * local[a][b] * t[b][j] * f.efficiency;
  }
  return out;
}

export function calculate(p: Project, f: Foundation): Calculation {
  const notices = check(p, f),
    result: Calculation = {
      matrix: zeros(6),
      diagonal: Array(6).fill(0),
      displacement: Array(6).fill(0),
      settlement: 0,
      method: "",
      notices,
      valid: false,
      area: f.capX * f.capY,
      e: 0,
      nu: 0,
      shaft: null,
      point: null,
      ultimate: null,
      pileForces: [],
      qMin: null,
      qMax: null,
      qUltimate: null,
      qReference: null,
      qSpt: null,
      kv: 0,
      segments: [],
      version: ENGINE_VERSION,
    };
  if (notices.some((n) => n.level === "error")) return result;
  try {
    if (f.kind === "pile") {
      const lateral = lateralHead(p, f),
        axial = barHead(p, f),
        torsion = barHead(p, f, true),
        local = zeros(6);
      local[0][0] = local[1][1] = lateral[0][0];
      local[2][2] = axial;
      local[3][3] = local[4][4] = lateral[1][1];
      local[5][5] = torsion;
      local[0][4] = local[4][0] = -lateral[0][1];
      local[1][3] = local[3][1] = lateral[0][1];
      result.matrix = assemblePileGroup(f, local);
      result.method = "Viga e barra em base de Winkler · bloco rígido";
      let shaft = 0;
      for (const [a, b] of intervals(p, f.depth, f.depth + f.length)) {
        const z = (a + b) / 2,
          layer = layerAt(p, z),
          n = sptAt(p, z),
          r =
            (Math.PI * f.diameter * layer.alpha * layer.k * n * (b - a)) / f.f2;
        shaft += r;
        result.segments.push({
          top: a,
          bottom: b,
          n,
          layer: layer.name,
          shaft: r,
          point: 0,
        });
      }
      const toe = f.depth + f.length,
        layer = layerAt(p, toe),
        n = sptAt(p, toe);
      result.point = (((Math.PI * f.diameter ** 2) / 4) * layer.k * n) / f.f1;
      result.shaft = shaft;
      result.ultimate = shaft + result.point;
      result.e = layer.e;
      result.nu = layer.nu;
      notices.push({
        level: "info",
        message:
          "Aoki–Velloso: resistência por estaca isolada, sem verificação normativa de grupo. Np é o valor do intervalo que contém a ponta; sem médias ou limites automáticos.",
      });
    } else {
      const b = Math.min(f.capX, f.capY),
        l = Math.max(f.capX, f.capY),
        interval = intervals(p, f.depth, f.depth + 2 * b);
      let invE = 0,
        nu = 0;
      for (const [a, z] of interval) {
        const layer = layerAt(p, (a + z) / 2);
        invE += (z - a) / layer.e;
        nu += (z - a) * layer.nu;
      }
      result.e = (2 * b) / invE;
      result.nu = nu / (2 * b);
      const g = (result.e * 1000) / (2 * (1 + result.nu)),
        r = Math.sqrt(result.area / Math.PI),
        kz = (4 * g * r) / (1 - result.nu),
        kh = (8 * g * r) / (2 - result.nu),
        kv = kz / result.area;
      const ix = (f.capX * f.capY ** 3) / 12,
        iy = (f.capY * f.capX ** 3) / 12;
      const diag = [
        kh,
        kh,
        kz,
        kv * ix,
        kv * iy,
        (kh / result.area) * (ix + iy),
      ];
      result.matrix = diag.map((v, i) => diag.map((_, j) => (i === j ? v : 0)));
      result.kv = kv;
      result.method = "Semiespaço circular equivalente + Winkler distribuído";
      const s = layerAt(p, f.depth),
        phi = (s.phi * Math.PI) / 180,
        tan = Math.tan(phi),
        nq = Math.exp(Math.PI * tan) * Math.tan(Math.PI / 4 + phi / 2) ** 2,
        nc = phi < 1e-9 ? Math.PI + 2 : (nq - 1) / tan,
        ng = 2 * (nq + 1) * tan;
      const sc = 1 + (nq / nc) * (b / l),
        sq = 1 + (b / l) * tan,
        sg = 1 - (0.4 * b) / l;
      const unitWeight = (a: number, z: number): number => {
        let v = 0;
        for (const [i, j] of intervals(p, a, z)) {
          const soil = layerAt(p, (i + j) / 2),
            dry = Math.max(0, Math.min(j, p.water) - i);
          v += soil.gamma * dry + (soil.gammaSat - 9.81) * (j - i - dry);
        }
        return v;
      };
      const q = unitWeight(0, f.depth),
        gamma = unitWeight(f.depth, f.depth + b) / b;
      result.qUltimate =
        s.cohesion * nc * sc + q * nq * sq + 0.5 * gamma * b * ng * sg;
      result.qReference = result.qUltimate / f.safety;
      let nspt = 0;
      for (const [a, z] of interval) nspt += (z - a) * sptAt(p, (a + z) / 2);
      result.qSpt = (nspt / (2 * b)) * f.sptFactor;
      const dq =
        (Math.abs(f.mx) * f.capY) / 2 / ix + (Math.abs(f.my) * f.capX) / 2 / iy;
      result.qMin = f.n / result.area - dq;
      result.qMax = f.n / result.area + dq;
      if (result.qMin < 0)
        notices.push({
          level: "warning",
          message:
            "Pressão mínima negativa: há perda de contato prevista. O modelo linear bilateral não representa o levantamento da sapata.",
        });
      if (f.hx || f.hy || f.mx || f.my)
        notices.push({
          level: "warning",
          message:
            "Vésic é apresentado para carga vertical centrada: inclinação, excentricidade e profundidade têm fatores unitários. Não constitui verificação da combinação aplicada.",
        });
      notices.push({
        level: "warning",
        message:
          "Sapatas: E equivalente harmônico e ν médio na faixa de 2B sob a base. Rigidezes de translação por disco de mesma área; rotações por Winkler. Sem correção de embutimento ou base rígida.",
      });
    }
    result.diagonal = result.matrix.map((row, i) => row[i]);
    result.displacement = solve(result.matrix, [
      f.hx,
      f.hy,
      -f.n,
      f.mx,
      f.my,
      f.mz,
    ]);
    result.settlement = -result.displacement[2] * 1000;
    if (f.kind === "pile") {
      const d = result.displacement,
        axial = barHead(p, f) * f.efficiency;
      result.pileForces = pilePositions(f).map(
        ([x, y]) => -axial * (d[2] + d[3] * y - d[4] * x),
      );
      if (result.pileForces.some((n) => n < 0))
        notices.push({
          level: "warning",
          message:
            "O modelo prevê tração em estaca. Resistência à tração e aderência não são verificadas nesta versão.",
        });
      if (result.pileForces.some((n) => n > (result.ultimate ?? 0)))
        notices.push({
          level: "warning",
          message:
            "Reação linear acima da resistência última Aoki–Velloso estimada por estaca. Revise o modelo e as ações.",
        });
    }
    result.valid =
      result.matrix.every((row) => row.every(Number.isFinite)) &&
      result.displacement.every(Number.isFinite);
    if (!result.valid)
      throw new Error("Resultado não finito. Revise as entradas.");
  } catch (e) {
    notices.push({
      level: "error",
      message:
        e instanceof Error ? e.message : "Não foi possível resolver o modelo.",
    });
    result.valid = false;
  }
  return result;
}

export function parseSpt(text: string): Project["spt"] {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .filter((r) => r.trim())
    .map((r) => r.split(/[;\t]/).map((v) => v.trim()));
  if (rows.length && Number.isNaN(Number(rows[0][0].replace(",", "."))))
    rows.shift();
  const spt = rows.map((r, i) => {
    if (r.length !== 2)
      throw new Error(
        `Linha ${i + 1}: use duas colunas separadas por ponto e vírgula ou TAB.`,
      );
    return {
      depth: Number(r[0].replace(",", ".")),
      n: Number(r[1].replace(",", ".")),
    };
  });
  const parsed = projectSchema.shape.spt.parse(spt);
  if (parsed.some((s, i) => s.depth <= (i ? parsed[i - 1].depth : 0)))
    throw new Error("Profundidades devem ser únicas e crescentes.");
  return parsed;
}
