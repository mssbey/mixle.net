"""data/falcon/puff-aromalar.json (falconkimya.com Puff Aromalar dökümü) ->
src/data/catalog.puff.json (site katalog şeması, TL fiyatlı "legacy" biçim)
+ public/images/products/puff/<slug>.webp ürün fotoğrafları.

Marka: "Falcon Puff" serisi "Mixle Puff" olarak, Falcon Kimya/Falcon Aroma
ibareleri "Mixle" olarak yazılır. Diğer seriler (Drifter, IVG, Vampire Vape,
Dinner Lady, Riot) üçüncü taraf ürün markalarıdır, aynen kalır.

Kullanım:
  python scripts/build-puff-catalog.py            # JSON + görseller
  python scripts/build-puff-catalog.py --no-images
Ardından:
  npm run db:migrate-catalog -- --file=src/data/catalog.puff.json
"""
import datetime
import json
import os
import re
import sys

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC = os.path.join(ROOT, "data", "falcon", "puff-aromalar.json")
OUT = os.path.join(ROOT, "src", "data", "catalog.puff.json")
IMG_OUT = os.path.join(ROOT, "public", "images", "products", "puff")
IMG_SIZE = 1000
NOW = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")

CATEGORY_ID = "puff-aromalar"
SUBCAT_RENAME = {"Falcon Puff Aroma": "Mixle Puff Aroma"}
SUBCAT_CODE = {
    "Drifter Bar Aroma": "DRF",
    "Riot Bar Edtn": "RIOT",
    "Dinner Lady Fruit Full Puff Aroma": "DL",
    "IVG Salt": "IVG",
    "Mixle Puff Aroma": "MXP",
    "Vampire Vape Bar Salts": "VVB",
}
BRAND_RULES = [
    (re.compile(r"Falcon Puff", re.I), "Mixle Puff"),
    (re.compile(r"Üretici Firma:\s*Falcon Aroma", re.I), "Üretici Firma: Mixle"),
    (re.compile(r"Falcon\s*(Kimya|Aroma)", re.I), "Mixle"),
    (re.compile(r"falconkimya", re.I), "mixle"),
    (re.compile(r"\bFalcon\b", re.I), "Mixle"),
]
EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF️]")

TR = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def tr_lower(s):
    # Python'da "İ".lower() birleşik nokta üretir; karşılaştırma öncesi sadeleştir.
    return s.replace("İ", "i").replace("I", "ı").lower()


def slugify(s):
    s = s.translate(TR).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def brand(s):
    for rx, rep in BRAND_RULES:
        s = rx.sub(rep, s)
    return s


def clean_description(text, flavor):
    lines = [EMOJI.sub("", l).strip() for l in brand(text).split("\n")]
    lines = [re.sub(r"\s+", " ", l) for l in lines if l]
    # başlık satırı (nokta ile bitmeyen, kısa, tat adını içeren ilk satır)
    if (
        lines
        and len(lines[0]) < 90
        and not lines[0].endswith((".", "!", "?"))
        and tr_lower(flavor)[:8] in tr_lower(lines[0])
    ):
        lines = lines[1:]
    # görsele/tabloya atıf yapan kapanış satırları
    lines = [l for l in lines if not re.search(r"aşağıdaki (gibidir|görsel)|göz atabilirsiniz", l, re.I)]
    # satır ortasında kırılmış cümleleri birleştir
    paras, cur = [], ""
    for l in lines:
        cur = (cur + " " + l).strip() if cur else l
        if cur.endswith((".", "!", "?", ":")):
            paras.append(cur)
            cur = ""
    if cur:
        paras.append(cur)
    return "\n".join(paras)


def first_sentences(text, limit=180):
    flat = text.replace("\n", " ")
    out = ""
    for sent in re.split(r"(?<=[.!?])\s+", flat):
        if not sent:
            continue
        if out and len(out) + len(sent) + 1 > limit:
            break
        out = (out + " " + sent).strip()
        if len(out) >= 90:
            break
    return out or flat[:limit]


