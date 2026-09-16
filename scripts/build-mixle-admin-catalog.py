"""
admin.mixle.net'ten cekilen data/mixle-admin/products.json + images/ →
  + src/data/catalog.seed.json (mevcut Puff kataloguna EKLENIR, uzerine yazilmaz)
  + public/images/products/aroma/<slug>.webp urun fotograflari.

  python scripts/build-mixle-admin-catalog.py            (gorselleri de donusturur)
  python scripts/build-mixle-admin-catalog.py --no-images

Kurallar (kullanici karari, 2026-09-16):
  * Varyantlar cekilmedi; her urun tek boy (adindaki "10ml" varsa o, yoksa "Tek boy").
  * Dolar fiyatlar rakam olarak TL yazilir (1,80 $ -> 1,80 TL). 0,00 olanlar taslak.
  * "Santa" markasi magazanin kendi markasi -> "Mixle". Ureticiler (Capella, TFA,
    Inawera, Solub, Flavour Art, Flavor West) aynen kalir.
  * Admin'de Kapali olanlar taslak, "test" kaydi atlanir.
"""
import datetime
import importlib.util
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data", "mixle-admin")
SRC = os.path.join(DATA, "products.json")
OUT = os.path.join(ROOT, "src", "data", "catalog.seed.json")
IMG_OUT = os.path.join(ROOT, "public", "images", "products", "aroma")
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

# slugify / convert_image / profiles_for / taste_for / note_profile puff betiginden
_spec = importlib.util.spec_from_file_location("puff", os.path.join(ROOT, "scripts", "build-puff-catalog.py"))
puff = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(puff)

# admin kategori adi -> vitrin kategorisi
CATEGORIES = {
    "Mix Aromalar": dict(id="mix-aromalar", name="Mix Aromalar", icon="mix.png", accent="purple", order=1,
                         tagline="Ünlü likitlerin aroma versiyonları",
                         description="Dünyaca bilinen likit serilerinin konsantre aroma versiyonları ve Mixle'ın kendi karışımları. Nbase ile karıştırılarak kullanılır."),
    "TFA / TPA": dict(id="tfa-tpa", name="TFA / TPA", icon="meyveli.png", accent="fresh", order=2,
                      tagline="The Flavor Apprentice tekil aromalar",
                      description="TFA / TPA (The Flavor Apprentice) tekil konsantre aromalar. Kendi tarifini kuranlar için geniş meyve, tatlı ve tütün yelpazesi."),
    "Capella": dict(id="capella", name="Capella", icon="tatli-kremsi.png", accent="gold", order=3,
                    tagline="Capella Flavors tekil aromalar",
                    description="Capella Flavors'ın kremsi, tatlı ve meyveli konsantre aromaları. 10ml orijinal şişe."),
    "Flavour Art": dict(id="flavour-art", name="Flavour Art", icon="meyveli.png", accent="fresh", order=4,
                        tagline="FlavourArt İtalya tekil aromalar",
                        description="FlavourArt'ın İtalyan üretimi, yoğun ve net karakterli konsantre aromaları. 10ml orijinal şişe."),
    "inawera": dict(id="inawera", name="Inawera", icon="tutun.png", accent="dark", order=5,
                    tagline="Inawera Polonya tekil aromalar",
                    description="Inawera'nın tütün, shisha ve meyve ağırlıklı konsantre aromaları. 10ml orijinal şişe."),
    "SOLUB AROME": dict(id="solub-arome", name="Solub Arome", icon="tatli-kremsi.png", accent="gold", order=6,
                        tagline="Solubarome Fransa tekil aromalar",
                        description="Solubarome'un Fransız üretimi tatlı, tütün ve meyve konsantre aromaları. 10ml orijinal şişe."),
    "Flavor West": dict(id="flavor-west", name="Flavor West", icon="icecek.png", accent="purple", order=7,
                        tagline="Flavor West ABD tekil aromalar",
                        description="Flavor West'in tatlı, pasta ve içecek karakterli konsantre aromaları. 10ml orijinal şişe."),
    "Nbase": dict(id="nbase", name="Nbase", icon="nbase.png", accent="dark", order=8,
                  tagline="Aromanı karıştıracağın baz",
                  description="Farklı üreticilerden VG/PG bazlar. Aromalarla karıştırılarak kullanılır."),
}
CATEGORY_FALLBACK = "Mix Aromalar"   # 'Kategori Seç' (Özel Sipariş) buraya
SKIP_IDS = {"cmril60ul00mpns0jwjvxc2be"}  # admin'deki 'test' kaydi

BRAND_RULES = [
    (re.compile(r"\bSanta\b", re.I), "Mixle"),
]
SMALL = {"and", "the", "in", "of", "de", "la", "le", "du", "des", "au", "aux", "&"}


def brand(s):
    for rx, rep in BRAND_RULES:
        s = rx.sub(rep, s)
    return s


def nice_case(s):
    # Inawera'daki TAMAMEN BUYUK adlari basliga cevir; digerlerine dokunma
    if not s.isupper() or not re.search(r"[A-ZÇĞİÖŞÜ]{3}", s):
        return s
    words = []
    for i, w in enumerate(re.split(r"(\s+)", s)):
        if not w.strip():
            words.append(w)
            continue
        lw = w.replace("İ", "i").lower()  # Ingilizce adlar: I -> i
        words.append(lw if (i and lw in SMALL) else lw[:1].upper() + lw[1:])
    return "".join(words)


def parse_price(s):
    m = re.search(r"[\d.]+,\d+|\d+", s.replace(".", ""))
    if not m:
        return 0.0
    return float(m.group(0).replace(",", "."))


