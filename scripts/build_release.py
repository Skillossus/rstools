#!/usr/bin/env python3
"""Build the self-contained viewer: index.html with every icon embedded as base64.

  python3 scripts/build_release.py index.html icons setups-viewer.html
"""
import base64
import json
import os
import sys

src, icon_dir, out = sys.argv[1:4]

icons = {}
for name in os.listdir(icon_dir):
    stem, ext = os.path.splitext(name)
    if ext == ".png" and stem.isdigit():
        with open(os.path.join(icon_dir, name), "rb") as f:
            icons[stem] = base64.b64encode(f.read()).decode()

version = {}
vpath = os.path.join(icon_dir, "version.json")
if os.path.exists(vpath):
    with open(vpath, encoding="utf-8") as f:
        version = json.load(f)

with open(src, encoding="utf-8") as f:
    html = f.read()
assert html.count("<script>") == 1, "expected exactly one inline script in the viewer"
data = json.dumps(icons, separators=(",", ":")).replace("</", "<\\/")
inject = f"<script>window.ICONS={data};window.ICON_VERSION={json.dumps(version)};</script>\n"
html = html.replace("<script>", inject + "<script>", 1)

with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"{len(icons)} icons embedded -> {out} ({os.path.getsize(out) / 1e6:.1f} MB)")
