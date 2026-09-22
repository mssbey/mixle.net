'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AdminCategory,
  AdminCollection,
  AdminProduct,
  CatalogFile,
} from '@/types/admin';
import { adminApi, ApiError, type AdminSessionUser } from '@/lib/admin/client';
import type { Permission } from '@/server/auth/rbac';
import type { BulkAction } from '@/lib/admin/mutations';
import { toast } from '@/store/toast';

interface AdminDataValue {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** Giriş yapmış panel kullanıcısı. */
  user: AdminSessionUser | null;
  /** Rolün sahip olduğu izinler — arayüz bunları GİZLEME için kullanır;
   *  asıl kontrol her zaman sunucudadır (bkz. src/lib/admin/http.ts). */
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  /** Kısayol: `can('katalog:yaz')`. */
  canWrite: boolean;
  catalog: CatalogFile | null;
  products: AdminProduct[];
  categories: AdminCategory[];
  collections: AdminCollection[];
  updatedAt: string | null;
  reload: () => Promise<void>;
  categoryName: (id: string) => string;
  collectionName: (id: string) => string;
  productById: (id: string) => AdminProduct | undefined;
  productBySlug: (slug: string) => AdminProduct | undefined;
  createProduct: (product: AdminProduct) => Promise<AdminProduct | null>;
  updateProduct: (id: string, patch: Partial<AdminProduct>) => Promise<boolean>;
  /** WordPress "Çoğalt": taslak kopya üretir, kopyayı döndürür. */
  duplicateProduct: (id: string) => Promise<AdminProduct | null>;
  deleteProduct: (id: string) => Promise<boolean>;
  bulkProducts: (op: BulkAction) => Promise<boolean>;
  saveCategory: (category: AdminCategory) => Promise<boolean>;
  updateCategory: (id: string, patch: Partial<AdminCategory>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (orderedIds: string[]) => Promise<boolean>;
  saveCollection: (collection: AdminCollection) => Promise<boolean>;
  updateCollection: (id: string, patch: Partial<AdminCollection>) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  reorderCollections: (orderedIds: string[]) => Promise<boolean>;
}

const AdminDataContext = createContext<AdminDataValue | null>(null);

function reportError(err: unknown, fallback: string): void {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      toast.error('Salt okunur mod', err.message);
      return;
    }
    const detail = Object.values(err.issues)[0];
    toast.error(fallback, detail ?? err.message);
    return;
  }
  toast.error(fallback, err instanceof Error ? err.message : undefined);
}

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [catalog, setCatalog] = useState<CatalogFile | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      const { catalog: data, meta } = await adminApi.loadCatalog();
      setCatalog(data);
      setUser(meta.user);
      setPermissions(meta.permissions);
      setStatus('ready');
      setError(null);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Katalog yüklenemedi');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const applyProduct = useCallback((product: AdminProduct) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      const exists = prev.products.some((p) => p.id === product.id);
      return {
        ...prev,
        products: exists
          ? prev.products.map((p) => (p.id === product.id ? product : p))
          : [...prev.products, product],
      };
    });
  }, []);

  const value = useMemo<AdminDataValue>(() => {
    const products = catalog?.products ?? [];
    const categories = [...(catalog?.categories ?? [])].sort((a, b) => a.order - b.order);
    const collections = [...(catalog?.collections ?? [])].sort((a, b) => a.order - b.order);

    const can = (permission: Permission) => permissions.includes(permission);

    return {
      status,
      error,
      user,
      permissions,
      can,
      canWrite: can('katalog:yaz'),
      catalog,
      products,
      categories,
      collections,
      updatedAt: catalog?.updatedAt ?? null,
      reload,
      categoryName: (id) => categories.find((c) => c.id === id)?.name ?? id,
      collectionName: (id) => collections.find((c) => c.id === id)?.name ?? id,
      productById: (id) => products.find((p) => p.id === id),
      productBySlug: (slug) => products.find((p) => p.slug === slug),

      createProduct: async (product) => {
        try {
          const { product: saved } = await adminApi.createProduct(product);
          applyProduct(saved);
          toast.success('Ürün oluşturuldu', saved.name);
          return saved;
        } catch (err) {
          reportError(err, 'Ürün oluşturulamadı');
          return null;
        }
      },

      updateProduct: async (id, patch) => {
        try {
          const { product: saved } = await adminApi.updateProduct(id, patch);
          applyProduct(saved);
          toast.success('Kaydedildi', saved.name);
          return true;
        } catch (err) {
          reportError(err, 'Kaydedilemedi');
          return false;
        }
      },

      duplicateProduct: async (id) => {
        try {
          const { product: copy } = await adminApi.duplicateProduct(id);
          applyProduct(copy);
          toast.success('Kopya oluşturuldu', `${copy.name} · taslak`);
          return copy;
        } catch (err) {
          reportError(err, 'Kopyalanamadı');
          return null;
        }
      },

      deleteProduct: async (id) => {
        const snapshot = catalog;
        setCatalog((prev) =>
          prev ? { ...prev, products: prev.products.filter((p) => p.id !== id) } : prev,
        );
        try {
          await adminApi.deleteProduct(id);
          toast.success('Ürün silindi');
          return true;
        } catch (err) {
          setCatalog(snapshot);
          reportError(err, 'Silinemedi');
          return false;
        }
      },

      bulkProducts: async (op) => {
        try {
          await adminApi.bulkProducts(op);
          await reload();
          toast.success('Toplu işlem uygulandı', `${op.ids.length} ürün`);
          return true;
        } catch (err) {
          reportError(err, 'Toplu işlem başarısız');
          return false;
        }
      },

      saveCategory: async (category) => {
        try {
          const { category: saved } = await adminApi.saveCategory(category);
          setCatalog((prev) => {
            if (!prev) return prev;
            const exists = prev.categories.some((c) => c.id === saved.id);
            return {
              ...prev,
              categories: exists
                ? prev.categories.map((c) => (c.id === saved.id ? saved : c))
                : [...prev.categories, saved],
            };
          });
          toast.success('Kategori kaydedildi', saved.name);
          return true;
        } catch (err) {
          reportError(err, 'Kategori kaydedilemedi');
          return false;
        }
      },

      updateCategory: async (id, patch) => {
        try {
          const { category: saved } = await adminApi.updateCategory(id, patch);
          setCatalog((prev) =>
            prev
              ? { ...prev, categories: prev.categories.map((c) => (c.id === id ? saved : c)) }
              : prev,
          );
          return true;
        } catch (err) {
          reportError(err, 'Kategori güncellenemedi');
          return false;
        }
      },

      deleteCategory: async (id) => {
        try {
          await adminApi.deleteCategory(id);
          await reload();
          toast.success('Kategori silindi');
          return true;
        } catch (err) {
          reportError(err, 'Kategori silinemedi');
          return false;
        }
      },

      reorderCategories: async (orderedIds) => {
        const snapshot = catalog;
        setCatalog((prev) => {
          if (!prev) return prev;
          const rank = new Map(orderedIds.map((cid, i) => [cid, i]));
          return {
            ...prev,
            categories: [...prev.categories]
              .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
              .map((c, i) => ({ ...c, order: i })),
          };
        });
        try {
          await adminApi.reorderCategories(orderedIds);
          return true;
        } catch (err) {
          setCatalog(snapshot);
          reportError(err, 'Sıralama kaydedilemedi');
          return false;
        }
      },

      saveCollection: async (collection) => {
        try {
          const { collection: saved } = await adminApi.saveCollection(collection);
          setCatalog((prev) => {
            if (!prev) return prev;
            const exists = prev.collections.some((c) => c.id === saved.id);
            return {
              ...prev,
              collections: exists
                ? prev.collections.map((c) => (c.id === saved.id ? saved : c))
                : [...prev.collections, saved],
            };
          });
          toast.success('Koleksiyon kaydedildi', saved.name);
          return true;
        } catch (err) {
          reportError(err, 'Koleksiyon kaydedilemedi');
          return false;
        }
      },

      updateCollection: async (id, patch) => {
        try {
          const { collection: saved } = await adminApi.updateCollection(id, patch);
          setCatalog((prev) =>
            prev
              ? { ...prev, collections: prev.collections.map((c) => (c.id === id ? saved : c)) }
              : prev,
          );
          return true;
        } catch (err) {
          reportError(err, 'Koleksiyon güncellenemedi');
          return false;
        }
      },

      deleteCollection: async (id) => {
        try {
          await adminApi.deleteCollection(id);
          await reload();
          toast.success('Koleksiyon silindi');
          return true;
        } catch (err) {
          reportError(err, 'Koleksiyon silinemedi');
          return false;
        }
      },

      reorderCollections: async (orderedIds) => {
        const snapshot = catalog;
        setCatalog((prev) => {
          if (!prev) return prev;
          const rank = new Map(orderedIds.map((cid, i) => [cid, i]));
          return {
            ...prev,
            collections: [...prev.collections]
              .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
              .map((c, i) => ({ ...c, order: i })),
          };
        });
        try {
          await adminApi.reorderCollections(orderedIds);
          return true;
        } catch (err) {
          setCatalog(snapshot);
          reportError(err, 'Sıralama kaydedilemedi');
          return false;
        }
      },
    };
  }, [status, error, user, permissions, catalog, reload, applyProduct]);

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataValue {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error('useAdminData yalnızca AdminDataProvider içinde kullanılabilir');
  return ctx;
}
