#!/usr/bin/env python3
"""Compare YouTube's transcription of a video against what that video claims to say.

    python3 check_captions.py <video>.captions.json <youtube>.en.vtt

YouTube transcribes the audio with a different model than `prepare-video` used, so
the two disagree in exactly the places one of them got a word wrong. That is the
only independent check available on a published video, and it is the check that
would have caught "they will just degrade" (burned in) against "we'll just
degrade" (what was actually said).

Corrections recorded in the sidecar act as an allow-list. A word deliberately
struck on screen and replaced is *expected* to differ from the audio, so it is
reported as explained rather than as a problem. What survives is the interesting
part: places where the video says one thing, YouTube heard another, and nobody
decided that on purpose.

Exit status is 0 whether or not divergences are found. This reports; the human
decides whether a re-render is worth it.
"""

import argparse
import difflib
import json
import pathlib
import re

CONTEXT = 6

# prepare-video strips these by design, so YouTube having them and the video not
# is not a disagreement about what was said. Only ever used to excuse words
# *YouTube* has and the video lacks, never the other way round, so listing an
# ordinary word like "just" here cannot hide a real divergence.
STRIPPED = {"uh", "um", "erm", "actually", "basically", "like", "well", "right",
            "so", "kind", "of", "sort", "just", "blah", "i", "a", "an", "the"}

# Transcription style, not disagreement. Compared in both directions.
EQUIV = [{"gonna", "going to"}, {"wanna", "want to"}, {"gotta", "got to"},
         {"we'll", "we will"}, {"it's", "it is"}, {"don't", "do not"},
         {"that's", "that is"}, {"i'm", "i am"}, {"you're", "you are"},
         {"can't", "cannot", "can not"}, {"won't", "will not"},
         {"they're", "they are"}, {"there's", "there is"}]


def equivalent(a, b):
    return any({a, b} <= group for group in EQUIV)


def norm(text):
    return [w for w in re.sub(r"[^a-z0-9'\s]", " ", text.lower()).split() if w]


def read_vtt(path):
    """VTT with the rolling-caption duplicates collapsed."""
    seen, out = set(), []
    for ln in pathlib.Path(path).read_text().splitlines():
        if "-->" in ln or ln.startswith(("WEBVTT", "Kind:", "Language:")) or not ln.strip():
            continue
        c = re.sub(r"<[^>]+>", "", ln).strip()
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return " ".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sidecar")
    ap.add_argument("captions", help="YouTube .vtt, or a plain-text transcript")
    args = ap.parse_args()

    doc = json.loads(pathlib.Path(args.sidecar).read_text())
    claimed = norm(doc["spoken_text"])
    p = pathlib.Path(args.captions)
    heard = norm(read_vtt(p) if p.suffix == ".vtt" else p.read_text())

    # A visible correction is a deliberate disagreement with the audio, and so is
    # anything dropped on purpose. Both become an allow-list rather than a finding.
    shown = [(( c["heard"] or "").lower(), (c["shown"] or "").lower())
             for c in doc.get("corrections", []) if c["class"] == "shown"]
    removable = set(STRIPPED) | {(c["heard"] or "").lower()
                                 for c in doc.get("corrections", [])
                                 if c["class"] in ("dropped", "struck")}

    explained, problems = [], []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, claimed, heard).get_opcodes():
        if op == "equal":
            continue
        ours_t, theirs_t = claimed[i1:i2], heard[j1:j2]
        ours, theirs = " ".join(ours_t), " ".join(theirs_t)

        extra = [t for t in theirs_t if t not in ours_t]
        missing = [t for t in ours_t if t not in theirs_t]

        if not missing and all(t in removable for t in extra):
            explained.append((ours, theirs, "removed on purpose"))
        elif any(sh and sh in ours and hd in theirs for hd, sh in shown):
            explained.append((ours, theirs, "corrected on screen"))
        elif equivalent(ours, theirs):
            explained.append((ours, theirs, "contraction"))
        else:
            ctx = " ".join(claimed[max(0, i1 - CONTEXT):i1])
            problems.append((ctx, ours, theirs))

    print(f"video claims {len(claimed)} words; YouTube heard {len(heard)}\n")

    if explained:
        print(f"{len(explained)} difference(s) explained by decisions made on purpose:")
        for ours, theirs, why in explained:
            print(f"   audio {theirs!r:34s} -> video {ours!r:22s} ({why})")
        print()

    if not problems:
        print("No unexplained divergence. The post transcript can be written from")
        print("spoken_text and it will match the video.")
        return

    print(f"{len(problems)} UNEXPLAINED divergence(s). The published video and a")
    print("transcript written from it would disagree here:\n")
    for ctx, ours, theirs in problems:
        print(f"   ...{ctx}")
        print(f"      video says : {ours!r}")
        print(f"      YouTube heard: {theirs!r}\n")
    print("Decide per item, and say which you chose in the summary:")
    print("  - the video is wrong  -> re-render with prepare-video, then re-upload")
    print("  - YouTube is wrong    -> write the post from the video, note it here")
    print("Do not silently write the better wording into the post: that leaves the")
    print("site disagreeing with the video and nobody knowing.")


if __name__ == "__main__":
    main()
