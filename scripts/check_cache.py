#!/usr/bin/env python3
"""OpenRS2 cache helper for the icon pipeline.

  check_cache.py check  [--download DIR] [--force]   is there a newer OSRS cache than icons/version.json?
  check_cache.py verify --new DIR                    sanity-check freshly rendered icons before they replace ours
  check_cache.py record --cache-id N --build M ...   write icons/version.json (only after everything succeeded)

`check` and `record` append key=value lines to $GITHUB_OUTPUT when it is set, else print them.
The renderer needs a full binary disk store (.dat2/.idx), which OpenRS2 serves as disk.zip.
"""
import argparse
import json
import os
import sys
import urllib.request
import zipfile

BASE = "https://archive.openrs2.org"
STATE = "icons/version.json"


def fetch(url, ua, dest=None):
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=120) as r:
        if dest is None:
            return r.read()
        with open(dest, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)


def emit(**kv):
    lines = "".join(f"{k}={v}\n" for k, v in kv.items())
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(lines)
    print(lines, end="")


def read_state(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def pick(caches):
    """Newest complete live English OSRS cache."""
    c = [x for x in caches if x.get("game") == "oldschool" and x.get("builds")]
    c = [x for x in c if x.get("environment", "live") == "live" and x.get("language", "en") == "en"]
    # A fresh cache can appear before OpenRS2 has finished crawling it into a usable disk store.
    if any("disk_store_valid" in x for x in c):
        c = [x for x in c if x.get("disk_store_valid")]
    if not c:
        sys.exit("No suitable OSRS cache found in caches.json (fields may have changed)")
    return max(c, key=lambda x: x.get("timestamp") or "")


def cmd_check(a):
    chosen = pick(json.loads(fetch(f"{a.base}/caches.json", a.ua)))
    cid = chosen["id"]
    build = chosen["builds"][0].get("major")
    stamp = (chosen.get("timestamp") or "")[:10]
    new = a.force or read_state(a.state).get("cache_id") != cid
    print(f"newest valid cache: id={cid} build={build} timestamp={stamp or '?'}; new={new}")
    info = {"new": str(new).lower(), "cache_id": cid, "build": build, "stamp": stamp}
    if new and a.download:
        scope = chosen.get("scope", "runescape")
        os.makedirs(a.download, exist_ok=True)
        zpath = os.path.join(a.download, "disk.zip")
        fetch(f"{a.base}/caches/{scope}/{cid}/disk.zip", a.ua, zpath)
        with zipfile.ZipFile(zpath) as z:
            z.extractall(a.download)
        os.remove(zpath)
        cache_dir = os.path.join(a.download, "cache")
        if not os.path.isdir(cache_dir):
            cache_dir = a.download
        if not os.path.exists(os.path.join(cache_dir, "main_file_cache.dat2")):
            sys.exit(f"main_file_cache.dat2 not found under {cache_dir}; unexpected disk.zip layout")
        info["cache_dir"] = cache_dir
    emit(**info)


def count_pngs(d):
    return sum(1 for n in os.listdir(d) if n.endswith(".png") and n[:-4].isdigit())


def cmd_verify(a):
    n = count_pngs(a.new)
    prev = read_state(a.state).get("count", 0)
    print(f"rendered {n} icons (previous build: {prev})")
    if n == 0:
        sys.exit("Renderer produced no icons")
    if prev and n < prev * a.min_ratio:
        sys.exit(f"Only {n} icons vs {prev} before (< {a.min_ratio:.0%}); refusing to replace them")


def cmd_record(a):
    label = f"rev{a.build}" + (f" ({a.stamp})" if a.stamp else "")
    state = {"cache_id": a.cache_id, "build": a.build, "cache": label, "count": count_pngs(a.icons)}
    with open(a.state, "w", encoding="utf-8") as f:
        json.dump(state, f)
    emit(label=label, count=state["count"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=BASE)
    ap.add_argument("--state", default=STATE)
    ap.add_argument("--ua", default="osrs-setups-viewer icon pipeline (github actions)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("--download")
    c.add_argument("--force", action="store_true")
    v = sub.add_parser("verify")
    v.add_argument("--new", required=True)
    v.add_argument("--min-ratio", type=float, default=0.95)
    r = sub.add_parser("record")
    r.add_argument("--cache-id", type=int, required=True)
    r.add_argument("--build", required=True)
    r.add_argument("--stamp", default="")
    r.add_argument("--icons", default="icons")
    a = ap.parse_args()
    {"check": cmd_check, "verify": cmd_verify, "record": cmd_record}[a.cmd](a)


if __name__ == "__main__":
    main()
