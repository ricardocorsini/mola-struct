import { pilePositions, type Foundation, type Project } from "./model";
import { intervals, layerAt, sptAt } from "./profile";
import { solve, zeros, type Matrix } from "./matrix";
import type { Notice } from "./engine";

export type MethodResult = {
  matrix: Matrix;
  details: { label: string; value: number; unit: string }[];
  compliance?: Matrix;
  method?: string;
  kv?: number;
  notices: Notice[];
};
export const TF = 9.80665;
export function safeKv(pressureKpa: number): number {
  const s = pressureKpa / 98.0665;
  if (s < 0.25 - 1e-10 || s > 4 + 1e-10)
    throw new Error(
      "SAFE/Morrison: σadm deve estar entre 24,52 e 392,27 kPa (0,25–4 kgf/cm²). Sem extrapolação.",
    );
  return (
    (-0.0257 * s ** 4 +
      0.2294 * s ** 3 -
      0.6517 * s ** 2 +
      2.5467 * s +
      0.1083) *
    9806.65
  );
}
/** Optional, explicit correlation. Mean N weighted by interval thickness in each layer. */
export function effectiveProfile(p: Project, f: Foundation): Project {
  if (f.modulusSource === "manual") return p;
  let top = 0;
  return {
    ...p,
    layers: p.layers.map((l) => {
      const a = top;
      top = l.bottom;
      const end = Math.min(l.bottom, p.spt.at(-1)!.depth);
      if (end <= a) return l; // coverage of the consumed zone is checked before calculation
      let sum = 0;
      for (const [u, v] of intervals(p, a, end))
        sum += (v - u) * sptAt(p, (u + v) / 2);
      const mean = sum / (end - a);
      const e =
        f.modulusSource === "aoki"
          ? aokiInitialModulus(l.k, mean, f.aokiFactor)
          : 3 * l.schmertmannK * mean;
      if (!(e > 0))
        throw new Error(
          `Correlação SPT: E nulo na camada ${l.name}. Informe E manual ou revise o perfil.`,
        );
      return { ...l, e };
    }),
  };
}
/** E0 = factor K_AV N, with K_AV in kPa/blow and output in MPa. No stress update. */
export function aokiInitialModulus(
  kKpa: number,
  n: number,
  factor: 3 | 4 | 6,
): number {
  return (factor * kKpa * n) / 1000;
}
/** Mindlin vertical Green function, m/kN, depths positive downward, E in kPa.
 * The 8(1-nu)^2 term is essential to recover Boussinesq at c=0. No radius clipping.
 */
