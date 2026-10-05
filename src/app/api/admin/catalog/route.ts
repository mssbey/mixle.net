import { handle } from '@/lib/admin/http';
import { readCatalog } from '@/server/catalog/persist';
import { rolePermissions } from '@/server/auth/rbac';
import { currentStore, deploymentStore } from '@/server/store-context';
import { getStoreBrand } from '@/server/settings';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async (user) => {
    const [catalog, brand] = await Promise.all([readCatalog(), getStoreBrand()]);
    return Response.json({
      catalog,
      meta: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        permissions: rolePermissions[user.role],
        store: currentStore(),
        // Başka alan adındaki mağazanın vitrin kökü; bu dağıtımın mağazası için boş (göreli bağlantı).
        storeUrl: currentStore() === deploymentStore() ? '' : brand.url,
      },
    });
  });
}