def parse_specs(short):
    specs = {"usage": "", "steep": "", "origin": "", "vgpg": "", "ingredients": [], "note": ""}
    for raw in brand(short).split("\n"):
        l = raw.strip()
        low = tr_lower(l)
        if not l:
            continue
        val = l.split(":", 1)[1].strip() if ":" in l else ""
        if "kullanım oranı" in low or "kullanim orani" in low:
            specs["usage"] = val
        elif "demlenme süresi" in low or "demlenme suresi" in low:
            steep = re.sub(r"^bu aromanın demlenme süresi\s*", "", val, flags=re.I)
            steep = re.sub(r"\s*aralığındadır\.?$", "", steep, flags=re.I)
            steep = re.sub(r"haftadır", "hafta", steep, flags=re.I)
            steep = re.sub(r"Gün", "gün", steep)
            specs["steep"] = steep.strip()
        elif low.startswith("menşei"):
            specs["origin"] = val
        elif low.startswith("üretici firma"):
            specs["origin"] = f"{val} üretimi"
        elif "vg/pg" in low or "vg –" in low or "vg -" in low:
            specs["vgpg"] = l
        elif low.startswith("ürün içeriği") and "ml" not in low:
            # Kaynakta sansürlenmiş "T****" = tütün
            specs["ingredients"] = [
                re.sub(r"^T\*+$", "Tütün", x.strip(" .")) for x in re.split(r"\s[–-]\s", val) if x.strip()
            ]
        elif "orijinal şişe" in low:
            specs["note"] = l
    return specs


FRESH = re.compile(r"\b(ice|iced|buz|frost|mentol|menthol|mint|nane|cool|chill|fresh|sub ?zero)\b", re.I)
MENTHOL = re.compile(r"mentol|menthol|mint|nane", re.I)
SWEET = re.compile(
    r"cream|custard|donut|cheesecake|waffle|pie|tart|vanil|caramel|karamel|krem|cotton candy|pamuk|bubblegum|sakız|candy|şeker|dessert|milk|süt|çikolata|chocolate|biscuit",
    re.I,
)
CREAMY = re.compile(r"cream|custard|cheesecake|vanil|krem|milk|süt|latte|ice cream|dondurma", re.I)
DRINK = re.compile(r"cola|kola|lemonade|limonata|energy|enerji|coffee|kahve|tea|çay|mojito|soda|gazoz|red rush|punch", re.I)
TOBACCO = re.compile(r"tobac|tütün|cigar", re.I)
SOUR = re.compile(r"sour|ekşi|lemon|lime|limon|razz|raspberry|ahududu|blackcurrant|frenk", re.I)
FRUIT = re.compile(
    r"melon|kavun|karpuz|watermelon|mango|pineapple|ananas|guava|peach|şeftali|apple|elma|berry|çilek|strawberry|kiwi|grape|üzüm|cherry|kiraz|banana|muz|lychee|coconut|hindistan|papaya|dragonfruit|passion|çarkıfelek|starfruit|kiwano|pomegranate|nar|orange|portakal|fruit|meyve|blue",
    re.I,
)


def profiles_for(text):
    p = []
    if TOBACCO.search(text):
        p.append("tutun")
    if FRUIT.search(text):
        p.append("meyveli")
    if FRESH.search(text):
        p.append("ferah")
    if MENTHOL.search(text):
        p.append("mentollu")
    if SWEET.search(text):
        p.append("tatli")
    if CREAMY.search(text):
        p.append("kremsi")
    if DRINK.search(text):
        p.append("icecek")
    if SOUR.search(text):
        p.append("eksi")
    return p or ["meyveli"]


def note_profile(label):
    pr = profiles_for(label)
    for want in ("tutun", "icecek", "kremsi", "mentollu", "ferah", "eksi", "tatli", "meyveli"):
        if want in pr:
            return want
    return "meyveli"


def taste_for(prof):
    return {
        "sweetness": 7 if "tatli" in prof else 5,
        "freshness": 8 if "ferah" in prof or "mentollu" in prof else 3,
        "intensity": 7,
        "sourness": 6 if "eksi" in prof else 2,
        "creaminess": 7 if "kremsi" in prof else 1,
    }


