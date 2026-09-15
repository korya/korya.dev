#!/usr/bin/env python3
"""Surface everything in a transcript worth asking the user about, before rendering.

    python3 review_transcript.py /tmp/pv/audio.json

Prints four buckets, each item numbered and carrying the timestamp and the flag
that acts on it, so the answers can be assembled straight into a make_ass.py
command line.

The buckets exist because the three kinds of correction have three different
tells, and no single signal finds all of them:

  A  suspected mishearings   low whisper confidence
  B  filler being removed    the FILLER_* rules in make_ass.py
  C  stutters and restarts   repeats, and long pauses mid-phrase
  D  read it yourself        nothing mechanical finds these -- see below

**Bucket D is not optional.** Whisper's confidence is a poor detector of the
worst class of error: a *confident* mishearing. Measured on the video this was
built for, where two errors changed the meaning of a sentence:

    "taught" (should be "studied")   p=0.957   rank  50/330
    "they"   (should be "we'll")     p=0.995   rank  96/330

Both sat in the top third by confidence. A review that only reads bucket A ships
them. The only thing that catches them is reading the transcript for passages
that do not parse, which is what bucket D prints the text for.
"""

import argparse
import importlib.util
import pathlib

_spec = importlib.util.spec_from_file_location(
    "make_ass", pathlib.Path(__file__).with_name("make_ass.py"))
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

LOW_PROB = 0.80      # below this, whisper was guessing
RESTART_GAP = 0.90   # a pause this long mid-phrase usually precedes a restart
NEAR = 3             # a repeat within this many words reads as a false start


def ctx(words, i, span=4):
    """The word in its neighbourhood, marked, so a human can judge it."""
    lo, hi = max(0, i - span), min(len(words), i + span + 1)
    return " ".join(f">>{w['raw']}<<" if j == i else w["raw"]
                    for j, w in enumerate(words[lo:hi], start=lo))


def filler_hits(words):
    """Which words the automatic rules will strip, and under which rule."""
    kept = {(round(w["start"], 2)) for w in M.strip_fillers(words)}
    out = []
    for w in words:
        if round(w["start"], 2) in kept:
            continue
        if w["n"] in M.FILLER_WORDS:
            rule = "filler word"
        elif w["n"] in M.COMMA_FENCED:
            rule = "comma-fenced marker"
        else:
            rule = "filler phrase or stutter"
        out.append((w, rule))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_in")
    ap.add_argument("--low", type=float, default=LOW_PROB,
                    help=f"confidence below this is suspect (default {LOW_PROB})")
    args = ap.parse_args()

    words = M.load_words(args.json_in)
    n = 0

    print(f"{len(words)} words transcribed. Review before rendering.\n")

    print("=" * 72)
    print("A. SUSPECTED MISHEARINGS  (low confidence)")
    print("   fix visibly: --correct-at T=WORD   |   silently: --retext-at T=TEXT")
    print("=" * 72)
    low = [(i, w) for i, w in enumerate(words)
           if w["prob"] is not None and w["prob"] < args.low]
    for i, w in sorted(low, key=lambda x: x[1]["prob"]):
        n += 1
        print(f"{n:3d}. [{w['start']:7.2f}] p={w['prob']:.2f}  {w['raw']!r}")
        print(f"      {ctx(words, i)}")
    if not low:
        print("   (none below threshold)")

    print()
    print("=" * 72)
    print("B. FILLER THE RULES WILL REMOVE  (veto with --keep-at T)")
    print("=" * 72)
    hits = filler_hits(words)
    for w, rule in hits:
        print(f"     [{w['start']:7.2f}] {w['raw']!r:16s} {rule}")
    print(f"   {len(hits)} words removed automatically."
          if hits else "   (nothing stripped)")

    print()
    print("=" * 72)
    print("C. STUTTERS AND RESTARTS  (drop with --drop-at T)")
    print("=" * 72)
    flagged = []
    for i, w in enumerate(words):
        prev = words[max(0, i - NEAR):i]
        if any(p["n"] == w["n"] and w["n"] for p in prev):
            flagged.append((i, w, f"repeats {w['raw']!r} within {NEAR} words"))
        elif i and w["start"] - words[i - 1]["end"] > RESTART_GAP:
            flagged.append((i, w, f"{w['start'] - words[i-1]['end']:.1f}s pause before this"))
    for i, w, why in flagged:
        n += 1
        print(f"{n:3d}. [{w['start']:7.2f}] {why}")
        print(f"      {ctx(words, i)}")
    if not flagged:
        print("   (none)")

    print()
    print("=" * 72)
    print("D. READ THIS FOR SENSE  (confidence cannot flag a confident error)")
    print("=" * 72)
    print("Look for passages that do not parse, pronouns that contradict their")
    print("sentence, and words that are plausible English but wrong here.\n")
    line = []
    for w in words:
        line.append(w["raw"])
        if sum(len(x) + 1 for x in line) > 88:
            print("   " + " ".join(line))
            line = []
    if line:
        print("   " + " ".join(line))

    print()
    print("Decide per item: visible correction (--correct-at / --strike-at),")
    print("silent fix (--retext-at), removal (--drop-at), or leave alone.")


if __name__ == "__main__":
    main()
