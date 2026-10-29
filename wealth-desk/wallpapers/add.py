"""Add images to the Wealth Desk wallpaper rotation.

Usage:
  python add.py IMAGE [IMAGE ...] [--name "desert tree"] [--tone dark|light] [--source "Unsplash / Jane Doe"] [--url PAGE_URL]

For each image it writes wp_N.json (one row: name, tone, width, height, src as a small JPEG data URL, about 30-80 KB)
and appends {id, name, tone, added, source, url} to index.json. Tone is guessed from brightness unless given.
Then, as the RUNBOOK says: upload each wp_N.json and index.json to the dashboard as assets, write datasets/wp_N
(kind file, fixed) and update datasets/wallpapers to the new index.json url.
"""
import argparse
import base64
import datetime
import io
import json
import os
import re

from PIL import Image, ImageOps, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))


def encode(path, width=600, max_bytes=80_000):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    q = 72
    while True:
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
        if buf.tell() <= max_bytes or q <= 40:
            break
        q -= 6
    tone = "light" if ImageStat.Stat(im.convert("L")).mean[0] > 120 else "dark"
    return im, "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode(), tone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--name")
    ap.add_argument("--tone", choices=["dark", "light"])
    ap.add_argument("--source", default="Dev")
    ap.add_argument("--url", default="")
    a = ap.parse_args()
    index_path = os.path.join(HERE, "index.json")
    index = json.load(open(index_path))
    nums = [int(re.sub(r"\D", "", w["id"])) for w in index]
    n = max(nums, default=0)
    for path in a.images:
        n += 1
        im, src, tone = encode(path)
        name = a.name or os.path.splitext(os.path.basename(path))[0].replace("-", " ").replace("_", " ")
        tone = a.tone or tone
        wid = f"wp_{n}"
        json.dump([{"name": name, "tone": tone, "width": im.width, "height": im.height, "src": src}], open(os.path.join(HERE, wid + ".json"), "w"))
        index.append({"id": wid, "name": name, "tone": tone, "added": datetime.date.today().isoformat(), "source": a.source, "url": a.url})
        print(f"{wid}: {name} ({tone}), {len(src) // 1024} KB")
    json.dump(index, open(index_path, "w"), indent=1)
    print(f"index.json now lists {len(index)} wallpapers")


if __name__ == "__main__":
    main()
