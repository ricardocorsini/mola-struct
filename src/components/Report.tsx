import { reviewFoundation, verificationEntries } from "../domain/nbr6122";
import { ReviewSummary } from "./NormativeReview";
import { hasReference16 } from "../domain/benchmark16";
import BenchmarkComparison from "./BenchmarkComparison";
import { BookOpen, ExternalLink } from "lucide-react";
import {
  fmt,
  headConnectionLabel,
  type Foundation,
  type Project,
} from "../domain/model";
import { methodNarrative } from "../domain/methods";
import type { Calculation } from "../domain/engine";
import { Notices } from "./Results";
import PileHeadActions from "./PileHeadActions";
export const references = [
  {
    title:
      "ABNT NBR 6122:2022 · Projeto e execução de fundações · edição consolidada de 25/03/2022, fornecida pelo usuário. Conferência parcial; texto integral não redistribuído.",
    url: "https://www.abntcatalogo.com.br/",
  },
  {
    title: "TQS · Estimativa de Vínculos Elásticos de Fundação",
    url: "https://docs.tqs.com.br/Docs/Details?id=1523972768&language=pt-BR",
  },
  {
    title: "TQS · Coeficiente de mola — Uma estaca (discussão conceitual)",
    url: "https://docs.tqs.com.br/Docs/Details?id=3288&language=pt-BR",
  },
  {
    title:
      "TQS · SISEs – Parte 10 · Articulações na interface estaca–bloco e transmissão por binários",
    url: "https://docs.tqs.com.br/Docs/Details?id=3458&language=pt-br",
  },
  {
    title:
      "Crispin & Mylonakis (2022) · Exact Winkler Solution for Laterally Loaded Piles in Inhomogeneous Soil · Journal of Engineering Mechanics, 148(11), 04022065",
    url: "https://doi.org/10.1061/(ASCE)EM.1943-7889.0002125",
  },
  {
    title:
      "Mindlin (1936) · Force at a Point in the Interior of a Semi-Infinite Solid · Physics 7, 195–202",
    url: "https://doi.org/10.1063/1.1745385",
  },
  {
    title:
      "Silva, Pedro Lima e (2017) · Desenvolvimento de programa computacional para estimativa de recalque elástico de estacas · UFRN, pp. 36–42 · PDF fornecido pelo usuário",
    url: "",
  },
  {
    title:
      "Olavo, Luiz Henrique Felipe (2023) · Código-fonte para cálculo de recalques de fundações · Revista On-line IDD 3, pp. 2–3 · PDF fornecido; divergência no termo 8(1−ν)² documentada",
    url: "",
  },
  {
    title:
      "NIST GCR 12-917-21 · Soil-Structure Interaction for Building Structures (2012)",
    url: "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=915495",
  },
  {
    title:
      "Gazetas (1991) · Formulas and Charts for Impedances of Surface and Embedded Foundations",
    url: "https://doi.org/10.1061/(ASCE)0733-9410(1991)117:9(1363)",
  },
  {
    title:
      "Cruz Junior et al. (2025) · Analysis of a database of instrumented static load tests on continuous flight auger piles in tropical soils",
    url: "https://doi.org/10.1590/0370-44672023780128",
  },
  {
    title: "Vesić (1973) · Analysis of Ultimate Loads of Shallow Foundations",
    url: "https://doi.org/10.1061/JSFEAQ.0001846",
  },
  {
    title:
      "USACE EM 1110-1-1905 (30/10/1992) · Bearing Capacity of Soils · fonte histórica dos fatores",
    url: "https://www.publications.usace.army.mil/portals/76/publications/engineermanuals/em_1110-1-1905.pdf",
  },
];
export default function Report({
  project: p,
  foundation: f,
  result: r,
}: {
  project: Project;
  foundation: Foundation;
  result: Calculation;
}) {
  return (
    <div className="report-wrap">
      <article className="calculation-report">
        <div className="report-brand">
          <img src="/molastruct-icon.png" width="30" height="30" alt="" />
          <span>
            MOLASTRUCT <small>OPENSTRUCT / ENGENHARIA ABERTA</small>
          </span>
          <span className="report-version">
            MEMÓRIA DE CÁLCULO
            <br />v{r.version}
          </span>
        </div>
        <div className="report-title">
          <span>ESTIMATIVA DE RIGIDEZ DE FUNDAÇÕES</span>
          <h1>{p.name}</h1>
          <p>
            {f.name} ·{" "}
            {f.kind === "pile"
              ? `Bloco sobre ${f.count} estacas`
              : "Sapata retangular"}{" "}
            · {p.borehole}
          </p>
        </div>
        <div className="report-intro">
          Documento de desenvolvimento. Os valores refletem as entradas atuais e
          as hipóteses abaixo. As metodologias pendentes não geram valores nesta
          memória.
        </div>
        <h2>01 / Dados de entrada</h2>
        <table>
          <tbody>
            {[
              ["Autor", p.author || "Não informado"],
              ["Observações", p.notes || "—"],
              [
                "Dimensões da base",
                `${fmt(f.capX)} × ${fmt(f.capY)} × ${fmt(f.height)} m`,
              ],
              [
                "Cota da base / nível d’água",
                `${fmt(f.depth)} / ${fmt(p.water)} m`,
              ],
              ["Base rígida de referência", `${fmt(p.bedrock)} m`],
              [
                "Concreto",
                `fck ${fmt(f.fck, 0)} MPa · Ec ${fmt(f.ec, 1)} GPa · νc ${fmt(f.concreteNu)}`,
              ],
              ...(f.kind === "pile"
                ? [
                    [
                      "Estacas",
                      `n = ${f.count} · Ø ${fmt(f.diameter)} m · L ${fmt(f.length)} m`,
                    ],
                    [
                      "Fatores Aoki–Velloso",
                      `F1 = ${fmt(f.f1)} · F2 = ${fmt(f.f2)}`,
                    ],
                    [
                      "Malha e redutor",
                      `${f.segments} elementos / estaca · η = ${fmt(f.efficiency)}`,
                    ],
                    ["Ligação estaca–bloco", headConnectionLabel(f)],
                  ]
                : []),
            ].map(([a, b]) => (
              <tr key={a}>
                <th>{a}</th>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>02 / Perfil geotécnico</h2>
        <table>
          <thead>
            <tr>
              <th>Camada</th>
              <th>Fim (m)</th>
              <th>E (MPa)</th>
              <th>ν</th>
              <th>K_E (MPa)</th>
              <th>α</th>
              <th>K (kPa)</th>
            </tr>
          </thead>
          <tbody>
            {p.layers.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{fmt(l.bottom, 1)}</td>
                <td>{fmt(l.e, 0)}</td>
                <td>{fmt(l.nu)}</td>
                <td>{fmt(l.schmertmannK)}</td>
                <td>{fmt(l.alpha, 3)}</td>
                <td>{fmt(l.k, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>03 / Modelo de cálculo</h2>
        <h3>{r.method || "Entradas inválidas"}</h3>
        {methodNarrative(f).map((t) => (
          <p key={t}>{t}</p>
        ))}
        <table>
          <tbody>
            {[
              ["Origem de E", f.modulusSource],
              ["μh / ρ", `${fmt(f.horizontalRatio)} / ${fmt(f.randolphRho)}`],
              [
                "Integração / transferência",
                `${f.integration} / ${f.transfer} / βp=${fmt(f.tipFraction)}`,
              ],
              [
                "kv informado / σadm",
                `${fmt(f.kvInput)} kN/m³ / ${fmt(f.allowablePressure)} kPa`,
              ],
              ...r.details.map((d) => [
                d.label,
                `${fmt(d.value, d.unit === "m/kN" ? 9 : 4)} ${d.unit}`,
              ]),
            ].map(([a, b]) => (
              <tr key={a}>
                <th>{a}</th>
                <td>{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>04 / Rigidezes e resposta</h2>
        <table>
          <thead>
            <tr>
              <th>Grandeza</th>
              <th>Valor</th>
              <th>Unidade</th>
            </tr>
          </thead>
          <tbody>
            {r.diagonal.map((v, i) => (
              <tr key={i}>
                <th>{["Kx", "Ky", "Kz", "Kθx", "Kθy", "Kθz"][i]}</th>
                <td>{r.valid ? fmt(v, 3) : "Não calculado"}</td>
                <td>{i < 3 ? "kN/m" : "kN·m/rad"}</td>
              </tr>
            ))}
            <tr>
              <th>Recalque linear</th>
              <td>{r.valid ? fmt(r.settlement, 3) : "Não calculado"}</td>
              <td>mm</td>
            </tr>
          </tbody>
        </table>
        <PileHeadActions foundation={f} result={r} />
        <p>
          A diagonal Kii pressupõe os demais graus de liberdade impedidos. Para
          blocos com estacas, os acoplamentos devem ser preservados na matriz
          completa exportada.
        </p>
        <h2>05 / Hipóteses e observações</h2>
        <Notices result={r} />
        <p>
          <b>Pendente:</b> Terzaghi. A edição 1996 é referência histórica do
          print. A conferência segundo 2022 é parcial; sem aprovação integral do
          projeto, dimensionamento do bloco ou validação por provas de carga.
        </p>
        {hasReference16(p, f) && (
          <>
            <h2>Comparação externa — print de 16 m</h2>
            <BenchmarkComparison project={p} foundation={f} result={r} report />
          </>
        )}
        <h2>06 / Conferência parcial — NBR 6122:2022</h2>
        <p>
          Entradas da conferência, separadas dos dados numéricos do motor.
          Registros e limites são declarações do projetista.
        </p>
        <table>
          <tbody>
            {verificationEntries(f).map(([label, value]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ReviewSummary review={reviewFoundation(f, r)} />
        <h2>07 / Referências e rastreabilidade</h2>
        <p>
          Referências de base para o modelo e conferência. A implementação
          reduzida e suas hipóteses são descritas acima; não representa
          reprodução integral das publicações.
        </p>
        {references.map((ref) => (
          <a
            className="report-ref"
            key={ref.title}
            href={ref.url || undefined}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={13} />
            {ref.title}
            <ExternalLink size={11} />
          </a>
        ))}
        <footer>
          MolaStruct · OpenStruct · motor {r.version} · unidades internas: kN,
          m, rad
        </footer>
      </article>
    </div>
  );
}
