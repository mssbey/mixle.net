"""falconkimya.com "Puff Aromalar" kategorisini herkese acik WooCommerce Store
API'sinden (wp-json/wc/store/v1) ceker: urunler, varyantlar (fiyat/stok/gorsel),
alt kategoriler. Ham dokum data/falcon/puff-aromalar.raw.json'a yazilir.

Zincir:
  python scripts/falcon-puff-scrape.py       # ham dokum
  python scripts/falcon-puff-normalize.py    # temiz JSON/CSV + gorsel indirme
  python scripts/build-puff-catalog.py       # site katalogu + webp
  npm run db:migrate-catalog -- --file=src/data/catalog.puff.json
"""
import json, sys, time, urllib.request, urllib.parse, html, re, os
sys.stdout.reconfigure(encoding='utf-8')
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
BASE = "https://falconkimya.com/wp-json/wc/store/v1"
def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8")), dict(r.headers)
        except Exception as e:
            print("retry", i, url, e); time.sleep(2 + i * 2)
    raise SystemExit("failed " + url)

cats, _ = get(f"{BASE}/products/categories?per_page=100")
byid = {c["id"]: c for c in cats}
PUFF = 695
puff_cats = [c for c in cats if c["id"] == PUFF or c.get("parent") == PUFF]

products = []
page = 1
while True:
    data, hdr = get(f"{BASE}/products?category={PUFF}&per_page=100&page={page}")
    products += data
    total_pages = int(hdr.get("x-wp-totalpages") or hdr.get("X-WP-TotalPages") or 1)
    print(f"page {page}/{total_pages}: {len(data)} products")
    if page >= total_pages: break
    page += 1

for i, p in enumerate(products, 1):
    if p["type"] == "variable":
        vs, _ = get(f"{BASE}/products?type=variation&parent={p['id']}&per_page=100")
        p["variation_details"] = sorted(vs, key=lambda v: int(v["prices"]["price"]))
    else:
        p["variation_details"] = []
    print(f"{i}/{len(products)} {html.unescape(p['name'])} -> {len(p['variation_details'])} var")
    time.sleep(0.3)

out = {"scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"), "source": "https://falconkimya.com/puff-aromalar/",
       "categories": puff_cats, "products": products}
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "falcon", "puff-aromalar.raw.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("saved", len(products), "products")