def norm_volume(label):
    l = label.strip()
    m = re.match(
        r"^(\d+(?:[.,]\d+)?)\s*ML\s*DIY-?KIT(?:\s*AROMA)?\s*\((\d+(?:[.,]\d+)?)\s*ML\s*Aroma\)$", l, re.I
    )
    if m:
        return f"{m.group(1)}ml DIY Kit ({m.group(2)}ml aroma)"
    m = re.match(r"^(\d+(?:[.,]\d+)?)\s*ML$", l, re.I)
    if m:
        return f"{m.group(1)}ml"
    return l


def vol_sort_key(label):
    m = re.match(r"(\d+(?:[.,]\d+)?)", label)
    return (float(m.group(1).replace(",", ".")) if m else 999, "diy" in label.lower())


def vol_code(label):
    m = re.match(r"(\d+(?:[.,]\d+)?)", label)
    base = m.group(1).replace(".", "").replace(",", "") if m else "X"
    return base + ("K" if "diy" in label.lower() else "")


def convert_image(src, dst):
    if os.path.exists(dst):
        return
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    side = max(w, h)
    if w != h:
        canvas = Image.new("RGB", (side, side), (255, 255, 255))
        canvas.paste(im, ((side - w) // 2, (side - h) // 2))
        im = canvas
    if side > IMG_SIZE:
        im = im.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    im.save(dst, "WEBP", quality=82, method=6)


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    do_images = "--no-images" not in sys.argv
    if do_images:
        os.makedirs(IMG_OUT, exist_ok=True)

    subcats = [SUBCAT_RENAME.get(s["name"], s["name"]) for s in data["subcategories"]]
    products, counters = [], {}
    for p in data["products"]:
        sub = SUBCAT_RENAME.get(p["subcategory"], p["subcategory"])
        name = brand(p["name"]).replace("Tobac..", "Tobacco")
        parts = [x.strip() for x in name.split(" - ")]
        flavor = parts[1] if len(parts) > 1 and tr_lower(parts[0]) in tr_lower(sub) else parts[0]
        flavor = re.sub(r"\s*\d+\s*ml\s*orijinal.*$", "", flavor, flags=re.I).strip()
        slug = slugify(name)
        code = SUBCAT_CODE[sub]
        counters[code] = counters.get(code, 0) + 1
        seq = counters[code]

        specs = parse_specs(p["shortDescription"])
        description = clean_description(p["description"], flavor)
        short = first_sentences(description) if description else f"{flavor} — {sub}."
        ingredients = specs["ingredients"] or [
            x.strip() for x in re.split(r"\s(?:&|and)\s|,", flavor) if x.strip()
        ]
        prof_text = " ".join([name] + ingredients)
        profiles = profiles_for(prof_text)
        seen = set()
        flavor_notes = []
        for ing in ingredients:
            lab = ing.strip().title()
            if lab.lower() in seen or not lab:
                continue
            seen.add(lab.lower())
            flavor_notes.append({"label": lab, "profile": note_profile(lab)})

        # görseller
        images = []
        for n, local in enumerate(p["localImages"]):
            fname = f"{slug}{'' if n == 0 else '-' + str(n + 1)}.webp"
            if do_images:
                convert_image(os.path.join(ROOT, local), os.path.join(IMG_OUT, fname))
            images.append(
                {"id": f"img-{slug}-{n}", "src": f"/images/products/puff/{fname}", "alt": f"{name} ürün görseli"}
            )
        primary_img = images[0]["src"] if images else None

        # seçenek + varyantlar
        if p["variants"]:
            raw_vars = sorted(p["variants"], key=lambda v: vol_sort_key(norm_volume(v["label"])))
            vlist = [(norm_volume(v["label"]), v) for v in raw_vars]
        else:
            m = re.search(r"(\d+)\s*ml\s*orijinal", name, re.I)
            label = f"{m.group(1)}ml (orijinal şişe)" if m else "Tek boy"
            vlist = [
                (
                    label,
                    {
                        "id": p["wcId"],
                        "price": p["price"],
                        "regularPrice": p["regularPrice"],
                        "onSale": p["onSale"],
                        "inStock": p["inStock"],
                        "image": None,
                    },
                )
            ]
        values = [{"id": "hacim-" + slugify(lab), "label": lab} for lab, _ in vlist]
        options = [{"id": "opt-hacim", "name": "Hacim", "order": 0, "values": values}]
        variants = []
        for lab, v in vlist:
            vid = "hacim-" + slugify(lab)
            variants.append(
                {
                    "id": f"{slug}--{slugify(lab)}",
                    "comboKey": f"opt-hacim:{vid}",
                    "optionValues": {"opt-hacim": vid},
                    "sku": f"MP-{code}-{seq:03d}-{vol_code(lab)}",
                    "price": v["price"],
                    "compareAtPrice": v["regularPrice"]
                    if v["onSale"] and v["regularPrice"] > v["price"]
                    else None,
                    "stock": 25 if v["inStock"] else 0,
                    "barcode": None,
                    "image": primary_img,
                    "isDefault": False,
                    "isActive": True,
                }
            )
        default = next((x for x in variants if x["stock"] > 0), variants[0])
        default["isDefault"] = True

        faq = []
        if specs["usage"]:
            ans = f"Tavsiye edilen kullanım oranı: {specs['usage']}."
            if specs["vgpg"]:
                ans += " " + specs["vgpg"]
            faq.append({"question": "Bu aromayı hangi oranda kullanmalıyım?", "answer": ans})
        elif specs["vgpg"]:
            faq.append({"question": "Hangi baz oranıyla karıştırmalıyım?", "answer": specs["vgpg"]})
        if specs["steep"]:
            faq.append(
                {"question": "Ne kadar dinlendirmek gerekiyor?", "answer": f"Önerilen demlenme süresi: {specs['steep']}."}
            )
        vol_labels = [lab for lab, _ in vlist]
        faq.append(
            {
                "question": "Hangi hacimlerde satılıyor?",
                "answer": "Seçenekler: " + ", ".join(vol_labels) + "." + (f" {specs['note']}." if specs["note"] else ""),
            }
        )

        products.append(
            {
                "id": slug,
                "slug": slug,
                "name": name,
                "series": sub,
                "shortDescription": short,
                "description": description,
                "subcategory": sub,
                "categoryIds": [CATEGORY_ID],
                "collectionIds": [],
                "tags": [],
                "images": images,
                "status": "yayında",
                "seo": {"title": name, "description": short},
                "flavorNotes": flavor_notes,
                "flavorProfiles": profiles,
                "badges": [],
                "featured": False,
                "bestSeller": False,
                "newArrival": True,
                "taste": taste_for(profiles),
                "form": "konsantre",
                "usageRate": specs["usage"] or "",
                "steepTime": specs["steep"] or "",
                "origin": specs["origin"] or "",
                "faq": faq,
                "options": options,
                "variants": variants,
                "createdAt": NOW,
                "updatedAt": NOW,
            }
        )

    catalog = {
        "schemaVersion": 1,
        "updatedAt": NOW,
        "categories": [
            {
                "id": CATEGORY_ID,
                "slug": CATEGORY_ID,
                "name": "Puff Aromalar",
                "tagline": "Hazır seri tadını kendin karıştır",
                "description": "Drifter, IVG, Vampire Vape, Dinner Lady, Riot ve Mixle Puff serilerinin yoğun aromaları. Nbase veya salt base ile karıştırılarak kullanılır; DIY kit boylarında şişe, aroma ile birlikte gelir.",
                "cover": "/images/products/puff/triple-melon-drifter-bar-aroma.webp",
                "icon": "/images/icons/mix.png",
                "subcategories": subcats,
                "accent": "fresh",
                "order": -1,
            }
        ],
        "collections": [],
        "products": products,
    }
    json.dump(catalog, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    nv = sum(len(p["variants"]) for p in products)
    ni = sum(len(p["images"]) for p in products)
    print(f"{len(products)} ürün, {nv} varyant, {ni} görsel -> {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
