#!/usr/bin/env python3
"""build-portable: package the owner's portable AI team (README 6c).

    python3 scripts/team/build-portable.py           check the source, then build everything
    python3 scripts/team/build-portable.py --check   check, and confirm the built files match the source

Source of truth: portable/ai-team/ (SKILL.md, references/, scripts/).
Builds:
  portable/dist/ai-team.zip              upload once at claude.ai -> Customize -> Skills:
                                         every chat, the desktop app, and Claude Code cloud sessions of any repo
  plugins/ai-team/                       the same team as a Claude Code plugin (skill + ten agents) for the
  .claude-plugin/marketplace.json        Claude Code CLI on a computer:
                                         claude plugin marketplace add shaxriyorsharifov08-hash/Level-up
Python standard library only.
"""
import io
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.environ.get("AI_TEAM_SRC") or os.path.join(ROOT, "portable", "ai-team")  # the override is for tests
NAME = "ai-team"
ROLES = ["planner", "coder", "tester", "translator", "reviewer", "designer", "health-safety", "analyst", "deck-editor", "docs-writer"]
READ_ONLY = {"planner", "reviewer", "health-safety"}
TOOLS = {"Read", "Edit", "Write", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"}
SKILL_KEYS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
# project-specific words that must not leak into the portable team (owner-rules.md may name the repo it lives in)
LEAKS = re.compile(r"index\.html|MENTOR_|leveluphunter|codemap|rules-check|affected-tests|i18n-check|defaultState|LEVEL UP|Level-up|level-up", re.I)
SECRETS = re.compile(r"sk-ant-[\w-]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_\w{20,}|AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----")
VERSION = "1.0.0"
OWNER = "shaxriyorsharifov08-hash"


def front(text):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.S)
    if not m:
        return None, text
    meta = {}
    for line in m.group(1).split("\n"):
        if ":" in line and not line.startswith(" "):
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, m.group(2)


def files_of(folder):
    out = []
    for base, dirs, names in os.walk(folder):
        dirs[:] = sorted(d for d in dirs if d not in ("__pycache__",))
        for n in sorted(names):
            if n.endswith(".pyc") or n == ".DS_Store":
                continue
            p = os.path.join(base, n)
            out.append(os.path.relpath(p, folder).replace(os.sep, "/"))
    return out


def validate():
    problems = []
    skill = os.path.join(SRC, "SKILL.md")
    if not os.path.exists(skill):
        return ["portable/ai-team/SKILL.md is missing"]
    text = open(skill, encoding="utf-8").read()
    meta, body = front(text)
    if meta is None:
        problems.append("SKILL.md has no frontmatter")
        meta = {}
    extra = set(meta) - SKILL_KEYS
    if extra:
        problems.append("SKILL.md frontmatter keys claude.ai refuses: " + ", ".join(sorted(extra)))
    name = meta.get("name", "")
    if name != NAME or not re.match(r"^[a-z0-9-]{1,64}$", name) or re.search(r"claude|anthropic", name):
        problems.append("SKILL.md name must be '%s' (lowercase, digits, hyphens, at most 64, no 'claude' or 'anthropic')" % NAME)
    desc = meta.get("description", "")
    if not desc or len(desc) > 200:
        problems.append("SKILL.md description must be 1-200 characters (it is %d)" % len(desc))
    if "<" in desc or ">" in desc:
        problems.append("SKILL.md description must not contain < or >")
    if len(text.split("\n")) > 500:
        problems.append("SKILL.md must stay under 500 lines")
    for ref in sorted(set(re.findall(r"`((?:references|scripts)/[\w./<>-]+)`", body))):
        if "<" in ref:
            continue
        if not os.path.exists(os.path.join(SRC, ref)):
            problems.append("SKILL.md points to a missing file: " + ref)
    roles_dir = os.path.join(SRC, "references", "roles")
    have = sorted(f[:-3] for f in os.listdir(roles_dir) if f.endswith(".md")) if os.path.isdir(roles_dir) else []
    if have != sorted(ROLES):
        problems.append("roles must be exactly: " + ", ".join(ROLES) + " (found: " + ", ".join(have) + ")")
    for r in have:
        rmeta, rbody = front(open(os.path.join(roles_dir, r + ".md"), encoding="utf-8").read())
        if rmeta is None:
            problems.append("roles/%s.md has no frontmatter" % r)
            continue
        if rmeta.get("name") != r:
            problems.append("roles/%s.md: name must be %s" % (r, r))
        d = rmeta.get("description", "")
        if not d or len(d) > 250:
            problems.append("roles/%s.md: description must be 1-250 characters (%d)" % (r, len(d)))
        tools = [t.strip() for t in rmeta.get("tools", "").split(",") if t.strip()]
        if not tools or not set(tools) <= TOOLS:
            problems.append("roles/%s.md: unknown tools %s" % (r, sorted(set(tools) - TOOLS)))
        if r in READ_ONLY and ({"Edit", "Write"} & set(tools)):
            problems.append("roles/%s.md must be read-only (no Edit or Write)" % r)
        if rmeta.get("model") not in ("inherit", "sonnet", "opus", "haiku"):
            problems.append("roles/%s.md: model must be inherit, sonnet, opus or haiku" % r)
        if "owner-rules" not in rbody:
            problems.append("roles/%s.md must tell the role to follow the owner rules" % r)
    for rel in files_of(SRC):
        if rel.split("/")[0] == "bin":
            problems.append("a top-level bin/ makes claude.ai refuse the upload")
        try:
            t = open(os.path.join(SRC, rel), encoding="utf-8").read()
        except UnicodeDecodeError:
            continue
        if SECRETS.search(t):
            problems.append(rel + ": looks like a secret")
        if rel != "references/owner-rules.md":
            m = LEAKS.search(t)
            if m:
                problems.append(rel + ": project-specific word in the portable team: " + m.group(0))
    return problems


