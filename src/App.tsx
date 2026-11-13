import { reference16Project } from "./domain/benchmark16";
import { footingReferenceProject } from "./domain/benchmarkFootings";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  Activity,
  ArrowDownToLine,
  BookOpen,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Columns3,
  Copy,
  FileCode2,
  FileDown,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid2X2,
  Layers,
  ListTree,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelRightClose,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Ruler,
  Save,
  Settings2,
  SlidersHorizontal,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Waves,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { parseSpt } from "./domain/engine";
import { useCalculation } from "./domain/useCalculation";
import {
  clone,
  defaultFoundation,
  exampleProject,
  methodologyProject,
  fmt,
  parseProject,
  serializeProject,
  uid,
  type Foundation,
  type Project,
} from "./domain/model";
import Inspector from "./components/Inspector";
import type { PropertyTab } from "./components/Inspector";
import SectionView from "./components/SectionView";
import SoilEditor from "./components/SoilEditor";
import Results, { SpringCards } from "./components/Results";
import Report from "./components/Report";
import UpdatePanel, {
  UpdateStatus,
  useUpdater,
  type PrepareRestart,
} from "./components/UpdatePanel";
import {
  geometryDxf,
  matrixCsv,
  nativeOpen,
  reportPdf,
  resultsTsv,
  safeName,
  saveFile,
  sectionSvg,
  sptCsv,
} from "./files";
const ThreeView = lazy(() => import("./components/ThreeView"));
type View = "3d" | "section" | "plan" | "soil" | "results" | "report";
type Action = {
  label: string;
  Icon: LucideIcon;
  action: () => void;
  disabled?: boolean;
};
const KEY = "molasstruct.project.v1";
function recover(): { p: Project; error: string } {
  try {
    const raw = localStorage.getItem(KEY);
    return { p: raw ? parseProject(raw) : exampleProject(), error: "" };
  } catch {
    return {
      p: exampleProject(),
      error:
        "O rascunho anterior não pôde ser aberto. Uma cópia foi preservada neste dispositivo.",
    };
  }
}
export default function App() {
  const [boot] = useState(recover),
    [history, setHistory] = useState({ items: [boot.p], at: 0 });
  const p = history.items[history.at];
  const [selected, setSelected] = useState(p.foundations[0].id),
    [view, setView] = useState<View>("3d"),
    [ribbon, setRibbon] = useState("Início"),
    [tab, setTab] = useState<PropertyTab>("geometry");
  const [dark, setDark] = useState(
      () => localStorage.getItem("molasstruct.theme") === "dark",
    ),
    [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [results, setResults] = useState(true);
  const [notice, setNotice] = useState(""),
    [saved, setSaved] = useState(true),
    [modal, setModal] = useState<"project" | "help" | null>(null),
    [draft, setDraft] = useState(p),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{
    url: string;
    name: string;
    size: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (preparedPdf) URL.revokeObjectURL(preparedPdf.url);
    },
    [preparedPdf],
  );
  const [options, setOptions] = useState({
      soil: true,
      water: true,
      springs: true,
      grid: true,
      dimensions: true,
    }),
    [resultTab, setResultTab] = useState("springs"),
    [soilTab, setSoilTab] = useState("spt");
  const file = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const f = p.foundations.find((x) => x.id === selected) ?? p.foundations[0];
  const r = useCalculation(p, f);
  const toast = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotice(""), 6500);
  }, []);
  const update = useCallback((next: Project) => {
    setHistory((h) => ({
      items: [...h.items.slice(Math.max(0, h.at - 49), h.at + 1), clone(next)],
      at: Math.min(h.at + 1, 50),
    }));
    setSaved(false);
  }, []);
  const updateFoundation = (next: Foundation) =>
    update({
      ...p,
      foundations: p.foundations.map((x) => (x.id === f.id ? next : x)),
    });
  const undo = () => setHistory((h) => ({ ...h, at: Math.max(0, h.at - 1) })),
    redo = () =>
      setHistory((h) => ({ ...h, at: Math.min(h.items.length - 1, h.at + 1) }));
  useEffect(() => {
    if (boot.error) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) localStorage.setItem(KEY + ".recovered", raw);
      } catch {
        /* storage failure is reported on the next save */
      }
      toast(boot.error);
    }
  }, [boot, toast]);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, serializeProject(p));
        setSaved(true);
      } catch {
        toast(
          "Não foi possível gravar o rascunho. Use Salvar JSON para manter uma cópia.",
        );
      }
    }, 350);
    return () => clearTimeout(t);
  }, [p, toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("molasstruct.theme", dark ? "dark" : "light");
    } catch {
      /* optional preference */
    }
  }, [dark]);
  useEffect(() => {
    document.title = `${f.name} · ${p.name} — MolaStruct`;
  }, [f.name, p.name]);
  const select = (id: string) => {
    setSelected(id);
    if (view === "soil") setView("3d");
  };
  const showResults = (key = "springs") => {
    setResultTab(key);
    setView("results");
  };
  const showSoil = (key = "spt") => {
    setSoilTab(key);
    setView("soil");
  };
  const add = (kind: "pile" | "footing" = "pile") => {
    const i = p.foundations.length + 1,
      next = {
        ...defaultFoundation(uid(), kind),
        name: `${kind === "pile" ? "F" : "S"}${String(i).padStart(2, "0")}`,
      };
    update({ ...p, foundations: [...p.foundations, next] });
    setSelected(next.id);
    setView("3d");
    setTab("geometry");
    toast("Fundação adicionada. Revise os parâmetros iniciais de exemplo.");
  };
  const duplicate = () => {
    const next = { ...clone(f), id: uid(), name: `${f.name} · cópia` };
    update({ ...p, foundations: [...p.foundations, next] });
    setSelected(next.id);
    toast("Fundação duplicada.");
  };
  const remove = () => {
    if (p.foundations.length === 1) {
      toast("O projeto precisa manter pelo menos uma fundação.");
      return;
    }
    const next = p.foundations.filter((x) => x.id !== f.id);
    update({ ...p, foundations: next });
    setSelected(next[0].id);
    toast("Fundação removida. Use Desfazer para recuperar.");
  };
  const newProject = () => {
    const next = exampleProject();
    next.name = "Novo projeto";
    next.author = "";
    next.notes =
      "Dados iniciais de exemplo. Substitua pela investigação e pelos parâmetros da obra.";
    next.foundations = [defaultFoundation()];
    update(next);
    setSelected(next.foundations[0].id);
    setView("3d");
    toast("Novo projeto criado com dados iniciais de exemplo.");
  };
  const openProject = () => {
    setDraft(clone(p));
    setModal("project");
  };
  const applyImport = (raw: string) => {
    try {
      const next = parseProject(raw);
      update(next);
      setSelected(next.foundations[0].id);
      setView("3d");
      toast("Projeto aberto e validado.");
    } catch {
      toast(
        "Projeto inválido ou versão não suportada. Use um arquivo MolaStruct v1.",
      );
    }
  };
  const open = async () => {
    if (isTauri()) {
      try {
        const raw = await nativeOpen();
        if (raw) applyImport(raw);
      } catch {
        toast("Não foi possível abrir o arquivo.");
      }
    } else {
      if (file.current) {
        file.current.accept = ".json";
        file.current.click();
      }
    }
  };
  const importSpt = () => {
    if (file.current) {
      file.current.accept = ".csv,.tsv,.txt";
      file.current.click();
    }
  };
  const exportFile = async (kind: string) => {
    try {
      if (["pdf", "matrix", "copy"].includes(kind) && !r.valid) {
        toast("Revise os dados inválidos antes de exportar os resultados.");
        return;
      }
      if (
        ["svg", "dxf"].includes(kind) &&
        r.notices.some((n) => n.level === "error")
      ) {
        toast("Revise a geometria e o perfil antes de exportar o desenho.");
        return;
      }
      const name = safeName(`${p.name}-${f.name}`);
      let done = true;
      if (kind === "json")
        done = await saveFile(
          `${safeName(p.name)}.molas.json`,
          serializeProject(p),
          "application/json",
          "json",
        );
      if (kind === "matrix")
        done = await saveFile(
          `${name}-matriz.csv`,
          matrixCsv(f, r),
          "text/csv;charset=utf-8",
          "csv",
        );
      if (kind === "spt")
        done = await saveFile(
          `${safeName(p.borehole)}-spt.csv`,
          sptCsv(p),
          "text/csv;charset=utf-8",
          "csv",
        );
      if (kind === "svg")
        done = await saveFile(
          `${name}-${view === "plan" ? "planta" : "corte"}.svg`,
          sectionSvg(p, f, view === "plan"),
          "image/svg+xml",
          "svg",
        );
      if (kind === "dxf")
        done = await saveFile(
          `${name}-geometria.dxf`,
          geometryDxf(f),
          "application/dxf",
          "dxf",
        );
      if (kind === "pdf") {
        setBusy(true);
        const pdfBytes = await reportPdf(p, f, r);
        if (!isTauri()) {
          const url = URL.createObjectURL(
            new Blob([new Uint8Array(pdfBytes).buffer], {
              type: "application/pdf",
            }),
          );
          setPreparedPdf({
            url,
            name: `${name}-memoria.pdf`,
            size: pdfBytes.length,
          });
          setNotice("");
          return;
        }
        done = await saveFile(
          `${name}-memoria.pdf`,
          pdfBytes,
          "application/pdf",
          "pdf",
        );
      }
      if (kind === "copy") {
        await navigator.clipboard.writeText(resultsTsv(f, r));
        toast("Matriz copiada. Unidades: kN, m e rad.");
        return;
      }
      if (done)
        toast(
          kind === "json"
            ? "Projeto JSON exportado."
            : "Arquivo exportado com os dados atuais.",
        );
    } catch (e) {
      toast(
        `Não foi possível concluir a exportação. ${e instanceof Error ? e.message : ""}`,
      );
    } finally {
      setBusy(false);
    }
  };
  // Antes de reiniciar para atualizar: nenhuma exportação em curso, nenhuma edição
  // pendente na janela de dados do projeto, rascunho gravado e, se pedido, o arquivo
  // salvo. Cancelar ou falhar ao salvar impede o reinício.
  const prepareRestart = useCallback<PrepareRestart>(
    async (withFile) => {
      if (busy)
        return "Aguarde a exportação em andamento terminar antes de reiniciar.";
      if (modal === "project")
        return "Feche a janela Dados do projeto (salvando ou cancelando as alterações) antes de reiniciar.";
      if (withFile) {
        let done = false;
        try {
          done = await saveFile(
            `${safeName(p.name)}.molas.json`,
            serializeProject(p),
            "application/json",
            "json",
          );
        } catch {
          done = false;
        }
        if (!done) return "O projeto não foi salvo; o reinício foi cancelado.";
      }
      try {
        localStorage.setItem(KEY, serializeProject(p));
        setSaved(true);
        return null;
      } catch {
        return withFile
          ? null
          : "Não foi possível guardar o rascunho neste dispositivo. Use Salvar projeto e reiniciar.";
      }
    },
    [busy, modal, p],
  );
  const updater = useUpdater(toast, prepareRestart);
  const run = () => {
    if (!r.valid) {
      toast("O modelo tem entradas inválidas. Consulte as verificações.");
      setResults(true);
      return;
    }
    setResults(true);
    toast(
      "Estimativa atualizada: matriz de rigidez e resposta às ações calculadas.",
    );
  };
  const handlers = useRef({ open, exportFile, undo, redo });
  handlers.current = { open, exportFile, undo, redo };
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void handlers.current.exportFile("json");
      }
      if (k === "o") {
        e.preventDefault();
        void handlers.current.open();
      }
      if (
        k === "z" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (e.shiftKey) handlers.current.redo();
        else handlers.current.undo();
      }
      if (k === "y") {
        e.preventDefault();
        handlers.current.redo();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const dialog = document.querySelector('[role="dialog"]');
        const els = dialog?.querySelectorAll<HTMLElement>(
          "button,input,textarea,select",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", fn);
    setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            '[role="dialog"] input, [role="dialog"] button',
          )
          ?.focus(),
      0,
    );
    return () => window.removeEventListener("keydown", fn);
  }, [modal]);
  const groups: { title: string; items: Action[] }[] =
    ribbon === "Início"
      ? [
          {
            title: "Projeto",
            items: [
              { label: "Novo", Icon: FilePlus2, action: newProject },
              {
                label: "Exemplo métodos",
                Icon: BookOpen,
                action: () => {
                  const next = methodologyProject();
                  update(next);
                  setSelected("M3");
                  setView("results");
                  setTab("methods");
                  setRight(true);
                  toast(
                    "Exemplo de métodos carregado. Desfazer recupera o projeto anterior.",
                  );
                },
              },
              {
                label: "Exemplo 16 m",
                Icon: BookOpen,
                action: () => {
                  const next = reference16Project();
                  update(next);
                  setSelected("B16");
                  setView("results");
                  setResultTab("benchmark");
                  setTab("methods");
                  setRight(true);
                  toast(
                    "Referência de 16 m carregada com hipóteses explícitas. Desfazer recupera o projeto anterior.",
                  );
                },
              },
              {
                label: "Exemplo sapatas",
                Icon: BookOpen,
                action: () => {
                  update(footingReferenceProject());
                  setSelected("S100");
                  setView("results");
                  setResultTab("benchmark");
                  setTab("methods");
                  setRight(true);
                  toast(
                    "Referência FEMA 273 carregada: 13 sapatas, silte NSPT 7. Desfazer recupera o projeto anterior.",
                  );
                },
              },
              { label: "Abrir", Icon: FolderOpen, action: () => void open() },
              {
                label: "Salvar JSON",
                Icon: Save,
                action: () => void exportFile("json"),
              },
            ],
          },
          {
            title: "Fundação",
            items: [
              { label: "Adicionar", Icon: Plus, action: () => add() },
              { label: "Duplicar", Icon: Copy, action: duplicate },
            ],
          },
          {
            title: "Visualização",
            items: [
              { label: "Vista 3D", Icon: Box, action: () => setView("3d") },
              {
                label: "Corte do solo",
                Icon: Layers,
                action: () => setView("section"),
              },
              { label: "Planta", Icon: Grid2X2, action: () => setView("plan") },
            ],
          },
          {
            title: "Documentação",
            items: [
              {
                label: "Memória",
                Icon: BookOpen,
                action: () => setView("report"),
              },
              {
                label: "Exportar PDF",
                Icon: FileDown,
                action: () => void exportFile("pdf"),
              },
            ],
          },
        ]
      : ribbon === "Modelo"
        ? [
            {
              title: "Adicionar elemento",
              items: [
                {
                  label: "Bloco / estacas",
                  Icon: Layers,
                  action: () => add("pile"),
                },
                { label: "Sapata", Icon: Box, action: () => add("footing") },
              ],
            },
            {
              title: "Propriedades",
              items: [
                {
                  label: "Geometria",
                  Icon: Ruler,
                  action: () => {
                    setTab("geometry");
                    setRight(true);
                  },
                },
                {
                  label: "Materiais",
                  Icon: Layers,
                  action: () => {
                    setTab("materials");
                    setRight(true);
                  },
                },
                {
                  label: "Ações",
                  Icon: ArrowDownToLine,
                  action: () => {
                    setTab("loads");
                    setRight(true);
                  },
                },
              ],
            },
            {
              title: "Organização",
              items: [
                { label: "Duplicar", Icon: Copy, action: duplicate },
                {
                  label: "Remover",
                  Icon: Trash2,
                  action: remove,
                  disabled: p.foundations.length === 1,
                },
              ],
            },
          ]
        : ribbon === "Sondagem"
          ? [
              {
                title: "Investigação",
                items: [
                  {
                    label: "Ensaio SPT",
                    Icon: ListTree,
                    action: () => showSoil("spt"),
                  },
                  {
                    label: "Camadas de solo",
                    Icon: Layers,
                    action: () => showSoil("layers"),
                  },
                  {
                    label: "Nível d’água",
                    Icon: Waves,
                    action: () => {
                      setTab("soil");
                      setRight(true);
                    },
                  },
                ],
              },
              {
                title: "Dados",
                items: [
                  { label: "Importar CSV", Icon: Upload, action: importSpt },
                  {
                    label: "Exportar SPT",
                    Icon: FileSpreadsheet,
                    action: () => void exportFile("spt"),
                  },
                ],
              },
            ]
          : ribbon === "Análise"
            ? [
                {
                  title: "Resultados",
                  items: [
                    {
                      label: "Rigidezes",
                      Icon: Activity,
                      action: () => showResults(),
                    },
                    {
                      label: "Matriz 6 × 6",
                      Icon: Grid2X2,
                      action: () => showResults("matrix"),
                    },
                    {
                      label: "Capacidade",
                      Icon: ArrowDownToLine,
                      action: () => showResults("capacity"),
                    },
                  ],
                },
                {
                  title: "Estudos",
                  items: [
                    {
                      label: "Comparar",
                      Icon: Columns3,
                      action: () => showResults("comparison"),
                    },
                    {
                      label: "Sensibilidade",
                      Icon: SlidersHorizontal,
                      action: () => showResults("sensitivity"),
                    },
                    {
                      label: "Métodos",
                      Icon: Settings2,
                      action: () => {
                        setTab("methods");
                        setRight(true);
                      },
                    },
                  ],
                },
              ]
            : ribbon === "Exibir"
              ? [
                  {
                    title: "Painéis",
                    items: [
                      {
                        label: "Navegador",
                        Icon: PanelLeftClose,
                        action: () => setLeft(!left),
                      },
                      {
                        label: "Propriedades",
                        Icon: PanelRightClose,
                        action: () => setRight(!right),
                      },
                      {
                        label: "Resultados",
                        Icon: Activity,
                        action: () => setResults(!results),
                      },
                    ],
                  },
                  {
                    title: "Modelo 3D",
                    items: [
                      {
                        label: "Cotas",
                        Icon: Ruler,
                        action: () =>
                          setOptions({
                            ...options,
                            dimensions: !options.dimensions,
                          }),
                      },
                      {
                        label: "Camadas",
                        Icon: Layers,
                        action: () =>
                          setOptions({ ...options, soil: !options.soil }),
                      },
                      {
                        label: "Molas",
                        Icon: Activity,
                        action: () =>
                          setOptions({ ...options, springs: !options.springs }),
                      },
                    ],
                  },
                  {
                    title: "Aparência",
                    items: [
                      {
                        label: dark ? "Tema claro" : "Tema escuro",
                        Icon: dark ? Sun : Moon,
                        action: () => setDark(!dark),
                      },
                    ],
                  },
                  {
                    title: "Aplicativo",
                    items: [
                      {
                        label: "Verificar atualizações",
                        Icon: RefreshCw,
                        action: () => void updater.check(true),
                      },
                    ],
                  },
                ]
              : [
                  {
                    title: "Documentos",
                    items: [
                      {
                        label: "Memória",
                        Icon: BookOpen,
                        action: () => setView("report"),
                      },
                      {
                        label: "Memória PDF",
                        Icon: FileText,
                        action: () => void exportFile("pdf"),
                      },
                    ],
                  },
                  {
                    title: "Exportação",
                    items: [
                      {
                        label: "Matriz CSV",
                        Icon: FileSpreadsheet,
                        action: () => void exportFile("matrix"),
                      },
                      {
                        label: "Geometria DXF",
                        Icon: Ruler,
                        action: () => void exportFile("dxf"),
                      },
                      {
                        label: "Desenho SVG",
                        Icon: FileCode2,
                        action: () => void exportFile("svg"),
                      },
                      {
                        label: "Salvar JSON",
                        Icon: Save,
                        action: () => void exportFile("json"),
                      },
                    ],
                  },
                  {
                    title: "Projeto editável",
                    items: [
                      {
                        label: "Dados do projeto",
                        Icon: Settings2,
                        action: openProject,
                      },
                    ],
                  },
                ];
  const viewNames: { key: View; title: string; Icon: LucideIcon }[] = [
    { key: "3d", title: "Vista 3D", Icon: Box },
    { key: "section", title: "Corte geotécnico", Icon: Layers },
    { key: "plan", title: "Planta", Icon: Grid2X2 },
    { key: "soil", title: "Sondagem", Icon: ListTree },
    { key: "results", title: "Resultados", Icon: Activity },
    { key: "report", title: "Memória", Icon: BookOpen },
  ];
  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="app-brand">
          <img src="/molastruct-icon.png" alt="" />
          <strong>
            Mola<span>Struct</span>
          </strong>
          <i /> <small>OPENSTRUCT</small>
        </div>
        <div className="quick-actions">
          <button onClick={() => void open()} title="Abrir projeto · Ctrl+O">
            <FolderOpen />
          </button>
          <button
            onClick={() => void exportFile("json")}
            title="Salvar projeto · Ctrl+S"
          >
            <Save />
          </button>
          <span />
          <button
            onClick={undo}
            disabled={history.at === 0}
            title="Desfazer · Ctrl+Z"
          >
            <Undo2 />
          </button>
          <button
            onClick={redo}
            disabled={history.at >= history.items.length - 1}
            title="Refazer · Ctrl+Y"
          >
            <Redo2 />
          </button>
        </div>
        <button className="project-title" onClick={openProject}>
          {p.name}
          <span> / Estudo de fundações</span>
          <ChevronDown size={12} />
        </button>
        <div className="titlebar-end">
          <span className="autosave">
            <span className={`dot ${saved ? "teal" : ""}`} />
            {saved ? "Rascunho salvo" : "Salvando…"}
          </span>
          <button
            title={dark ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun /> : <Moon />}
          </button>
          <button title="Ajuda e informações" onClick={() => setModal("help")}>
            <CircleHelp />
          </button>
        </div>
      </header>
      <div className="ribbon-tabs">
        <nav>
          {[
            "Início",
            "Modelo",
            "Sondagem",
            "Análise",
            "Exibir",
            "Documentação",
          ].map((t) => (
            <button
              key={t}
              className={t === ribbon ? "active" : ""}
              onClick={() => setRibbon(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <span className="release">
          MOLAS DE FUNDAÇÃO <b>v0.7</b>
        </span>
      </div>
      <div className="ribbon">
        <div className="ribbon-groups">
          {groups.map((g) => (
            <div className="ribbon-group" key={g.title}>
              <div>
                {g.items.map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    disabled={a.disabled || busy}
                  >
                    <a.Icon size={23} />
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
              <small>{g.title}</small>
            </div>
          ))}
        </div>
        <div className="calculate-group">
          <button className="calculate" onClick={run} disabled={busy}>
            <Play size={15} fill="currentColor" />
            Calcular molas
            <ChevronDown size={13} />
          </button>
          <span>Estimativa linear · 6 graus de liberdade</span>
        </div>
      </div>
      <main
        className={`workspace ${!left ? "hide-left" : ""} ${!right ? "hide-right" : ""}`}
      >
        {left && (
          <aside className="navigator">
            <div className="panel-heading">
              <ListTree size={15} />
              Navegador do projeto
              <button title="Recolher navegador" onClick={() => setLeft(false)}>
                <PanelLeftClose size={14} />
              </button>
            </div>
            <button className="nav-project" onClick={openProject}>
              <FolderOpen size={21} />
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.foundations.length} fundações · {p.layers.length} camadas
                </small>
              </span>
            </button>
            <div className="nav-section">
              <span>
                <ChevronDown size={12} />
                Fundações
              </span>
              <button title="Adicionar fundação" onClick={() => add()}>
                <Plus size={15} />
              </button>
            </div>
            <div className="foundation-list">
              {p.foundations.map((item) => (
                <div
                  key={item.id}
                  className={`foundation-item ${f.id === item.id ? "selected" : ""}`}
                >
                  <button
                    className="foundation-select"
                    onClick={() => select(item.id)}
                  >
                    <ChevronRight
                      size={12}
                      className={f.id === item.id ? "expanded" : ""}
                    />
                    <Layers size={17} />
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.kind === "pile"
                          ? `Bloco · ${item.count} ${item.count === 1 ? "estaca" : "estacas"}`
                          : "Sapata retangular"}
                      </small>
                    </span>
                    <i className="foundation-dot" />
                  </button>
                  {f.id === item.id && (
                    <div className="foundation-children">
                      {viewNames
                        .filter((v) =>
                          ["3d", "section", "plan"].includes(v.key),
                        )
                        .map((v) => (
                          <button
                            key={v.key}
                            className={view === v.key ? "active" : ""}
                            onClick={() => setView(v.key)}
                          >
                            <v.Icon size={13} />
                            {v.title}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="nav-section">
              <span>
                <ChevronDown size={12} />
                Investigação
              </span>
            </div>
            <button
              className={`nav-link ${view === "soil" && soilTab === "spt" ? "active" : ""}`}
              onClick={() => showSoil("spt")}
            >
              <ListTree size={15} />
              <span>{p.borehole} · Sondagem SPT</span>
              <small>{p.spt.length} m</small>
            </button>
            <button className="nav-link" onClick={() => showSoil("layers")}>
              <Layers size={15} />
              <span>Perfil de solo</span>
              <small>{p.layers.length}</small>
            </button>
            <div className="nav-section">
              <span>
                <ChevronDown size={12} />
                Análise e documentos
              </span>
            </div>
            <button
              className={`nav-link ${view === "results" ? "active" : ""}`}
              onClick={() => showResults()}
            >
              <Activity size={15} />
              <span>Rigidezes e capacidade</span>
            </button>
            <button
              className="nav-link"
              onClick={() => showResults("comparison")}
            >
              <Columns3 size={15} />
              <span>Comparar fundações</span>
            </button>
            <button
              className={`nav-link ${view === "report" ? "active" : ""}`}
              onClick={() => setView("report")}
            >
              <BookOpen size={15} />
              <span>Memória de cálculo</span>
            </button>
            <div className="navigator-bottom">
              <div className="sample-tag">
                <span />
                ESTIMATIVA EXPERIMENTAL
              </div>
              <p>Estudo de rigidez e interação solo–estrutura.</p>
              <button onClick={() => setModal("help")}>
                Conheça os métodos <ChevronRight size={12} />
              </button>
            </div>
          </aside>
        )}
        <section className="center-workspace">
          <div className="document-tabs">
            {viewNames.map((v) => (
              <button
                key={v.key}
                className={view === v.key ? "active" : ""}
                onClick={() => setView(v.key)}
              >
                <v.Icon size={14} />
                {v.title}
              </button>
            ))}
            <button
              className="workspace-menu"
              title="Opções de visualização"
              onClick={() => setMore(!more)}
            >
              <MoreHorizontal size={16} />
            </button>
            {more && (
              <div className="workspace-popover">
                <button
                  onClick={() => {
                    setLeft(!left);
                    setMore(false);
                  }}
                >
                  Alternar navegador
                </button>
                <button
                  onClick={() => {
                    setRight(!right);
                    setMore(false);
                  }}
                >
                  Alternar propriedades
                </button>
                <button
                  onClick={() => {
                    setResults(!results);
                    setMore(false);
                  }}
                >
                  Alternar resultados inferiores
                </button>
                <button
                  onClick={() => {
                    void exportFile("svg");
                    setMore(false);
                  }}
                >
                  Exportar corte / planta SVG
                </button>
              </div>
            )}
          </div>
          <div className="document-meta">
            <span>
              <b>{f.name}</b>
              <i />{" "}
              {f.kind === "pile" ? "Fundação profunda" : "Fundação superficial"}
            </span>
            <span className="meta-method">
              <span className="dot teal" />{" "}
              <span className="method-name" title={r.method}>
                {r.method || "Entradas inválidas"}
              </span>
              <span className="experimental">EXPERIMENTAL</span>
            </span>
          </div>
          <div
            className={`document-body ${["3d", "section", "plan"].includes(view) ? "graphical" : ""}`}
          >
            {view === "3d" && (
              <Suspense
                fallback={
                  <div className="loading">
                    <Box />
                    Preparando visualização 3D…
                  </div>
                }
              >
                <ThreeView
                  project={p}
                  foundation={f}
                  options={options}
                  setOptions={setOptions}
                  dark={dark}
                />
              </Suspense>
            )}
            {view === "section" && <SectionView project={p} foundation={f} />}
            {view === "plan" && <SectionView project={p} foundation={f} plan />}
            {view === "soil" && (
              <SoilEditor
                foundation={f}
                onFoundation={updateFoundation}
                key={`soil-${soilTab}`}
                initial={soilTab}
                project={p}
                onChange={update}
                toast={toast}
                onDownload={() => void exportFile("spt")}
              />
            )}
            {view === "results" && (
              <Results
                key={`${f.id}-${resultTab}`}
                initial={resultTab}
                project={p}
                foundation={f}
                result={r}
                onCopy={() => void exportFile("copy")}
                onSelect={select}
                onFoundation={updateFoundation}
              />
            )}
            {view === "report" && (
              <Report project={p} foundation={f} result={r} />
            )}
          </div>
          {["3d", "section", "plan"].includes(view) && (
            <div className={`bottom-results ${!results ? "collapsed" : ""}`}>
              <button
                className="bottom-heading"
                onClick={() => setResults(!results)}
              >
                <Activity size={15} />
                <strong>Coeficientes de mola</strong>
                <span>Centro da base · {f.name}</span>
                <ChevronDown size={15} />
              </button>
              {results && (
                <>
                  <div className="bottom-summary">
                    <SpringCards result={r} compact />
                    <div className="settlement-card">
                      <span>Recalque estimado</span>
                      <strong>
                        {r.valid ? fmt(r.settlement, 2) : "—"}
                        <small>mm</small>
                      </strong>
                      <button onClick={() => showResults()}>
                        Ver análise completa <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`verification-line ${r.valid ? "" : "error"}`}
                  >
                    {r.valid ? (
                      <CircleAlert size={14} />
                    ) : (
                      <CircleAlert size={14} />
                    )}
                    <span>
                      {r.valid
                        ? "Estimativa experimental · revise parâmetros e hipóteses antes de aplicar ao modelo estrutural."
                        : r.notices.find((n) => n.level === "error")?.message}
                    </span>
                    <button onClick={() => showResults()}>
                      Verificações
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
        {right && (
          <Inspector
            project={p}
            foundation={f}
            tab={tab}
            setTab={setTab}
            onFoundation={updateFoundation}
            onProject={update}
            openSoil={(tab = "layers") => showSoil(tab)}
            openProject={openProject}
          />
        )}
      </main>
      <footer className="statusbar">
        <span>
          <span className="dot teal" />
          {isTauri() ? "Desktop" : "Prévia web"} <i />{" "}
          {saved ? "Rascunho salvo neste dispositivo" : "Alterações pendentes"}
        </span>
        <span>
          {r.valid
            ? `${r.notices.filter((n) => n.level === "warning").length} hipóteses para revisão`
            : "Revise as entradas"}{" "}
          <i /> Motor 0.7.0
          <UpdateStatus updater={updater} />
        </span>
        <span>
          kN · m · MPa <i /> X / Y / Z ↑
        </span>
      </footer>
      {preparedPdf && (
        <div className="download-ready" role="status">
          <FileText size={25} />
          <div>
            <strong>Memória de cálculo pronta</strong>
            <small>
              PDF · {Math.round(preparedPdf.size / 1024)} kB · dados no momento
              da geração
            </small>
          </div>
          <a
            className="primary"
            href={preparedPdf.url}
            download={preparedPdf.name}
          >
            Baixar PDF <FileDown size={14} />
          </a>
          <button
            aria-label="Fechar download"
            onClick={() => setPreparedPdf(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {notice && !preparedPdf && (
        <div className="toast" role="status">
          <InfoIcon />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Fechar aviso">
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={file}
        hidden
        type="file"
        accept=".json"
        onChange={async (e) => {
          const v = e.target.files?.[0];
          if (v) {
            const raw = await v.text();
            if (v.name.endsWith(".json")) applyImport(raw);
            else
              try {
                const spt = parseSpt(raw);
                update({ ...p, spt });
                showSoil();
                toast(`${spt.length} registros SPT importados.`);
              } catch (err) {
                toast(
                  err instanceof Error ? err.message : "Arquivo SPT inválido.",
                );
              }
          }
          e.target.value = "";
        }}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <header>
              <div>
                <img src="/molastruct-icon.png" alt="" />
                <h2 id="modal-title">
                  {modal === "project" ? "Dados do projeto" : "MolaStruct"}
                </h2>
              </div>
              <button onClick={() => setModal(null)} aria-label="Fechar janela">
                <X size={18} />
              </button>
            </header>
            {modal === "project" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  update({
                    ...p,
                    name: draft.name.trim(),
                    author: draft.author,
                    notes: draft.notes,
                    foundations: p.foundations.map((v) =>
                      v.id === f.id
                        ? {
                            ...v,
                            name:
                              draft.foundations.find((x) => x.id === f.id)
                                ?.name || v.name,
                          }
                        : v,
                    ),
                  });
                  setModal(null);
                }}
              >
                <label>
                  Título do projeto
                  <input
                    autoFocus
                    required
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Responsável
                  <input
                    value={draft.author}
                    onChange={(e) =>
                      setDraft({ ...draft, author: e.target.value })
                    }
                    placeholder="Nome do responsável"
                  />
                </label>
                <label>
                  Nome da fundação selecionada
                  <input
                    required
                    value={
                      draft.foundations.find((x) => x.id === f.id)?.name ??
                      f.name
                    }
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        foundations: draft.foundations.map((v) =>
                          v.id === f.id ? { ...v, name: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Observações
                  <textarea
                    rows={4}
                    value={draft.notes}
                    onChange={(e) =>
                      setDraft({ ...draft, notes: e.target.value })
                    }
                  />
                </label>
                <footer>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>
                  <button className="primary" type="submit">
                    Salvar alterações
                  </button>
                </footer>
              </form>
            ) : (
              <div className="help-content">
                <span className="tag">OPENSTRUCT / CÁLCULO DE MOLAS</span>
                <h3>Da sondagem ao apoio elástico.</h3>
                <p>
                  Estime a rigidez de sapatas e blocos sobre 1 a 4 estacas,
                  compare modelos e exporte uma memória rastreável.
                </p>
                <p>
                  <b>Ativo:</b> Mindlin/Aoki–Lopes, Steinbrenner, Randolph–Wroth
                  simplificado, SAFE/Morrison, viga/barra em Winkler, semiespaço
                  circular equivalente, rotações por Winkler, capacidade
                  Aoki–Velloso e tensão última com fatores de Vésic.
                </p>
                <p>
                  <b>Conferência:</b> critérios parciais da NBR 6122:2022 na aba
                  de resultados, com ações de ELU e ELS separadas. Terzaghi
                  permanece pendente.
                </p>
                <div className="shortcut-grid">
                  <span>
                    Salvar JSON <kbd>Ctrl S</kbd>
                  </span>
                  <span>
                    Abrir projeto <kbd>Ctrl O</kbd>
                  </span>
                  <span>
                    Desfazer <kbd>Ctrl Z</kbd>
                  </span>
                  <span>
                    Refazer <kbd>Ctrl Y</kbd>
                  </span>
                </div>
                <p>
                  Os dados iniciais são exemplos. A memória descreve as
                  hipóteses, as equações e as limitações. Dados do projeto são
                  editados e guardados localmente.
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    setView("report");
                    setModal(null);
                  }}
                >
                  Consultar memória <BookOpen size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <UpdatePanel updater={updater} />
    </div>
  );
}
function InfoIcon() {
  return <Check size={17} />;
}
