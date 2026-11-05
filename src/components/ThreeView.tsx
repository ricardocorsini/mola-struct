import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SVGRenderer } from "three/addons/renderers/SVGRenderer.js";
import {
  Box,
  Focus,
  Grid2X2,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Waves,
  Zap,
} from "lucide-react";
import {
  fmt,
  pilePositions,
  type Foundation,
  type Project,
} from "../domain/model";

type Label = {
  text: string;
  point: THREE.Vector3;
  color?: string;
  className?: string;
};
type Engine = {
  renderer: THREE.WebGLRenderer | SVGRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  draw: () => void;
  fit: () => void;
  dispose: () => void;
};
type Options = {
  soil: boolean;
  water: boolean;
  springs: boolean;
  grid: boolean;
  dimensions: boolean;
};
export default function ThreeView({
  project: p,
  foundation: f,
  options,
  setOptions,
  dark,
}: {
  project: Project;
  foundation: Foundation;
  options: Options;
  setOptions: (o: Options) => void;
  dark: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    labelHost = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null);
  const [fallback, setFallback] = useState(false);
  const [preset, setPreset] = useState("iso");
  const renderKey = JSON.stringify([
    f.kind,
    f.count,
    f.diameter,
    f.length,
    f.spacingX,
    f.spacingY,
    f.capX,
    f.capY,
    f.height,
    f.depth,
    f.n,
    p.water,
    p.layers.map((l) => [l.bottom, l.color, l.name]),
    options,
    dark,
  ]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const labels: Label[] = [];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(dark ? "#171e2a" : "#f5f6f8");
    let renderer: THREE.WebGLRenderer | SVGRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      setFallback(false);
    } catch {
      renderer = new SVGRenderer();
      setFallback(true);
    }
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI * 0.94;
    controls.minDistance = 1;
    controls.maxDistance = 150;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Modelo tridimensional interativo da fundação. Arraste para orbitar; use a roda para aproximar.",
    );
    const depth = f.kind === "pile" ? f.depth + f.length : f.depth;
    const total = Math.max(4, depth + 1.5),
      w = Math.max(f.capX, f.capY, 2) + 2.8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x71809b, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(8, 12, 9);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8d5ff, 0.6);
    fill.position.set(-6, 2, -4);
    scene.add(fill);
    const concrete = new THREE.MeshStandardMaterial({
      color: dark ? 0xb8c5d6 : 0xdce2ea,
      roughness: 0.74,
      metalness: 0.02,
    });
    const pileMat = new THREE.MeshStandardMaterial({
      color: dark ? 0x91a2bb : 0xc9d3e1,
      roughness: 0.65,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: dark ? 0x647fbe : 0x637593,
      transparent: true,
      opacity: 0.72,
    });
    const mesh = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      edges = false,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      scene.add(m);
      if (edges) {
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          edgeMat,
        );
        edge.position.copy(m.position);
        scene.add(edge);
      }
      return m;
    };
    const line = (
      a: number[],
      b: number[],
      color = 0x8391aa,
      dashed = false,
    ) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...(a as [number, number, number])),
        new THREE.Vector3(...(b as [number, number, number])),
      ]);
      const mat = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.1, gapSize: 0.07 })
        : new THREE.LineBasicMaterial({ color });
      const l = new THREE.Line(geo, mat);
      if (dashed) l.computeLineDistances();
      scene.add(l);
    };
    const label = (
      text: string,
      x: number,
      y: number,
      z: number,
      color?: string,
      className?: string,
    ) =>
      labels.push({
        text,
        point: new THREE.Vector3(x, y, z),
        color,
        className,
      });
    if (options.soil) {
      let top = 0;
      for (const [i, layer] of p.layers.entries()) {
        const bottom = Math.min(layer.bottom, total);
        if (bottom <= top) break;
        const h = bottom - top,
          y = -(top + bottom) / 2;
        const mat = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: dark ? 0.2 : 0.24,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        // L-shaped cutaway: the front and right faces are open for inspection.
        mesh(new THREE.BoxGeometry(w, h, w / 2), mat, 0, y, -w / 4, true);
        mesh(
          new THREE.BoxGeometry(w / 2, h, w / 2),
          mat,
          -w / 4,
          y,
          w / 4,
          true,
        );
        label(
          `0${i + 1}  ${layer.name}`,
          -w * 0.6,
          y,
          w * 0.1,
          dark ? "#c6beb2" : "#756b5e",
          "soil-label",
        );
        line([-w / 2, -bottom, w / 2], [w / 2, -bottom, w / 2], 0xb6a58f, true);
        top = bottom;
      }
    }
    if (options.grid) {
      const grid = new THREE.GridHelper(
        w * 1.65,
        24,
        dark ? 0x3f4f67 : 0xb9c3d3,
        dark ? 0x293546 : 0xdbe1e9,
      );
      grid.position.y = 0.006;
      const mat = grid.material as THREE.Material;
      mat.transparent = true;
      mat.opacity = 0.7;
      scene.add(grid);
    }
    if (options.water && p.water < total) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x62b7df,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const plane = mesh(new THREE.PlaneGeometry(w, w), mat, 0, -p.water, 0);
      plane.rotation.x = -Math.PI / 2;
      line([-w / 2, -p.water, w / 2], [w / 2, -p.water, w / 2], 0x4ca2c9, true);
      label(
        `N.A. −${fmt(p.water, 1)} m`,
        w * 0.54,
        -p.water,
        w * 0.45,
        "#3682a7",
        "water-label",
      );
    }
    mesh(
      new THREE.BoxGeometry(f.capX, f.height, f.capY),
      concrete,
      0,
      -f.depth + f.height / 2,
      0,
      true,
    );
    const colH = 1.25 + Math.max(0, f.depth - f.height);
    mesh(
      new THREE.BoxGeometry(0.42, colH, 0.42),
      concrete,
      0,
      -f.depth + f.height + colH / 2,
      0,
      true,
    );
    const spring = (
      x: number,
      y: number,
      z: number,
      vertical: boolean,
      len = 0.5,
    ) => {
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 120; j++) {
        const t = j / 120,
          angle = t * Math.PI * 12;
        pts.push(
          vertical
            ? new THREE.Vector3(
                x + 0.08 * Math.cos(angle),
                y - len * t,
                z + 0.08 * Math.sin(angle),
              )
            : new THREE.Vector3(
                x + len * t,
                y + 0.07 * Math.sin(angle),
                z + 0.07 * Math.cos(angle),
              ),
        );
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(
        new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1c9e92 })),
      );
      return pts;
    };
    if (f.kind === "pile") {
      for (const [i, [x, yy]] of pilePositions(f).entries()) {
        const z = -yy;
        mesh(
          new THREE.CylinderGeometry(
            f.diameter / 2,
            f.diameter / 2,
            f.length,
            28,
          ),
          pileMat,
          x,
          -f.depth - f.length / 2,
          z,
          true,
        );
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(f.diameter / 2 + 0.005, 0.012, 6, 32),
          new THREE.MeshBasicMaterial({ color: 0x3448d1 }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, -f.depth - 0.04, z);
        scene.add(ring);
        label(
          `E${i + 1}`,
          x + f.diameter * 0.9,
          -f.depth - f.length * 0.5,
          z,
          "#3448D1",
          "pile-label",
        );
        if (options.springs) {
          spring(x, -depth, z, true, 0.6);
          for (let j = 1; j <= 3; j++)
            spring(
              x + f.diameter / 2,
              -f.depth - (f.length * j) / 4,
              z,
              false,
              0.4,
            );
        }
      }
      if (options.dimensions) {
        const x = f.capX / 2 + 1.2,
          z = f.capY / 2 + 0.1;
        line([x, -f.depth, z], [x, -depth, z], 0x7c8ea6);
        line([x - 0.1, -f.depth, z], [x + 0.1, -f.depth, z]);
        line([x - 0.1, -depth, z], [x + 0.1, -depth, z]);
        label(
          `L = ${fmt(f.length, 2)} m`,
          x + 0.1,
          -f.depth - f.length / 2,
          z,
          "#63718a",
          "dimension-label",
        );
      }
    } else if (options.springs) {
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++)
          spring(
            -f.capX * 0.4 + (i * f.capX * 0.8) / 3,
            -f.depth,
            -f.capY * 0.35 + j * f.capY * 0.35,
            true,
            0.55,
          );
    }
    if (options.dimensions) {
      const y = -f.depth + f.height + 0.12,
        z = f.capY / 2 + 0.35;
      line([-f.capX / 2, y, z], [f.capX / 2, y, z]);
      label(
        `${fmt(f.capX, 2)} m`,
        0,
        y + 0.12,
        z,
        "#63718a",
        "dimension-label",
      );
    }
    const top = -f.depth + f.height + colH;
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, top + 1.0, 0),
      0.85,
      0x3448d1,
      0.23,
      0.14,
    );
    scene.add(arrow);
    label(
      `N = ${fmt(f.n, 0)} kN`,
      0.45,
      top + 0.85,
      0,
      "#3448D1",
      "force-label",
    );
    const axes = new THREE.AxesHelper(0.9);
    axes.position.set(-f.capX / 2 - 0.5, 0.02, f.capY / 2 + 0.8);
    scene.add(axes);
    if (labelHost.current) labelHost.current.innerHTML = "";
    const labelEls = labels.map((l) => {
      const e = document.createElement("span");
      e.textContent = l.text;
      e.className = `scene-label ${l.className ?? ""}`;
      if (l.color) e.style.color = l.color;
      labelHost.current?.appendChild(e);
      return e;
    });
    const draw = () => {
      renderer.render(scene, camera);
      const rect = el.getBoundingClientRect();
      labels.forEach((l, i) => {
        const pt = l.point.clone().project(camera),
          e = labelEls[i];
        e.style.transform = `translate(${(pt.x * 0.5 + 0.5) * rect.width}px,${(-pt.y * 0.5 + 0.5) * rect.height}px) translate(-50%,-50%)`;
        e.style.display = pt.z > 1 || pt.z < -1 ? "none" : "";
      });
    };
    const fit = () => {
      const target = new THREE.Vector3(0, -depth * 0.42, 0);
      controls.target.copy(target);
      const size = Math.max(total + top + 1.5, w * 1.5),
        aspect = el.clientWidth / Math.max(el.clientHeight, 1);
      const distance =
        (size / (2 * Math.tan((camera.fov * Math.PI) / 360))) *
        Math.max(1, 1 / aspect) *
        1.05;
      camera.position
        .copy(target)
        .add(
          new THREE.Vector3(1.25, 0.75, 1.6)
            .normalize()
            .multiplyScalar(distance),
        );
      controls.update();
      setPreset("iso");
      draw();
    };
    const resize = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    };
    controls.addEventListener("change", draw);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    fit();
    const dispose = () => {
      observer.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => mat.dispose());
        }
      });
      if (renderer instanceof THREE.WebGLRenderer) renderer.dispose();
      renderer.domElement.remove();
      labelEls.forEach((e) => e.remove());
    };
    engine.current = { renderer, scene, camera, controls, draw, fit, dispose };
    return () => {
      dispose();
      engine.current = null;
    };
    // Model objects are represented by renderKey to avoid rebuilding for unrelated project metadata.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderKey]);
  const view = (name: string) => {
    const e = engine.current;
    if (!e) return;
    const distance = e.camera.position.distanceTo(e.controls.target);
    const v =
      name === "top"
        ? new THREE.Vector3(0, 1, 0.001)
        : name === "front"
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(1, 0, 0);
    e.camera.position.copy(e.controls.target).add(v.multiplyScalar(distance));
    e.controls.update();
    e.draw();
    setPreset(name);
  };
  const zoom = (x: number) => {
    const e = engine.current;
    if (!e) return;
    e.camera.position
      .sub(e.controls.target)
      .multiplyScalar(x)
      .add(e.controls.target);
    e.controls.update();
    e.draw();
  };
  const toggle = (key: keyof Options) =>
    setOptions({ ...options, [key]: !options[key] });
  return (
    <div className="three-view">
      <div ref={host} className="three-host" />
      <div ref={labelHost} className="scene-labels" aria-hidden="true" />
      <div className="scene-title">
        <span className="eyebrow">MODELO GEOTÉCNICO / {f.name}</span>
        <h2>
          {f.kind === "pile"
            ? `Bloco sobre ${f.count} ${f.count === 1 ? "estaca" : "estacas"}`
            : "Sapata retangular"}
        </h2>
        <p>
          {f.kind === "pile"
            ? `Ø ${fmt(f.diameter * 100, 0)} cm · L = ${fmt(f.length, 1)} m`
            : `${fmt(f.capX, 2)} × ${fmt(f.capY, 2)} m`}
          <span>·</span>
          {p.borehole}
        </p>
      </div>
      <div className="view-cube" aria-label="Vistas predefinidas">
        <button
          title="Vista isométrica"
          className={preset === "iso" ? "active" : ""}
          onClick={() => engine.current?.fit()}
        >
          <Box size={27} />
          <small>ISO</small>
        </button>
        <div>
          <button onClick={() => view("top")}>Topo</button>
          <button onClick={() => view("front")}>Frente</button>
          <button onClick={() => view("side")}>Lado</button>
        </div>
      </div>
      <div className="viewport-tools">
        <button title="Enquadrar modelo" onClick={() => engine.current?.fit()}>
          <Focus />
        </button>
        <button title="Aproximar" onClick={() => zoom(0.82)}>
          <Plus />
        </button>
        <button title="Afastar" onClick={() => zoom(1.22)}>
          <Minus />
        </button>
        <i />
        <button
          title="Camadas de solo"
          className={options.soil ? "active" : ""}
          onClick={() => toggle("soil")}
        >
          <Layers />
        </button>
        <button
          title="Nível d’água"
          className={options.water ? "active" : ""}
          onClick={() => toggle("water")}
        >
          <Waves />
        </button>
        <button
          title="Molas esquemáticas"
          className={options.springs ? "active" : ""}
          onClick={() => toggle("springs")}
        >
          <Zap />
        </button>
        <button
          title="Grade de referência"
          className={options.grid ? "active" : ""}
          onClick={() => toggle("grid")}
        >
          <Grid2X2 />
        </button>
        <button title="Restaurar vista" onClick={() => engine.current?.fit()}>
          <RotateCcw />
        </button>
      </div>
      <div className="scene-key">
        <span>
          <i style={{ background: "#c6cfdf" }} />
          Concreto
        </span>
        <span>
          <i style={{ background: "#1c9e92" }} />
          Molas esquemáticas
        </span>
        <span>
          <i style={{ background: "#62b7df" }} />
          Nível d’água
        </span>
      </div>
      <div className="scene-hint">
        Arraste para orbitar <b>·</b> Roda para zoom <b>·</b> Botão direito para
        mover {fallback && <strong>· Renderizador vetorial</strong>}
      </div>
    </div>
  );
}
