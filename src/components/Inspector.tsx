import {
  ArrowDownToLine,
  CircleHelp,
  Layers,
  Ruler,
  Settings2,
  SlidersHorizontal,
  Waves,
} from "lucide-react";
import { fmt, type Foundation, type Project } from "../domain/model";
import { NumberField, Section } from "./Fields";
export type PropertyTab =
  | "geometry"
  | "materials"
  | "soil"
  | "loads"
  | "methods";
export default function Inspector({
  project: p,
  foundation: f,
  tab,
  setTab,
  onFoundation: up,
  onProject,
  openSoil,
  openProject,
}: {
  project: Project;
  foundation: Foundation;
  tab: PropertyTab;
  setTab: (t: PropertyTab) => void;
  onFoundation: (f: Foundation) => void;
  onProject: (p: Project) => void;
  openSoil: () => void;
  openProject: () => void;
}) {
  const setCount = (count: 1 | 2 | 3 | 4) =>
    up({
      ...f,
      count,
      capX: Math.max(f.capX, (count > 1 ? f.spacingX : 0) + f.diameter + 0.4),
      capY: Math.max(
        f.capY,
        (count === 3 ? (4 * f.spacingY) / 3 : count === 4 ? f.spacingY : 0) +
          f.diameter +
          0.4,
      ),
    });
  const field = (
    key: keyof Foundation,
    label: string,
    unit: string,
    symbol?: string,
    hint?: string,
  ) => (
    <NumberField
      label={label}
      unit={unit}
      symbol={symbol}
      value={Number(f[key])}
      onChange={(v) => up({ ...f, [key]: v })}
      hint={hint}
    />
  );
  return (
    <aside className="inspector">
      <div className="panel-heading">
        <SlidersHorizontal size={15} />
        Propriedades<span className="tag subtle">{f.name}</span>
      </div>
      <div className="selected-element">
        <div className="selected-glyph">
          <Layers size={25} />
        </div>
        <div>
          <strong>
            {f.name} ·{" "}
            {f.kind === "pile" ? "Bloco de fundação" : "Sapata isolada"}
          </strong>
          <p>
            {f.kind === "pile"
              ? `${f.count} estacas · Ø ${fmt(f.diameter * 100, 0)} cm`
              : "Retangular · apoio elástico"}
          </p>
        </div>
      </div>
      <div className="property-tabs">
        {(
          [
            ["geometry", Ruler, "Geometria"],
            ["materials", Layers, "Materiais"],
            ["soil", Waves, "Solo"],
            ["loads", ArrowDownToLine, "Ações"],
            ["methods", Settings2, "Métodos"],
          ] as const
        ).map(([key, Icon, name]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={tab === key ? "active" : ""}
            title={name}
          >
            <Icon size={17} />
            <span>{name}</span>
          </button>
        ))}
      </div>
      <div className="property-content">
        {tab === "geometry" && (
          <>
            <Section title="TIPO DE FUNDAÇÃO">
              <div className="segmented">
                <button
                  className={f.kind === "pile" ? "active" : ""}
                  onClick={() => up({ ...f, kind: "pile" })}
                >
                  Bloco / estacas
                </button>
                <button
                  className={f.kind === "footing" ? "active" : ""}
                  onClick={() => up({ ...f, kind: "footing" })}
                >
                  Sapata
                </button>
              </div>
              {f.kind === "pile" && (
                <>
                  <label className="select-field">
                    <span>Quantidade de estacas</span>
                    <select
                      aria-label="Quantidade de estacas"
                      value={f.count}
                      onChange={(e) =>
                        setCount(Number(e.target.value) as 1 | 2 | 3 | 4)
                      }
                    >
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "estaca" : "estacas"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="pile-patterns">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        title={`Arranjo com ${n} estacas`}
                        key={n}
                        className={f.count === n ? "active" : ""}
                        onClick={() => setCount(n as 1 | 2 | 3 | 4)}
                      >
                        <svg viewBox="0 0 48 35">
                          <rect
                            x="5"
                            y="3"
                            width="38"
                            height="29"
                            rx="3"
                            fill="none"
                            stroke="currentColor"
                            opacity=".4"
                          />
                          {(n === 1
                            ? [[24, 17]]
                            : n === 2
                              ? [
                                  [15, 17],
                                  [33, 17],
                                ]
                              : n === 3
                                ? [
                                    [15, 23],
                                    [33, 23],
                                    [24, 11],
                                  ]
                                : [
                                    [15, 10],
                                    [33, 10],
                                    [15, 25],
                                    [33, 25],
                                  ]
                          ).map(([x, y], i) => (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="3.6"
                              fill="currentColor"
                            />
                          ))}
                        </svg>
                        <small>{n}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Section>
            <Section
              title={f.kind === "pile" ? "ESTACAS" : "DIMENSÕES DA SAPATA"}
              badge="m"
            >
              {f.kind === "pile" ? (
                <>
                  {field("diameter", "Diâmetro", "m", "Ø")}
                  {field("length", "Comprimento abaixo do bloco", "m", "L")}
                  {f.count > 1 &&
                    field("spacingX", "Distância entre eixos X", "m", "sx")}
                  {f.count > 2 &&
                    field("spacingY", "Distância entre fileiras Y", "m", "sy")}
                </>
              ) : (
                <>
                  {field("capX", "Comprimento em X", "m", "Lx")}
                  {field("capY", "Largura em Y", "m", "Ly")}
                  {field("height", "Altura", "m", "h")}
                </>
              )}
            </Section>
            {f.kind === "pile" && (
              <Section title="BLOCO RÍGIDO" badge="m">
                {field("capX", "Comprimento em X", "m", "Lx")}
                {field("capY", "Largura em Y", "m", "Ly")}
                {field("height", "Altura do bloco", "m", "h")}
              </Section>
            )}
            <Section title="COTAS DE REFERÊNCIA">
              {field(
                "depth",
                "Cota da base",
                "m",
                "D",
                "Profundidade da face inferior do bloco ou da sapata, positiva abaixo do terreno.",
              )}
              <div className="computed-row">
                <span>
                  {f.kind === "pile" ? "Cota da ponta" : "Cota do topo"}
                </span>
                <strong>
                  −
                  {fmt(
                    f.kind === "pile" ? f.depth + f.length : f.depth - f.height,
                  )}{" "}
                  m
                </strong>
              </div>
            </Section>
            <div className="info-box">
              <CircleHelp size={15} />
              <p>
                Geometria e vistas sincronizadas. Dimensões em metros; cotas de
                profundidade positivas para baixo.
              </p>
            </div>
          </>
        )}
        {tab === "materials" && (
          <>
            <Section title="CONCRETO">
              {field("fck", "Resistência característica", "MPa", "fck")}
              {field("ec", "Módulo de elasticidade", "GPa", "Ec")}
              {field("concreteNu", "Coeficiente de Poisson", "—", "νc")}
            </Section>
            <div className="info-box">
              <CircleHelp size={15} />
              <p>
                Ec é informado diretamente e governa EA, EI e GJ das estacas.
                fck é registrado na memória; não há dimensionamento estrutural
                nesta versão. O bloco é rígido.
              </p>
            </div>
            {f.kind === "pile" && (
              <Section title="AOKI–VELLOSO">
                {field("f1", "Fator de ponta", "—", "F₁")}
                {field("f2", "Fator de atrito lateral", "—", "F₂")}
                <p className="field-help">
                  Fatores editáveis conforme tipo e execução da estaca. Os
                  valores iniciais 1,75 / 3,50 são apenas um exemplo.
                </p>
              </Section>
            )}
          </>
        )}
        {tab === "soil" && (
          <>
            <Section title="SONDAGEM E NÍVEL D’ÁGUA">
              <div className="computed-row">
                <span>Sondagem vinculada</span>
                <strong>{p.borehole}</strong>
              </div>
              <NumberField
                label="Cota do nível d’água"
                symbol="NA"
                unit="m"
                value={p.water}
                onChange={(water) => onProject({ ...p, water })}
              />
              <NumberField
                label="Base rígida de referência"
                hint="Hipótese do modelo; não se confunde automaticamente com impenetrabilidade ao SPT."
                symbol="zi"
                unit="m"
                value={p.bedrock}
                onChange={(bedrock) => onProject({ ...p, bedrock })}
              />
              <button className="secondary full" onClick={openSoil}>
                <Layers size={15} />
                Editar perfil e SPT
              </button>
            </Section>
            <Section title="CAMADAS DO PERFIL">
              {p.layers.map((l, i) => (
                <div className="soil-item" key={l.id}>
                  <span
                    className="soil-swatch"
                    style={{ background: l.color }}
                  />
                  <div>
                    <strong>{l.name}</strong>
                    <small>
                      {fmt(i ? p.layers[i - 1].bottom : 0, 1)} a{" "}
                      {fmt(l.bottom, 1)} m · E {fmt(l.e, 0)} MPa
                    </small>
                  </div>
                </div>
              ))}
            </Section>
            <div className="info-box">
              <Waves size={15} />
              <p>
                O nível d’água corrige o peso efetivo no cálculo de Vésic. Os
                módulos e coeficientes de reação são informados
                independentemente.
              </p>
            </div>
          </>
        )}
        {tab === "loads" && (
          <>
            <Section title="AÇÕES NO CENTRO DA BASE" badge="serviço">
              {field("n", "Força normal (compressão +)", "kN", "N")}
              {field("hx", "Força horizontal X", "kN", "Hx")}
              {field("hy", "Força horizontal Y", "kN", "Hy")}
              {field("mx", "Momento em X", "kN·m", "Mx")}
              {field("my", "Momento em Y", "kN·m", "My")}
              {field("mz", "Torção em Z", "kN·m", "Mz")}
            </Section>
            <div className="info-box">
              <CircleHelp size={15} />
              <p>
                Eixos estruturais: X e Y no plano; Z para cima. N positivo é
                convertido para Fz = −N. Momentos seguem a regra da mão direita.
              </p>
            </div>
          </>
        )}
        {tab === "methods" && (
          <>
            <Section title="MODELO DE RIGIDEZ">
              <label className="select-field method-select">
                <span>Método de cálculo</span>
                <select
                  aria-label="Método de cálculo"
                  value={f.kind === "pile" ? f.pileMethod : f.footingMethod}
                  onChange={(e) =>
                    up({
                      ...f,
                      ...(f.kind === "pile"
                        ? {
                            pileMethod: e.target
                              .value as Foundation["pileMethod"],
                          }
                        : {
                            footingMethod: e.target
                              .value as Foundation["footingMethod"],
                          }),
                    })
                  }
                >
                  {f.kind === "pile" ? (
                    <>
                      <option value="winkler">Winkler · viga e barra</option>
                      <option value="randolph">
                        Randolph–Wroth · TQS simplificado
                      </option>
                      <option value="mindlin">
                        Mindlin / Aoki–Lopes / Steinbrenner
                      </option>
                    </>
                  ) : (
                    <>
                      <option value="elastic">
                        Elasticidade · disco equivalente
                      </option>
                      <option value="winkler">Winkler · kv informado</option>
                      <option value="safe">
                        Winkler · SAFE/Morrison (TQS)
                      </option>
                      <option value="mindlin">
                        Mindlin / Steinbrenner · centro
                      </option>
                    </>
                  )}
                </select>
              </label>
              <p className="field-help">
                Métodos experimentais. Consulte as hipóteses e os valores
                intermediários na memória de cálculo.
              </p>
              {f.kind === "pile" && (
                <>
                  <label className="select-field method-select">
                    <span>Ligação estaca–bloco</span>
                    <select
                      aria-label="Ligação estaca–bloco"
                      value={f.headConnection}
                      onChange={(e) =>
                        up({
                          ...f,
                          headConnection: e.target
                            .value as Foundation["headConnection"],
                        })
                      }
                    >
                      <option value="fixed">Rígida à flexão</option>
                      <option value="pinned">Rotulada em X e Y</option>
                    </select>
                  </label>
                  <p className="field-help">
                    {f.headConnection === "pinned"
                      ? "Mx e My nulos no topo; o bloco permanece rígido e transmite momento pelos binários axiais. A rigidez lateral Winkler é condensada. Torção em Z permanece vinculada."
                      : "O topo acompanha a rotação do bloco. O momento pode ser dividido entre flexão das estacas e binários axiais."}
                  </p>
                </>
              )}
              {(f.kind === "pile" ||
                f.footingMethod === "mindlin" ||
                f.footingMethod === "elastic") && (
                <label className="select-field method-select">
                  <span>Módulo do solo E</span>
                  <select
                    aria-label="Origem do módulo do solo"
                    value={f.modulusSource}
                    onChange={(e) =>
                      up({
                        ...f,
                        modulusSource: e.target
                          .value as Foundation["modulusSource"],
                      })
                    }
                  >
                    <option value="manual">Informado por camada</option>
                    <option value="spt">SPT · Schmertmann (3 K_E N)</option>
                    {f.kind === "pile" ? (
                      <option value="aoki">SPT · E0 Aoki (1984)</option>
                    ) : (
                      f.modulusSource === "aoki" && (
                        <option value="aoki" disabled>
                          Aoki: somente estacas — selecione outra origem
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}
              {f.kind === "pile" && f.modulusSource === "aoki" && (
                <>
                  <label className="select-field method-select">
                    <span>Coeficiente executivo para E0</span>
                    <select
                      aria-label="Coeficiente executivo para E0"
                      value={f.aokiFactor}
                      onChange={(e) =>
                        up({
                          ...f,
                          aokiFactor: Number(e.target.value) as 3 | 4 | 6,
                        })
                      }
                    >
                      <option value="6">6 · cravada</option>
                      <option value="4">4 · hélice contínua</option>
                      <option value="3">3 · escavada</option>
                    </select>
                  </label>
                  <p className="field-help">
                    E0 = fator × K_AV × N̄SPT. K_AV em kPa/golpe; resultado
                    convertido para MPa. Sem atualização do módulo pelo
                    acréscimo de tensões. Não substitui automaticamente E
                    manual.
                  </p>
                </>
              )}
              {f.kind === "pile" && (
                <>
                  {field("segments", "Elementos por estaca", "—", "ne")}
                  {field(
                    "efficiency",
                    "Redutor adicional de rigidez",
                    "—",
                    "η",
                  )}
                  <p className="field-help">
                    η = 1 mantém a rigidez do método. Mindlin inclui interação
                    vertical; os demais somam estacas independentes.
                  </p>
                </>
              )}
              {f.kind === "footing" &&
                f.footingMethod === "winkler" &&
                field(
                  "kvInput",
                  "Coeficiente de reação vertical",
                  "kN/m³",
                  "kv",
                )}
              {f.kind === "footing" && f.footingMethod === "safe" && (
                <>
                  {field(
                    "allowablePressure",
                    "Tensão admissível informada",
                    "kPa",
                    "σadm",
                  )}
                  <p className="field-help">
                    Faixa da correlação: 24,52–392,27 kPa. Sem extrapolação. Não
                    utiliza automaticamente qúlt/FS.
                  </p>
                </>
              )}
              {((f.kind === "pile" && f.pileMethod === "randolph") ||
                (f.kind === "footing" && f.footingMethod !== "elastic")) &&
                field(
                  "horizontalRatio",
                  "Razão horizontal / vertical",
                  "—",
                  "μh",
                )}
              {f.kind === "pile" && f.pileMethod === "randolph" && (
                <>
                  {field(
                    "randolphRho",
                    "Razão de módulos G(L/2)/G(L)",
                    "—",
                    "ρ",
                  )}
                  <p className="field-help">
                    ρ = 1 para fuste equivalente homogêneo. Formulação
                    simplificada de fuste publicada pelo TQS, sem termo de ponta
                    do método completo.
                  </p>
                </>
              )}
              {((f.kind === "pile" && f.pileMethod === "mindlin") ||
                (f.kind === "footing" && f.footingMethod === "mindlin")) && (
                <>
                  {field(
                    "integration",
                    "Ordem de integração (8–32)",
                    "—",
                    "ng",
                  )}
                  <p className="field-help">
                    Descreva as camadas até a base indeslocável de{" "}
                    {fmt(p.bedrock)} m. Compare ordens e malhas para conferir
                    convergência.
                  </p>
                  {f.kind === "pile" && (
                    <>
                      <label className="select-field method-select">
                        <span>Transferência vertical</span>
                        <select
                          aria-label="Transferência vertical"
                          value={f.transfer}
                          onChange={(e) =>
                            up({
                              ...f,
                              transfer: e.target
                                .value as Foundation["transfer"],
                            })
                          }
                        >
                          <option value="capacity-ratio">
                            Proporcional a RL e RP (Aoki–Velloso)
                          </option>
                          <option value="manual">
                            Fração de ponta informada
                          </option>
                        </select>
                      </label>
                      {f.transfer === "manual" &&
                        field(
                          "tipFraction",
                          "Fração de carga na ponta (0–1)",
                          "—",
                          "βp",
                        )}
                      <p className="field-help">
                        Fração fixa para estimativa linear; não representa a
                        sequência real de mobilização fuste/ponta. Lateral e
                        torção por Winkler.
                      </p>
                    </>
                  )}
                </>
              )}
            </Section>
            {f.kind === "footing" && (
              <Section title="REFERÊNCIAS DE CAPACIDADE">
                {field("safety", "Divisor da tensão última", "—", "FS")}
                {field(
                  "sptFactor",
                  "Fator da correlação SPT",
                  "kPa/golpe",
                  "C",
                )}
                <p className="field-help">
                  Vésic e qSPT são estimativas separadas da rigidez, sem
                  verificação normativa completa.
                </p>
              </Section>
            )}
            <p className="field-help">
              Análise → NBR 6122:2022 reúne as verificações parciais, hipóteses
              e dados que faltam para o projeto.
            </p>
            <Section title="METODOLOGIA A COMPLEMENTAR">
              {["Terzaghi · capacidade de carga"].map((m) => (
                <div className="pending-method" key={m}>
                  <span>{m}</span>
                  <small>Pendente</small>
                </div>
              ))}
            </Section>
            <button className="secondary full" onClick={openProject}>
              Dados e observações do projeto
            </button>
          </>
        )}
      </div>
      <div className="inspector-footer">
        <span className="dot teal" />
        Edição local · rascunho automático
      </div>
    </aside>
  );
}
