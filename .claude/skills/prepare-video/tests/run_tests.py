#!/usr/bin/env python3
"""Regression tests for make_ass.py.

    python3 tests/run_tests.py            # run
    python3 tests/run_tests.py --update   # rewrite the golden .ass files

Two kinds of check. Golden files catch *any* unintended change to the rendered
output, which is what makes the geometry safe to refactor. The assertions below
them cover the failure modes this skill has documented as silent: a caption that
overflows the frame and wraps instead of erroring, and a mistimed flag that
renders successfully with the edit missing.

**Font dependence.** Caption positions are computed from real Avenir Next Heavy
metrics, so any case involving a correction needs that font and Pillow, and can
only run on macOS. Those cases SKIP elsewhere and say so: a green run on Linux
is a genuine but partial result, and the summary line states which it was.
"""

import argparse
import importlib.util
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
SKILL = HERE.parent
MAKE_ASS = SKILL / "scripts" / "make_ass.py"
FIXTURE = HERE / "fixtures" / "sample.words.json"
GOLDEN = HERE / "golden"

_spec = importlib.util.spec_from_file_location("make_ass", MAKE_ASS)
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

# A correction is positioned with real glyph advances; everything else is not.
CORRECTIONS = [
    "--strike-at", "10.54",
    "--correct-at", "22.18=humankind",
    "--retext-at", "4.02=AI",
    "--break-at", "12.26",
    "--drop-at", "15.36",
]

CASES = [
    ("vertical-plain",       ["--layout", "vertical", "--tone", "hlg"], False),
    ("horizontal-plain",     ["--layout", "horizontal", "--tone", "sdr"], False),
    ("vertical-corrected",   ["--layout", "vertical", "--tone", "hlg"] + CORRECTIONS, True),
    ("horizontal-corrected", ["--layout", "horizontal", "--tone", "hlg"] + CORRECTIONS, True),
]

PASS, FAIL, SKIP = [], [], []


def have_font():
    try:
        from PIL import ImageFont
        ImageFont.truetype(M.MEASURE_TTC[0], 100, index=M.MEASURE_TTC[1])
        return True
    except Exception:
        return False


def ok(name):
    PASS.append(name); print(f"  ok    {name}")


def bad(name, detail):
    FAIL.append(name); print(f"  FAIL  {name}\n        {detail}")


def skip(name, why):
    SKIP.append(name); print(f"  skip  {name}  ({why})")


def run(args, out):
    return subprocess.run([sys.executable, str(MAKE_ASS), str(FIXTURE), str(out)] + args,
                          capture_output=True, text=True)


def golden_cases(tmp, update, font):
    for name, args, needs_font in CASES:
        if needs_font and not font:
            skip(name, "needs Avenir Next Heavy")
            continue
        out = tmp / f"{name}.ass"
        r = run(args, out)
        if r.returncode:
            bad(name, r.stderr.strip()[:300]); continue
        g = GOLDEN / f"{name}.ass"
        if update:
            g.write_text(out.read_text()); print(f"  wrote {g.name}"); continue
        if not g.exists():
            bad(name, f"no golden; run --update"); continue
        if g.read_text() != out.read_text():
            bad(name, f"output differs from {g.name}; inspect, then --update if intended")
        else:
            ok(name)


def width_checks(tmp, font):
    """The documented silent failure: an over-long line wraps instead of erroring."""
    if not font:
        skip("line-widths-fit-frame", "needs Avenir Next Heavy"); return
    worst = None
    for name, args, _ in CASES:
        layout = args[args.index("--layout") + 1]
        cfg = M.LAYOUTS[layout]
        usable = cfg["play_w"] - 2 * cfg["margin_lr"] - 2 * cfg["outline"]
        out = tmp / f"w-{name}.ass"
        if run(args, out).returncode:
            continue
        for ln in out.read_text().splitlines():
            if not ln.startswith("Dialogue: 0,"):
                continue
            txt = re.sub(r"\{[^}]*\}", "", ln.split(",", 9)[9]).strip()
            w = M.text_width(txt, cfg["font_size"], M.SPACING)
            if w > usable:
                bad("line-widths-fit-frame", f"{layout}: {w:.0f}px > {usable}px  {txt!r}")
                return
            if worst is None or w / usable > worst[0]:
                worst = (w / usable, layout, txt)
    ok(f"line-widths-fit-frame (worst {worst[0]:.0%} of usable, {worst[1]})")


