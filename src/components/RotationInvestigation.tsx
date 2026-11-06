import type { Calculation } from "../domain/engine";
import { fmt, type Foundation } from "../domain/model";
import { reference16 } from "../domain/benchmark16";
import { twoPileRotationAudit } from "../domain/rotationAudit";

export default function RotationInvestigation({
  foundation: f,
  result: r,
}: {
  foundation: Foundation;
  result: Calculation;
}) {
  const audit = twoPileRotationAudit(f, r);
  if (!audit.available)
    return <p className="field-help">Investigação de Kθy: {audit.reason}</p>;
  return (
    <section
      className="rotation-investigation"
      aria-label="Investigação da diferença de Kθy"
    >
      <h3>De onde vem a diferença de Kθy?</h3>
      <p>
        O modelo ativo soma <strong>{fmt(audit.axialRy, 2)}</strong> da parcela
        axial e <strong>{fmt(audit.localRy, 2)}</strong> da flexão local,
        totalizando <strong>{fmt(audit.fullRy, 2)} tf·m/rad</strong>. Comparando
        somente a parcela axial, a diferença para o print é{" "}
        {fmt(audit.axialDifferencePercent, 2)}%. Nenhuma parcela é removida da
        matriz ativa por esta análise.
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Reconstrução da diferença</th>
              <th>tf·m/rad</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Valor do print</td>
              <td>{fmt(reference16.ry, 4)}</td>
            </tr>
            {audit.terms.map((term) => (
              <tr key={term.id}>
                <td>{term.label}</td>
                <td>
                  {term.value > 0 ? "+" : ""}
                  {fmt(term.value, 4)}
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Modelo ativo · soma das parcelas</strong>
              </td>
              <td>
                <strong>{fmt(audit.reconstructed, 4)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="field-help">
        Esta soma é uma identidade algébrica, não uma calibração. O pequeno
        fechamento do print ({fmt(-audit.referenceClosure, 5)} tf·m/rad) excede
        o limite {fmt(audit.referenceRoundingBound, 5)} atribuível apenas ao
        arredondamento de Kz e Kθy a 0,01. A relação Kθy≈Kz·s²/4 é próxima, mas
        não exata.
      </p>
      <h3>Interação: recalque uniforme e rotação são modos diferentes</h3>
      <div className="formula-line">
        C = [[a, b], [b, a]] · Kz = 2η/(a+b) · Kθy,axial = ηs²/[2(a−b)]
      </div>
      <p>
        No modelo, b/a = {fmt(audit.interactionRatio * 100, 4)}%. A interação
        reduz a rigidez do movimento comum e aumenta a rigidez do movimento
        oposto das duas estacas. Por isso Kθy,axial/Kz ={" "}
        {fmt(audit.axialRy / audit.kz, 6)} m² difere de s²/4 ={" "}
        {fmt(audit.armSquared, 6)} m².
      </p>
      <p className="field-help">
        Com o mesmo Kz do print, apenas normalizando a razão modal, a parcela
        axial seria {fmt(audit.normalizedAxialRy, 2)} tf·m/rad. É uma comparação
        de razões; não se alteraram Ec, E ou transferência para atingir o alvo.
      </p>
      <h3>Condições de ligação e de translação</h3>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hipótese</th>
              <th>Kθy (tf·m/rad)</th>
            </tr>
          </thead>
          <tbody>
            {audit.boundaryCases.map((test) => (
              <tr key={test.id}>
                <td>{test.label}</td>
                <td>{fmt(test.ry, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="field-help">
        Liberar ux com Hx=0 aplica Kθθ−Kθx·Kxx⁻¹·Kxθ. Isso é diferente de
        articular os topos das estacas. Uma articulação exige liberar também os
        momentos locais e condensar seus acoplamentos; zerar apenas Kθx deixaria
        um modelo inconsistente. No diagnóstico articulado, Kx seria{" "}
        {audit.pinnedHorizontal === null
          ? "não disponível"
          : fmt(audit.pinnedHorizontal, 2)}{" "}
        tf/m, ainda distinto do print.
      </p>
    </section>
  );
}
