"""
admin.mixle.net urun listesinden cekilen data/mixle-admin/products.json icindeki
gorselleri data/mixle-admin/images/<id>.<ext> olarak indirir (salt okunur, GET).

  python scripts/mixle-admin-download-images.py

Var olan ve boyutu tutan dosyalari atlar; hatalari 3 kez dener. Sonuc
products.json'a localImage / imageBytes alanlari olarak yazilir ve
images/_manifest.json'a ozet cikarilir.
"""
import json, os, sys, time, hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = os.path.join(os.path.dirname(__file__), "..")
DATA = os.path.join(ROOT, "data", "mixle-admin")
SRC = os.path.join(DATA, "products.json")
IMG_DIR = os.path.join(DATA, "images")
UA = "Mozilla/5.0 (mixle-admin-image-sync)"
MAGIC = {b"\x89PNG": "png", b"\xff\xd8\xff": "jpg", b"RIFF": "webp", b"GIF8": "gif"}


def sniff_ext(head, url):
    for m, e in MAGIC.items():
        if head.startswith(m):
            return e
    return url.rsplit(".", 1)[-1].lower() if "." in url.rsplit("/", 1)[-1] else "bin"


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=60) as r:
                return r.read()
        except (HTTPError, URLError, TimeoutError, OSError) as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def job(p):
    url = p["image"]
    if not url:
        return p["id"], None, "no-image"
    # once uzanti tahmin et; icerik tipine gore duzeltilir
    guess = url.rsplit(".", 1)[-1].lower()
    for ext in (guess, "webp", "png", "jpg"):
        cand = os.path.join(IMG_DIR, f"{p['id']}.{ext}")
        if os.path.exists(cand) and os.path.getsize(cand) > 0:
            return p["id"], os.path.relpath(cand, DATA).replace("\\", "/"), "exists"
    try:
        data = fetch(url)
    except Exception as e:
        return p["id"], None, f"error: {e}"
    if not data:
        return p["id"], None, "empty"
    ext = sniff_ext(data[:4], url)
    dst = os.path.join(IMG_DIR, f"{p['id']}.{ext}")
    with open(dst, "wb") as fh:
        fh.write(data)
    return p["id"], os.path.relpath(dst, DATA).replace("\\", "/"), f"ok {len(data)}"


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    with open(SRC, encoding="utf-8") as fh:
        products = json.load(fh)
    by_id = {p["id"]: p for p in products}
    results = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = [ex.submit(job, p) for p in products]
        for n, f in enumerate(as_completed(futs), 1):
            pid, local, status = f.result()
            results[pid] = (local, status)
            if n % 50 == 0 or status.startswith("error"):
                print(f"[{n}/{len(products)}] {pid} {status}", flush=True)
    ok = err = none = 0
    for pid, (local, status) in results.items():
        p = by_id[pid]
        p["localImage"] = local or ""
        p["imageBytes"] = os.path.getsize(os.path.join(DATA, local)) if local else 0
        if status == "no-image":
            none += 1
        elif local:
            ok += 1
        else:
            err += 1
    with open(SRC, "w", encoding="utf-8") as fh:
        json.dump(products, fh, ensure_ascii=False, indent=2)
    manifest = {
        "total": len(products), "downloaded": ok, "failed": err, "noImage": none,
        "failedIds": [pid for pid, (l, s) in results.items() if s.startswith("error") or s == "empty"],
        "noImageIds": [pid for pid, (l, s) in results.items() if s == "no-image"],
    }
    with open(os.path.join(IMG_DIR, "_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
