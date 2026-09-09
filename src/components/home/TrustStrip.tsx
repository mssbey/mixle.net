import Link from 'next/link';
import { Layers3, BookOpen, Package, MessageCircle } from 'lucide-react';
const items = [
  { icon: Layers3, title: 'Özenli ürün seçimi', text: 'Tat ailelerini karşılaştır', href: '/urunler' },
  { icon: BookOpen, title: 'ürün danışmanlığı', text: 'Rehberle doğru soruları sor', href: '/aroma-rehberi' },
  { icon: Package, title: 'Paketleme bilgileri', text: 'örnek teslimat koşullarını incele', href: '/iade-ve-teslimat' },
  { icon: MessageCircle, title: 'İletişim & destek', text: 'İletişim alanını görüntüle', href: '/iletisim' },
];
export function TrustStrip() {
  return <div className="border-y border-line bg-white/60"><div className="container-page grid grid-cols-2 gap-6 py-7 lg:grid-cols-4">{items.map(({ icon: Icon, ...item }) => <Link key={item.title} href={item.href} className="flex items-start gap-3"><Icon size={23} strokeWidth={1.4} className="mt-1 shrink-0 text-brand-500" /><div><p className="text-xs font-semibold text-ink sm:text-sm">{item.title}</p><p className="mt-1 text-[11px] leading-5 text-ink-soft">{item.text}</p></div></Link>)}</div></div>;
}
