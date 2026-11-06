import { lateralOptions, type Foundation } from "../domain/model";
import { hasLateralModel } from "../domain/lateral";
import { NumberField, Section } from "./Fields";

export default function LateralSettings({
  foundation: f,
  onChange,
  openSoil,
}: {
  foundation: Foundation;
  onChange: (f: Foundation) => void;
  openSoil: () => void;
}) {
  if (f.kind !== "pile") return null;
  if (!hasLateralModel(f))
    return (
      <p className="field-help">
        Randolph simplificado usa Kh=μh Kz. As opções de CRH aplicam-se a
        Winkler e ao lateral do Mindlin.
      </p>
    );
  const c = lateralOptions(f),
    set = (change: Partial<typeof c>) =>
      onChange({ ...f, lateral: { ...c, ...change } });
  return (
    <Section title="REAÇÃO HORIZONTAL DO SOLO">
      <label className="select-field method-select">
        <span>Correlação horizontal</span>
        <select
          aria-label="Correlação horizontal"
          value={c.source}
          onChange={(e) => set({ source: e.target.value as typeof c.source })}
        >
          <option value="manual">Manual · kh por camada</option>
          <option value="terzaghi">K/nh · tipo de solo / TQS</option>
          <option value="tietz">SPT/m · Tietz / TQS</option>
        </select>
      </label>
      {c.source === "terzaghi" && (
        <label className="select-field method-select">
          <span>Versão da tabela K/nh</span>
          <select
            aria-label="Versão da tabela K/nh"
            value={c.tableVersion}
            onChange={(e) =>
              set({ tableVersion: e.target.value as typeof c.tableVersion })
            }
          >
            <option value="tqs-3829">TQS 3829 · sapatas/tubulões</option>
            <option value="tqs-3836">TQS 3836 · estacas</option>
          </select>
        </label>
      )}
      {c.source === "terzaghi" && c.tableVersion === "tqs-3836" && (
        <p className="field-help">
          nh em kN/m³ pela compatibilidade K=nh·z; o cabeçalho original mostra
          MPa. Valores secos ausentes exigem outra referência ou personalização.
        </p>
      )}
      {c.source === "tietz" && (
        <>
          <label className="select-field method-select">
            <span>Fonte da tabela m</span>
            <select
              aria-label="Fonte da tabela m"
              value={c.mTableSource}
              onChange={(e) =>
                set({ mTableSource: e.target.value as typeof c.mTableSource })
              }
            >
              <option value="tqs">Publicada · TQS 3829/3836</option>
              <option value="custom">Personalizada</option>
            </select>
          </label>
          <label className="select-field method-select">
            <span>Regra entre pontos de NSPT</span>
            <select
              aria-label="Regra entre pontos de NSPT"
              value={c.interpolation}
              onChange={(e) =>
                set({ interpolation: e.target.value as typeof c.interpolation })
              }
            >
              <option value="linear">Interpolação linear</option>
              <option value="lower">Degrau inferior</option>
              <option value="upper">Degrau superior</option>
            </select>
          </label>
          <p className="field-help">
            As ordenadas m coincidem nas duas referências. A regra entre pontos
            é uma hipótese selecionada. Origem do método em tubulões ≥1 m;
            avaliar aplicação ao solo e diâmetro.
          </p>
        </>
      )}
      {c.source !== "manual" && (
        <label className="select-field method-select">
          <span>Origem da profundidade z</span>
          <select
            aria-label="Origem da profundidade z"
            value={c.depthReference}
            onChange={(e) =>
              set({ depthReference: e.target.value as typeof c.depthReference })
            }
          >
            <option value="ground">Terreno</option>
            <option value="cap">Base do bloco</option>
          </select>
        </label>
      )}
      <label className="select-field method-select">
        <span>Discretização lateral</span>
        <select
          aria-label="Discretização lateral"
          value={c.discretization}
          onChange={(e) =>
            set({ discretization: e.target.value as typeof c.discretization })
          }
        >
          <option value="consistent">Reação consistente por elemento</option>
          <option value="nodal">Molas nodais · comparação</option>
        </select>
      </label>
      {c.discretization === "nodal" && (
        <>
          <NumberField
            label="Passo máximo lateral"
            value={c.nodalStep}
            unit="m"
            min={0.1}
            onChange={(nodalStep) => set({ nodalStep })}
          />
          <p className="field-help">
            2–128 trechos. Molas nos nós abaixo do topo, com peso Δl integral,
            inclusive na ponta. Essa convenção é distinta da matriz consistente.
          </p>
        </>
      )}
      <button className="secondary full" onClick={openSoil}>
        Editar coeficientes horizontais
      </button>
      <p className="field-help">
        Seleção por fundação, independente de E, ν e transferência vertical. As
        associações do solo são compartilhadas pelo projeto.
      </p>
    </Section>
  );
}
