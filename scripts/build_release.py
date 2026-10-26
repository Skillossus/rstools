#!/usr/bin/env python3
"""Build the self-contained viewer: one HTML file with CSS, JS, the example, every icon
(base64) and the item-name map all embedded.

  python3 scripts/build_release.py . icons setups-viewer.html

Arguments: <viewer dir with index.html, style.css, app.js, example.js> <icons dir> <output file>
"""
import base64
import json
import os
import sys

viewer, icon_dir, out = sys.argv[1:4]


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def inline(html, tag, replacement):
    assert html.count(tag) == 1, f"expected exactly one {tag!r} in index.html"
    return html.replace(tag, replacement, 1)


icons = {}
for name in os.listdir(icon_dir):
    stem, ext = os.path.splitext(name)
    if ext == ".png" and stem.isdigit():
        with open(os.path.join(icon_dir, name), "rb") as f:
            icons[stem] = base64.b64encode(f.read()).decode()


def optional_json(name):
    path = os.path.join(icon_dir, name)
    return json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}


names, version = optional_json("names.json"), optional_json("version.json")

book_icons = {}
book_dir = os.path.join(icon_dir, "spellbooks")
if os.path.isdir(book_dir):
    for name in os.listdir(book_dir):
        stem, ext = os.path.splitext(name)
        if ext == ".png":
            with open(os.path.join(book_dir, name), "rb") as f:
                book_icons[stem] = base64.b64encode(f.read()).decode()


def js(obj):  # safe inside <script>
    return json.dumps(obj, separators=(",", ":")).replace("</", "<\\/")


css, app, example = (read(os.path.join(viewer, f)) for f in ("style.css", "app.js", "example.js"))
for label, text in (("style.css", css), ("app.js", app), ("example.js", example)):
    assert "</script" not in text.lower() and "</style" not in text.lower(), f"{label} contains a closing tag"

html = read(os.path.join(viewer, "index.html"))
html = inline(html, '<link rel="stylesheet" href="style.css">', f"<style>\n{css}</style>")
data = f"<script>window.ICONS={js(icons)};window.NAMES={js(names)};window.BOOK_ICONS={js(book_icons)};window.ICON_VERSION={js(version)};</script>\n"
html = inline(html, '<script src="example.js"></script>', data + f"<script>\n{example}</script>")
html = inline(html, '<script src="app.js"></script>', f"<script>\n{app}</script>")

with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"{len(icons)} icons, {len(book_icons)} spellbook icons, {len(names)} names embedded -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)")
