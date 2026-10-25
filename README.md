<div align="center">

<h1><a href="https://skillossus.github.io/rstools">Open the OSRS Setup Viewer &rarr;</a></h1>

<p><b>skillossus.github.io/rstools</b></p>

<p>Move your RuneLite <b>Inventory Setups</b> to your phone or tablet.<br>
Paste or drop your export, tap <b>Copy</b>, paste into the game.</p>

<p><b>Private</b>: everything runs in your browser. Nothing is uploaded.<br>
<b>Free and open source.</b></p>

<h3><a href="https://skillossus.github.io/rstools">Use it now</a> &nbsp;|&nbsp; <a href="https://youtu.be/xYnjzy-O7v4?si=tkwmiFZgMFf6qWEe">Watch the demo (YouTube)</a> &nbsp;|&nbsp; <a href="https://github.com/Skillossus/rstools/issues">Report a problem</a> &nbsp;|&nbsp; <a href="https://github.com/Skillossus/rstools/releases">Download the offline version</a></h3>

</div>

---

## Why it exists

I got a new tablet, and moving my setups over from my computer was a struggle. The mobile client can't read the Inventory Setups format. The only route was converting each setup with the converter on the OSRS Wiki, one at a time. This tool does that conversion for you: paste or drop your export, find a setup, tap Copy, and paste it into the game.

## Your data stays on your device

Everything runs inside your browser. Your setups are never uploaded, sent, or stored: no accounts, no tracking, no cookies, nothing saved between visits. Pasting, dropping a file, searching, converting and copying all happen locally.

One detail: the hosted page loads item icons (and an item-name list) from the same site, so the host can see which of those files were requested, but never your export, setup names or notes. For zero network activity, download the **self-contained release** (a single HTML file with every icon built in) from the [Releases](https://github.com/Skillossus/rstools/releases) page and open it offline.

## What it does

- Reads a full Inventory Setups export. Paste it, or drag and drop one or more files.
- Shows each setup with its inventory, equipment (laid out as in-game, with quiver ammo beside the head slot), rune pouch, extra items and notes.
- Shows the spellbook as a coloured badge: Standard grey, Ancient red, Lunar blue, Arceuus purple.
- Gives hover names for items. Tap an item on a touch screen to see its name.
- Generates the bank tag import string, with a **Copy** button in each setup's header and again at the bottom.
- Shows each setup's bank tag layout.
- Also reads official bank tag strings and RuneLite bank tag exports, so you can view them and convert between formats.
- Searches by setup name. Setups only render when you open them, so big exports stay fast.
- Shows an example if you press Load with nothing pasted.

## How to use it

1. In RuneLite, export your setups from Inventory Setups.
2. Open the viewer on your tablet or phone and paste or drop the export.
3. Open a setup, tap **Copy**, and paste it into the game's bank tag import.

Good to know:

- The official client allows 20 bank tags, and the import string holds item positions only, so you name each tab yourself.
- A setup with no layout in its export, or with items beyond the 8x10 tab grid, gets no import string. The viewer says so.
- An official bank tag string carries no names or inventory/equipment split, so it shows as a bank layout grid called "Bank tag 1", "Bank tag 2" and so on.

## Supported input

| Paste | Result |
| --- | --- |
| Inventory Setups JSON (full export, or a single setup) | Inventory, equipment, spellbook, bank tag string |
| RuneLite bank tag export (`banktags,1,name,icon,layout,...`) | Layout grid, converted to the official string |
| Official client string (`1,N,id,col,row,...`) | Layout grid, copyable string |

## How the icons stay current

Item icons are rendered from the OSRS game cache by a GitHub Action (`.github/workflows/update-icons.yml`):

1. Several times a day it asks the [OpenRS2 archive](https://archive.openrs2.org) whether a newer OSRS cache exists, which costs one request when nothing changed.
2. On a new cache it renders every item icon and builds an id-to-name map, using the item-icons tool from [RuneProfile](https://github.com/ReinhardtR/runeprofile).
3. It refuses to replace the existing icons if the render looks broken (none, or far fewer than before).
4. It commits the icons, records the cache version in `icons/version.json`, and attaches the self-contained single-file build to a release.

Items released after the last refresh show their ID instead of an icon until the next run.

## Repository layout

| Path | What it is |
| --- | --- |
| `index.html`, `style.css`, `app.js`, `example.js` | The viewer: no build step, no dependencies |
| `docs/demo.mp4` | The demo video linked from this README |
| `icons/` | `<id>.png` icons, `names.json`, `version.json` (written by the workflow) |
| `scripts/check_cache.py` | OpenRS2 cache check, render sanity check, version record |
| `scripts/build_release.py` | Inlines CSS, JS, example, icons and names into one HTML file |
| `tools/DumpItemNames.java` | Writes the item id-to-name map from the cache |
| `.github/workflows/update-icons.yml` | The nightly icon pipeline |

## Running it locally

Open `index.html` through a local web server so the icon folder loads:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`. (Opening the file directly can fail to load icons in sandboxed browsers. The self-contained release has no such limit.)

To build the single-file version yourself:

```
python3 scripts/build_release.py . icons setups-viewer.html
```

## Reporting a problem

Open an [issue](https://github.com/Skillossus/rstools/issues). Please don't paste your whole export. A single setup, or just the part that looks wrong, is enough.

## Credits

- Item icons are rendered with the item-icons tool from [RuneProfile](https://github.com/ReinhardtR/runeprofile), from the cache archived by [OpenRS2](https://archive.openrs2.org).
- Bank tag string formats are documented on the [OSRS Wiki](https://oldschool.runescape.wiki/w/Bank_tags).
- Built to work with the [Inventory Setups](https://github.com/dillydill123/inventory-setups) RuneLite plugin.

Old School RuneScape and its item icons are the property of Jagex Ltd. This project is not affiliated with or endorsed by Jagex.
