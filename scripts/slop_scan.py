#!/usr/bin/env python3
"""
Scan a project for the mechanical tells of AI-generated design and copy.

The judgement half of the anti-slop gate lives in references/anti-slop.md;
this is the half a script can do reliably. It is context-aware: a palette the
brief asked for is not slop, so approved exceptions are read from a line in
the repo's CLAUDE.md or .claude/kodexa-learnings.md such as

    Palette exceptions: pink, gradient

or passed with --allow pink,gradient.

Usage:
    python scripts/slop_scan.py <repo>              # report
    python scripts/slop_scan.py <repo> --allow pink
    python scripts/slop_scan.py <repo> --strict     # warnings also fail

Exit code 1 when there are errors (em or en dashes anywhere, or filler copy),
or when --strict and there are warnings. Warnings are palette and effect tells
that are fine when the brief wants them.

Exception words and what they allow:
    pink      pink, fuchsia and rose colours
    purple    purple, violet and indigo colours
    cyan      cyan, sky and teal neon accents
    gradient  multi-colour gradients and gradient-filled text
    glass     backdrop blur / frosted panels
    glow      blurred colour orbs and glow shadows
    dark      a dark-only theme
    inter     Inter as the only typeface
"""

import argparse
import os
import re
import sys
from pathlib import Path

SCAN_EXT = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".css", ".md", ".mdx", ".html", ".json", ".sql"}
SKIP_DIRS = {"node_modules", ".next", ".git", "dist", "build", "out", ".vercel", ".turbo", "coverage", ".claude"}
# Docs about the project quote the words they ban ("never write 'seamless'"),
# so filler checks run on shipped copy only. Dashes are checked everywhere.
DOC_FILES = {"CLAUDE.md", "AGENTS.md", "README.md", "CHANGELOG.md", "CONTRIBUTING.md"}
# Checked for dashes even though .claude/ is skipped for everything else.
EXTRA_DASH_FILES = [".claude/kodexa-learnings.md"]
SKIP_FILES = {"package-lock.json", "pnpm-lock.yaml", "yarn.lock"}

FILLER = [
    "seamless", "seamlessly", "elevate your", "unlock the", "unleash", "delve", "empower",
    "cutting-edge", "cutting edge", "in today's fast-paced", "whether you're", "game-changer",
    "revolutionize", "supercharge", "next-level", "world-class", "state-of-the-art",
    "harness the power", "look no further", "take it to the next level",
]

PALETTE = {
    "pink": {
        "classes": r"\b(?:from|via|to|bg|text|border|shadow|ring)-(?:pink|fuchsia|rose)-\d{2,3}\b",
        "hex": ["#ec4899", "#f472b6", "#db2777", "#d946ef", "#e879f9", "#f43f5e", "#fb7185"],
    },
    "purple": {
        "classes": r"\b(?:from|via|to|bg|text|border|shadow|ring)-(?:purple|violet|indigo)-\d{2,3}\b",
        "hex": ["#8b5cf6", "#7c3aed", "#a78bfa", "#a855f7", "#9333ea", "#c084fc", "#6366f1", "#818cf8", "#6d28d9"],
    },
    "cyan": {
        "classes": r"\b(?:from|via|to|shadow|ring)-(?:cyan|sky|teal)-\d{2,3}\b",
        "hex": ["#22d3ee", "#06b6d4", "#67e8f9", "#0ea5e9", "#38bdf8", "#2dd4bf"],
    },
}

EFFECTS = [
    ("gradient", r"bg-clip-text[^\"'`]*text-transparent|text-transparent[^\"'`]*bg-clip-text|background-clip:\s*text", "gradient-filled text"),
    ("gradient", r"bg-gradient-to-[a-z]+\s+from-(?:purple|violet|indigo|pink|fuchsia)-\d+[^\"'`]*to-(?:pink|cyan|blue|fuchsia|purple|sky)-\d+", "purple/pink/cyan gradient"),
    ("glass", r"backdrop-blur(?:-[a-z0-9\[\]]+)?|backdrop-filter:\s*blur", "frosted glass (backdrop blur)"),
    ("glow", r"blur-(?:2xl|3xl|\[\d{2,3}px\])|filter:\s*blur\(\s*[4-9]\d|filter:\s*blur\(\s*\d{3}", "blurred colour orb"),
    ("glow", r"shadow-\[0_0_\d+px[^\]]*(?:purple|violet|pink|cyan|#8b5cf6|#a78bfa|#22d3ee|#ec4899)", "neon glow shadow"),
    (None, r"\bSparkles\b", "Sparkles icon (the 'AI badge' tell); fine if it is genuinely about magic or cleaning"),
]