def validation_checks(tmp):
    """A mistimed flag must be a hard error, never a silent no-op."""
    for flag in (["--retext-at", "99.99=nope"], ["--break-at", "99.99"],
                 ["--strike-at", "99.99"], ["--correct-at", "99.99=nope"]):
        r = run(["--layout", "vertical"] + flag, tmp / "v.ass")
        if r.returncode and "not found in output" in r.stderr:
            ok(f"rejects mistimed {flag[0]}")
        else:
            bad(f"rejects mistimed {flag[0]}", "expected a non-zero exit naming the time")

    # Dropping the word a correction targets leaves the correction unreachable.
    r = run(["--layout", "vertical", "--drop-at", "22.18",
             "--correct-at", "22.18=humankind"], tmp / "v.ass")
    if r.returncode:
        ok("rejects a correction on a dropped word")
    else:
        bad("rejects a correction on a dropped word", "rendered anyway")


def probability_optional(tmp):
    """Transcripts from other tools carry no per-word probability."""
    d = json.loads(FIXTURE.read_text())
    for s in d["segments"]:
        for w in s.get("words", []):
            w.pop("probability", None)
    noprob = tmp / "noprob.json"
    noprob.write_text(json.dumps(d))
    r = subprocess.run([sys.executable, str(MAKE_ASS), str(noprob), str(tmp / "np.ass"),
                        "--layout", "vertical"], capture_output=True, text=True)
    if r.returncode == 0 and (tmp / "np.ass").exists():
        ok("renders without per-word probability")
    else:
        bad("renders without per-word probability", r.stderr.strip()[:200])


def sidecar_check(tmp, font):
    """caption_text and spoken_text must diverge exactly at the visible corrections."""
    if not font:
        skip("sidecar records the dispositions", "needs Avenir Next Heavy"); return
    side = tmp / "s.captions.json"
    r = run(["--layout", "vertical", "--tone", "hlg"] + CORRECTIONS
            + ["--sidecar", str(side), "--source", "sample.MOV"], tmp / "s.ass")
    if r.returncode:
        bad("sidecar records the dispositions", r.stderr.strip()[:200]); return
    d = json.loads(side.read_text())
    classes = sorted({c["class"] for c in d["corrections"]})
    if classes != ["dropped", "shown", "silent", "struck"]:
        bad("sidecar records the dispositions", f"classes were {classes}"); return
    if "humanity" not in d["caption_text"] or "humankind" not in d["spoken_text"]:
        bad("sidecar records the dispositions",
            "caption_text/spoken_text do not differ at the visible correction"); return
    if d["layouts"]["vertical"]["ass"] != "s.ass":
        bad("sidecar records the dispositions", "layout not recorded"); return
    ok("sidecar records the dispositions")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--update", action="store_true",
                    help="rewrite goldens; review the diff before committing")
    args = ap.parse_args()

    font = have_font()
    import tempfile
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        print("golden files")
        golden_cases(tmp, args.update, font)
        if not args.update:
            print("assertions")
            width_checks(tmp, font)
            validation_checks(tmp)
            probability_optional(tmp)
            sidecar_check(tmp, font)

    if args.update:
        print("\ngoldens rewritten.")
        return 0
    scope = "full" if font else "partial (no Avenir Next Heavy: font-metric cases skipped)"
    print(f"\n{len(PASS)} passed, {len(FAIL)} failed, {len(SKIP)} skipped — {scope}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
