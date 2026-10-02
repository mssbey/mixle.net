'use client';

// CSV / Excel'den toplu stok (ve fiyat) yükleme. Dosya seçilir seçilmez HİÇBİR
// ŞEY yazılmaz: önce sunucudan özet alınır (bulunan / güncellenecek /
// değişiklik yok / hatalı), "Güncellemeleri uygula" deyince yazılır.
// Eşleştirme ürün adıyla DEĞİL; Varyasyon ID → SKU → Ürün ID ile yapılır.

import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { Dialog } from '@/components/admin/orders/Dialog';
import { ApiError } from '@/lib/admin/client';
import { stockManagerApi } from '@/lib/admin/stock-client';
import { parseStockCsv, type CsvRow, type ManagerSaveResult } from '@/lib/admin/stock-manager';
import { toast } from '@/store/toast';

type Tab = 'guncellenecek' | 'hata' | 'degisiklik-yok';

export function StockCsvImportDialog({
  open,
  onClose,
  onDone,
  hasDrafts,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void | Promise<void>;
  hasDrafts: boolean;
}) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [preview, setPreview] = useState<ManagerSaveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('guncellenecek');
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName('');
    setRows(null);
    setPreview(null);
    setError(null);
    setTab('guncellenecek');
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = () => {
    reset();
    onClose();
  };

  const errMsg = (err: unknown) =>
    err instanceof ApiError ? (Object.values(err.issues)[0] ?? err.message) : err instanceof Error ? err.message : 'Beklenmeyen hata';

  const readFile = async (file: File) => {
    reset();
    setFileName(file.name);
    if (!/\.(csv|txt|tsv)$/i.test(file.name)) {
      setError('Lütfen .csv dosyası seçin. Excel’de “Farklı kaydet → CSV UTF-8 (virgülle ayrılmış)” kullanabilirsiniz.');
      return;
    }
    setBusy(true);
    try {
      const parsed = parseStockCsv(await file.text());
      if (parsed.error) {
        setError(parsed.error);
        return;
      }
      setRows(parsed.rows);
      const res = await stockManagerApi.importCsv(parsed.rows, true);
      setPreview(res);
      setTab(res.summary.updated ? 'guncellenecek' : res.summary.errors ? 'hata' : 'degisiklik-yok');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const res = await stockManagerApi.importCsv(rows, false);
      toast.success('CSV uygulandı', `${res.summary.updated} satır güncellendi${res.summary.errors ? `, ${res.summary.errors} satır atlandı` : ''}`);
      await onDone();
      close();
    } catch (err) {
      toast.error('CSV uygulanamadı', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const s = preview?.summary;
  const found = s ? s.total - (preview?.results.filter((r) => r.status === 'hata' && !r.variantId).length ?? 0) : 0;
  const list = preview?.results.filter((r) => (tab === 'hata' ? r.status === 'hata' || r.status === 'cakisma' : r.status === tab)) ?? [];

  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title="CSV / Excel’den stok yükle"
      description="Önce “CSV / Excel’e aktar” ile listeyi indirin, Excel’de Stok (ve isterseniz Fiyat) sütununu değiştirin, kaydedip buraya yükleyin."
      footer={
        <>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={close} disabled={busy}>
            Vazgeç
          </button>
          {preview && (
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={() => void apply()}
              disabled={busy || !s?.updated}
            >
              {busy ? 'Uygulanıyor…' : `Güncellemeleri uygula (${s?.updated ?? 0})`}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center text-sm transition-colors"
          style={{ borderColor: drag ? 'var(--brand-purple, #6d28d9)' : 'var(--admin-line-strong)', background: drag ? '#f5f2ff' : '#fafafa' }}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) void readFile(f);
          }}
        >
          {fileName ? <FileSpreadsheet size={22} /> : <Upload size={22} />}
          <span className="font-medium">{fileName || 'CSV dosyasını sürükleyin ya da seçmek için tıklayın'}</span>
          <span className="admin-hint text-xs">
            Eşleştirme sırası: Varyasyon ID → SKU → Ürün ID. Ürün adıyla eşleştirme yapılmaz.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,.txt,.tsv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readFile(f);
            }}
          />
        </label>

        {hasDrafts && (
          <p className="rounded bg-[#fff7e0] p-2 text-xs text-[#8a5a00]">
            Tabloda kaydedilmemiş değişiklikleriniz var. CSV uygulandıktan sonra tablo yenilenir; çakışan hücreler
            kaydederken uyarı verir.
          </p>
        )}

        {busy && !preview && <p className="admin-hint">Dosya kontrol ediliyor…</p>}
        {error && <p className="rounded bg-[#fdecec] p-2.5 text-sm text-[#b42318]">{error}</p>}

        {preview && s && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Summary label="Satır bulundu" value={found} />
              <Summary label="Güncellenecek" value={s.updated} tone="ok" active={tab === 'guncellenecek'} onClick={() => setTab('guncellenecek')} />
              <Summary label="Değişiklik yok" value={s.unchanged} active={tab === 'degisiklik-yok'} onClick={() => setTab('degisiklik-yok')} />
              <Summary label="Hatalı" value={s.errors + s.conflicts} tone="bad" active={tab === 'hata'} onClick={() => setTab('hata')} />
            </div>

            <div className="max-h-[38vh] overflow-y-auto rounded border border-[var(--admin-line)]">
              {list.length === 0 ? (
                <p className="admin-hint p-3">Bu grupta satır yok.</p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Satır</th>
                      <th>Ürün</th>
                      <th>SKU</th>
                      <th>{tab === 'hata' ? 'Hata' : 'Değişiklik'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.slice(0, 500).map((r, i) => (
                      <tr key={`${r.key}-${i}`}>
                        <td className="whitespace-nowrap text-xs">{r.key.startsWith('satır') ? r.key.replace('satır ', '#') : ''}</td>
                        <td>{r.productName || '—'}</td>
                        <td className="font-mono text-xs">{r.sku || '—'}</td>
                        <td className="text-xs">
                          {tab === 'hata' ? (
                            <span className="text-[#b42318]">{r.message}</span>
                          ) : r.changes.length ? (
                            r.changes.join(' · ')
                          ) : (
                            <span className="admin-hint">Aynı</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {list.length > 500 && <p className="admin-hint p-2 text-xs">İlk 500 satır gösteriliyor.</p>}
            </div>
            {s.errors + s.conflicts > 0 && s.updated > 0 && (
              <p className="admin-hint text-xs">Hatalı satırlar atlanır; yalnız “Güncellenecek” satırlar yazılır.</p>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}

function Summary({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'ok' | 'bad';
  active?: boolean;
  onClick?: () => void;
}) {
  const color = tone === 'ok' ? '#0f6b3d' : tone === 'bad' ? '#b42318' : 'var(--brand-purple-deep)';
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className="flex flex-col items-start rounded-lg border border-[var(--admin-line)] bg-white px-3 py-2 text-left disabled:cursor-default"
      style={active ? { outline: '2px solid var(--brand-purple, #6d28d9)' } : undefined}
    >
      <span className="text-xl font-semibold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="admin-hint text-xs">{label}</span>
    </button>
  );
}
