import { BookOpen, ExternalLink } from "lucide-react";
import { fmt, type Foundation, type Project } from "../domain/model";
import type { Calculation } from "../domain/engine";
import { Notices } from "./Results";
export const references = [
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
          <img src="/molas.svg" width="30" height="30" alt="" />
          <span>
            MOLASSTRUCT <small>OPENSTRUCT / ENGENHARIA ABERTA</small>
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
              ["Impenetrável", `${fmt(p.bedrock)} m`],
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
                <td>{fmt(l.alpha, 3)}</td>
                <td>{fmt(l.k, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Parâmetros de deformabilidade informados, sem derivação automática a
          partir de N SPT.
        </p>
        <h2>03 / Modelo de cálculo</h2>
        <h3>{r.method || "Entradas inválidas"}</h3>
        {f.kind === "pile" ? (
          <>
            <p>
              Estacas modeladas como barras axiais e vigas de Euler–Bernoulli em
              base elástica de Winkler. A malha utiliza {f.segments} elementos
              por estaca, matriz consistente de reação lateral e molas
              distribuídas de interface do fuste. A ponta axial possui mola kp ×
              Ap; a ponta lateral é livre.
            </p>
            <div className="report-formula">
              EI · w'''' + kh · d · w = 0<br />
              EA · u'' − kt · U · u = 0<br />
              Kbloco = η · Σ(Tᵢᵀ · Kestaca · Tᵢ)
            </div>
            <p>
              Topo solidário ao bloco rígido, sem contato bloco–solo e sem
              interação elástica entre estacas. A torção da estaca usa GJ e
              reação tangencial distribuída kt · U · r²; sem mola torsional de
              ponta. Aoki–Velloso é calculado separadamente, com Np do intervalo
              da ponta e sem truncamento de N.
            </p>
          </>
        ) : (
          <>
            <p>
              Sapata representada por disco de mesma área para as translações. O
              solo é substituído por semiespaço homogêneo com E equivalente
              harmônico e ν médio na faixa de 2B abaixo da base, sendo B a menor
              dimensão em planta.
            </p>
            <div className="report-formula">
              r = √(A/π) · G = Eeq/[2(1+ν)]
              <br />
              Kz = 4Gr/(1−ν) · Kx = Ky = 8Gr/(2−ν)
              <br />
              kv = Kz/A · Kθx = kv · Ix · Kθy = kv · Iy
              <br />
              Kθz = (Kx/A) · (Ix + Iy)
            </div>
            <p>
              As rotações são uma aproximação por Winkler distribuído, diferente
              da solução de disco rígido. Sem correção de embutimento e de base
              rígida. A tensão última usa fatores de Vésic e fatores de forma,
              com demais fatores unitários. A correlação qSPT = C × N é
              exploratória e não normativa.
            </p>
          </>
        )}
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
        <p>
          A diagonal Kii pressupõe os demais graus de liberdade impedidos. Para
          blocos com estacas, os acoplamentos devem ser preservados na matriz
          completa exportada.
        </p>
        <h2>05 / Hipóteses e observações</h2>
        <Notices result={r} />
        <p>
          <b>Pendentes:</b> Mindlin, Steinbrenner, Terzaghi e tensão básica da
          NBR 6122:1996. Sem avaliação de conformidade normativa,
          dimensionamento do bloco, efeitos de longo prazo ou calibração com
          provas de carga.
        </p>
        <h2>06 / Referências e rastreabilidade</h2>
        <p>
          Referências de base para o modelo e conferência. A implementação
          reduzida e suas hipóteses são descritas acima; não representa
          reprodução integral das publicações.
        </p>
        {references.map((ref) => (
          <a
            className="report-ref"
            key={ref.url}
            href={ref.url}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={13} />
            {ref.title}
            <ExternalLink size={11} />
          </a>
        ))}
        <footer>
          MolasStruct · OpenStruct · motor {r.version} · unidades internas: kN,
          m, rad
        </footer>
      </article>
    </div>
  );
}
