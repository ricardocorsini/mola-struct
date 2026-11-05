import { useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { calculate, type Calculation, type Matrix } from "./engine";
import type { Foundation, Project } from "./model";
export function useCalculation(p: Project, f: Foundation): Calculation {
  const estimate = useMemo(() => calculate(p, f), [p, f]);
  const desktop = isTauri(),
    key = JSON.stringify({
      foundation: f,
      layers: p.layers,
      spt: p.spt,
      bedrock: p.bedrock,
    });
  const [native, setNative] = useState<{
    key: string;
    matrix?: Matrix;
    displacement?: number[];
    error?: string;
  }>({ key: "" });
  useEffect(() => {
    if (!desktop || !estimate.valid) return;
    let cancelled = false;
    void invoke<{ matrix: Matrix; displacement: number[] }>(
      "foundation_stiffness",
      { input: JSON.parse(key) },
    )
      .then((out) => {
        const matches =
          out.matrix.length === 6 &&
          out.matrix.every(
            (row, i) =>
              row.length === 6 &&
              row.every(
                (v, j) =>
                  Number.isFinite(v) &&
                  Math.abs(v - estimate.matrix[i][j]) <=
                    1e-8 * Math.max(1, Math.abs(v)),
              ),
          );
        if (!cancelled)
          setNative(
            matches
              ? { key, ...out }
              : {
                  key,
                  error:
                    "Divergência entre o núcleo Rust e a prévia. Revise o motor antes de exportar.",
                },
          );
      })
      .catch(() => {
        if (!cancelled)
          setNative({
            key,
            error:
              "Não foi possível consultar o núcleo Rust. Nenhum resultado nativo foi liberado.",
          });
      });
    return () => {
      cancelled = true;
    };
    // Input key includes every parameter consumed by the native kernel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, key, estimate.valid]);
  if (!desktop || !estimate.valid) return estimate;
  if (native.key !== key)
    return {
      ...estimate,
      valid: false,
      notices: [
        ...estimate.notices,
        { level: "error", message: "Aguardando cálculo no núcleo Rust…" },
      ],
    };
  if (native.error || !native.matrix || !native.displacement)
    return {
      ...estimate,
      valid: false,
      notices: [
        ...estimate.notices,
        {
          level: "error",
          message: native.error ?? "Resposta nativa inválida.",
        },
      ],
    };
  return {
    ...estimate,
    matrix: native.matrix,
    diagonal: native.matrix.map((row, i) => row[i]),
    displacement: native.displacement,
    settlement: -native.displacement[2] * 1000,
  };
}
