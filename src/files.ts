import {
  hasReference16,
  reference16Comparison,
  referenceInputDifferences,
  benchmarkAssumptions,
  axialDiagnostics,
  reference16,
} from "./domain/benchmark16";
import { twoPileRotationAudit } from "./domain/rotationAudit";
import {
  reviewFoundation,
  reviewLabels,
  verificationEntries,
} from "./domain/nbr6122";
import { methodNarrative } from "./domain/methods";
import { lateralEntries, lateralSummary } from "./domain/lateral";
import { teixeiraAlpha } from "./domain/footing";
import {
  hasFootingReference,
  footingBenchmarkTable,
} from "./domain/benchmarkFootings";
import { isTauri } from "@tauri-apps/api/core";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { SectionSvg } from "./components/SectionView";
import { references } from "./components/Report";
import {
  fmt,
  headConnectionLabel,
  type Foundation,
  type Project,
} from "./domain/model";
import type { Calculation } from "./domain/engine";
export const safeName = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 70) || "projeto";
export async function saveFile(
  name: string,
  data: string | Uint8Array,
  mime: string,
  extension: string,
): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: name,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (!path) return false;
    const fs = await import("@tauri-apps/plugin-fs");
    if (typeof data === "string") await fs.writeTextFile(path, data);
    else await fs.writeFile(path, data);
    return true;
  }
  const bytes = typeof data === "string" ? data : new Uint8Array(data).buffer;
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
export async function nativeOpen() {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({
    multiple: false,
    filters: [{ name: "Projeto MolaStruct", extensions: ["json"] }],
  });
  if (!path) return null;
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  return readTextFile(path);
}
const csvN = (n: number) =>
  Number.isFinite(n) ? n.toFixed(6).replace(".", ",") : "";
const csvText = (s: string) => `"${s.replace(/"/g, '""')}"`;
export function matrixCsv(f: Foundation, r: Calculation): string {
  const header = [
    "GDL",
    "ux (m)",
    "uy (m)",
    "uz (m)",
    "theta_x (rad)",
    "theta_y (rad)",
    "theta_z (rad)",
  ];
  return (
    "\uFEFF" +
    [
      ["MolaStruct", f.name, "kN;m;rad"].map(csvText).join(";"),
      header.join(";"),
      ...r.matrix.map((row, i) =>
        [
          csvText(
            [
              "Fx (kN)",
              "Fy (kN)",
              "Fz (kN)",
              "Mx (kN.m)",
              "My (kN.m)",
              "Mz (kN.m)",
            ][i],
          ),
          ...row.map(csvN),
        ].join(";"),
      ),
      ...(f.kind === "pile"
        ? [
            ["Ligação estaca–bloco", headConnectionLabel(f)]
              .map(csvText)
              .join(";"),
          ]
        : []),
      [
        "GDL livres",
        r.freeDofs.map((i) => header[i + 1]).join(", ") || "Nenhum",
      ]
        .map(csvText)
        .join(";"),
      ["Reação horizontal", lateralSummary(f)].map(csvText).join(";"),
      ...(f.kind === "footing"
        ? [
            ["Modelo", r.method].map(csvText).join(";"),
            ["Origem E", f.modulusSource].map(csvText).join(";"),
            [
              "Meio contínuo",
              f.footingMethod === "halfspace"
                ? (f.footingSoil ?? "support")
                : "não aplicável",
            ]
              .map(csvText)
              .join(";"),
            ...r.details.map((d) =>
              [d.label, csvN(d.value), d.unit].map(csvText).join(";"),
            ),
          ]
        : []),
    ].join("\r\n")
  );
}
export const sptCsv = (p: Project) =>
  "\uFEFFprofundidade_m;N_SPT\r\n" +
  p.spt.map((s) => `${String(s.depth).replace(".", ",")};${s.n}`).join("\r\n");
