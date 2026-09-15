"""falconkimya.com "Puff Aromalar" kategorisinin ham Store API dokumunu
(data/falcon/puff-aromalar.raw.json) temiz bir veri setine cevirir:

  data/falcon/puff-aromalar.json  -> urun/varyant/fiyat/gorsel (yapisal)
  data/falcon/puff-aromalar.csv   -> her varyant bir satir (inceleme icin)
  data/falcon/images/<slug>.<ext> -> orijinal urun gorselleri (indirilir)

Kullanim: python scripts/falcon-puff-normalize.py [--no-images]
"""
import csv, html, json, os, re, sys, time, urllib.request

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "falcon", "puff-aromalar.raw.json")
OUT_JSON = os.path.join(ROOT, "data", "falcon", "puff-aromalar.json")
OUT_CSV = os.path.join(ROOT, "data", "falcon", "puff-aromalar.csv")
IMG_DIR = os.path.join(ROOT, "data", "falcon", "images")
CSV_EXPORT = os.path.join(ROOT, "wc-product-export-5-9-2026-1788593698668.csv")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"

def text(h: str) -> str:
    h = re.sub(r"<br\s*/?>", "\n", h or "", flags=re.I)
    h = re.sub(r"</(p|li|h\d|div|ul)>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h)
    h = re.sub(r"[ \t\xa0]+", " ", h)
    return re.sub(r"\n\s*\n+", "\n", h).strip()

def minor_to_tl(s): return int(s) / 100

# Varyant aciklamalari Store API'de yok; 5 Eylul export CSV'sinden alinir.
var_desc = {}
if os.path.exists(CSV_EXPORT):
    for r in csv.DictReader(open(CSV_EXPORT, encoding="utf-8-sig")):
        if r["Tür"].startswith("variation") and r["Açıklama"]:
            var_desc[int(r["Kimlik"])] = r["Açıklama"].strip()

raw = json.load(open(RAW, encoding="utf-8"))
cats = {c["id"]: c for c in raw["categories"]}
parent = cats[695]

products = []
for p in raw["products"]:
    sub = next((c for c in p["categories"] if c["id"] != 695), None)
    name = html.unescape(p["name"]).replace("–", "-").strip()
    name = re.sub(r"\s+", " ", name)
    # "Tat - Seri" / "Seri - Tat" ayrimi: seri adi kategoriden gelir
    subname = html.unescape(sub["name"]) if sub else parent["name"]
    variants = []
    for v in p["variation_details"]:
        # Liste ucunda `attributes` bos gelir; "HACİM: 30 ML" biçimindeki
        # `variation` metni tek kaynaktır (birden fazla nitelik virgülle ayrılır).
        attrs = {}
        for part in html.unescape(v["variation"]).split(", "):
            k, _, val = part.partition(": ")
            attrs[k.strip()] = val.strip()
        variants.append({
            "id": v["id"],
            "label": " / ".join(attrs.values()),
            "attributes": attrs,
            "price": minor_to_tl(v["prices"]["price"]),
            "regularPrice": minor_to_tl(v["prices"]["regular_price"]),
            "salePrice": minor_to_tl(v["prices"]["sale_price"]),
            "onSale": v["on_sale"],
            "inStock": v["is_in_stock"],
            "sku": v["sku"],
            "image": v["images"][0]["src"] if v["images"] else None,
            "description": var_desc.get(v["id"], ""),
        })
    products.append({
        "wcId": p["id"],
        "slug": p["slug"],
        "name": name,
        "permalink": p["permalink"],
        "type": p["type"],
        "category": parent["name"],
        "categorySlug": parent["slug"],
        "subcategory": subname,
        "subcategorySlug": sub["slug"] if sub else None,
        "shortDescriptionHtml": p["short_description"],
        "shortDescription": text(p["short_description"]),
        "descriptionHtml": p["description"],
        "description": text(p["description"]),
        "price": minor_to_tl(p["prices"]["price"]),
        "regularPrice": minor_to_tl(p["prices"]["regular_price"]),
        "salePrice": minor_to_tl(p["prices"]["sale_price"]),
        "priceMin": minor_to_tl(p["prices"]["price_range"]["min_amount"]) if p["prices"].get("price_range") else minor_to_tl(p["prices"]["price"]),
        "priceMax": minor_to_tl(p["prices"]["price_range"]["max_amount"]) if p["prices"].get("price_range") else minor_to_tl(p["prices"]["price"]),
        "onSale": p["on_sale"],
        "inStock": p["is_in_stock"],
        "sku": p["sku"],
        "tags": [html.unescape(t["name"]) for t in p["tags"]],
        "images": [{"id": i["id"], "src": i["src"], "name": i["name"], "alt": i["alt"]} for i in p["images"]],
        "attributes": [{"name": html.unescape(a["name"]), "taxonomy": a["taxonomy"],
                        "values": [html.unescape(t["name"]) for t in a["terms"]]} for a in p["attributes"]],
        "variants": variants,
        "localImages": [],
    })

# Gorselleri indir (aynisi tekrar indirilmez; --no-images ile sadece yol yazilir)
os.makedirs(IMG_DIR, exist_ok=True)
for p in products:
    for n, img in enumerate(p["images"]):
        ext = os.path.splitext(img["src"].split("?")[0])[1].lower() or ".jpg"
        fname = f"{p['slug']}{'' if n == 0 else '-' + str(n + 1)}{ext}"
        dst = os.path.join(IMG_DIR, fname)
        if "--no-images" not in sys.argv and not os.path.exists(dst):
            for attempt in range(3):
                try:
                    req = urllib.request.Request(img["src"], headers={"User-Agent": UA})
                    with urllib.request.urlopen(req, timeout=60) as r, open(dst, "wb") as f:
                        f.write(r.read())
                    break
                except Exception as e:
                    print("  tekrar", attempt, img["src"], e); time.sleep(2)
            time.sleep(0.15)
        p["localImages"].append(f"data/falcon/images/{fname}")

out = {
    "source": raw["source"], "scrapedAt": raw["scraped_at"],
    "category": {"id": parent["id"], "slug": parent["slug"], "name": parent["name"],
                 "description": text(parent["description"]), "image": (parent.get("image") or {}).get("src")},
    "subcategories": [{"id": c["id"], "slug": c["slug"], "name": html.unescape(c["name"]), "count": c["count"],
                       "description": text(c["description"]), "image": (c.get("image") or {}).get("src")}
                      for c in raw["categories"] if c["id"] != 695],
    "products": products,
}
json.dump(out, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["Alt kategori", "Ürün", "Tür", "Varyant", "Fiyat (TL)", "Normal fiyat", "İndirimli", "Stokta", "WC ürün id", "WC varyant id", "Görsel", "Sayfa"])
    for p in products:
        if p["variants"]:
            for v in p["variants"]:
                w.writerow([p["subcategory"], p["name"], "variable", v["label"], v["price"], v["regularPrice"],
                            v["salePrice"] if v["onSale"] else "", "evet" if v["inStock"] else "hayır",
                            p["wcId"], v["id"], p["images"][0]["src"] if p["images"] else "", p["permalink"]])
        else:
            w.writerow([p["subcategory"], p["name"], "simple", "-", p["price"], p["regularPrice"],
                        p["salePrice"] if p["onSale"] else "", "evet" if p["inStock"] else "hayır",
                        p["wcId"], "", p["images"][0]["src"] if p["images"] else "", p["permalink"]])

nv = sum(len(p["variants"]) for p in products)
print(f"\n{len(products)} ürün, {nv} varyant -> {OUT_JSON}")