def load_exceptions(repo, cli):
    allowed = set(x.strip().lower() for x in (cli or "").split(",") if x.strip())
    for name in ("CLAUDE.md", "AGENTS.md", ".claude/kodexa-learnings.md"):
        p = repo / name
        if p.exists():
            for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
                m = re.search(r"palette exceptions:\s*\**\s*(.+)$", line, re.I)
                if m and not re.match(r"\s*none\b", m.group(1), re.I):
                    allowed |= {w.strip(" .*`").lower() for w in re.split(r"[,;/]| and ", m.group(1)) if w.strip()}
    return allowed


def files(repo):
    for dirpath, dirnames, filenames in os.walk(repo):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            p = Path(dirpath) / f
            if p.suffix.lower() in SCAN_EXT and f not in SKIP_FILES:
                yield p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("repo")
    ap.add_argument("--allow", help="comma-separated exception words (see --help)")
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    allowed = load_exceptions(repo, args.allow)
    errors, warnings, notes = [], [], []

    fonts_seen, inter_seen, dark_only = set(), False, False

    for p in files(repo):
        rel = p.relative_to(repo)
        try:
            lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        in_docs = p.name in DOC_FILES or (rel.parts and rel.parts[0] in {"docs", "supabase"})
        is_copy = p.suffix.lower() in {".js", ".jsx", ".ts", ".tsx", ".mdx", ".html", ".json"} and not in_docs
        generated = False
        for n, line in enumerate(lines, 1):
            # `next dev` writes and re-adds this block in AGENTS.md; its words
            # are Next's, not ours, and the block is meant to be committed.
            if "BEGIN:nextjs-agent-rules" in line:
                generated = True
            if generated:
                if "END:nextjs-agent-rules" in line:
                    generated = False
                continue
            where = f"{rel}:{n}"
            if "\u2014" in line or "\u2013" in line:
                errors.append(f"{where}: em or en dash")
            if is_copy:
                low = line.lower()
                for w in FILLER:
                    if w in low:
                        errors.append(f"{where}: filler copy '{w}'")
            for key, spec in PALETTE.items():
                if key in allowed:
                    continue
                if re.search(spec["classes"], line):
                    warnings.append(f"{where}: {key} colour class ({key} is not in this brief's palette exceptions)")
                for h in spec["hex"]:
                    if h in line.lower():
                        warnings.append(f"{where}: {key} hex {h}")
            for key, pattern, label in EFFECTS:
                if key and key in allowed:
                    continue
                if re.search(pattern, line):
                    (warnings if key else notes).append(f"{where}: {label}")
            for m in re.finditer(r"from\s+[\"']next/font/google[\"']|import\s*\{([^}]+)\}\s*from\s*[\"']next/font/google", line):
                if m.group(1):
                    for f in m.group(1).split(","):
                        fonts_seen.add(f.strip())
            if re.search(r"\bInter\b\s*\(", line) or re.search(r"font-family:[^;]*\bInter\b", line):
                inter_seen = True
            if re.search(r"color-scheme:\s*dark\s*;", line) and "light" not in line:
                dark_only = True

    for name in EXTRA_DASH_FILES:
        p = repo / name
        if p.exists():
            for n, line in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
                if "\u2014" in line or "\u2013" in line:
                    errors.append(f"{name}:{n}: em or en dash")

    if inter_seen and len({f for f in fonts_seen if f}) <= 1 and "inter" not in allowed:
        warnings.append("Inter appears to be the only typeface; pair a display face with it, or choose another")
    if dark_only and "dark" not in allowed:
        notes.append("the site declares a dark-only colour scheme; confirm the brief wants dark, not a reflex")

    print(f"slop scan: {repo}")
    print(f"palette exceptions: {', '.join(sorted(allowed)) or 'none'}\n")
    for label, items in (("ERRORS", errors), ("WARNINGS", warnings), ("NOTES", notes)):
        if items:
            print(f"{label} ({len(items)})")
            for i in items[:200]:
                print(f"  {i}")
            if len(items) > 200:
                print(f"  ... and {len(items) - 200} more")
            print()
    if not (errors or warnings or notes):
        print("clean")

    if errors or (args.strict and warnings):
        sys.exit(1)


if __name__ == "__main__":
    main()
