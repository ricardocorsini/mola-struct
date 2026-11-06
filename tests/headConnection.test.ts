import { describe, expect, it } from "vitest";
import {
  calculate,
  connectedLateralHead,
  lateralHead,
} from "../src/domain/engine";
import {
  defaultFoundation,
  exampleProject,
  parseProject,
  pilePositions,
  type Foundation,
} from "../src/domain/model";
import { freeCoordinates, solveSupported } from "../src/domain/matrix";
import {
  reference16Project,
  reference16Comparison,
} from "../src/domain/benchmark16";
import { TF } from "../src/domain/methods";
import { twoPileRotationAudit } from "../src/domain/rotationAudit";
import { matrixCsv } from "../src/files";

const homogeneous = () => {
  const p = exampleProject();
  p.layers = [{ ...p.layers[0], bottom: 40 }];
  p.spt = Array.from({ length: 40 }, (_, i) => ({ depth: i + 1, n: 10 }));
  p.bedrock = 40;
  return p;
};

describe("ligação estaca–bloco rotulada", () => {
  it("preserva a ligação rígida de JSON antigos e rejeita seleções desconhecidas", () => {
    const p = exampleProject(),
      old = JSON.parse(JSON.stringify(p));
    old.foundations.forEach(
      (f: Record<string, unknown>) => delete f.headConnection,
    );
    const loaded = parseProject(JSON.stringify(old));
    expect(loaded.foundations.every((f) => f.headConnection === "fixed")).toBe(
      true,
    );
    expect(calculate(loaded, loaded.foundations[0]).matrix).toEqual(
      calculate(p, p.foundations[0]).matrix,
    );
    old.foundations[0].headConnection = "unknown";
    expect(() => parseProject(JSON.stringify(old))).toThrow();
  });
  it("reproduz a rigidez analítica de cabeça livre de uma estaca longa", () => {
    const p = homogeneous(),
      f: Foundation = {
        ...defaultFoundation(),
        length: 16,
        segments: 64,
        headConnection: "pinned",
      };
    const ei = (f.ec * 1e6 * Math.PI * f.diameter ** 4) / 64,
      beta = ((p.layers[0].kh * f.diameter) / (4 * ei)) ** 0.25;
    const rigid = lateralHead(p, f),
      pinned = connectedLateralHead(rigid, f);
    // Independent semi-infinite Winkler solution: H/u=2 EI beta^3 for Mhead=0.
    expect(Math.abs(pinned[0][0] / (2 * ei * beta ** 3) - 1)).toBeLessThan(
      0.001,
    );
    expect(pinned[0][1]).toBe(0);
    expect(pinned[1]).toEqual([0, 0]);
    expect(rigid[0][1]).toBeGreaterThan(0);
  });
  it("para My=1 tf·m e s=0,90 m, reproduz ±1,11111 tf sem momento de topo", () => {
    const p = reference16Project(),
      f: Foundation = {
        ...p.foundations[0],
        headConnection: "pinned",
        n: 0,
        my: TF,
      };
    const r = calculate(p, f);
    expect(r.valid).toBe(true);
    expect(r.pileForces[0] / TF).toBeCloseTo(-1 / 0.9, 10);
    expect(r.pileForces[1] / TF).toBeCloseTo(1 / 0.9, 10);
    expect(r.pileMoments).toEqual([
      [0, 0],
      [0, 0],
    ]);
    const loaded = calculate(p, { ...f, n: 40 * TF });
    expect(loaded.pileForces[0] / TF).toBeCloseTo(20 - 1 / 0.9, 10);
    expect(loaded.pileForces[1] / TF).toBeCloseTo(20 + 1 / 0.9, 10);
  });
  it("preserva C e Kz, mantém o binário com interação e recalcula Kh e o braço torsional", () => {
    const p = reference16Project(),
      f = p.foundations[0],
      rigid = calculate(p, f);
    const pinnedF: Foundation = { ...f, headConnection: "pinned" },
      pinned = calculate(p, pinnedF);
    expect(pinned.valid).toBe(true);
    expect(pinned.verticalCompliance).toEqual(rigid.verticalCompliance);
    expect(pinned.diagonal[2]).toBe(rigid.diagonal[2]);
    const c = pinned.verticalCompliance!;
    expect(pinned.diagonal[4]).toBeCloseTo(
      (f.efficiency * f.spacingX ** 2) / (2 * (c[0][0] - c[0][1])),
      7,
    );
    expect(pinned.diagonal[3]).toBe(0);
    expect(pinned.freeDofs).toEqual([3]);
    expect(pinned.matrix[3]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(pinned.matrix[0][4]).toBe(0);
    expect(
      reference16Comparison(p, pinnedF, pinned).find((row) => row.id === "ry")!
        .note,
    ).toContain("Ligação rotulada");
    expect(pinned.matrix[1][3]).toBe(0);
    expect(pinned.diagonal[0] / TF).toBeCloseTo(956.0341056675124, 7);
    expect(rigid.diagonal[5] - pinned.diagonal[5]).toBeCloseTo(
      ((rigid.diagonal[0] - pinned.diagonal[0]) * f.spacingX ** 2) / 4,
      7,
    );
    const audit = twoPileRotationAudit(pinnedF, pinned);
    if (!audit.available) throw new Error(audit.reason);
    expect(audit.localRy).toBeCloseTo(0, 9);
    expect(audit.pinnedHorizontal).toBeCloseTo(pinned.diagonal[0] / TF, 9);
    expect(audit.fullRy).toBeCloseTo(4937.736874722536, 7);
  });
  it("cabeça rígida compartilha momento entre binário e flexão local, respeitando Hx=0", () => {
    const p = reference16Project(),
      f = { ...p.foundations[0], n: 0, my: TF },
      r = calculate(p, f);
    const couple = r.pileForces.reduce(
      (sum, n, i) => sum + n * pilePositions(f)[i][0],
      0,
    );
    const bending = r.pileMoments.reduce((sum, m) => sum + m[1], 0);
    expect(couple).toBeGreaterThan(0);
    expect(bending).toBeGreaterThan(0);
    expect(couple + bending).toBeCloseTo(TF, 7);
    expect(r.pileForces[1] / TF).toBeLessThan(1 / f.spacingX);
    // Exported local moments must also close both global bending equilibria
    // under simultaneous horizontal/vertical loads and torsion, in every model.
    for (const pileMethod of ["winkler", "mindlin", "randolph"] as const)
      for (const count of [1, 2, 3, 4] as const) {
        const project = homogeneous(),
          foundation: Foundation = {
            ...defaultFoundation(),
            pileMethod,
            count,
            capX: 3,
            capY: 3,
            integration: 8,
            efficiency: 0.73,
            hx: 15,
            hy: 7,
            mx: 20,
            my: 30,
            mz: 4,
          },
          response = calculate(project, foundation),
          pos = pilePositions(foundation);
        expect(response.valid).toBe(true);
        expect(
          response.pileMoments.reduce(
            (sum, m, i) => sum + m[0] - response.pileForces[i] * pos[i][1],
            0,
          ),
        ).toBeCloseTo(foundation.mx, 7);
        expect(
          response.pileMoments.reduce(
            (sum, m, i) => sum + m[1] + response.pileForces[i] * pos[i][0],
            0,
          ),
        ).toBeCloseTo(foundation.my, 7);
      }
  });
  it.each(
    (["winkler", "mindlin", "randolph"] as const).flatMap((pileMethod) =>
      ([1, 2, 3, 4] as const).map((count) => ({ pileMethod, count })),
    ),
  )(
    "conserva seis equilíbrios e binários em $pileMethod, $count estacas",
    ({ pileMethod, count }) => {
      const p = homogeneous(),
        f: Foundation = {
          ...defaultFoundation(),
          headConnection: "pinned",
          pileMethod,
          count,
          segments: 24,
          integration: 8,
          capX: 3,
          capY: 3,
          efficiency: 0.73,
          hx: 15,
          hy: 7,
          mx: count >= 3 ? 15 : 0,
          my: count >= 2 ? 30 : 0,
          mz: 4,
        };
      const r = calculate(p, f);
      expect(r.valid, JSON.stringify(r.notices)).toBe(true);
      expect(r.freeDofs).toEqual(count === 1 ? [3, 4] : count === 2 ? [3] : []);
      const force = [f.hx, f.hy, -f.n, f.mx, f.my, f.mz];
      r.matrix.forEach((row, i) =>
        expect(
          row.reduce((sum, k, j) => sum + k * r.displacement[j], 0),
        ).toBeCloseTo(force[i], 7),
      );
      const pos = pilePositions(f);
      expect(r.pileForces.reduce((sum, n) => sum + n, 0)).toBeCloseTo(f.n, 7);
      expect(
        r.pileForces.reduce((sum, n, i) => sum - n * pos[i][1], 0),
      ).toBeCloseTo(f.mx, 7);
      expect(
        r.pileForces.reduce((sum, n, i) => sum + n * pos[i][0], 0),
      ).toBeCloseTo(f.my, 7);
      expect(r.pileMoments.every(([mx, my]) => mx === 0 && my === 0)).toBe(
        true,
      );
    },
  );
  it.each([1, 2] as const)(
    "bloqueia Mx sem braço em %i estaca(s) rotulada(s)",
    (count) => {
      const p = homogeneous(),
        f: Foundation = {
          ...defaultFoundation(),
          count,
          headConnection: "pinned",
          my: 0,
          mx: 1,
        };
      const r = calculate(p, f);
      expect(r.valid).toBe(false);
      expect(
        r.notices.some(
          (n) => n.level === "error" && n.message.includes("Sem rigidez em θx"),
        ),
      ).toBe(true);
    },
  );
  it("rejeita My em estaca única e não inventa travamento para modos singulares acoplados", () => {
    const p = homogeneous(),
      f: Foundation = {
        ...defaultFoundation(),
        count: 1,
        headConnection: "pinned",
        mx: 0,
        my: 1,
      };
    expect(calculate(p, f).valid).toBe(false);
    expect(() =>
      solveSupported(
        [
          [1, 1],
          [1, 1],
        ],
        [0, 0],
      ),
    ).toThrow();
    expect(
      freeCoordinates([
        [1e-8, 0],
        [0, 0],
      ]),
    ).toEqual([1]);
    expect(
      solveSupported(
        [
          [1e-8, 0],
          [0, 0],
        ],
        [1e-8, 0],
      ),
    ).toEqual([1, 0]);
    expect(() =>
      solveSupported(
        [
          [1e-8, 0],
          [0, 0],
        ],
        [0, 1e-14],
      ),
    ).toThrow();
  });
  it("registra a opção no CSV, conserva zeros e ignora a seleção em sapatas", () => {
    const p = homogeneous(),
      f: Foundation = { ...defaultFoundation(), headConnection: "pinned" },
      r = calculate(p, f);
    expect(matrixCsv(f, r)).toContain("Rotulada em X e Y");
    expect(matrixCsv(f, r)).toContain(
      '"Mx (kN.m)";0,000000;0,000000;0,000000;0,000000;0,000000;0,000000',
    );
    expect(matrixCsv(f, r)).toContain('"GDL livres";"theta_x (rad)"');
    const footing = { ...f, kind: "footing" as const };
    expect(calculate(p, footing).matrix).toEqual(
      calculate(p, { ...footing, headConnection: "fixed" }).matrix,
    );
  });
});