def build(out_root):
    """write the zip, the plugin and the marketplace under out_root"""
    # 1. the claude.ai upload: a zip whose top-level entry is the skill folder
    dist = os.path.join(out_root, "portable", "dist")
    os.makedirs(dist, exist_ok=True)
    zpath = os.path.join(dist, NAME + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in files_of(SRC):
            info = zipfile.ZipInfo(NAME + "/" + rel, date_time=(1980, 1, 1, 0, 0, 0))
            info.external_attr = (0o755 if rel.endswith(".py") else 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, open(os.path.join(SRC, rel), "rb").read())
    # 2. the Claude Code plugin: the same skill, plus each role as an agent
    plug = os.path.join(out_root, "plugins", NAME)
    if os.path.exists(plug):
        shutil.rmtree(plug)
    shutil.copytree(SRC, os.path.join(plug, "skills", NAME), ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    os.makedirs(os.path.join(plug, "agents"))
    for r in ROLES:
        shutil.copyfile(os.path.join(SRC, "references", "roles", r + ".md"), os.path.join(plug, "agents", r + ".md"))
    os.makedirs(os.path.join(plug, ".claude-plugin"))
    meta, _ = front(open(os.path.join(SRC, "SKILL.md"), encoding="utf-8").read())
    with open(os.path.join(plug, ".claude-plugin", "plugin.json"), "w", encoding="utf-8") as f:
        json.dump({"name": NAME, "version": VERSION, "description": meta["description"],
                   "author": {"name": OWNER}, "keywords": ["team", "agents", "review", "testing", "decks"]}, f, indent=2)
        f.write("\n")
    with open(os.path.join(plug, "GENERATED.md"), "w", encoding="utf-8") as f:
        f.write("# Generated: do not edit\n\nThis folder is built from `portable/ai-team/` by `python3 scripts/team/build-portable.py`.\nEdit the source there and rebuild.\n")
    # 3. the marketplace at the repository root, so `claude plugin marketplace add <owner>/<repo>` finds it
    mk = os.path.join(out_root, ".claude-plugin")
    os.makedirs(mk, exist_ok=True)
    with open(os.path.join(mk, "marketplace.json"), "w", encoding="utf-8") as f:
        json.dump({"name": NAME, "owner": {"name": OWNER},
                   "plugins": [{"name": NAME, "source": "./plugins/" + NAME, "description": meta["description"], "version": VERSION}]}, f, indent=2)
        f.write("\n")
    return zpath


def zip_contents(p):
    with zipfile.ZipFile(p) as z:
        return {n: z.read(n) for n in z.namelist()}


def tree(folder):
    return {rel: open(os.path.join(folder, rel), "rb").read() for rel in files_of(folder)} if os.path.isdir(folder) else {}


def main(argv):
    problems = validate()
    if problems:
        print("The portable team has problems:")
        for p in problems:
            print("  - " + p)
        return 1
    if "--check" in argv:
        tmp = tempfile.mkdtemp()
        try:
            build(tmp)
            same = (zip_contents(os.path.join(tmp, "portable", "dist", NAME + ".zip")) == (zip_contents(os.path.join(ROOT, "portable", "dist", NAME + ".zip")) if os.path.exists(os.path.join(ROOT, "portable", "dist", NAME + ".zip")) else None)
                    and tree(os.path.join(tmp, "plugins", NAME)) == tree(os.path.join(ROOT, "plugins", NAME))
                    and tree(os.path.join(tmp, ".claude-plugin")) == tree(os.path.join(ROOT, ".claude-plugin")))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        if not same:
            print("The built files are out of date: run  python3 scripts/team/build-portable.py  and commit.")
            return 1
        print("portable team: valid, and the zip, plugin and marketplace match the source.")
        return 0
    z = build(ROOT)
    n = len(zip_contents(z))
    print("Built %s (%d files), plugins/%s/ and .claude-plugin/marketplace.json." % (os.path.relpath(z, ROOT), n, NAME))
    print("Upload the zip once at claude.ai -> Customize -> Skills, then turn it on.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
