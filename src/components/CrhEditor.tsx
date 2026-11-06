import { crhPresets, defaultMTable } from "../domain/crhCatalog";
import {
  layerCoefficients,
  lateralSummary,
  hasLateralModel,
} from "../domain/lateral";
import {
  defaultLayerCrh,
  defaultLateral,
  lateralOptions,
  fmt,
  type Foundation,
  type Project,
  type Layer,
} from "../domain/model";
import { Cell, NumberField } from "./Fields";

function insertPoint(rows: [number, number][]): [number, number][] {
  const i = rows.findIndex((r, j) => j > 0 && r[0] - rows[j - 1][0] > 1);
  if (i > 0) {
    const [a, u] = rows[i - 1],
      [b, v] = rows[i],
      n = Math.floor((a + b) / 2);
    return [
      ...rows.slice(0, i),
      [n, u + ((n - a) / (b - a)) * (v - u)],
      ...rows.slice(i),
    ];
  }
  return rows.at(-1)![0] < 100
    ? [...rows, [rows.at(-1)![0] + 1, rows.at(-1)![1]]]
    : rows;
}

export default function CrhEditor({
  project: p,
  foundation: f,
  onProject,
  onFoundation,
}: {
  project: Project;
  foundation: Foundation;
  onProject: (p: Project) => void;
  onFoundation: (f: Foundation) => void;
}) {
  const cfg = lateralOptions(f),
    set = (change: Partial<typeof cfg>) =>
      onFoundation({ ...f, lateral: { ...cfg, ...change } });
  const change = (index: number, delta: Partial<NonNullable<Layer["crh"]>>) =>
    onProject({
      ...p,
      layers: p.layers.map((l, i) =>
        i === index
          ? { ...l, crh: { ...(l.crh ?? defaultLayerCrh()), ...delta } }
          : l,
      ),
    });
  return (
    <section className="crh-editor" aria-label="Coeficientes horizontais">
      <h3>Reação horizontal · {f.name}</h3>
      <p className="field-help">{lateralSummary(f)}</p>
      <div className="inline-actions">
        {(
          [
            ["manual", "kh manual"],
            ["terzaghi", "K/nh · TQS"],
            ["tietz", "SPT/m · TQS"],
          ] as const
        ).map(([source, label]) => (
          <button
            className={cfg.source === source ? "primary" : "secondary"}
            key={source}
            disabled={!hasLateralModel(f)}
            onClick={() => set({ source })}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="field-help">
        Configure versão, regra entre pontos e malha em Propriedades → Métodos.
        K/nh deste painel é reação horizontal; K de Aoki–Velloso permanece na
        tabela de capacidade.
      </p>
      {p.layers.map((l, i) => {
        const c = l.crh ?? defaultLayerCrh();
        let effective = "";
        let error = "";
        if (cfg.source === "terzaghi")
          try {
            const v = layerCoefficients(l, f);
            effective =
              v.law === "k"
                ? `K = ${fmt(v.k, 4)} kN/m²`
                : `nh seco = ${v.dry === null ? "não publicado" : fmt(v.dry, 4)} / submerso = ${v.wet === null ? "não publicado" : fmt(v.wet, 4)} kN/m³`;
          } catch (e) {
            error = e instanceof Error ? e.message : "Associação pendente";
          }
        return (
          <div className="crh-layer" key={l.id}>
            <h4>
              {i + 1} · {l.name} <small>até {fmt(l.bottom)} m</small>
            </h4>
            {cfg.source === "manual" ? (
              <NumberField
                label={`kh manual · camada ${i + 1}`}
                value={l.kh}
                unit="kN/m³"
                onChange={(kh) =>
                  onProject({
                    ...p,
                    layers: p.layers.map((v, j) =>
                      j === i ? { ...v, kh } : v,
                    ),
                  })
                }
              />
            ) : cfg.source === "terzaghi" ? (
              <>
                <label className="select-field method-select">
                  <span>Associação K/nh</span>
                  <select
                    aria-label={`Associação K/nh · camada ${i + 1}`}
                    value={c.preset}
                    onChange={(e) => change(i, { preset: e.target.value })}
                  >
                    <option value="unset">Selecionar explicitamente</option>
                    {crhPresets.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                    <option value="custom-k">K personalizado</option>
                    <option value="custom-nh">nh personalizado</option>
                  </select>
                </label>
                {effective && <p className="field-help">{effective}</p>}
                {error && <p className="notice warning">{error}</p>}
                {c.preset === "custom-k" ? (
                  <NumberField
                    label={`K horizontal · camada ${i + 1}`}
                    value={c.k}
                    unit="kN/m²"
                    onChange={(k) => change(i, { k: k > 0 ? k : null })}
                  />
                ) : c.preset === "custom-nh" ? (
                  <>
                    <NumberField
                      label={`nh seco · camada ${i + 1}`}
                      value={c.nhDry}
                      unit="kN/m³"
                      onChange={(nhDry) =>
                        change(i, { nhDry: nhDry > 0 ? nhDry : null })
                      }
                    />
                    <NumberField
                      label={`nh submerso · camada ${i + 1}`}
                      value={c.nhWet}
                      unit="kN/m³"
                      onChange={(nhWet) =>
                        change(i, { nhWet: nhWet > 0 ? nhWet : null })
                      }
                    />
                  </>
                ) : (
                  <button
                    className="secondary"
                    onClick={() => {
                      try {
                        const v = layerCoefficients(l, f);
                        change(
                          i,
                          v.law === "k"
                            ? { preset: "custom-k", k: v.k }
                            : {
                                preset: "custom-nh",
                                nhDry: v.dry,
                                nhWet: v.wet,
                              },
                        );
                      } catch {
                        /* pending association stays explicit */
                      }
                    }}
                    disabled={!!error}
                  >
                    Copiar para personalizar
                  </button>
                )}
              </>
            ) : (
              <label className="select-field method-select">
                <span>Família da tabela SPT/m</span>
                <select
                  aria-label={`Família SPT/m · camada ${i + 1}`}
                  value={c.family}
                  onChange={(e) =>
                    change(i, { family: e.target.value as typeof c.family })
                  }
                >
                  <option value="soil">
                    Pelo tipo declarado (
                    {l.soil === "sand"
                      ? "areia"
                      : l.soil === "clay"
                        ? "argila"
                        : l.soil === "silt"
                          ? "silte"
                          : "aterro"}
                    )
                  </option>
                  <option value="clay">Argiloso</option>
                  <option value="granular">Granular</option>
                </select>
              </label>
            )}
          </div>
        );
      })}
      {cfg.source === "tietz" && (
        <>
          <h3>Tabelas m · tf/m⁴</h3>
          <p className="field-help">
            Fonte{" "}
            {cfg.mTableSource === "tqs"
              ? "publicada TQS 3829/3836"
              : "personalizada"}
            . Nas tabelas personalizadas, NSPT fora da faixa bloqueia o cálculo.
            Não se alteram α ou K de capacidade.
          </p>
          <button
            className="secondary"
            onClick={() =>
              set({
                mTableSource: cfg.mTableSource === "tqs" ? "custom" : "tqs",
              })
            }
          >
            {cfg.mTableSource === "tqs"
              ? "Editar tabela personalizada"
              : "Usar tabela publicada"}
          </button>
          <div className="crh-tables">
            {(["clay", "granular"] as const).map((family) => {
              const key = family === "clay" ? "clayTable" : "granularTable",
                rows =
                  cfg.mTableSource === "custom"
                    ? cfg[key]
                    : defaultMTable(family);
              return (
                <div key={family}>
                  <h4>
                    {family === "clay" ? "Solo argiloso" : "Solo granular"}
                  </h4>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>NSPT</th>
                        <th>m (tf/m⁴)</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([n, m], i) => (
                        <tr key={i}>
                          <td>
                            {cfg.mTableSource === "custom" ? (
                              <Cell
                                label={`NSPT m ${family} ${i + 1}`}
                                value={n}
                                onChange={(value) =>
                                  set({
                                    [key]: rows.map((r, j) =>
                                      j === i ? [value, r[1]] : r,
                                    ),
                                  })
                                }
                              />
                            ) : (
                              n
                            )}
                          </td>
                          <td>
                            {cfg.mTableSource === "custom" ? (
                              <Cell
                                label={`Coeficiente m ${family} ${i + 1}`}
                                value={m}
                                onChange={(value) =>
                                  set({
                                    [key]: rows.map((r, j) =>
                                      j === i ? [r[0], value] : r,
                                    ),
                                  })
                                }
                              />
                            ) : (
                              m
                            )}
                          </td>
                          <td>
                            {cfg.mTableSource === "custom" && (
                              <button
                                aria-label={`Remover ponto m ${family} ${i + 1}`}
                                disabled={rows.length <= 2}
                                onClick={() =>
                                  set({ [key]: rows.filter((_, j) => j !== i) })
                                }
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {cfg.mTableSource === "custom" && (
                    <div className="inline-actions">
                      <button
                        className="secondary"
                        disabled={
                          rows.length >= 20 ||
                          (rows.at(-1)![0] >= 100 &&
                            !rows.some(
                              (r, j) => j > 0 && r[0] - rows[j - 1][0] > 1,
                            ))
                        }
                        onClick={() => set({ [key]: insertPoint(rows) })}
                      >
                        Adicionar ponto
                      </button>
                      <button
                        className="secondary"
                        onClick={() => set({ [key]: defaultLateral()[key] })}
                      >
                        Restaurar valores
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