def volume_label(name):
    m = re.search(r"(\d+)\s*ml", name, re.I)
    return f"{m.group(1)}ml" if m else "Tek boy"


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    do_images = "--no-images" not in sys.argv
    if do_images:
        os.makedirs(IMG_OUT, exist_ok=True)

    products, used_slugs = [], set()
    subcats = {c["id"]: [] for c in CATEGORIES.values()}
    skipped, drafts_zero, drafts_closed, renamed = [], 0, 0, 0
    for p in data:
        if p["id"] in SKIP_IDS:
            skipped.append(p["name"])
            continue
        cat_key = p["category"] if p["category"] in CATEGORIES else CATEGORY_FALLBACK
        cat = CATEGORIES[cat_key]
        series = p["brand"] if p["brand"] != "Marka Seç" else "Özel Sipariş"
        series = brand(series)
        name = nice_case(p["name"].strip())
        new_name = brand(name)
        if new_name != name:
            renamed += 1
        name = new_name
        if series not in subcats[cat["id"]]:
            subcats[cat["id"]].append(series)

        slug = puff.slugify(name) or puff.slugify(p["model"]) or p["id"]
        if slug in used_slugs:
            slug = puff.slugify(f"{name} {p['model']}")
        if slug in used_slugs:
            slug = f"{slug}-{p['id'][-6:]}"
        used_slugs.add(slug)

        price = parse_price(p["price"])
        stock = min(int(re.sub(r"\D", "", p["stock"]) or 0), 9999)  # admin'deki 336.000.000 gibi yer tutuculari sinirla
        status = "yayında"
        if p["status"] != "Açık":
            status, drafts_closed = "taslak", drafts_closed + 1
        elif price <= 0:
            status, drafts_zero = "taslak", drafts_zero + 1

        images = []
        if p.get("localImage"):
            fname = f"{slug}.webp"
            if do_images:
                puff.convert_image(os.path.join(DATA, p["localImage"]), os.path.join(IMG_OUT, fname))
            images.append({"id": f"img-{slug}-0", "src": f"/images/products/aroma/{fname}", "alt": f"{name} ürün görseli"})
        primary_img = images[0]["src"] if images else None

        label = volume_label(name)
        vid = "hacim-" + puff.slugify(label)
        options = [{"id": "opt-hacim", "name": "Hacim", "order": 0, "values": [{"id": vid, "label": label}]}]
        variants = [{
            "id": f"{slug}--{puff.slugify(label)}",
            "comboKey": f"opt-hacim:{vid}",
            "optionValues": {"opt-hacim": vid},
            "sku": p["model"] or slug,
            "price": price,
            "compareAtPrice": None,
            "stock": stock,
            "barcode": None,
            "image": primary_img,
            "isDefault": True,
            "isActive": True,
        }]

        profiles = puff.profiles_for(name)
        short = f"{name} — {series} {cat['name'].lower() if cat['id'] != 'nbase' else 'baz'}" + (
            f", {label}." if label != "Tek boy" else ".")
        faq = [{"question": "Hangi hacimlerde satılıyor?", "answer": f"Seçenek: {label}."}]

        products.append({
            "id": slug, "slug": slug, "name": name, "series": series,
            "shortDescription": short, "description": short,
            "subcategory": series, "categoryIds": [cat["id"]], "collectionIds": [], "tags": [],
            "images": images, "status": status,
            "seo": {"title": name, "description": short},
            "flavorNotes": [], "flavorProfiles": profiles, "badges": [],
            "featured": False, "bestSeller": False, "newArrival": True,
            "taste": puff.taste_for(profiles),
            "form": "konsantre" if cat["id"] != "nbase" else "baz",
            "usageRate": "", "steepTime": "", "origin": "", "faq": faq,
            "options": options, "variants": variants,
            "createdAt": NOW, "updatedAt": NOW,
        })

    categories = []
    for key, c in CATEGORIES.items():
        first_img = next((x["images"][0]["src"] for x in products if x["categoryIds"][0] == c["id"] and x["images"]), "")
        categories.append({
            "id": c["id"], "slug": c["id"], "name": c["name"], "tagline": c["tagline"],
            "description": c["description"], "cover": first_img, "icon": f"/images/icons/{c['icon']}",
            "subcategories": sorted(subcats[c["id"]], key=puff.tr_lower), "accent": c["accent"], "order": c["order"],
        })

    # mevcut seed ile birlestir: bu betigin daha once yazdigi kategori/urunleri degistir, digerlerini koru
    seed = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {
        "schemaVersion": 1, "updatedAt": NOW, "categories": [], "collections": [], "products": []}
    mine = {c["id"] for c in categories}
    kept_cats = [c for c in seed["categories"] if c["id"] not in mine]
    kept_prods = [p for p in seed["products"] if not (set(p["categoryIds"]) & mine)]
    seed["updatedAt"] = NOW
    seed["categories"] = kept_cats + categories
    seed["products"] = kept_prods + products
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(seed, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"Yazildi: {OUT}")
    print(f"  korunan urun (Puff vb.): {len(kept_prods)}, eklenen: {len(products)}, toplam: {len(seed['products'])}")
    print(f"  kategoriler: {[c['name'] + ' (' + str(sum(1 for p in products if p['categoryIds'][0] == c['id'])) + ')' for c in categories]}")
    print(f"  taslak: kapali {drafts_closed} + fiyat 0 {drafts_zero}; Santa->Mixle ad degisikligi: {renamed}")
    print(f"  atlanan: {skipped}; gorselsiz: {sum(1 for p in products if not p['images'])}")


if __name__ == "__main__":
    main()
