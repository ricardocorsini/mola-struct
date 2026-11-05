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
                label="Cota do impenetrável"
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
            <Section title="MOTOR ATIVO">
              <div className="method-card">
                <span className="dot teal" />
                <strong>
                  {f.kind === "pile"
                    ? "Winkler · viga/barra discretizada"
                    : "Elasticidade + Winkler"}
                </strong>
                <small>Implementação experimental · v0.1</small>
              </div>
              {f.kind === "pile" ? (
                <>
                  {field("segments", "Elementos por estaca", "—", "ne")}
                  {field("efficiency", "Redutor manual de rigidez", "—", "η")}
                  <p className="field-help">
                    η = 1 soma estacas independentes. Não substitui a análise de
                    interação de grupo.
                  </p>
                </>
              ) : (
                <>
                  {field("safety", "Divisor da tensão última", "—", "FS")}
                  {field(
                    "sptFactor",
                    "Fator da correlação SPT",
                    "kPa/golpe",
                    "C",
                  )}
                  <p className="field-help">
                    qSPT = C × N médio em 2B. Correlação exploratória, sem
                    atribuição normativa.
                  </p>
                </>
              )}
            </Section>
            <Section title="MÉTODOS PARA PRÓXIMA REVISÃO">
              {[
                "Mindlin · meio contínuo",
                "Steinbrenner · camada finita",
                "NBR 6122:1996 · tensão básica",
                "Terzaghi · capacidade de carga",
              ].map((m) => (
                <div className="pending-method" key={m}>
                  <span>{m}</span>
                  <small>Pendente</small>
                </div>
              ))}
              <p className="field-help">
                Disponíveis na estrutura do projeto para futura implementação.
                Não produzem resultados nesta versão.
              </p>
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
