'use client';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      Yazdır / PDF
    </button>
  );
}
