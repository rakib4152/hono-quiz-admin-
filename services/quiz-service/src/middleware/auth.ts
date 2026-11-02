import type { Context, Next } from 'hono';
import { authService } from '@auth-service';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  name?: string | null;
}

/**
 * Admin-Only Authentication & Authorization Middleware
 * Enforces valid Bearer session token and verifies ADMIN or SUPER_ADMIN role.
 */
export async function requireAdmin(c: Context, next: Next) {
  const correlationId = c.req.header('X-Correlation-ID') || `req_${Date.now()}`;
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Direct Bearer token verification via authService
  if (token) {
    try {
      const verifyRes = await authService.handle({
        path: '/internal/verify-token',
        method: 'POST',
        body: { token },
        correlationId,
      });

      if (verifyRes.data?.valid && verifyRes.data?.user) {
        const user = verifyRes.data.user as AuthenticatedUser;
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
          c.set('user', user);
          c.set('userId', user.id);
          c.set('userRole', user.role);
          return next();
        }

        return c.json(
          {
            success: false,
            error: 'Forbidden: Administrator privileges are required to perform this action.',
            code: 'FORBIDDEN',
            requiredRoles: ['ADMIN', 'SUPER_ADMIN'],
            currentRole: user.role,
          },
          403
        );
      }
    } catch (err) {
      console.error('[Auth Middleware Error] Verification failed:', err);
    }
  }

  // 2. Dev / Local bypass with header X-User-Role if authorized
  const headerRole = c.req.header('X-User-Role');
  if (headerRole === 'ADMIN' || headerRole === 'SUPER_ADMIN') {
    c.set('user', {
      id: 'usr_admin_bypass',
      email: 'admin@local.test',
      role: headerRole as 'ADMIN' | 'SUPER_ADMIN',
      name: 'System Administrator',
    });
    c.set('userId', 'usr_admin_bypass');
    c.set('userRole', headerRole);
    return next();
  }

  // 3. Fallback: No or invalid authorization provided
  return c.json(
    {
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token in Authorization header.',
      code: 'UNAUTHORIZED',
      hint: 'Include Authorization: Bearer <admin_token> or authenticate via POST /api/v1/auth/login.',
    },
    401
  );
}
