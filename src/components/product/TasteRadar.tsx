'use client';

import { m, useReducedMotion } from 'framer-motion';
import type { TasteRadar as TasteRadarType } from '@/types';

const AXES: { key: keyof TasteRadarType; label: string }[] = [
  { key: 'sweetness', label: 'Tatlılık' },
  { key: 'freshness', label: 'Ferahlık' },
  { key: 'intensity', label: 'Yoğunluk' },
  { key: 'sourness', label: 'Ekşilik' },
  { key: 'creaminess', label: 'Kremsilik' },
];

export function TasteRadar({ taste, size = 260 }: { taste: TasteRadarType; size?: number }) {
  const reduce = useReducedMotion();
  const c = size / 2;
  const r = c - 34;
  const n = AXES.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 10) * r;
    return [c + Math.cos(angle) * dist, c + Math.sin(angle) * dist];
  };

  const gridRings = [2, 4, 6, 8, 10];
  const dataPoints = AXES.map((a, i) => point(i, taste[a.key]));
  const dataPath = dataPoints.map((p) => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Tat profili radar grafiği">
      {gridRings.map((g) => (
        <polygon
          key={g}
          points={AXES.map((_, i) => point(i, g).join(',')).join(' ')}
          fill="none"
          stroke="#EFE6F3"
          strokeWidth={1}
        />
      ))}
      {AXES.map((a, i) => {
        const [x, y] = point(i, 10);
        const [lx, ly] = point(i, 12.6);
        return (
          <g key={a.key}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="#EFE6F3" strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              fill="#5A4E60"
            >
              {a.label}
            </text>
            <text x={lx} y={ly + 12} textAnchor="middle" fontSize={10} fill="#672779" fontWeight={700}>
              {taste[a.key]}
            </text>
          </g>
        );
      })}
      <m.polygon
        points={dataPath}
        fill="rgba(103,39,121,0.16)"
        stroke="#672779"
        strokeWidth={2}
        strokeLinejoin="round"
        initial={reduce ? undefined : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${c}px ${c}px` }}
      />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#D2940B" stroke="#fff" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

export function TasteBars({ taste }: { taste: TasteRadarType }) {
  return (
    <dl className="space-y-3">
      {AXES.map((a) => (
        <div key={a.key}>
          <div className="flex items-center justify-between text-xs font-medium">
            <dt className="text-ink-soft">{a.label}</dt>
            <dd className="font-semibold text-ink">{taste[a.key]}/10</dd>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${taste[a.key] * 10}%` }}
            />
          </div>
        </div>
      ))}
    </dl>
  );
}
