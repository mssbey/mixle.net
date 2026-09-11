import Image from 'next/image';
import Link from 'next/link';

const groups = {
  first: [{ id: 3, name: 'Santa' }, { id: 4, name: 'Halo' }, { id: 5, name: 'Twelve Monkeys' }, { id: 6, name: 'Cuttwood' }],
  second: [{ id: 7, name: 'Cosmic Fog' }, { id: 8, name: 'Suicide Bunny' }, { id: 9, name: 'Capella' }],
  last: [{ id: 10, name: 'Humble' }, { id: 11, name: 'One Hit Wonder' }],
};
export function BrandBanners({ group }: { group: keyof typeof groups }) {
  return <section className={`container-page reference-banners reference-banners-${group}`} aria-label="Markaları keşfet">
    {groups[group].map(brand => <Link key={brand.id} href={`/arama?q=${encodeURIComponent(brand.name)}`} aria-label={`${brand.name} ürünleri`}>
      <Image src={`/images/reference/${brand.id}.jpg`} alt={brand.name} width={group === 'first' ? 289 : group === 'second' ? 389 : 592} height={group === 'first' ? 165 : group === 'second' ? 170 : 136} sizes="(max-width: 640px) 50vw, 40vw" />
    </Link>)}
  </section>;
}
