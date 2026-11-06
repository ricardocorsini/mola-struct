import type { Foundation, Project } from "../domain/model";
import { fmt } from "../domain/model";
import { effectiveProfile, TF } from "../domain/methods";
import { continuumParameters } from "../domain/footing";

export default function FootingSettings({
  project: p,
  foundation: f,
  onChange,
}: {
  project: Project;
  foundation: Foundation;
  onChange: (f: Foundation) => void;
}) {
  if (f.kind !== "footing" || f.footingMethod !== "halfspace") return null;
  let medium = null;
  try {
    medium = continuumParameters(effectiveProfile(p, f), f);
  } catch {
    /* Calculation notices identify invalid inputs. */
  }
  return (
    <div className="continuum-settings">
      <label className="select-field method-select">
        <span>Solo do meio contínuo</span>
        <select
          aria-label="Solo do meio contínuo"
          value={f.footingSoil ?? "support"}
          onChange={(e) =>
            onChange({
              ...f,
              footingSoil: e.target.value as Foundation["footingSoil"],
            })
          }
        >
          <option value="support">
            Homogêneo · parâmetros da camada de apoio
          </option>
          <option value="equivalent">
            Equivalente · E harmônico / ν médio em 2B
          </option>
        </select>
      </label>
      {medium && (
        <p className="field-help">
          <b>E = {fmt(medium.e, 5)} MPa</b> ({fmt((medium.e * 1000) / TF, 2)}{" "}
          tf/m²) · ν = {fmt(medium.nu, 3)}
          <br />
          {medium.soil}
        </p>
      )}
      <p className="field-help">
        FEMA 273, fig. 4-2 · k0. Raios distintos para translação, rotação e
        torção. Fatores de forma e embutimento α=β=1. A cota de apoio seleciona
        o solo, mas não acrescenta confinamento lateral.
      </p>
      {f.modulusSource === "teixeira" && (
        <p className="field-help">
          E=αTG K_E N̄SPT. Edite K_E, αTG e ν em Sondagem → Camadas de solo. Para
          o silte do exemplo: 5 × 0,35 × 7 = 12,25 MPa.
        </p>
      )}
    </div>
  );
}
