"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';
import type { StorefrontContact } from '@/lib/storefront';
import { site } from '@/lib/site';

const socials = ['Instagram', 'Twitter', 'TikTok', 'Behance', 'WhatsApp', 'YouTube', 'Snapchat', 'LinkedIn', 'Dribbble', 'Pinterest', 'Spotify', 'Facebook'];
const payments = ['Visa', 'Mastercard', 'Troy', 'Axess', 'Bonus', 'Maximum', 'Paraf', 'World'];
const legal = [
  ['Kullanım Koşulları', '/mesafeli-satis-sozlesmesi'], ['Gizlilik Politikası', '/gizlilik-politikasi'], ['KVKK', '/gizlilik-politikasi#kvkk'], ['Mesafeli Satış', '/mesafeli-satis-sozlesmesi'], ['İade Politikası', '/iade-ve-teslimat'], ['Çerez Politikası', '/cerez-politikasi'],
];
export function HomeFooter({ contact }: { contact: StorefrontContact }) {
  const socialLinks: Record<string, string> = { Instagram: site.social.instagram, Twitter: site.social.x, YouTube: site.social.youtube, WhatsApp: contact.phoneUrl.replace('tel:', 'https://wa.me/').replace('+', '') };
  return <footer className="reference-footer">
    <div className="reference-socials" aria-label="Sosyal medya">
      {socials.map((name, index) => socialLinks[name] ? <a href={socialLinks[name]} key={name} target="_blank" rel="noopener noreferrer" aria-label={name}><Image src={`/images/reference/${index + 12}.png`} alt={name} width={60} height={60} /></a> : <Image key={name} src={`/images/reference/${index + 12}.png`} alt={name} width={60} height={60} />)}
    </div>
    <div className="container-page reference-footer-columns">
      <div className="reference-subscriptions">
        <Logo />
        <p>Kampanya, duyuru, bilgilendirmelerden e-posta ile haberdar olmak istiyorum.</p>
        <NewsletterForm variant="light" submitLabel="Gönder" />
        <p>Kampanya, duyuru ve bilgilendirmelerden haberdar olmak için kayıt olun.</p>
        <NewsletterForm variant="light" kind="sms" submitLabel="Gönder" />
      </div>
      <div><h2>Kurumsal</h2><ul>{legal.map(([label, href]) => <li key={label}><Link href={href}>› &nbsp;{label}</Link></li>)}</ul></div>
      <div><h2>Kategoriler</h2><ul>{['Mixle', 'Twisted', 'Santa', 'TFA', 'Capella', 'Inawera'].map(name => <li key={name}><Link href={`/arama?q=${name}`}>› &nbsp;{name} Aroma</Link></li>)}</ul></div>
      <div><h2>Bize Ulaşın</h2><p>{contact.workingHours} saatleri arasında ulaşabilirsiniz.</p><ul className="reference-contact"><li><Phone size={17} /><a href={contact.phoneUrl}>{contact.phone}</a></li><li><Mail size={17} /><a href={contact.emailUrl}>{contact.email}</a></li><li><MapPin size={17} />{contact.address}</li></ul></div>
    </div>
    <div className="reference-footer-bottom"><div className="container-page"><p>© {new Date().getFullYear()} {contact.legalName}. {site.legal.sslNote}</p><div>{payments.map((name, i) => <Image key={name} src={`/images/reference/${24 + i}.png`} alt={name} width={72} height={45} />)}</div></div></div>
    <div className="reference-powered">Powered by <Logo /> <span>e-ticaret</span></div>
  </footer>;
}
