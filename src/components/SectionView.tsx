import {
  fmt,
  pilePositions,
  type Foundation,
  type Project,
} from "../domain/model";
export function SectionSvg({
  project: p,
  foundation: f,
  plan = false,
}: {
  project: Project;
  foundation: Foundation;
  plan?: boolean;
}) {
  if (plan) {
    const scale = 170 / Math.max(f.capX, f.capY),
      cx = 400,
      cy = 290;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 550"
        role="img"
        aria-label="Planta da fundação"
      >
        <defs>
          <pattern
            id="planGrid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0H0V20"
              fill="none"
              stroke="#e6eaf0"
              strokeWidth=".7"
            />
          </pattern>
        </defs>
        <rect width="800" height="550" fill="#f9fafc" />
        <rect width="800" height="550" fill="url(#planGrid)" />
        <text
          x="35"
          y="42"
          fill="#3448D1"
          fontSize="12"
          fontFamily="sans-serif"
        >
          {f.name} / PLANTA DE LOCAÇÃO
        </text>
        <rect
          x={cx - (f.capX * scale) / 2}
          y={cy - (f.capY * scale) / 2}
          width={f.capX * scale}
          height={f.capY * scale}
          fill="#e3e7ef"
          stroke="#536482"
          strokeWidth="1.5"
        />
        {f.kind === "pile" &&
          pilePositions(f).map(([x, y], i) => (
            <g key={i}>
              <circle
                cx={cx + x * scale}
                cy={cy - y * scale}
                r={(f.diameter * scale) / 2}
                fill="#becbf0"
                stroke="#3448d1"
              />
              <path
                d={`M${cx + x * scale - 10} ${cy - y * scale}h20m-10 -10v20`}
                stroke="#3448d1"
              />
              <text
                x={cx + x * scale}
                y={cy - y * scale - (f.diameter * scale) / 2 - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#3448D1"
              >
                E{i + 1} ({fmt(x, 2)}; {fmt(y, 2)})
              </text>
            </g>
          ))}
        <rect
          x={cx - 0.21 * scale}
          y={cy - 0.21 * scale}
          width={0.42 * scale}
          height={0.42 * scale}
          fill="#a4b2ca"
          stroke="#536482"
        />
        <path
          d={`M${cx - (f.capX * scale) / 2} ${cy + (f.capY * scale) / 2 + 35}h${f.capX * scale}`}
          stroke="#6e7f99"
        />
        <text
          x={cx}
          y={cy + (f.capY * scale) / 2 + 55}
          textAnchor="middle"
          fill="#536482"
          fontSize="13"
        >
          Lx = {fmt(f.capX)} m
        </text>
        <text
          x={cx + (f.capX * scale) / 2 + 20}
          y={cy}
          fill="#536482"
          fontSize="13"
        >
          Ly = {fmt(f.capY)} m
        </text>
        <path d="M65 455v-65m0 65h65" stroke="#3448d1" />
        <text x="135" y="458" fontSize="12" fill="#3448d1">
          X
        </text>
        <text x="61" y="380" fontSize="12" fill="#3448d1">
          Y
        </text>
        <text x="35" y="525" fill="#758198" fontSize="11">
          Coordenadas em metros, relativas ao centro do bloco. Representação
          esquemática.
        </text>
      </svg>
    );
  }
  const toe = f.kind === "pile" ? f.depth + f.length : f.depth,
    max = Math.min(p.layers[p.layers.length - 1].bottom, Math.max(toe + 2, 10)),
    top = 95,
    sy = 380 / max;
  const sx = 65,
    cx = 560,
    base = top + f.depth * sy;
  let a = 0;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 550"
      role="img"
      aria-label="Corte geotécnico com sondagem SPT e fundação"
    >
      <defs>
        <pattern
          id="sectionGrid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <path d="M25 0H0V25" stroke="#e5e9ef" strokeWidth=".7" fill="none" />
        </pattern>
        <pattern
          id="concrete"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <path d="M2 2l1 2m4 2l1 1" stroke="#b8c1d1" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="800" height="550" fill="#fbfcfd" />
      <rect x="315" y={top} width="440" height="380" fill="url(#sectionGrid)" />
      <text x="32" y="35" fontFamily="sans-serif" fontSize="12" fill="#3448d1">
        {f.name} / CORTE GEOTÉCNICO
      </text>
      <text x="50" y="70" fontSize="11" fill="#6d7c93">
        Prof. (m)
      </text>
      <text x="155" y="70" fontSize="11" fill="#6d7c93">
        {p.borehole} · N SPT
      </text>
      <text x="350" y="70" fontSize="11" fill="#6d7c93">
        PERFIL DE SOLO / FUNDAÇÃO
      </text>
      {p.layers.map((l, i) => {
        const start = a;
        a = l.bottom;
        const bottom = Math.min(l.bottom, max);
        if (start >= max) return null;
        return (
          <g key={l.id}>
            <rect
              x="320"
              y={top + start * sy}
              width="435"
              height={(bottom - start) * sy}
              fill={l.color}
              fillOpacity=".24"
            />
            <rect
              x="110"
              y={top + start * sy}
              width="24"
              height={(bottom - start) * sy}
              fill={l.color}
            />
            <text
              x="330"
              y={top + start * sy + 20}
              fontSize="11"
              fill="#6a6e72"
            >
              0{i + 1} · {l.name}
            </text>
            <text x="330" y={top + start * sy + 36} fontSize="9" fill="#79818d">
              E = {fmt(l.e, 0)} MPa · ν = {fmt(l.nu)} · α = {fmt(l.alpha, 3)}
            </text>
            <path
              d={`M110 ${top + bottom * sy}H755`}
              stroke="#bdc5d1"
              strokeDasharray="4 5"
            />
          </g>
        );
      })}
      {p.spt
        .filter((s) => s.depth <= max)
        .map((s, i) => (
          <g key={i}>
            <text
              x="80"
              y={top + s.depth * sy + 4}
              textAnchor="end"
              fontSize="10"
              fill="#7c8798"
            >
              {fmt(s.depth, 0)}
            </text>
            <line
              x1="155"
              x2={155 + s.n * 2.2}
              y1={top + s.depth * sy}
              y2={top + s.depth * sy}
              stroke="#c5cbee"
              strokeWidth="6"
            />
            <circle
              cx={155 + s.n * 2.2}
              cy={top + s.depth * sy}
              r="2.5"
              fill="#3448D1"
            />
            <text
              x={166 + s.n * 2.2}
              y={top + s.depth * sy + 4}
              fontSize="10"
              fill="#3448D1"
            >
              {s.n}
            </text>
          </g>
        ))}
      <line
        x1="100"
        x2="755"
        y1={top}
        y2={top}
        stroke="#7b899c"
        strokeWidth="1.3"
      />
      <text x="680" y={top - 9} fontSize="10" fill="#6a798e">
        Terreno ±0,00
      </text>
      {p.water <= max && (
        <g>
          <line
            x1="320"
            x2="755"
            y1={top + p.water * sy}
            y2={top + p.water * sy}
            stroke="#359acc"
            strokeDasharray="7 4"
          />
          <text x="664" y={top + p.water * sy - 8} fontSize="10" fill="#358fb9">
            N.A. −{fmt(p.water, 1)} m
          </text>
        </g>
      )}
      <rect
        x={cx - (f.capX * sx) / 2}
        y={base - f.height * sy}
        width={f.capX * sx}
        height={f.height * sy}
        fill="#dce2ea"
        stroke="#4f627c"
        strokeWidth="1.4"
      />
      <rect
        x={cx - (f.capX * sx) / 2}
        y={base - f.height * sy}
        width={f.capX * sx}
        height={f.height * sy}
        fill="url(#concrete)"
      />
      <rect
        x={cx - 0.21 * sx}
        y={top - 25}
        width={0.42 * sx}
        height={Math.max(12, base - f.height * sy - top + 25)}
        fill="#bac6d8"
        stroke="#4f627c"
      />
      {f.kind === "pile" &&
        [...new Set(pilePositions(f).map((v) => v[0]))].map((x, i) => (
          <g key={i}>
            <rect
              x={cx + (x - f.diameter / 2) * sx}
              y={base}
              width={f.diameter * sx}
              height={f.length * sy}
              fill="#cbd6e7"
              stroke="#536985"
            />
            <line
              x1={cx + x * sx}
              x2={cx + x * sx}
              y1={base + 8}
              y2={base + f.length * sy - 8}
              stroke="#3448d1"
              strokeDasharray="5 4"
            />
            <text
              x={cx + x * sx}
              y={base + f.length * sy + 17}
              textAnchor="middle"
              fontSize="10"
              fill="#3448d1"
            >
              Ø{fmt(f.diameter * 100, 0)}
            </text>
          </g>
        ))}
      <line x1="770" x2="770" y1={base} y2={top + toe * sy} stroke="#8392a8" />
      <text
        x="780"
        y={(base + top + toe * sy) / 2}
        fontSize="10"
        fill="#6b7b94"
        transform={`rotate(-90 780 ${(base + top + toe * sy) / 2})`}
      >
        {f.kind === "pile" ? `L = ${fmt(f.length)} m` : `D = ${fmt(f.depth)} m`}
      </text>
      <text x="32" y="517" fontSize="10" fill="#7c8798">
        Cotas positivas para baixo · SPT por intervalo até a profundidade
        informada · dimensões em metros
      </text>
      <text x="32" y="537" fontSize="10" fill="#3448D1">
        MOLASSTRUCT / OPENSTRUCT
      </text>
    </svg>
  );
}
export default function SectionView(props: {
  project: Project;
  foundation: Foundation;
  plan?: boolean;
}) {
  return (
    <div className="section-view">
      <SectionSvg {...props} />
    </div>
  );
}
