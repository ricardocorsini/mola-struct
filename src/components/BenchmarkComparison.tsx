import { useMemo } from "react";
import { Info } from "lucide-react";
import { fmt, type Project, type Foundation } from "../domain/model";
import type { Calculation } from "../domain/engine";
import {
  reference16Comparison,
  axialDiagnostics,
  concreteSensitivity16,
  initialModuli16,
  benchmarkAssumptions,
  reference16,
  referenceInputDifferences,
} from "../domain/benchmark16";
export default function BenchmarkComparison({
  project: p,
  foundation: f,
  result: r,
  report = false,
}: {
  project: Project;
  foundation: Foundation;
  result: Calculation;
  report?: boolean;
}) {
  const changes = referenceInputDifferences(p, f);
  const rows = reference16Comparison(p, f, r),
    axial = axialDiagnostics(f, r);
  const sensitivity = useMemo(
    () => (report ? [] : concreteSensitivity16(p, f)),
    [p, f, report],
  );
  const labels = {
    match: "Confere no arredondamento",
    different: "Diverge",
    conditional: "Não confirmado",
    blocked: "Não calculado",
  };
  return (
    <div className="benchmark-comparison">
      {r.notices
        .filter((n) => n.level === "error")
        .map((n) => (
          <div className="notice error" role="alert" key={n.message}>
            <Info size={17} />
            <span>{n.message}</span>
          </div>
        ))}
      <div className="notice warning">
        <Info size={17} />
        <span>
          <strong>Comparação externa · dados do print, NSPT(11)=17</strong>
          <br />
          Capacidade pode ser conferida. As molas permanecem condicionadas às
          hipóteses abaixo; coincidência de um valor não valida os demais.
        </span>
      </div>
      {changes.length > 0 && (
        <div className="notice warning">
          <Info size={16} />
          <span>
            <strong>Entradas alteradas em relação ao caso de referência</strong>
            <br />
            {changes.join(" · ")}
          </span>
        </div>
      )}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Grandeza</th>
              <th>Print</th>
              <th>Modelo atual</th>
              <th>Δ relativo</th>
              <th>Unidade</th>
              <th>Conferência</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td>{fmt(row.expected, 4)}</td>
                <td>{row.actual === null ? "—" : fmt(row.actual, 4)}</td>
                <td>
                  {row.differencePercent === null
                    ? "—"
                    : `${fmt(row.differencePercent, 2)}%`}
                </td>
                <td>{row.unit}</td>
                <td>
                  <span
                    className={`review-status ${row.status === "match" ? "pass" : row.status === "different" ? "fail" : "pending"}`}
                  >
                    {labels[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows
        .filter((row) => row.status !== "match")
        .map((row) => (
          <p className="field-help" key={row.id}>
            <strong>{row.label}:</strong> {row.note}
          </p>
        ))}
      {axial.length > 0 && (
        <>
          <h3>Separação da contribuição axial</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Kz (tf/m)</th>
                  <th>Kθx (tf·m/rad)</th>
                  <th>Kθy (tf·m/rad)</th>
                </tr>
              </thead>
              <tbody>
                {axial.map((a) => (
                  <tr key={a.label}>
                    <td>{a.label}</td>
                    {a.diagonal.map((v, i) => (
                      <td key={i}>{fmt(v, 4)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-help">
            Diagnóstico da parcela BᵀC⁻¹B, sem flexão local. Não substitui a
            matriz ativa. O print apresenta Kθy/Kz ≈{" "}
            {fmt(reference16.ry / reference16.kz, 6)} m², próximo de sx²/4 =
            0,2025 m², e Kθx = 0. Isso indica uma diferença de modelagem que
            precisa ser confirmada.
          </p>
        </>
      )}
      {!report && (
        <>
          <h3>Sensibilidade ao Ec não informado no print</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ec assumido (GPa)</th>
                  <th>Kz global (tf/m)</th>
                  <th>Recalque (mm)</th>
                </tr>
              </thead>
              <tbody>
                {sensitivity.map((a) => (
                  <tr key={a.ec}>
                    <td>{a.ec}</td>
                    <td>{a.kz === null ? "—" : fmt(a.kz, 4)}</td>
                    <td>
                      {a.settlement === null ? "—" : fmt(a.settlement, 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="field-help">
            Valores manuais para estudo, sem ajuste automático para reproduzir
            Kz do print e sem atribuição a uma fórmula normativa de Ec.
          </p>
        </>
      )}
      <h3>Correlação da foto · E0 de Aoki (1984)</h3>
      <p>
        E0 = 6 K N para cravadas; 4 K N para hélice contínua; 3 K N para
        escavadas. K é o de Aoki–Velloso. A tabela abaixo usa a média de N por
        espessura, com conversão para MPa; não substitui os E manuais do print.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Camada</th>
              <th>N médio</th>
              <th>E manual (MPa)</th>
              <th>E0 cravada</th>
              <th>E0 CFA</th>
              <th>E0 escavada</th>
            </tr>
          </thead>
          <tbody>
            {initialModuli16(p).map((a) => (
              <tr key={a.layer}>
                <td>{a.layer}</td>
                <td>{fmt(a.mean, 3)}</td>
                <td>{fmt(a.manual, 3)}</td>
                <td>{fmt(a.driven, 3)}</td>
                <td>{fmt(a.cfa, 3)}</td>
                <td>{fmt(a.bored, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Transcrição e hipóteses ainda não confirmadas</h3>
      <ul>
        {benchmarkAssumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
