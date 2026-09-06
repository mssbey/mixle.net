// DEMO veri — gerçek müşteri yorumu/sorusu değildir. `demo: true` ile işaretlenmiştir.
import type { Review, QuestionAnswer } from '@/types';
import { seededRandom } from '@/lib/utils';

const NAMES = [
  'Deniz K.', 'Mert A.', 'Selin T.', 'Onur B.', 'Ece M.', 'Kaan Y.', 'Aslı D.',
  'Baran S.', 'Ceren V.', 'Emre L.', 'Nil P.', 'Yusuf C.',
];

const REVIEW_BODIES = [
  'Beklediğim gibi dengeli çıktı, tarif kartındaki oranla başladım ve iyi sonuç aldım.',
  'Şişe ve kapak kalitesi güzeldi, sızıntı olmadı. Tat profili açıklamayla uyumlu.',
  'İlk denemede biraz yoğun geldi, oranı düşürünce tam kıvamını buldu.',
  'Kargo hızlıydı, paketleme özenliydi. Aromanın kendisi de iddialı.',
  'Tat notaları gerçekten hissediliyor, yapay bir tat bırakmıyor.',
  'Bekleme süresini biraz uzatınca profil daha da oturdu.',
];

const QUESTIONS = [
  'Bu ürünü diğer kremsi aromalarla karıştırabilir miyim?',
  'Extra Fresh varyantı ne kadar daha soğuk hissettiriyor?',
  '30 ml ile 60 ml arasında oran değişiyor mu?',
  'Açıldıktan sonra raf ömrü ne kadar?',
];

const ANSWERS = [
  'Evet, kremsi aromalarla dengeli şekilde katmanlanabilir; küçük oranla başlamanız önerilir.',
  'Extra Fresh, Standart’a göre belirgin şekilde daha soğuk hissettirir; ilk denemede Standart’ı öneririz.',
  'Oran aynıdır, sadece toplam hacim değişir; kullanım yüzdesi ürün sayfasında belirtilir.',
  'Doğru saklandığında (serin, ışıksız) birkaç ay içinde karakterini korur; kesin süre için etiketi kontrol edin.',
];

export function reviewsFor(productId: string): Review[] {
  const rnd = seededRandom(
    Array.from(productId).reduce((a, c) => a + c.charCodeAt(0), 0) * 977,
  );
  const count = 3 + Math.floor(rnd() * 3);
  return Array.from({ length: count }).map((_, i) => {
    const day = 3 + Math.floor(rnd() * 300);
    const date = new Date(Date.now() - day * 86400000).toISOString();
    return {
      id: `${productId}-review-${i}`,
      productId,
      author: NAMES[Math.floor(rnd() * NAMES.length)],
      rating: 3 + Math.round(rnd() * 2),
      date,
      title: i === 0 ? 'Beklentimi karşıladı' : REVIEW_BODIES[Math.floor(rnd() * REVIEW_BODIES.length)].slice(0, 28) + '…',
      body: REVIEW_BODIES[Math.floor(rnd() * REVIEW_BODIES.length)],
      verified: rnd() > 0.35,
      demo: true,
    };
  });
}

export function qaFor(productId: string): QuestionAnswer[] {
  const rnd = seededRandom(
    Array.from(productId).reduce((a, c) => a + c.charCodeAt(0), 0) * 613,
  );
  const count = 1 + Math.floor(rnd() * 3);
  return Array.from({ length: count }).map((_, i) => {
    const day = 5 + Math.floor(rnd() * 200);
    const date = new Date(Date.now() - day * 86400000).toISOString();
    const answered = rnd() > 0.25;
    return {
      id: `${productId}-qa-${i}`,
      productId,
      author: NAMES[Math.floor(rnd() * NAMES.length)],
      date,
      question: QUESTIONS[Math.floor(rnd() * QUESTIONS.length)],
      answer: answered ? ANSWERS[Math.floor(rnd() * ANSWERS.length)] : undefined,
      demo: true,
    };
  });
}

