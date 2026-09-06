import { handle } from '@/lib/admin/http';
import { readCatalog } from '@/server/catalog/persist';
import { rolePermissions } from '@/server/auth/rbac';

export const dynamic = 'force-dynamic';

export function GET(): Promise<Response> {
  return handle('katalog:oku', async (user) => {
    const catalog = await readCatalog();
    return Response.json({
      catalog,
      meta: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        permissions: rolePermissions[user.role],
      },
    });
  });
}
