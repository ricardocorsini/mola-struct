import { effectiveProfile } from "../domain/methods";
import NormativeReview from "./NormativeReview";
import BenchmarkComparison from "./BenchmarkComparison";
import PileHeadActions from "./PileHeadActions";
import { hasReference16 } from "../domain/benchmark16";
import { hasFootingReference } from "../domain/benchmarkFootings";
import FootingComparison from "./FootingComparison";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeftRight,
  Check,
  CircleAlert,
  Copy,
  Info,
  MoveHorizontal,
  RotateCw,
} from "lucide-react";
import { calculate, type Calculation } from "../domain/engine";
import { fmt, type Foundation, type Project } from "../domain/model";
export const stiffnessNames = ["Kx", "Ky", "Kz", "Kθx", "Kθy", "Kθz"];
export function SpringCards({
  result: r,
  unit = "kn",
  compact = false,
}: {
  result: Calculation;
  unit?: string;
  compact?: boolean;
}) {
  const factor = unit === "tf" ? 9.80665 : 1;
  return (
    <div className={`spring-cards ${compact ? "compact" : ""}`}>
      {stiffnessNames.map((name, i) => {
        const Icon = i < 2 ? MoveHorizontal : i === 2 ? ArrowDown : RotateCw;
        return (
          <div
            key={name}
            className={`spring-card ${i === 2 ? "featured" : ""}`}
          >
            <header>
              <span>{name}</span>
              <Icon size={14} />
            </header>
            <strong>
              {r.valid ? fmt(r.diagonal[i] / factor, i > 2 ? 1 : 0) : "—"}
            </strong>
            <small>
              {unit === "tf" ? "tf" : "kN"}
              {i > 2 ? "·m/rad" : "/m"}
            </small>
            {!compact && (
              <span className="spring-caption">
                {r.freeDofs.includes(i)
                  ? "Livre · sem travamento"
                  : [
                      "Translação em X",
                      "Translação em Y",
                      "Translação vertical",
                      "Rotação em X",
                      "Rotação em Y",
                      "Torção em Z",
                    ][i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function Notices({ result: r }: { result: Calculation }) {
  return (
    <div className="notice-list">
      {r.notices.map((n, i) => {
        const Icon =
          n.level === "error"
            ? CircleAlert
            : n.level === "warning"
              ? CircleAlert
              : Info;
        return (
          <div className={`notice ${n.level}`} key={i}>
            <Icon size={15} />
            <span>{n.message}</span>
          </div>
        );
      })}
    </div>
  );
}
export default function Results({
  project: p,
  foundation: f,
  result: r,
  onCopy,
  onSelect,
  onFoundation,
  initial = "springs",
}: {
  project: Project;
  foundation: Foundation;
  result: Calculation;
  onCopy: () => void;
  onSelect: (id: string) => void;
  onFoundation: (f: Foundation) => void;
  initial?: string;
}) {
  const [tab, setTab] = useState(initial),
    [unit, setUnit] = useState("kn");
  const labels = ["X", "Y", "Z", "θx", "θy", "θz"];
  return (
    <div className="results-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ANÁLISE / {f.name}</span>
          <h2>
            {tab === "normative"
              ? "Conferência parcial — NBR 6122:2022"
              : "Rigidez do conjunto fundação + solo"}
          </h2>
          <p>{r.method || "Revise os dados para calcular."}</p>
        </div>
        <div className="inline-actions">
          <select
            aria-label="Unidade dos resultados"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option value="kn">kN · m</option>
            <option value="tf">tf · m</option>
          </select>
          <button className="secondary" disabled={!r.valid} onClick={onCopy}>
            <Copy size={14} />
            Copiar
          </button>
        </div>
      </div>
      <div className="subnav">
        {[
          ["springs", "Rigidezes"],
          ["matrix", "Matriz 6 × 6"],
          ["capacity", "Capacidade de carga"],
          ["comparison", "Comparar fundações"],
          ["sensitivity", "Sensibilidade"],
          ["normative", "NBR 6122:2022"],
          ...(hasReference16(p, f) || hasFootingReference(p, f)
            ? [["benchmark", "Comparar print"]]
            : []),
        ].map(([key, title]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {title}
          </button>
        ))}
      </div>
      {tab === "benchmark" && hasFootingReference(p, f) && (
        <FootingComparison project={p} />
      )}
      {tab === "benchmark" && hasReference16(p, f) && (
        <BenchmarkComparison project={p} foundation={f} result={r} />
      )}
      {tab === "normative" && (
        <NormativeReview foundation={f} result={r} onChange={onFoundation} />
      )}
      {tab === "springs" && (
        <>
          <SpringCards result={r} unit={unit} />
          {r.details.length > 0 && (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parâmetro intermediário</th>
                    <th>Valor</th>
                    <th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {r.details.map((d) => (
                    <tr key={d.label}>
                      <td>{d.label}</td>
                      <td>
                        {r.valid
                          ? fmt(d.value, d.unit === "m/kN" ? 9 : 4)
                          : "—"}
                      </td>
                      <td>{d.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="result-metrics">
            <div>
              <ArrowDownToLine />
              <span>Recalque linear estimado</span>
              <strong>
                {r.valid ? fmt(r.settlement, 2) : "—"} <small>mm</small>
              </strong>
              <p>Sob N = {fmt(f.n, 0)} kN e demais ações</p>
            </div>
            <div>
              <ArrowLeftRight />
              <span>Deslocamentos horizontais</span>
              <strong>
                {r.valid
                  ? `${fmt(r.displacement[0] * 1000, 3)} / ${fmt(r.displacement[1] * 1000, 3)}`
                  : "—"}{" "}
                <small>mm</small>
              </strong>
              <p>ux / uy no centro da base</p>
            </div>
            <div>
              <RotateCw />
              <span>Rotações da fundação</span>
              <strong>
                {r.valid
                  ? [3, 4]
                      .map((i) =>
                        r.freeDofs.includes(i)
                          ? "Livre"
                          : fmt(r.displacement[i] * 1000, 3),
                      )
                      .join(" / ")
                  : "—"}{" "}
                <small>mrad</small>
              </strong>
              <p>θx / θy no centro da base</p>
            </div>
          </div>
          <PileHeadActions foundation={f} result={r} unit={unit} />
          <div className="info-box">
            <Info size={16} />
            <p>
              Os cartões mostram a diagonal Kii, com os demais graus de
              liberdade impedidos.{" "}
              {f.kind === "pile"
                ? "Há acoplamento entre translações e rotações: utilize a matriz completa para reproduzir os deslocamentos."
                : "A matriz da sapata é diagonal nesta aproximação."}
            </p>
          </div>
          <Notices result={r} />
        </>
      )}
      {tab === "matrix" && (
        <>
          <div className="matrix-equation">
            <span>F = K · u</span>
            <p>Ordem: [Fx, Fy, Fz, Mx, My, Mz] e [ux, uy, uz, θx, θy, θz]</p>
          </div>
          <div className="table-scroll">
            <table className="data-table matrix-table">
              <thead>
                <tr>
                  <th>K</th>
                  {labels.map((n) => (
                    <th key={n}>{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.matrix.map((row, i) => (
                  <tr key={i}>
                    <th>{labels[i]}</th>
                    {row.map((v, j) => (
                      <td
                        key={j}
                        className={
                          i === j ? "diagonal" : v !== 0 ? "coupled" : ""
                        }
                      >
                        {r.valid
                          ? fmt(v / (unit === "tf" ? 9.80665 : 1), 2)
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-help">
            Bloco TT: {unit === "tf" ? "tf" : "kN"}/m; blocos TR e RT:{" "}
            {unit === "tf" ? "tf" : "kN"}; bloco RR:{" "}
            {unit === "tf" ? "tf" : "kN"}·m/rad. Rotações em radianos; Z
            positivo para cima. Origem no centro da base.
          </p>
          <div className="matrix-response">
            <h3>Resposta ao vetor de ações</h3>
            <div>
              {r.displacement.map((v, i) => (
                <span key={i}>
                  <small>{["ux", "uy", "uz", "θx", "θy", "θz"][i]}</small>
                  <b>
                    {r.valid
                      ? r.freeDofs.includes(i)
                        ? "Livre / indeterminado"
                        : fmt(v * 1000, 4)
                      : "—"}
                  </b>
                  <em>{i < 3 ? "mm" : "mrad"}</em>
                </span>
              ))}
            </div>
          </div>
          <div className="info-box">
            <Info size={15} />
            <p>
              Fz = −N. Matrizes geradas por transformação das estacas para o
              centro do bloco rígido, respeitando a ligação estaca–bloco
              selecionada. GDL livres têm linha e coluna nulas; não há rigidez
              fictícia de travamento. A matriz não inclui a superestrutura.
            </p>
          </div>
        </>
      )}
      {tab === "capacity" && (
        <>
          <div className="capacity-heading">
            <span className="tag">
              {f.kind === "pile"
                ? "Aoki–Velloso · estaca isolada"
                : "Vésic · hipótese centrada"}
            </span>
            <p>A capacidade de carga é estimada separadamente da rigidez.</p>
          </div>
          {f.kind === "pile" ? (
            <>
              <div className="capacity-cards">
                {[
                  ["Resistência lateral", r.shaft],
                  ["Resistência de ponta", r.point],
                  ["Resistência última", r.ultimate],
                ].map(([n, v]) => (
                  <div key={String(n)}>
                    <span>{n}</span>
                    <strong>
                      {r.valid ? fmt(Number(v), 1) : "—"}{" "}
                      <small>kN / estaca</small>
                    </strong>
                  </div>
                ))}
              </div>
              <div className="formula-line">
                Ru = RL + RP &nbsp;·&nbsp; RL = U · Σ(α · K · N · ΔL / F₂)
                &nbsp;·&nbsp; RP = Ap · K · Np / F₁
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Trecho (m)</th>
                      <th>Solo</th>
                      <th>N SPT</th>
                      <th>ΔRL (kN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.segments.map((s, i) => (
                      <tr key={i}>
                        <td>
                          {fmt(s.top, 1)} → {fmt(s.bottom, 1)}
                        </td>
                        <td>{s.layer}</td>
                        <td>{s.n}</td>
                        <td>{fmt(s.shaft, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3>Reações lineares nas estacas</h3>
              <div className="pile-reactions">
                {r.pileForces.map((n, i) => (
                  <div key={i}>
                    <span>E{i + 1}</span>
                    <strong>
                      {fmt(n, 1)} <small>kN</small>
                    </strong>
                    <small>{n >= 0 ? "Compressão" : "Tração"}</small>
                  </div>
                ))}
              </div>
              <p className="field-help">
                Resistências últimas sem coeficientes de segurança. Não inclui
                verificação de grupo, bloco ou estado limite de serviço. Rigidez
                não é obtida dividindo a capacidade por um recalque arbitrário.
              </p>
            </>
          ) : (
            <>
              <div className="capacity-cards">
                {[
                  ["Tensão última · Vésic", r.qUltimate],
                  ["qúlt / FS (referência)", r.qReference],
                  ["Correlação SPT · qref", r.qSpt],
                ].map(([n, v]) => (
                  <div key={String(n)}>
                    <span>{n}</span>
                    <strong>
                      {r.valid ? fmt(Number(v), 1) : "—"} <small>kPa</small>
                    </strong>
                  </div>
                ))}
              </div>
              <div className="formula-line">
                qúlt = c · Nc · sc + q · Nq · sq + 0,5 · γ′ · B · Nγ · sγ
              </div>
              <p className="field-help">
                Fatores de forma incluídos. Fatores de profundidade, inclinação
                e excentricidade unitários. Pesos efetivos calculados com nível
                d’água e estratigrafia. Correlação SPT exploratória: C ={" "}
                {fmt(f.sptFactor, 1)} kPa/golpe; sem atribuição normativa.
              </p>
              <div className="result-metrics two">
                <div>
                  <span>Pressão de contato mínima</span>
                  <strong>
                    {r.valid ? fmt(r.qMin ?? 0, 2) : "—"} <small>kPa</small>
                  </strong>
                </div>
                <div>
                  <span>Pressão de contato máxima</span>
                  <strong>
                    {r.valid ? fmt(r.qMax ?? 0, 2) : "—"} <small>kPa</small>
                  </strong>
                </div>
              </div>
              <p className="field-help">
                Pressões por distribuição linear, sem redistribuição de contato.
                A comparação com qúlt/FS não é uma verificação normativa.
              </p>
            </>
          )}
          <div className="pending-banner">
            <Info size={17} />
            <div>
              <strong>Alcance e validação</strong>
              <p>
                Mindlin e Steinbrenner têm implementação vertical experimental.
                Terzaghi permanece pendente. NBR 6122:1996 é referência
                histórica; a conferência atual está na aba NBR 6122:2022, com
                critérios parciais e informações faltantes identificados.
              </p>
            </div>
          </div>
        </>
      )}
      {tab === "comparison" && <Comparison project={p} onSelect={onSelect} />}
      {tab === "sensitivity" && <Sensitivity project={p} foundation={f} />}
    </div>
  );
}
function Comparison({
  project: p,
  onSelect,
}: {
  project: Project;
  onSelect: (id: string) => void;
}) {
  const rows = useMemo(
    () => p.foundations.map((f) => ({ f, r: calculate(p, f) })),
    [p],
  );
  return (
    <>
      <p className="field-help">
        Fundações do mesmo projeto sob o perfil {p.borehole}. Cada linha usa a
        geometria e as ações próprias.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fundação</th>
              <th>Tipo</th>
              <th>Kx (kN/m)</th>
              <th>Kz (kN/m)</th>
              <th>Kθy (kN·m/rad)</th>
              <th>Recalque (mm)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ f, r }) => (
              <tr key={f.id}>
                <td>
                  <button className="text-link" onClick={() => onSelect(f.id)}>
                    {f.name}
                  </button>
                </td>
                <td>{f.kind === "pile" ? `${f.count} estacas` : "Sapata"}</td>
                {[
                  r.diagonal[0],
                  r.diagonal[2],
                  r.diagonal[4],
                  r.settlement,
                ].map((v, i) => (
                  <td key={i}>{r.valid ? fmt(v, i === 3 ? 2 : 0) : "—"}</td>
                ))}
                <td>
                  <span className={`status-pill ${r.valid ? "" : "error"}`}>
                    {r.valid ? <Check size={12} /> : <CircleAlert size={12} />}{" "}
                    {r.valid ? "Estimativa" : "Revisar"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Sensitivity({
  project: p,
  foundation: f,
}: {
  project: Project;
  foundation: Foundation;
}) {
  const [mult, setMult] = useState(1);
  const parameter =
    f.kind === "pile" && f.pileMethod === "winkler"
      ? "winkler"
      : f.kind === "footing" && f.footingMethod === "winkler"
        ? "kv"
        : f.kind === "footing" && f.footingMethod === "safe"
          ? "safe"
          : "e";
  const variant = (factor: number) => {
    const winkler = f.kind === "pile" && f.pileMethod === "winkler";
    try {
      const effective = winkler ? p : effectiveProfile(p, f);
      const layers = effective.layers.map((l) =>
        winkler
          ? {
              ...l,
              kh: l.kh * factor,
              shaftK: l.shaftK * factor,
              baseK: l.baseK * factor,
            }
          : { ...l, e: l.e * factor },
      );
      const foundation = {
        ...f,
        modulusSource: winkler ? f.modulusSource : ("manual" as const),
        kvInput: f.kvInput * factor,
        allowablePressure: f.allowablePressure * factor,
      };
      return calculate({ ...effective, layers }, foundation);
    } catch {
      return calculate(p, f);
    }
  };
  const rows = [0.5, 0.75, 1, 1.25, 1.5, 2].map((factor) => ({
    factor,
    r: variant(factor),
  }));
  const modified = variant(mult);
  const max = Math.max(...rows.map((x) => x.r.diagonal[2]), 1);
  return (
    <>
      <div className="sensitivity-control">
        <div>
          <h3>
            {parameter === "winkler"
              ? "Coeficientes de reação do solo"
              : parameter === "kv"
                ? "Coeficiente kv informado"
                : parameter === "safe"
                  ? "Tensão admissível da correlação SAFE"
                  : "Módulo de elasticidade do solo"}
          </h3>
          <p>
            {parameter === "winkler"
              ? "Varia kh, kt e kp de todas as camadas."
              : parameter === "kv"
                ? "Varia kv, mantendo μh."
                : parameter === "safe"
                  ? "Varia σadm; valores fora da faixa SAFE são bloqueados."
                  : "Varia o módulo efetivo escolhido (E ou E0) de todas as camadas, mantendo ν e os parâmetros de capacidade."}{" "}
            Ações e geometria constantes.
          </p>
        </div>
        <label>
          <input
            aria-label="Multiplicador de sensibilidade"
            type="range"
            min=".25"
            max="2"
            step=".05"
            value={mult}
            onChange={(e) => setMult(Number(e.target.value))}
          />
          <b>{fmt(mult, 2)}×</b>
        </label>
      </div>
      <SpringCards result={modified} compact />
      {!modified.valid && <Notices result={modified} />}
      <div className="sensitivity-chart">
        <h3>Influência na rigidez vertical</h3>
        {rows.map(({ factor, r }) => (
          <div key={factor}>
            <span>{fmt(factor, 2)}×</span>
            <div>
              <i
                style={{
                  width: `${(r.diagonal[2] / max) * 100}%`,
                  background: factor === 1 ? "#3448d1" : "#b6c0ec",
                }}
              />
            </div>
            <strong>
              {r.valid ? fmt(r.diagonal[2], 0) : "—"} <small>kN/m</small>
            </strong>
          </div>
        ))}
      </div>
      <p className="field-help">
        Estudo paramétrico exploratório. Não altera os dados salvos do projeto
        nem representa uma faixa de confiabilidade.
      </p>
    </>
  );
}