export function mindlinVertical(
  r: number,
  z: number,
  c: number,
  e: number,
  nu: number,
): number {
  const r1 = Math.hypot(r, z - c),
    r2 = Math.hypot(r, z + c),
    a = 3 - 4 * nu;
  if (!(r1 > 0 && r2 > 0 && e > 0))
    throw new Error(
      "Ponto singular ou módulo inválido na integral de Mindlin.",
    );
  return (
    ((1 + nu) / (8 * Math.PI * e * (1 - nu))) *
    (a / r1 +
      (8 * (1 - nu) ** 2 - a) / r2 +
      (z - c) ** 2 / r1 ** 3 +
      (a * (z + c) ** 2 - 2 * c * z) / r2 ** 3 +
      (6 * c * z * (z + c) ** 2) / r2 ** 5)
  );
}
/** Gauss–Legendre nodes/weights on [0,1]. */
export function gauss(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)),
      derivative = 0;
    for (let iteration = 0; iteration < 32; iteration++) {
      let p1 = 1,
        p2 = 0;
      for (let j = 1; j <= n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j;
      }
      derivative = (n * (z * p1 - p2)) / (z * z - 1);
      const next = z - p1 / derivative;
      if (Math.abs(next - z) < 1e-15) {
        z = next;
        break;
      }
      z = next;
    }
    out.push([(1 + z) / 2, 1 / ((1 - z * z) * derivative * derivative)]);
  }
  return out;
}
type Source = { x: number; y: number; c: number; load: number };
function layeredResponse(
  p: Project,
  r: number,
  c: number,
  base: number,
): number {
  let top = 0,
    total = 0;
  for (const l of p.layers) {
    const a = Math.max(base, top),
      b = Math.min(p.bedrock, l.bottom);
    top = l.bottom;
    if (b > a)
      total +=
        mindlinVertical(r, a, c, l.e * 1000, l.nu) -
        mindlinVertical(r, b, c, l.e * 1000, l.nu);
  }
  return total;
}
/** Aoki–Velloso provides weights only; proportional mobilization is a declared linear assumption. */
export function pileCompliance(
  p: Project,
  f: Foundation,
  ultimate: number,
  point: number,
): { compliance: Matrix; tip: number; elastic: number; sources: number } {
  const tip =
    f.transfer === "manual"
      ? f.tipFraction
      : ultimate > 0
        ? point / ultimate
        : NaN;
  if (!Number.isFinite(tip))
    throw new Error(
      "Transferência de carga indefinida: resistência Aoki–Velloso nula. Informe a fração de ponta.",
    );
  const shaft = ultimate - point,
    toe = f.depth + f.length,
    radius = f.diameter / 2,
    sources: Source[] = [];
  const angles = 2 * f.integration,
    quad = gauss(f.integration);
  const bounds = [
    ...new Set(
      [
        f.depth,
        toe,
        ...p.layers.map((l) => l.bottom),
        ...p.spt.map((s) => s.depth),
        ...Array.from(
          { length: f.segments - 1 },
          (_, i) => f.depth + ((i + 1) * f.length) / f.segments,
        ),
      ].filter((z) => z >= f.depth && z <= toe),
    ),
  ].sort((a, b) => a - b);
  let elastic = 0,
    cumulative = 0;
  for (let j = 0; j < bounds.length - 1; j++) {
    const a = bounds[j],
      b = bounds[j + 1],
      c = (a + b) / 2,
      l = layerAt(p, c);
    const resistance =
      (Math.PI * f.diameter * l.alpha * l.k * sptAt(p, c) * (b - a)) / f.f2;
    const fraction = shaft > 0 ? ((1 - tip) * resistance) / shaft : 0;
    if (shaft <= 0 && tip < 1)
      throw new Error(
        "Sem resistência de fuste para distribuir a fração lateral. Use fração de ponta igual a 1 ou revise α e SPT.",
      );
    elastic +=
      ((b - a) * (1 - cumulative - fraction / 2)) /
      (f.ec * 1e6 * Math.PI * radius ** 2);
    cumulative += fraction;
    for (let k = 0; k < angles; k++) {
      const angle = (2 * Math.PI * (k + 0.5)) / angles;
      sources.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        c,
        load: fraction / angles,
      });
    }
  }
  for (const [u, w] of quad)
    for (let k = 0; k < angles; k++) {
      const angle = (2 * Math.PI * (k + 0.5)) / angles;
      sources.push({
        x: radius * u * Math.cos(angle),
        y: radius * u * Math.sin(angle),
        c: toe,
        load: (tip * 2 * u * w) / angles,
      });
    }
  const positions = pilePositions(f),
    compliance = zeros(f.count);
  for (let i = 0; i < f.count; i++)
    for (let j = i; j < f.count; j++) {
      const dx = positions[i][0] - positions[j][0],
        dy = positions[i][1] - positions[j][1];
      const soil = sources.reduce(
        (v, s) =>
          v +
          s.load * layeredResponse(p, Math.hypot(dx - s.x, dy - s.y), s.c, toe),
        0,
      );
      compliance[i][j] = compliance[j][i] = soil + (i === j ? elastic : 0);
    }
  // Failure is reported, never hidden by artificial diagonal springs.
  const lower = zeros(f.count);
  for (let i = 0; i < f.count; i++)
    for (let j = 0; j <= i; j++) {
      let v = compliance[i][j];
      for (let k = 0; k < j; k++) v -= lower[i][k] * lower[j][k];
      if (i === j) {
        if (!(v > 0))
          throw new Error(
            "Flexibilidade Mindlin não positiva. Revise estratigrafia, transferência e discretização.",
          );
        lower[i][j] = Math.sqrt(v);
      } else lower[i][j] = v / lower[j][j];
    }
  return { compliance, tip, elastic, sources: sources.length };
}
/** Uniform rectangular pressure, settlement at base center. Duffy map removes the 1/r singularity. */
export function footingCompliance(p: Project, f: Foundation): number {
  const quad = gauss(f.integration),
    a = f.capX / 2,
    b = f.capY / 2;
  let sum = 0;
  for (const [u, wu] of quad)
    for (const [v, wv] of quad)
      sum +=
        wu *
        wv *
        u *
        (layeredResponse(p, Math.hypot(a * u, b * u * v), f.depth, f.depth) +
          layeredResponse(p, Math.hypot(a * u * v, b * u), f.depth, f.depth));
  if (!(sum > 0))
    throw new Error(
      "Flexibilidade da sapata não positiva. Revise a base rígida e as camadas.",
    );
  return sum;
}
export function randolphAxial(
  p: Project,
  f: Foundation,
): { axial: number; e: number; nu: number; zeta: number; muL: number } {
  let e = 0,
    nu = 0;
  for (const [a, b] of intervals(p, f.depth, f.depth + f.length)) {
    const l = layerAt(p, (a + b) / 2);
    e += (b - a) * l.e;
    nu += (b - a) * l.nu;
  }
  e /= f.length;
  nu /= f.length;
  const g = (e * 1000) / (2 * (1 + nu)),
    r = f.diameter / 2,
    rho = f.randolphRho;
  const zeta = Math.log((2.5 * f.length * rho * (1 - nu)) / r);
  if (!(zeta > 0))
    throw new Error(
      "Randolph simplificado: raio de influência deve ser maior que o raio da estaca. Revise L/d, ρ e ν.",
    );
  const muL = (Math.sqrt((2 * g) / (zeta * f.ec * 1e6)) * f.length) / r;
  const axial =
    ((2 * Math.PI * f.length * g * rho) / zeta) * (Math.tanh(muL) / muL);
  return { axial, e, nu, zeta, muL };
}
export function methodMatrix(
  p: Project,
  f: Foundation,
  legacy: Matrix,
  ultimate: number,
  point: number,
): MethodResult {
  const out: MethodResult = { matrix: legacy, details: [], notices: [] };
  const detail = (label: string, value: number, unit: string) =>
    out.details.push({ label, value, unit });
  if (f.kind === "pile" && f.pileMethod === "winkler") return out;
  if (f.kind === "footing" && f.footingMethod === "elastic") return out;
  const matrix = zeros(6);
  out.matrix = matrix;
  if (f.kind === "pile") {
    const pos = pilePositions(f);
    if (f.pileMethod === "mindlin") {
      const m = pileCompliance(p, f, ultimate, point);
      out.compliance = m.compliance;
      // Retain Winkler lateral/bending/torsion, remove only the independent axial spring block.
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) matrix[i][j] = legacy[i][j];
      // Legacy axial contribution is supplied separately by the caller via the explicit block below.
      out.method =
        "Mindlin/Aoki–Lopes + Steinbrenner (vertical) · Winkler lateral/torção";
      detail("Fração de carga na ponta", m.tip, "—");
      detail(
        "Flexibilidade própria do solo",
        m.compliance[0][0] - m.elastic,
        "m/kN",
      );
      detail("Encurtamento elástico por carga unitária", m.elastic, "m/kN");
      detail("Fontes por estaca", m.sources, "—");
      out.notices.push({
        level: "warning",
        message:
          "Mindlin/Aoki–Lopes: cargas de fuste e ponta com mobilização proporcional fixa (ou fração de ponta informada), superposição vertical entre estacas e encurtamento EA. Não é a curva bilinear de mobilização do ALPI. Lateral e torção permanecem Winkler.",
      });
    } else {
      const r = randolphAxial(p, f);
      out.compliance = zeros(f.count);
      for (let i = 0; i < f.count; i++) out.compliance[i][i] = 1 / r.axial;
      matrix[0][0] = matrix[1][1] =
        f.efficiency * f.count * f.horizontalRatio * r.axial;
      // TQS does not define torsion: retain the existing GJ/interface spring, remove horizontal lever below.
      const horizontalLegacy = legacy[0][0] / f.count;
      matrix[5][5] =
        legacy[5][5] +
        pos.reduce(
          (v, [x, y]) =>
            v +
            (f.efficiency * f.horizontalRatio * r.axial - horizontalLegacy) *
              (x * x + y * y),
          0,
        );
      const bending =
        (f.headConnection === "pinned"
          ? 0
          : (1.5 * f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64 / f.length) *
        f.count *
        f.efficiency;
      if (pos.every(([, y]) => Math.abs(y) < 1e-10)) matrix[3][3] = bending;
      if (pos.every(([x]) => Math.abs(x) < 1e-10)) matrix[4][4] = bending;
      out.method = "Randolph–Wroth simplificado conforme TQS · grupo rígido";
      detail("E médio do fuste", r.e, "MPa");
      detail("ν médio do fuste", r.nu, "—");
      detail("ζ = ln(rm/r0)", r.zeta, "—");
      detail("μRW L", r.muL, "—");
      detail("Kz por estaca", r.axial, "kN/m");
      out.notices.push({
        level: "warning",
        message:
          "Formulação simplificada publicada pelo TQS, com parcela de fuste de Randolph–Wroth. E e ν médios por espessura no fuste; ρ informado. Sem interação entre estacas nem termo de base do método completo. Kh = μh Kz, independente da ligação nesta aproximação. Rotação sem braço = 0,5·3EI/L por estaca somente na ligação rígida; nula na rotulada. Torção usa Winkler + braço horizontal.",
      });
    }
  } else {
    let kv = f.kvInput;
    if (f.footingMethod === "safe") {
      kv = safeKv(f.allowablePressure);
      detail("σadm informado", f.allowablePressure, "kPa");
    }
    if (f.footingMethod === "mindlin") {
      const compliance = footingCompliance(p, f);
      kv = 1 / compliance / (f.capX * f.capY);
      detail("Flexibilidade vertical no centro", compliance, "m/kN");
    }
    const area = f.capX * f.capY,
      kz = kv * area,
      kh = f.horizontalRatio * kz,
      ix = (f.capX * f.capY ** 3) / 12,
      iy = (f.capY * f.capX ** 3) / 12;
    const diag = [kh, kh, kz, kv * ix, kv * iy, (kh / area) * (ix + iy)];
    diag.forEach((v, i) => (matrix[i][i] = v));
    out.kv = kv;
    detail("kv adotado", kv, "kN/m³");
    detail("Razão horizontal μh", f.horizontalRatio, "—");
    out.method =
      f.footingMethod === "mindlin"
        ? "Mindlin–Steinbrenner · pressão uniforme / centro da sapata"
        : f.footingMethod === "safe"
          ? "Winkler · correlação SAFE/Morrison conforme TQS"
          : "Winkler · kv informado";
    out.notices.push({
      level: "warning",
      message:
        f.footingMethod === "mindlin"
          ? "Recalque avaliado no centro de área retangular sob pressão uniforme, com base indeslocável. Não é solução de punção rígida nem de distribuição real de contato. Rotações por kv I; Kh = μh Kz e torção distribuída são aproximações adicionais."
          : "Sapatas: Kz = kv A; Kθx = kv Ix; Kθy = kv Iy; Kh = μh Kz conforme a estimativa TQS. A extensão torsional Kθz = (Kh/A)(Ix+Iy) é uma hipótese do MolasStruct.",
    });
  }
  if (
    (f.kind === "pile" && f.pileMethod === "mindlin") ||
    (f.kind === "footing" && f.footingMethod === "mindlin")
  ) {
    detail("Base indeslocável", p.bedrock, "m");
    detail("Ordem de integração", f.integration, "—");
    for (let i = 1; i < p.layers.length; i++)
      if (
        Math.max(
          p.layers[i].e / p.layers[i - 1].e,
          p.layers[i - 1].e / p.layers[i].e,
        ) >= 10
      )
        out.notices.push({
          level: "warning",
          message:
            "Contraste de módulos ≥ 10 entre camadas: o artifício de Steinbrenner pode perder validade (Silva, 2017, p. 38).",
        });
  }
  return out;
}
/** Assemble the axial block from flexibility, replacing the legacy independent springs. */
export function replaceAxial(
  matrix: Matrix,
  f: Foundation,
  compliance: Matrix,
  legacyAxial: number,
): void {
  const b = pilePositions(f).map(([x, y]) => [0, 0, 1, y, -x, 0]);
  for (let col = 0; col < f.count; col++) {
    const unit = Array(f.count).fill(0);
    unit[col] = 1;
    const inverse = solve(compliance, unit);
    for (let row = 0; row < f.count; row++)
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++)
          matrix[i][j] += f.efficiency * b[row][i] * inverse[row] * b[col][j];
  }
  if (legacyAxial)
    for (const bi of b)
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++)
          matrix[i][j] -= f.efficiency * bi[i] * legacyAxial * bi[j];
}
export function methodNarrative(f: Foundation): string[] {
  const common =
    "Unidades internas: kN, m, rad. Profundidades positivas para baixo; ponta da estaca em D+L. Matriz referida ao centro da face inferior do bloco/sapata, com Z estrutural para cima.";
  const source =
    f.modulusSource === "aoki"
      ? `E0 = ${f.aokiFactor} K_AV N̄SPT (Aoki, 1984); K_AV em kPa/golpe, conversão para MPa. Fatores 6/4/3 para cravada/hélice contínua/escavada. Módulo inicial sem atualização de Es por tensão geostática e acréscimo de tensão; ν informado. Não se usa K_E de Schmertmann nesta correlação.`
      : f.modulusSource === "spt"
        ? "E = 3 K_E N̄SPT (MPa), por camada e média ponderada por espessura dos intervalos investigados. ν informado. K_E de Schmertmann não é K de Aoki–Velloso."
        : "E e ν informados por camada. Não há correlação automática nesta seleção.";
  let model: string[];
  if (f.kind === "pile") {
    model =
      f.pileMethod === "winkler"
        ? [
            "Viga Euler–Bernoulli: EI w'''' + kh d w = 0. Barra axial: EA u'' − kt U u = 0. Matriz consistente de reação. Ponta lateral livre; mola axial kp Ap. Torção por GJ e kt U r², sem mola torsional de ponta.",
            "Bloco rígido: K = η Σ(Tᵀ Kestaca T). Estacas independentes; sem contato bloco–solo.",
          ]
        : f.pileMethod === "randolph"
          ? [
              "Estimativa simplificada TQS/Randolph–Wroth: E e ν médios aritméticos por espessura no fuste; G = E/[2(1+ν)], rm = 2,5 L ρ (1−ν), ζ = ln(rm/r0), μRW = √[2G/(ζEp)]/r0. k = (2πLGρ/ζ) tanh(μRW L)/(μRW L).",
              "A expressão publicada corresponde à parcela de fuste; não implementa o termo de ponta da solução completa de Randolph–Wroth. Kh = μh Kz; rotação sem braço geométrico = 0,5·3EI/L por estaca. Grupo: soma das molas verticais e respectivos braços. Sem interação de grupo. Torção: Winkler GJ/interface + braços de Kh.",
            ]
          : [
              "Mindlin: w/P = (1+ν)/[8πE(1−ν)] × {(3−4ν)/R1 + [8(1−ν)²−(3−4ν)]/R2 + (z−c)²/R1³ + [(3−4ν)(z+c)²−2cz]/R2³ + 6cz(z+c)²/R2⁵}. R1²=r²+(z−c)²; R2²=r²+(z+c)².",
              "Aoki–Lopes: superposição de cargas elementares no fuste circular e na ponta uniforme. Frações de fuste ponderadas por αKN/F2, ponta definida pela razão RP/(RL+RP) ou informada. Mobilização proporcional fixa, independente do nível de carga; não reproduz a curva bilinear de mobilização do ALPI.",
              "Steinbrenner: Σ[w(topo,Ei,νi)−w(base,Ei,νi)] das camadas entre a ponta e a base indeslocável. Avaliação no centro da ponta de cada estaca. Encurtamento elástico próprio = ∫N(z)/(Ep Ap) dz. Flexibilidade C inclui as contribuições mútuas; Kvertical = η Bᵀ C⁻¹ B, B=[1,y,−x]. Lateral, flexão local e torção continuam pelo modelo Winkler.",
            ];
    model.push(
      f.headConnection === "pinned"
        ? "Ligação estaca–bloco rotulada à flexão em X e Y: Mx=My=0 no topo; bloco permanece rígido. Em Winkler e no lateral do Mindlin, kh,rotulado = Kuu − Kuθ Kθθ⁻¹ Kθu, antes da montagem do grupo. Eliminam-se momentos locais e acoplamentos de flexão; os braços axiais e a torção em Z são preservados. No Randolph simplificado, Kh=μh Kz permanece uma hipótese independente; remove-se apenas a flexão local aproximada. A rótula não elimina momentos ao longo do fuste sob ações laterais."
        : "Ligação estaca–bloco rígida à flexão: θx e θy dos topos acompanham o bloco. Momentos podem ser resistidos pelos binários axiais e pela flexão local das estacas. A rigidez da estaca e do solo é finita; não é um apoio perfeitamente engastado no terreno.",
      "Aoki–Velloso é independente do cálculo de rigidez: RL = U Σ(α K N Δz)/F2; RP = Ap K Np/F1. α decimal; K em kPa/golpe. Np pertence ao intervalo que termina na ponta, inclusive em fronteira de camada. Sem médias ou limites automáticos de Np e sem verificação normativa de grupo.",
    );
  } else {
    model =
      f.footingMethod === "elastic"
        ? [
            "Disco de mesma área: r=√(A/π), G=Eeq/[2(1+ν)], Kz=4Gr/(1−ν), Kh=8Gr/(2−ν). Eeq harmônico e ν médio na faixa de 2B abaixo da base. Sem correção de embutimento nem base rígida.",
          ]
        : f.footingMethod === "mindlin"
          ? [
              "Mindlin–Steinbrenner: pressão uniforme sobre retângulo, integração por Gauss–Legendre com transformação de Duffy, sem corte artificial da singularidade. Soma das diferenças de deslocamento por camada até a base indeslocável. Kz = P/wcentro, kv = Kz/A. É o recalque no centro de uma base flexível sob pressão uniforme; não é a solução de contato de sapata rígida.",
            ]
          : f.footingMethod === "safe"
            ? [
                "SAFE/Morrison conforme TQS: kv = −0,0257 σ⁴ + 0,2294 σ³ − 0,6517 σ² + 2,5467 σ + 0,1083; σ em kgf/cm² e kv em kgf/cm³. Conversões: 1 kgf/cm² = 98,0665 kPa; 1 kgf/cm³ = 9.806,65 kN/m³. Faixa 0,25–4 kgf/cm², sem extrapolação. σadm é informado pelo projetista e não é obtido automaticamente de Vésic.",
              ]
            : [
                "Winkler com kv informado em kN/m³. Kz = kv A. Não há dedução automática de kv a partir da capacidade de carga.",
              ];
    model.push(
      "Rotações aproximadas por Winkler: Kθx = kv Ix; Kθy = kv Iy. Nos métodos com kv, Kh = μh Kz. Extensão torsional adotada pelo MolasStruct: Kθz = (Kh/A)(Ix+Iy). Modelo linear bilateral, sem redistribuição do contato quando houver levantamento.",
    );
    model.push(
      "Capacidade Vésic: fatores de forma incluídos, demais fatores unitários; peso específico efetivo com nível d’água. qSPT = C N̄(2B) é referência exploratória. Terzaghi permanece pendente; NBR 6122:1996 é referência histórica do print. Critérios parciais da NBR 6122:2022 são conferidos separadamente.",
    );
  }
  return [common, source, ...model];
}
