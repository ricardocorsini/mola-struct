import { useRef, useState } from "react";
import {
  ClipboardPaste,
  Download,
  Plus,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import { fmt, soilNames, uid, type Layer, type Project } from "../domain/model";
import { parseSpt } from "../domain/engine";
import { Cell, NumberField } from "./Fields";
export default function SoilEditor({
  project: p,
  onChange,
  toast,
  onDownload,
  initial = "spt",
}: {
  initial?: string;
  project: Project;
  onChange: (p: Project) => void;
  toast: (s: string) => void;
  onDownload: () => void;
}) {
  const [tab, setTab] = useState(initial),
    [advanced, setAdvanced] = useState(false),
    [paste, setPaste] = useState(false),
    [text, setText] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const setLayer = (i: number, change: Partial<Layer>) =>
    onChange({
      ...p,
      layers: p.layers.map((l, j) => (i === j ? { ...l, ...change } : l)),
    });
  const load = (s: string) => {
    try {
      const spt = parseSpt(s);
      onChange({ ...p, spt });
      setPaste(false);
      toast(`${spt.length} registros SPT importados.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Arquivo inválido.");
    }
  };
  return (
    <div className="soil-editor">
      <div className="page-heading">
        <div>
          <span className="eyebrow">INVESTIGAÇÃO GEOTÉCNICA</span>
          <h2>Sondagem e perfil do solo</h2>
          <p>Um perfil compartilhado pelas fundações do projeto.</p>
        </div>
        <span className="tag">
          <Waves size={14} />
          {p.borehole}
        </span>
      </div>
      <div className="soil-stats">
        <label>
          <span>Identificação</span>
          <input
            aria-label="Identificação da sondagem"
            value={p.borehole}
            onChange={(e) => onChange({ ...p, borehole: e.target.value })}
          />
        </label>
        <NumberField
          label="Nível d’água"
          unit="m"
          value={p.water}
          onChange={(water) => onChange({ ...p, water })}
        />
        <NumberField
          label="Impenetrável"
          unit="m"
          value={p.bedrock}
          onChange={(bedrock) => onChange({ ...p, bedrock })}
        />
        <div>
          <span>Profundidade investigada</span>
          <strong>
            {fmt(p.spt.at(-1)?.depth ?? 0, 1)} <small>m</small>
          </strong>
        </div>
      </div>
      <div className="subnav">
        <button
          className={tab === "spt" ? "active" : ""}
          onClick={() => setTab("spt")}
        >
          Ensaio SPT <span>{p.spt.length}</span>
        </button>
        <button
          className={tab === "layers" ? "active" : ""}
          onClick={() => setTab("layers")}
        >
          Camadas de solo <span>{p.layers.length}</span>
        </button>
      </div>
      {tab === "spt" ? (
        <>
          <div className="editor-toolbar">
            <button
              className="secondary"
              onClick={() => {
                const last = p.spt.at(-1)!;
                onChange({
                  ...p,
                  spt: [...p.spt, { depth: last.depth + 1, n: last.n }],
                });
              }}
            >
              <Plus size={15} />
              Adicionar metro
            </button>
            <button onClick={() => file.current?.click()}>
              <Upload size={15} />
              Importar CSV
            </button>
            <button onClick={() => setPaste(!paste)}>
              <ClipboardPaste size={15} />
              Colar tabela
            </button>
            <button title="Baixar CSV da sondagem" onClick={onDownload}>
              <Download size={15} />
            </button>
          </div>
          {paste && (
            <div className="paste-box">
              <label htmlFor="paste-spt">
                Profundidade (m) ; N SPT — use ponto e vírgula ou colunas de
                planilha.
              </label>
              <textarea
                id="paste-spt"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"profundidade;n\n1;4\n2;6\n3;10"}
              />
              <button className="primary" onClick={() => load(text)}>
                Aplicar sondagem
              </button>
            </div>
          )}
          <div className="spt-layout">
            <div className="table-scroll">
              <table className="data-table spt-table">
                <thead>
                  <tr>
                    <th>Registro</th>
                    <th>Profundidade (m)</th>
                    <th>N SPT (golpes)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.spt.map((s, i) => (
                    <tr key={i}>
                      <td className="muted">
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td>
                        <Cell
                          label={`Profundidade SPT ${i + 1}`}
                          value={s.depth}
                          onChange={(depth) =>
                            onChange({
                              ...p,
                              spt: p.spt.map((v, j) =>
                                j === i ? { ...v, depth } : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <Cell
                          label={`N SPT ${i + 1}`}
                          value={s.n}
                          step={1}
                          min={0}
                          onChange={(n) =>
                            onChange({
                              ...p,
                              spt: p.spt.map((v, j) =>
                                j === i ? { ...v, n } : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          title={`Remover registro ${i + 1}`}
                          disabled={p.spt.length <= 1}
                          onClick={() =>
                            onChange({
                              ...p,
                              spt: p.spt.filter((_, j) => j !== i),
                            })
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="spt-chart">
              <span className="eyebrow">RESISTÊNCIA À PENETRAÇÃO</span>
              <svg
                viewBox={`0 0 300 ${Math.max(350, p.spt.length * 27 + 50)}`}
                aria-label="Gráfico N SPT por profundidade"
                role="img"
              >
                {[0, 10, 20, 30, 40, 50, 60].map((n) => (
                  <g key={n}>
                    <line
                      x1={45 + n * 3.7}
                      x2={45 + n * 3.7}
                      y1="30"
                      y2={p.spt.length * 27 + 35}
                      stroke="#e5e9ef"
                    />
                    <text
                      x={45 + n * 3.7}
                      y="18"
                      textAnchor="middle"
                      fontSize="10"
                      fill="#7f8b9c"
                    >
                      {n}
                    </text>
                  </g>
                ))}
                {p.spt.map((s, i) => (
                  <g key={i}>
                    <text
                      x="30"
                      y={48 + i * 27}
                      textAnchor="end"
                      fontSize="10"
                      fill="#7f8b9c"
                    >
                      {s.depth} m
                    </text>
                    <rect
                      x="45"
                      y={39 + i * 27}
                      width={Math.min(s.n, 60) * 3.7}
                      height="10"
                      fill="#e3e7fa"
                    />
                    <circle
                      cx={45 + Math.min(s.n, 60) * 3.7}
                      cy={44 + i * 27}
                      r="3.2"
                      fill="#3448d1"
                    />
                  </g>
                ))}
                <polyline
                  points={p.spt
                    .map(
                      (s, i) =>
                        `${45 + Math.min(s.n, 60) * 3.7},${44 + i * 27}`,
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#3448d1"
                  strokeWidth="1.7"
                />
              </svg>
              <p>
                Os registros representam o intervalo entre a profundidade
                anterior e a indicada. N &gt; 60 é limitado apenas no gráfico.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="editor-toolbar">
            <button
              className="secondary"
              onClick={() => {
                const last = p.layers.at(-1)!;
                onChange({
                  ...p,
                  layers: [
                    ...p.layers,
                    {
                      ...last,
                      id: uid(),
                      name: "Nova camada",
                      bottom: last.bottom + 3,
                    },
                  ],
                });
              }}
            >
              <Plus size={15} />
              Adicionar camada
            </button>
            <label className="check-label">
              <input
                type="checkbox"
                checked={advanced}
                onChange={(e) => setAdvanced(e.target.checked)}
              />
              Parâmetros avançados
            </label>
          </div>
          <div className="table-scroll">
            <table className="data-table layers-table">
              <thead>
                <tr>
                  <th>Camada / descrição</th>
                  <th>Cota final (m)</th>
                  <th>Tipo</th>
                  {advanced ? (
                    <>
                      <th>γ (kN/m³)</th>
                      <th>γsat</th>
                      <th>φ (°)</th>
                      <th>c (kPa)</th>
                      <th>α</th>
                      <th>K (kPa)</th>
                      <th>kh (kN/m³)</th>
                      <th>kt (kN/m³)</th>
                      <th>kp (kN/m³)</th>
                    </>
                  ) : (
                    <>
                      <th>E (MPa)</th>
                      <th>ν</th>
                      <th>K_E (MPa)</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.layers.map((l, i) => (
                  <tr key={l.id}>
                    <td>
                      <div className="layer-name">
                        <input
                          type="color"
                          aria-label={`Cor camada ${i + 1}`}
                          value={l.color}
                          onChange={(e) =>
                            setLayer(i, { color: e.target.value })
                          }
                        />
                        <input
                          aria-label={`Descrição camada ${i + 1}`}
                          value={l.name}
                          onChange={(e) =>
                            setLayer(i, { name: e.target.value })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <Cell
                        label={`Cota final camada ${i + 1}`}
                        value={l.bottom}
                        onChange={(bottom) => setLayer(i, { bottom })}
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Solo camada ${i + 1}`}
                        value={l.soil}
                        onChange={(e) =>
                          setLayer(i, { soil: e.target.value as Layer["soil"] })
                        }
                      >
                        {Object.entries(soilNames).map(([v, n]) => (
                          <option key={v} value={v}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(advanced
                      ? [
                          "gamma",
                          "gammaSat",
                          "phi",
                          "cohesion",
                          "alpha",
                          "k",
                          "kh",
                          "shaftK",
                          "baseK",
                        ]
                      : ["e", "nu", "schmertmannK"]
                    ).map((key) => (
                      <td key={key}>
                        <Cell
                          label={`${key} camada ${i + 1}`}
                          value={Number(l[key as keyof Layer])}
                          onChange={(n) => setLayer(i, { [key]: n })}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        title={`Remover camada ${i + 1}`}
                        disabled={p.layers.length <= 1}
                        onClick={() =>
                          onChange({
                            ...p,
                            layers: p.layers.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="soil-definitions">
            <p>
              <b>E e ν</b> são informados. Na aba Métodos, cada fundação pode
              optar por E = 3 K_E N̄SPT (Schmertmann conforme TQS). K_E em MPa:
              areia 0,90; areia siltosa 0,70; silte 0,35; argila siltosa 0,20.
              Edite conforme a classificação real.
            </p>
            <p>
              <b>α e K</b> pertencem ao método Aoki–Velloso. α é decimal (ex.:
              0,014 = 1,4%); K é informado em kPa por golpe.
            </p>
            <p>
              <b>kh</b> é a reação lateral por deslocamento e área projetada.{" "}
              <b>kt</b> é a rigidez tangencial da interface do fuste; <b>kp</b>{" "}
              é a reação normal da ponta. Todos em kN/m³.
            </p>
            <p>
              <b>γ, γsat, φ e c</b> são usados na estimativa de tensão última de
              Vésic.
            </p>
          </div>
        </>
      )}
      <input
        ref={file}
        type="file"
        accept=".csv,.tsv,.txt"
        hidden
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (selected) load(await selected.text());
          e.target.value = "";
        }}
      />
    </div>
  );
}
