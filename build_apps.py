#!/usr/bin/env python3
"""Refresh apps.json: every PUBLIC repo of OWNER with GitHub Pages whose live URL returns 200.
Usage: python3 build_apps.py   (needs `gh` authenticated). Order: keeps existing order in apps.json, new apps appended."""
import json, subprocess, urllib.request, os, sys
OWNER = "mrbugimposter3-ship-it"
SKIP = {"all-apps"}            # never include the launcher itself
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "apps.json")

def gh(path):
    r = subprocess.run(["gh", "api", "--paginate", path], capture_output=True, text=True)
    return r.returncode, r.stdout

def status(url):
    req = urllib.request.Request(url, headers={"User-Agent": "all-apps-builder"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, {}

NAMES = {"fx-trainer": "FX Trainer", "quranmix": "QuranMix", "Mevlanas": "Mevlanas Hifz", "my-day-coach": "My Day Coach"}
def pretty(name):
    if name in NAMES: return NAMES[name]
    if any(c.isupper() for c in name[1:]): return name   # KoranCube, SurahCube
    return " ".join(w if w.isupper() else w.capitalize() for w in name.replace("_", "-").split("-"))

code, out = gh("user/repos?per_page=100&affiliation=owner")
repos = json.loads(out.replace("][", ","))
old = {}
if os.path.exists(OUT):
    for i, a in enumerate(json.load(open(OUT))["apps"]):
        old[a["repo"]] = (i, a)
apps, skipped = [], []
for r in repos:
    n = r["name"]
    if r.get("private") or n in SKIP: skipped.append((n, "private" if r.get("private") else "launcher itself")); continue
    if not r.get("has_pages"): skipped.append((n, "no GitHub Pages site")); continue
    c, p = gh(f"repos/{OWNER}/{n}/pages")
    url = json.loads(p).get("html_url") if c == 0 else f"https://{OWNER}.github.io/{n}/"
    url = (url or f"https://{OWNER}.github.io/{n}/").replace("http://", "https://")
    st, hd = status(url)
    if st != 200: skipped.append((n, f"Pages URL returned {st}")); continue
    xfo = hd.get("x-frame-options", "")
    prev = old.get(n, (None, {}))[1]
    apps.append({
        "repo": n,
        "name": pretty(n),   # edit NAMES above to rename
        "description": (r.get("description") or "").strip(),
        "url": url,
        "icon": prev.get("icon", ""),
        "frameable": not xfo,
        "pushed_at": r.get("pushed_at"),
    })
apps.sort(key=lambda a: (old[a["repo"]][0] if a["repo"] in old else 10**6, a["repo"].lower()))
json.dump({"owner": OWNER, "apps": apps, "skipped": [{"repo": a, "reason": b} for a, b in skipped]},
          open(OUT, "w"), ensure_ascii=False, indent=1)
print(f"{len(apps)} apps -> apps.json")
for a in apps: print("  +", a["repo"], a["url"])
for a, b in skipped: print("  -", a, b)