export function resultsTsv(f: Foundation, r: Calculation): string {
  return (
    `Fundação\t${f.name}\nGDL\tX\tY\tZ\tthetaX\tthetaY\tthetaZ\n` +
    r.matrix
      .map((row, i) =>
        [["Fx", "Fy", "Fz", "Mx", "My", "Mz"][i], ...row.map(csvN)].join("\t"),
      )
      .join("\n") +
    "\nUnidades: kN, m, rad. Matriz no centro da base; Fz = -N."
  );
}
export function sectionSvg(p: Project, f: Foundation, plan = false): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    renderToStaticMarkup(
      createElement(SectionSvg, { project: p, foundation: f, plan }),
    )
  );
}
export function geometryDxf(f: Foundation): string {
  const e: string[] = [];
  const add = (...v: (string | number)[]) => e.push(...v.map(String));
  add(
    0,
    "SECTION",
    2,
    "HEADER",
    9,
    "$ACADVER",
    1,
    "AC1015",
    9,
    "$INSUNITS",
    70,
    6,
    0,
    "ENDSEC",
    0,
    "SECTION",
    2,
    "ENTITIES",
  );
  const rect = (x: number, y: number, w: number, h: number, layer: string) =>
    add(
      0,
      "LWPOLYLINE",
      8,
      layer,
      90,
      4,
      70,
      1,
      10,
      x,
      20,
      y,
      10,
      x + w,
      20,
      y,
      10,
      x + w,
      20,
      y + h,
      10,
      x,
      20,
      y + h,
    );
  const text = (x: number, y: number, s: string) =>
    add(0, "TEXT", 8, "TEXTOS", 10, x, 20, y, 30, 0, 40, 0.1, 1, safeAscii(s));
  rect(-f.capX / 2, -f.capY / 2, f.capX, f.capY, "PLANTA");
  rect(-0.21, -0.21, 0.42, 0.42, "PILAR");
  const pos =
    f.count === 1
      ? [[0, 0]]
      : f.count === 2
        ? [
            [-f.spacingX / 2, 0],
            [f.spacingX / 2, 0],
          ]
        : f.count === 3
          ? [
              [-f.spacingX / 2, -f.spacingY / 3],
              [f.spacingX / 2, -f.spacingY / 3],
              [0, (2 * f.spacingY) / 3],
            ]
          : [
              [-f.spacingX / 2, -f.spacingY / 2],
              [f.spacingX / 2, -f.spacingY / 2],
              [f.spacingX / 2, f.spacingY / 2],
              [-f.spacingX / 2, f.spacingY / 2],
            ];
  if (f.kind === "pile")
    pos.forEach(([x, y], i) => {
      add(0, "CIRCLE", 8, "ESTACAS", 10, x, 20, y, 30, 0, 40, f.diameter / 2);
      text(x, y + f.diameter / 2 + 0.15, `E${i + 1}`);
    });
  text(-f.capX / 2, f.capY / 2 + 0.5, `${f.name} - PLANTA - m`);
  const offset = -f.capY / 2 - 2;
  rect(-f.capX / 2, offset - f.depth, f.capX, f.height, "CORTE");
  if (f.kind === "pile")
    [...new Set(pos.map((v) => v[0]))].forEach((x) =>
      rect(
        x - f.diameter / 2,
        offset - f.depth - f.length,
        f.diameter,
        f.length,
        "CORTE",
      ),
    );
  text(-f.capX / 2, offset + 0.3, `${f.name} - CORTE - D=${f.depth} m`);
  text(
    -f.capX / 2,
    offset - f.depth - (f.kind === "pile" ? f.length : 0) - 0.5,
    "MolaStruct / OpenStruct - geometria esquematica",
  );
  add(0, "ENDSEC", 0, "EOF");
  return e.join("\n") + "\n";
}
function safeAscii(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[θΘ]/g, "theta")
    .replace(/[ν]/g, "nu")
    .replace(/[α]/g, "alpha")
    .replace(/[γ]/g, "gamma")
    .replace(/[−–—→]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/[³]/g, "3")
    .replace(/[²]/g, "2")
    .replace(/[Σ]/g, "SUM")
    .replace(/[Δ]/g, "Delta")
    .replace(/[₀₁₂]/g, (c) => ({ "₀": "0", "₁": "1", "₂": "2" })[c] ?? c)
    .replace(/[^\x20-\x7E\n]/g, "");
}
export async function reportPdf(
  p: Project,
  f: Foundation,
  r: Calculation,
): Promise<Uint8Array> {
  const [{ jsPDF }, fonts] = await Promise.all([
    import("jspdf"),
    import("./pdfFonts"),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.addFileToVFS("DejaVuSans.ttf", fonts.regular);
  pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", fonts.bold);
  pdf.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
  let y = 35;
  let page = 1;
  const pageHeader = () => {
    pdf.setFillColor(52, 72, 209);
    pdf.rect(0, 0, 210, 10, "F");
    pdf.setFont("DejaVu", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(52, 72, 209);
    pdf.text("MOLASTRUCT / OPENSTRUCT", 18, 20);
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    pdf.text("MEMORIA DE CALCULO - v" + r.version, 192, 20, { align: "right" });
  };
  const next = () => {
    pdf.setFontSize(7);
    pdf.setTextColor(120);
    pdf.text(`Motor experimental - kN, m, rad | ${page++}`, 18, 286);
    pdf.addPage();
    y = 29;
    pageHeader();
  };
  pageHeader();
  const text = (s: string, size = 9, bold = false, color = 55) => {
    pdf.setFont("DejaVu", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    const lines = pdf.splitTextToSize(
      s.replace(/[−–—]/g, "-"),
      174,
    ) as string[];
    for (const line of lines) {
      if (y > 273) {
        next();
        pdf.setFont("DejaVu", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(color);
      }
      pdf.text(line, 18, y);
      y += size * 0.48;
    }
    y += 2;
  };
  const title = (s: string) => {
    if (y > 247) next();
    y += 5;
    text(s, 12, true, 52);
  };
  const row = (a: string, b: string) => text(`${a}: ${b}`);
  text(p.name, 19, true);
  text(
    `${f.name} - ${f.kind === "pile" ? `Bloco sobre ${f.count} estacas` : "Sapata retangular"} - Sondagem ${p.borehole}`,
    10,
  );
  text(
    "Estimativa experimental de rigidez. Sem avaliacao de conformidade normativa. As hipoteses e os metodos pendentes fazem parte deste documento.",
    9,
    true,
  );
  title("01 / Projeto e geometria");
  row("Autor", p.author || "Nao informado");
  row("Observacoes", p.notes);
  row(
    "Dimensoes da base",
    `${fmt(f.capX)} x ${fmt(f.capY)} x ${fmt(f.height)} m`,
  );
  row(
    "Cota da base / NA / base rígida",
    `${fmt(f.depth)} / ${fmt(p.water)} / ${fmt(p.bedrock)} m`,
  );
  row(
    "Concreto",
    `fck=${fmt(f.fck)} MPa; Ec=${fmt(f.ec)} GPa; nu=${fmt(f.concreteNu)}`,
  );
  if (f.kind === "pile") {
    row(
      "Estacas",
      `n=${f.count}; d=${fmt(f.diameter)} m; L=${fmt(f.length)} m; sx=${fmt(f.spacingX)} m; sy=${fmt(f.spacingY)} m`,
    );
    row(
      "Modelo",
      `${f.segments} elementos por estaca; eta=${fmt(f.efficiency)}; F1=${fmt(f.f1)}; F2=${fmt(f.f2)}`,
    );
  } else
    row(
      "Parametros de referencia",
      `FS=${fmt(f.safety)}; C_SPT=${fmt(f.sptFactor)} kPa/golpe`,
    );
  row(
    "Acoes",
    `N=${fmt(f.n)} kN; Hx=${fmt(f.hx)} kN; Hy=${fmt(f.hy)} kN; Mx=${fmt(f.mx)} kN.m; My=${fmt(f.my)} kN.m; Mz=${fmt(f.mz)} kN.m`,
  );
  title("02 / Sondagem e estratigrafia");
  text("SPT - profundidade final do intervalo (m) / N (golpes)");
  text(p.spt.map((s) => `${fmt(s.depth, 1)} / ${s.n}`).join("   |   "), 8);
  p.layers.forEach((l, i) => {
    text(`Camada ${i + 1}: ${l.name} - ate ${fmt(l.bottom)} m`, 10, true);
    row(
      "Elasticidade",
      `K_E=${fmt(l.schmertmannK)} MPa; αTG=${l.teixeiraAlpha ?? (l.soil === "fill" ? "não associado" : teixeiraAlpha(l))}; E informado=${fmt(l.e)} MPa; nu=${fmt(l.nu)}`,
    );
    row(
      "Capacidade",
      `alpha=${fmt(l.alpha, 4)}; K=${fmt(l.k)} kPa; phi=${fmt(l.phi)} graus; c=${fmt(l.cohesion)} kPa; gamma=${fmt(l.gamma)} kN/m3; gamma_sat=${fmt(l.gammaSat)} kN/m3`,
    );
    row(
      "Reacao de interface",
      `kh=${fmt(l.kh)}; kt=${fmt(l.shaftK)}; kp=${fmt(l.baseK)} kN/m3`,
    );
  });
  title("03 / Modelo e hipoteses");
  text(r.method, 10, true);
  if (f.kind === "pile") row("Ligação estaca–bloco", headConnectionLabel(f));
  for (const paragraph of methodNarrative(f)) text(paragraph);
  for (const [label, value] of lateralEntries(p, f)) row(label, value);
  row(
    "Seletores",
    `E=${f.modulusSource}; μh=${fmt(f.horizontalRatio)}; ρ=${fmt(f.randolphRho)}; integração=${f.integration}; transferência=${f.transfer}; βp=${fmt(f.tipFraction)}`,
  );
  row(
    "kv / σadm informados",
    `${fmt(f.kvInput)} kN/m³ / ${fmt(f.allowablePressure)} kPa`,
  );
  for (const d of r.details)
    row(d.label, `${fmt(d.value, d.unit === "m/kN" ? 9 : 4)} ${d.unit}`);
  title("04 / Matriz de rigidez e resposta");
  text(
    "F = K u. Ordem: X, Y, Z, thetaX, thetaY, thetaZ. Z positivo para cima; Fz=-N. Translacoes em m e rotacoes em rad. Bloco TT: kN/m, TR e RT: kN, RR: kN.m/rad. A diagonal Kii pressupoe outros GDL impedidos.",
  );
  r.matrix.forEach((values, i) =>
    text(
      `${["Fx", "Fy", "Fz", "Mx", "My", "Mz"][i]} | ${values.map((n) => n.toExponential(5)).join(" | ")}`,
      7,
    ),
  );
  row(
    "Resposta [mm, mrad]",
    r.displacement
      .map((v, i) =>
        r.freeDofs.includes(i) ? "Livre / indeterminado" : fmt(v * 1000, 5),
      )
      .join(" ; "),
  );
  row("Recalque linear", `${fmt(r.settlement, 4)} mm`);
  title("05 / Capacidade de carga");
  if (f.kind === "pile") {
    text(
      "Aoki-Velloso: RL=U SUM(alpha K N DeltaL / F2); RP=Ap K Np / F1. Np e o valor do intervalo da ponta. Sem truncamento de N e sem fatores de seguranca. Valores por estaca isolada, sem verificacao de grupo.",
    );
    row(
      "RL / RP / Rultima",
      `${fmt(r.shaft ?? 0)} / ${fmt(r.point ?? 0)} / ${fmt(r.ultimate ?? 0)} kN por estaca`,
    );
    r.segments.forEach((s) =>
      text(
        `${fmt(s.top, 1)}-${fmt(s.bottom, 1)} m | ${s.layer} | N=${s.n} | DeltaRL=${fmt(s.shaft, 3)} kN`,
        8,
      ),
    );
    row(
      "Reacoes nas estacas",
      r.pileForces.map((v, i) => `E${i + 1}=${fmt(v)} kN`).join("; "),
    );
    for (const [i, moments] of r.pileMoments.entries())
      row(
        `Momentos de topo · E${i + 1}`,
        `Mx=${fmt(moments[0], 4)}; My=${fmt(moments[1], 4)} kN·m`,
      );
  } else {
    text(
      "Vesic: qult=c Nc sc + q Nq sq + 0.5 gamma' B Ngamma sg. Nq=exp(pi tan(phi)) tan(pi/4+phi/2)^2; Nc=(Nq-1)/tan(phi), limite pi+2 para phi=0; Ngamma=2(Nq+1)tan(phi). sc=1+(Nq/Nc)(B/L); sq=1+(B/L)tan(phi); sg=1-0.4(B/L). Fatores de profundidade, inclinacao e excentricidade unitarios. Pesos efetivos com NA e estratigrafia.",
    );
    row(
      "qult / qult-FS / qSPT",
      `${fmt(r.qUltimate ?? 0)} / ${fmt(r.qReference ?? 0)} / ${fmt(r.qSpt ?? 0)} kPa`,
    );
    row("qmin / qmax", `${fmt(r.qMin ?? 0)} / ${fmt(r.qMax ?? 0)} kPa`);
    text(
      "qSPT=C Nmedio(2B) e referencia exploratoria sem atribuicao normativa. Nao constitui tensao ultima nem verificacao normativa.",
    );
  }
  title("06 / Observacoes de validacao");
  r.notices.forEach((n) => text(`[${n.level.toUpperCase()}] ${n.message}`, 8));
  text(
    "Terzaghi permanece pendente. NBR 6122:1996 é referência histórica do print, sem resultado calculado. A conferência atual segundo 2022 é parcial.",
  );
  if (hasFootingReference(p, f)) {
    title("Comparação externa — sapatas FEMA 273");
    text(
      "Silte NSPT=7, E=12,25 MPa (1.249,15 tf/m² arredondado), ν=0,35. Atual / print: Kx, Kz em tf/m; Kθx e Kθz em tf·m/rad. Tolerância do print: ±0,05 por coluna. Não valida capacidade, contato não linear ou estratificação.",
    );
    for (const row of footingBenchmarkTable(p))
      text(
        `${row.cm}×${row.cm} cm | ${row.expected.map((v, i) => `${row.actual ? fmt(row.actual[i], 1) : "—"}/${fmt(v, 1)}`).join(" | ")} | ${row.match ? "Compatível" : "Revisar entradas"}`,
        8,
      );
  }
  if (hasReference16(p, f)) {
    title("Comparação externa — duas estacas de 16 m");
    text(
      "Referência com NSPT(11)=17. Confira os estados de cada linha; rigidezes ainda dependem das hipóteses não confirmadas.",
      9,
      true,
    );
    const changes = referenceInputDifferences(p, f);
    if (changes.length)
      text(
        "Entradas alteradas em relação ao print: " + changes.join("; "),
        8,
        true,
      );
    for (const a of benchmarkAssumptions) text(a, 8);
    for (const row of reference16Comparison(p, f, r)) {
      text(
        `${row.label}: print=${fmt(row.expected, 4)}; modelo=${row.actual === null ? "Não calculado" : fmt(row.actual, 4)} ${row.unit}; Δ=${row.differencePercent === null ? "—" : fmt(row.differencePercent, 3) + "%"}`,
        8,
        true,
      );
      text(
        `${row.status === "match" ? "Confere no arredondamento" : row.status === "different" ? "Diverge" : row.status === "conditional" ? "Não confirmado" : "Não calculado"}. ${row.note}`,
        8,
      );
    }
    for (const d of axialDiagnostics(f, r))
      row(
        d.label,
        `Kz=${fmt(d.diagonal[0], 4)} tf/m; Kθx=${fmt(d.diagonal[1], 4)}; Kθy=${fmt(d.diagonal[2], 4)} tf·m/rad`,
      );
    text(
      "As parcelas axiais são diagnósticos e não substituem a matriz ativa, que também contém flexão e torção.",
      8,
    );
    const audit = twoPileRotationAudit(f, r);
    if (audit.available) {
      // Keep the reconstruction and its boundary cases together when space is short.
      if (y > 155) next();
      title("Investigação da diferença de Kθy");
      text(
        `Parcela axial=${fmt(audit.axialRy, 4)} e flexão local=${fmt(audit.localRy, 4)} tf·m/rad. Sem a flexão local, a diferença para o print é ${fmt(audit.axialDifferencePercent, 3)}%. A matriz ativa foi preservada.`,
        8,
      );
      row("Valor do print", `${fmt(reference16.ry, 4)} tf·m/rad`);
      for (const t of audit.terms) row(t.label, `${fmt(t.value, 5)} tf·m/rad`);
      row("Soma reconstruída", `${fmt(audit.reconstructed, 4)} tf·m/rad`);
      text(
        `Para C=[[a,b],[b,a]], Kz=2η/(a+b) e Kθy,axial=ηs²/[2(a-b)]. b/a=${fmt(audit.interactionRatio * 100, 4)}%. O modo de movimento comum usa a+b; o modo de incrementos axiais opostos usa a-b.`,
        8,
      );
      text(
        `Kθy≈Kz·s²/4 no print, com desvio residual ${fmt(-audit.referenceClosure, 5)} tf·m/rad. O limite do arredondamento a 0,01 é ${fmt(audit.referenceRoundingBound, 5)}: a relação é próxima, mas não exata.`,
        8,
      );
      for (const test of audit.boundaryCases)
        row(test.label, `${fmt(test.ry, 4)} tf·m/rad`);
      text(
        "Liberar Hx=0 aplica o complemento de Schur e é diferente de articular os topos. A opção rotulada em Métodos libera os momentos locais e condensa os acoplamentos antes da montagem. Os cenários diagnósticos não modificam a seleção ativa nem identificam, sozinhos, o algoritmo do print.",
        8,
      );
    }
  }
  title("07 / Conferência parcial — NBR 6122:2022");
  const review = reviewFoundation(f, r);
  text(
    "Este documento não declara conformidade integral, certificação do motor nem aprovação da fundação. Critérios calculados e declarações do usuário são identificados separadamente.",
    9,
    true,
  );
  text("Entradas da conferência (registro completo):", 8, true);
  for (const [label, value] of verificationEntries(f)) row(label, value);
  for (const i of review.items) {
    if (y > 245) next();
    text(`${i.title} · ${i.clause} · ${reviewLabels[i.status]}`, 8, true);
    if (i.value !== undefined)
      text(
        `Valor=${fmt(i.value, 4)} ${i.unit ?? ""}${i.limit !== undefined ? ` · limite/referência=${fmt(i.limit, 4)}` : ""}`,
        8,
      );
    text(i.message, 8);
  }
  for (const m of review.metrics) row(m.label, `${fmt(m.value, 4)} ${m.unit}`);
  // Keep the bibliography together when it fits on one page.
  const referenceEntryHeight = (ref: (typeof references)[number]) => {
    pdf.setFont("DejaVu", "bold");
    pdf.setFontSize(7);
    const titleLines = pdf.splitTextToSize(ref.title, 174).length;
    pdf.setFont("DejaVu", "normal");
    pdf.setFontSize(6);
    pdf.setFontSize(6);
    const urlLines = ref.url ? pdf.splitTextToSize(ref.url, 174).length : 0;
    return titleLines * 7 * 0.48 + 2 + (urlLines ? urlLines * 6 * 0.48 + 2 : 0);
  };
  const referenceHeight = references.reduce(
    (height, ref) => height + referenceEntryHeight(ref),
    20,
  );
  if (y + referenceHeight > 273) next();
  title("08 / Referencias");
  references.forEach((ref) => {
    if (y + referenceEntryHeight(ref) > 273) next();
    text(ref.title, 7, true);
    if (ref.url) text(ref.url, 6);
  });
  pdf.setFontSize(7);
  pdf.setTextColor(120);
  pdf.text(`Motor experimental - kN, m, rad | ${page}`, 18, 286);
  pdf.setProperties({
    title: `${p.name} - ${f.name} - Memoria de calculo`,
    author: p.author || "OpenStruct",
    subject: "Estimativa experimental de rigidez de fundacoes",
  });
  return new Uint8Array(pdf.output("arraybuffer"));
}
