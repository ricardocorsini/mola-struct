import type { Calculation } from "../domain/engine";
import { fmt, headConnectionLabel, type Foundation } from "../domain/model";

export default function PileHeadActions({
  foundation: f,
  result: r,
  unit = "kn",
}: {
  foundation: Foundation;
  result: Calculation;
  unit?: string;
}) {
  if (f.kind !== "pile") return null;
  const factor = unit === "tf" ? 9.80665 : 1,
    forceUnit = unit === "tf" ? "tf" : "kN";
  return (
    <section aria-label="Esforços no topo das estacas">
      <h3>Esforços no topo · {headConnectionLabel(f)}</h3>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Estaca</th>
              <th>N ({forceUnit})</th>
              <th>Mx ({forceUnit}·m)</th>
              <th>My ({forceUnit}·m)</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: f.count }, (_, i) => (
              <tr key={i}>
                <td>E{i + 1}</td>
                <td>{r.valid ? fmt(r.pileForces[i] / factor, 4) : "—"}</td>
                <td>{r.valid ? fmt(r.pileMoments[i][0] / factor, 4) : "—"}</td>
                <td>{r.valid ? fmt(r.pileMoments[i][1] / factor, 4) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-help">
        Sob o vetor de ações atual. N positivo em compressão; momentos nos eixos
        globais, transmitidos pelo bloco às estacas. A rótula libera a flexão no
        topo; momentos no fuste sob ações laterais ainda podem existir.
      </p>
    </section>
  );
}
