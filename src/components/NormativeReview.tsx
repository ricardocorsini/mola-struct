import { useMemo } from "react";
import { CircleAlert, ClipboardCheck, Info } from "lucide-react";
import { fmt, type Foundation, type Verification } from "../domain/model";
import type { Calculation } from "../domain/engine";
import {
  reviewFoundation,
  reviewLabels,
  type NbrReview,
} from "../domain/nbr6122";
import { NumberField, Section } from "./Fields";
export function ReviewSummary({ review }: { review: NbrReview }) {
  return (
    <div className="norm-review-summary">
      <div
        className={`notice ${review.outcome === "inconsistent" ? "error" : "warning"}`}
      >
        <CircleAlert size={17} />
        <span>
          <strong>
            {review.outcome === "blocked"
              ? "Cálculo bloqueado"
              : review.outcome === "inconsistent"
                ? "Há critérios não atendidos"
                : "Conferência parcial com pendências"}
          </strong>
          <br />
          ABNT NBR 6122:2022. Os critérios calculados e as declarações abaixo
          não constituem validação integral da fundação ou certificação do
          motor.
        </span>
      </div>
      <div className="table-scroll">
        <table className="data-table norm-table">
          <thead>
            <tr>
              <th>Critério / item</th>
              <th>Situação</th>
              <th>Resultado e alcance</th>
            </tr>
          </thead>
          <tbody>
            {review.items.map((i) => (
              <tr key={i.id}>
                <td>
                  <strong>{i.title}</strong>
                  <small className="norm-clause">
                    NBR 6122:2022 · {i.clause}
                  </small>
                </td>
                <td>
                  <span className={`review-status ${i.status}`}>
                    {reviewLabels[i.status]}
                  </span>
                </td>
                <td>
                  {i.value !== undefined && (
                    <div className="norm-value">
                      {fmt(i.value, 4)} {i.unit}
                      {i.limit !== undefined
                        ? ` · limite / referência: ${fmt(i.limit, 4)} ${i.unit}`
                        : ""}
                    </div>
                  )}
                  {i.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {review.metrics.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Referência numérica da conferência</th>
                <th>Valor</th>
                <th>Unidade</th>
              </tr>
            </thead>
            <tbody>
              {review.metrics.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td>{fmt(m.value, 4)}</td>
                  <td>{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default function NormativeReview({
  foundation: f,
  result: r,
  onChange,
}: {
  foundation: Foundation;
  result: Calculation;
  onChange: (f: Foundation) => void;
}) {
  const v = f.verification;
  const review = useMemo(() => reviewFoundation(f, r), [f, r]);
  const update = (change: Partial<Verification>) =>
    onChange({ ...f, verification: { ...v, ...change } });
  const text = (
    key:
      | "serviceReference"
      | "ultimateReference"
      | "limitsReference"
      | "geotechnicalReference"
      | "executionReference",
    label: string,
  ) => (
    <label className="norm-text">
      <span>{label}</span>
      <input
        aria-label={label}
        value={v[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  const checkbox = (
    key:
      | "serviceConfirmed"
      | "selfWeightIncluded"
      | "geotechnicalBasisConfirmed",
    label: string,
  ) => (
    <label className="check-label">
      <input
        type="checkbox"
        checked={v[key]}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const limit = (
    key: "settlementLimit" | "horizontalLimit" | "rotationLimit",
    label: string,
    unit: string,
  ) => (
    <label className="number-field norm-limit">
      <span>{label}</span>
      <div>
        <input
          aria-label={label}
          type="number"
          min="0"
          step="any"
          placeholder="Não definido"
          value={v[key] ?? ""}
          onChange={(e) =>
            update({
              [key]: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
        <small>{unit}</small>
      </div>
    </label>
  );
  return (
    <div className="norm-review">
      <div className="info-box">
        <Info size={17} />
        <p>
          A norma define critérios de ELU/ELS, não uma tabela universal de
          molas. Mantenha as ações de serviço no painel Ações; informe aqui um
          vetor separado para ELU. Campos não informados permanecem pendentes.
        </p>
      </div>
      <p className="field-help">
        <strong>
          {review.outcome === "inconsistent"
            ? "Há critérios não atendidos nesta conferência."
            : "Conferência parcial, com pendências identificadas."}
        </strong>{" "}
        Não há aprovação global automática. Os resultados e os itens da norma
        aparecem após os dados de entrada.
      </p>
      <div className="norm-input-grid">
        <Section title="AÇÕES E LIMITES DE SERVIÇO (ELS)">
          {checkbox(
            "serviceConfirmed",
            "Confirmo ações características de serviço no vetor principal",
          )}
          {text("serviceReference", "Origem / combinação de ELS")}
          {limit(
            "settlementLimit",
            f.kind === "pile"
              ? "Limite vertical absoluto nos topos"
              : "Limite vertical absoluto no centro",
            "mm",
          )}
          {limit(
            "horizontalLimit",
            "Limite de translação horizontal resultante",
            "mm",
          )}
          {limit(
            "rotationLimit",
            "Limite de rotação resultante (X, Y, Z)",
            "mrad",
          )}
          {text("limitsReference", "Justificativa dos limites para a obra")}
          <p className="field-help">
            Limites definidos pelo projetista conforme desempenho da estrutura,
            terreno e vizinhança. Sem valor padrão de 25 mm. A verificação se
            refere aos deslocamentos do modelo, sem efeitos de longo prazo.
          </p>
        </Section>
        <Section title="VETOR INDEPENDENTE DE ELU">
          <label className="select-field method-select">
            <span>Regime das ações de ELU</span>
            <select
              aria-label="Regime das ações de ELU"
              value={v.ultimateBasis}
              onChange={(e) =>
                update({
                  ultimateBasis: e.target
                    .value as Verification["ultimateBasis"],
                })
              }
            >
              <option value="unset">Não informado</option>
              <option value="characteristic">
                Característico · segurança global
              </option>
              <option value="design">
                De cálculo · coeficiente de resistência
              </option>
            </select>
          </label>
          {text("ultimateReference", "Origem / combinação de ELU")}
          {(
            [
              ["ultimateN", "N de ELU (compressão +)", "kN"],
              ["ultimateHx", "Hx de ELU", "kN"],
              ["ultimateHy", "Hy de ELU", "kN"],
              ["ultimateMx", "Mx de ELU", "kN·m"],
              ["ultimateMy", "My de ELU", "kN·m"],
              ["ultimateMz", "Mz de ELU", "kN·m"],
            ] as const
          ).map(([key, label, unit]) => (
            <NumberField
              key={key}
              label={label}
              unit={unit}
              value={v[key]}
              onChange={(n) => update({ [key]: n })}
            />
          ))}
          <p className="field-help">
            Ações no centro da face inferior do bloco/sapata, como o vetor
            principal. Não há transferência automática do nível da
            superestrutura. Valores de cálculo não recebem majoração adicional
            nesta conferência.
          </p>
        </Section>
        <Section title="DADOS GEOTÉCNICOS E PESO PRÓPRIO">
          {checkbox(
            "selfWeightIncluded",
            "Peso próprio incluído nos vetores aplicáveis",
          )}
          {checkbox(
            "geotechnicalBasisConfirmed",
            "Domínio do método e parâmetros geotécnicos conferidos pelo projetista",
          )}
          {text(
            "geotechnicalReference",
            "Ensaios / parâmetros / drenagem / justificativa",
          )}
          {f.kind === "footing" && (
            <label className="select-field method-select">
              <span>Regime da capacidade da sapata</span>
              <select
                aria-label="Regime da capacidade da sapata"
                value={v.soilRegime}
                onChange={(e) =>
                  update({
                    soilRegime: e.target.value as Verification["soilRegime"],
                  })
                }
              >
                <option value="unset">Não informado</option>
                <option value="drained-effective">
                  Drenado / tensões efetivas
                </option>
                <option value="undrained-total">
                  Não drenado / tensões totais — não implementado
                </option>
              </select>
            </label>
          )}
          <p className="field-help">
            A declaração não valida ensaios. A alternativa de 5% da NBR 6122 usa
            a carga vertical permanente, que não está decomposta no programa;
            não somamos 5% de N total.
          </p>
          {f.kind === "footing" && (
            <NumberField
              label="FSg de compressão da sapata"
              value={f.safety}
              unit="—"
              onChange={(safety) => onChange({ ...f, safety })}
            />
          )}
        </Section>
        {f.kind === "pile" && (
          <Section title="ESTACAS · EXECUÇÃO E RESISTÊNCIA DE PONTA">
            <label className="select-field method-select">
              <span>Tipo executivo</span>
              <select
                aria-label="Tipo executivo da estaca"
                value={v.pileType}
                onChange={(e) =>
                  update({
                    pileType: e.target.value as Verification["pileType"],
                    toeProcedure: "unconfirmed",
                  })
                }
              >
                <option value="unspecified">Não informado</option>
                <option value="driven">Cravada</option>
                <option value="cfa">Hélice contínua</option>
                <option value="bored-fluid">Escavada com fluido</option>
                <option value="other">Outro — justificar</option>
              </select>
            </label>
            <label className="select-field method-select">
              <span>Parcela de ponta no ELU</span>
              <select
                aria-label="Condição da ponta no ELU"
                value={v.toeProcedure}
                onChange={(e) =>
                  update({
                    toeProcedure: e.target
                      .value as Verification["toeProcedure"],
                  })
                }
              >
                <option value="unconfirmed">Sem comprovação</option>
                <option value="ignored">Desconsiderar Rp</option>
                <option value="minimum">
                  Considerar — procedimento aplicável comprovado
                </option>
                {v.pileType === "bored-fluid" && (
                  <option value="special">
                    Especial / ponta em rocha — fora do escopo
                  </option>
                )}
              </select>
            </label>
            {text(
              "executionReference",
              "Justificativa executiva / evidência do executor",
            )}
            <NumberField
              label="FSg de compressão da estaca"
              unit="—"
              value={v.pileSafety}
              onChange={(pileSafety) => update({ pileSafety })}
            />
            <p className="field-help">
              CFA e escavada com fluido: ponta limitada ao fuste nos
              procedimentos mínimos; sem contato assegurado, Rp=0. A exceção do
              Anexo J.3.3 trata ponta em rocha e não é liberada pelo modelo SPT
              atual. São regras de resistência ELU; a transferência de carga nas
              molas deve ser revista separadamente.
            </p>
          </Section>
        )}
      </div>
      <h3 className="norm-heading">
        <ClipboardCheck size={18} /> Conferência rastreável
      </h3>
      <ReviewSummary review={review} />
    </div>
  );
}
