"""Independent OpenSees FE model, used only for verification.

SI units; nodal lumped soil springs, versus consistent springs in MolasStruct.
No MolasStruct assembly or solve function is imported. Six unit-force solves
recover the global compliance; inversion yields the cap stiffness.
"""

import json, math, platform
from pathlib import Path
import numpy as np
import openseespy.opensees as ops
from importlib.metadata import version


def stiffness(case, segments):
    f = case["foundation"]
    layers = case["project"]["layers"]
    positions = case["positions"]
    h = f["length"] / segments
    area = math.pi * f["diameter"] ** 2 / 4
    I = math.pi * f["diameter"] ** 4 / 64
    J = 2 * I
    E = f["ec"] * 1e6
    G = E / (2 * (1 + f["concreteNu"]))

    def layer(z):
        return next((l for l in layers if z <= l["bottom"] + 1e-9), layers[-1])

    def build(force):
        ops.wipe()
        ops.model("basic", "-ndm", 3, "-ndf", 6)
        ops.geomTransf("Linear", 1, 1, 0, 0)
        ops.node(1, 0, 0, -f["depth"])
        tag = 10
        el = 1
        mat = 1
        for x, y in positions:
            nodes = []
            for i in range(segments + 1):
                n = tag
                ground = tag + 1
                tag += 2
                z = -(f["depth"] + i * h)
                ops.node(n, x, y, z)
                ops.node(ground, x, y, z)
                ops.fix(ground, 1, 1, 1, 1, 1, 1)
                nodes.append(n)
                kh = kt = kr = 0.0
                for j in (i - 1, i):
                    if 0 <= j < segments:
                        l = layer(f["depth"] + (j + 0.5) * h)
                        kh += l["kh"] * f["diameter"] * h / 2
                        kt += l["shaftK"] * math.pi * f["diameter"] * h / 2
                        kr += l["shaftK"] * math.pi * f["diameter"] ** 3 / 4 * h / 2
                if i == segments:
                    kt += layer(f["depth"] + f["length"])["baseK"] * area
                for k, dof in [(kh, 1), (kh, 2), (kt, 3), (kr, 6)]:
                    ops.uniaxialMaterial("Elastic", mat, k)
                    ops.element("zeroLength", el, ground, n, "-mat", mat, "-dir", dof)
                    mat += 1
                    el += 1
            for ni, nj in zip(nodes[:-1], nodes[1:]):
                ops.element("elasticBeamColumn", el, ni, nj, area, E, G, J, I, I, 1)
                el += 1
            ops.rigidLink("beam", 1, nodes[0])
        ops.timeSeries("Linear", 1)
        ops.pattern("Plain", 1, 1)
        ops.load(1, *force)
        ops.constraints("Transformation")
        ops.numberer("RCM")
        ops.system("BandSPD")
        ops.integrator("LoadControl", 1)
        ops.algorithm("Linear")
        ops.analysis("Static")
        if ops.analyze(1) != 0:
            raise RuntimeError("OpenSees analysis failed")
        return np.array(ops.nodeDisp(1))

    C = np.column_stack([build(np.eye(6)[i].tolist()) for i in range(6)])
    return np.linalg.inv(C) * f["efficiency"]


cases = json.loads(Path("tmp/verification/input.json").read_text())
out = []
for case in cases:
    expected = np.array(case["matrix"])
    denom = np.sqrt(np.outer(np.diag(expected), np.diag(expected)))
    rows = []
    for n in [64, 128, 256]:
        k = stiffness(case, n)
        delta = (k - expected) / denom
        row = {
            "segments": n,
            "matrix": k.tolist(),
            "maxNormalizedEntryError": float(np.max(np.abs(delta))),
            "diagonalErrorsPercent": (
                (np.diag(k) / np.diag(expected) - 1) * 100
            ).tolist(),
        }
        rows.append(row)
        print(
            case["id"],
            n,
            "error",
            row["maxNormalizedEntryError"],
            "diag%",
            row["diagonalErrorsPercent"],
            flush=True,
        )
    out.append(
        {
            "id": case["id"],
            "input": {k: case[k] for k in ["project", "foundation", "positions"]},
            "reference": rows,
        }
    )
Path("tmp/verification/opensees-results.json").write_text(
    json.dumps(
        {
            "generator": "OpenSeesPy elasticBeamColumn + nodal Elastic zeroLength springs + rigidLink; no MolasStruct solver imported",
            "version": ops.version(),
            "openseespy": version("openseespy"),
            "openseespylinux": version("openseespylinux"),
            "python": platform.python_version(),
            "cases": out,
        },
        indent=2,
    )
    + "\n"
)
ops.wipe()
print(
    "VERIFICATION_RESULT_JSON="
    + Path("tmp/verification/opensees-results.json").read_text().replace("\n", ""),
    flush=True,
)
