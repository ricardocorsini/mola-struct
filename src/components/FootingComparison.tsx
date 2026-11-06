import { useMemo } from "react";
import type { Project } from "../domain/model";
import { fmt } from "../domain/model";
import { footingBenchmarkTable } from "../domain/benchmarkFootings";
export default function FootingComparison({
  project: p,
}: {
  project: Project;
}) {
  const rows = useMemo(() => footingBenchmarkTable(p), [p]);
  return (
    <section
      className="benchmark-comparison"
      aria-label="Comparação das sapatas com o print"
    >
      <h3>Sapatas de 60 a 180 cm · FEMA 273</h3>
      <p>
        Silte NSPT=7 · E=12,25 MPa (1.249,15 tf/m² arredondado) · ν=0,35. Cada
        célula mostra <b>atual / print</b>. Translações em tf/m; rotações em
        tf·m/rad.
      </p>
      <p>
        <b>{rows.filter((r) => r.match).length} de 13 sapatas compatíveis</b>{" "}
        com a precisão do print (±0,05 na unidade de cada coluna). Isso verifica
        as constantes k0 deste exemplo, sem validar embutimento, estratificação
        ou capacidade.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sapata (cm)</th>
              <th>Kx = Ky</th>
              <th>Kz</th>
              <th>Kθx = Kθy</th>
              <th>Kθz</th>
              <th>Conferência</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cm}>
                <td>
                  {r.cm} × {r.cm}
                </td>
                {r.expected.map((v, i) => (
                  <td key={i}>
                    {r.actual ? fmt(r.actual[i], 1) : "—"} / {fmt(v, 1)}
                  </td>
                ))}
                <td>{r.match ? "Compatível" : "Revisar entradas"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
