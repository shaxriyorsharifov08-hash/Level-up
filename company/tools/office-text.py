#!/usr/bin/env python3
"""office-text: read a PowerPoint or Word file as plain text, fast (the ai-team skill).

    python3 scripts/office-text.py deck.pptx              every slide: text, tables, chart data, speaker notes
    python3 scripts/office-text.py deck.pptx --slide 12   one slide
    python3 scripts/office-text.py deck.pptx --numbers    every number with its slide and context, so
                                                               the same figure written two ways stands out
    python3 scripts/office-text.py doc.docx               paragraphs and tables of a Word file
    python3 scripts/office-text.py deck.pptx --find "payback"

Python standard library only (zipfile + XML), so it needs no package and never
changes the file: it only reads.
"""
import re
import sys
import zipfile
import posixpath
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}
R_ID = "{%s}id" % NS["r"]
NUM = re.compile(r"[-−–]?\$?\d[\d,.\s]*\d(?:\s?(?:%|k|K|M|mln|bn|so'm|soʻm|сум|сўм|USD|\$))?|[-−–]?\$?\d(?:\s?%)?")


def rels(z, part):
    """relationship id -> (type, absolute target) for one part"""
    d, base = posixpath.split(part)
    path = posixpath.join(d, "_rels", base + ".rels")
    out = {}
    if path not in z.namelist():
        return out
    for r in ET.fromstring(z.read(path)).findall("rel:Relationship", NS):
        t = r.get("Target")
        if r.get("TargetMode") == "External":
            continue
        out[r.get("Id")] = (r.get("Type").rsplit("/", 1)[-1], posixpath.normpath(posixpath.join(d, t)))
    return out


def para_text(p):
    return "".join(t.text or "" for t in p.iter("{%s}t" % NS["a"])).strip()


def chart_lines(z, part):
    root = ET.fromstring(z.read(part))
    out = []
    title = " ".join(t.text or "" for t in root.findall(".//c:title//a:t", NS)).strip()
    if title:
        out.append("chart title: " + title)
    for ser in root.iter("{%s}ser" % NS["c"]):
        name = " ".join(v.text or "" for v in ser.findall("c:tx//c:v", NS)).strip() or "series"
        cats = [v.text for v in ser.findall("c:cat//c:pt/c:v", NS)]
        vals = [v.text for v in ser.findall("c:val//c:pt/c:v", NS)]
        if cats and len(cats) == len(vals):
            out.append("chart series %s: %s" % (name, ", ".join("%s=%s" % (c, v) for c, v in zip(cats, vals))))
        else:
            out.append("chart series %s: %s" % (name, ", ".join(v or "" for v in vals)))
    return out


def shape_lines(z, part, srels, el):
    out = []
    for ch in el:
        tag = ch.tag.split("}")[-1]
        if tag == "grpSp":
            out += shape_lines(z, part, srels, ch)
        elif tag == "sp":
            for p in ch.iter("{%s}p" % NS["a"]):
                t = para_text(p)
                if t:
                    out.append(t)
        elif tag == "graphicFrame":
            tbl = ch.find(".//a:tbl", NS)
            if tbl is not None:
                for tr in tbl.findall("a:tr", NS):
                    cells = [" ".join(para_text(p) for p in tc.iter("{%s}p" % NS["a"])).strip() for tc in tr.findall("a:tc", NS)]
                    out.append("| " + " | ".join(cells) + " |")
            c = ch.find(".//c:chart", NS)
            if c is not None and c.get(R_ID) in srels:
                out += chart_lines(z, srels[c.get(R_ID)][1])
    return out


def pptx_slides(path):
    z = zipfile.ZipFile(path)
    pres = ET.fromstring(z.read("ppt/presentation.xml"))
    prels = rels(z, "ppt/presentation.xml")
    slides = []
    for i, s in enumerate(pres.findall("p:sldIdLst/p:sldId", NS), 1):
        part = prels[s.get(R_ID)][1]
        srels = rels(z, part)
        root = ET.fromstring(z.read(part))
        tree = root.find("p:cSld/p:spTree", NS)
        body = shape_lines(z, part, srels, tree) if tree is not None else []
        notes = []
        for typ, target in srels.values():
            if typ == "notesSlide" and target in z.namelist():
                nroot = ET.fromstring(z.read(target))
                for sp in nroot.iter("{%s}sp" % NS["p"]):
                    ph = sp.find(".//p:ph", NS)
                    if ph is not None and ph.get("type") in ("sldNum", "sldImg", "hdr", "ftr", "dt"):
                        continue
                    for p in sp.iter("{%s}p" % NS["a"]):
                        t = para_text(p)
                        if t:
                            notes.append(t)
        slides.append({"n": i, "lines": body, "notes": notes, "hidden": root.get("show") == "0"})
    return slides


def docx_blocks(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read("word/document.xml"))
    body = root.find("w:body", NS)
    out = []
    for el in body:
        tag = el.tag.split("}")[-1]
        if tag == "p":
            t = "".join(x.text or "" for x in el.iter("{%s}t" % NS["w"])).strip()
            if t:
                out.append(t)
        elif tag == "tbl":
            for tr in el.iter("{%s}tr" % NS["w"]):
                cells = ["".join(x.text or "" for x in tc.iter("{%s}t" % NS["w"])).strip() for tc in tr.findall("w:tc", NS)]
                out.append("| " + " | ".join(cells) + " |")
    return out


def numbers(units):
    """(where, number, context) for every figure; years and slide numbers alone are skipped"""
    rows = []
    for where, line in units:
        for m in NUM.finditer(line):
            v = m.group(0).strip()
            digits = re.sub(r"\D", "", v)
            if not digits or (len(digits) == 4 and v.isdigit() and 1990 <= int(v) <= 2100):
                continue
            if v.isdigit() and int(v) < 10 and "%" not in v:
                continue
            s, e = max(0, m.start() - 40), min(len(line), m.end() + 40)
            rows.append((where, v, line[s:e].replace("\n", " ")))
    return rows


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    path = argv[1]
    want = int(argv[argv.index("--slide") + 1]) if "--slide" in argv else None
    find = argv[argv.index("--find") + 1].lower() if "--find" in argv else None
    units = []
    out = []
    if path.lower().endswith(".pptx"):
        for s in pptx_slides(path):
            if want and s["n"] != want:
                continue
            out.append("## Slide %d%s" % (s["n"], " (hidden)" if s["hidden"] else ""))
            out += s["lines"]
            if s["notes"]:
                out.append("notes: " + " / ".join(s["notes"]))
            out.append("")
            units += [("slide %d" % s["n"], l) for l in s["lines"]] + [("slide %d notes" % s["n"], l) for l in s["notes"]]
    elif path.lower().endswith(".docx"):
        for i, b in enumerate(docx_blocks(path), 1):
            out.append(b)
            units.append(("paragraph %d" % i, b))
    else:
        print("only .pptx and .docx")
        return 2
    if "--numbers" in argv:
        rows = numbers(units)
        for where, v, ctx in rows:
            print("%-16s %-14s %s" % (where, v, ctx))
        print("\n%d figures. Look for the same quantity written with different values." % len(rows))
    elif find:
        for where, l in units:
            if find in l.lower():
                print("%-16s %s" % (where, l))
    else:
        print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
