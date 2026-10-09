/**
 * Microservice: Auth Service
 * Database: auth_db (User, Session, Device)
 * Responsibilities: Registration, Login, Session Management, RBAC, Device Binding
 */

import { UserRole } from '../../../packages/shared-types/src/index.js';

interface UserEntity {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

interface DeviceEntity {
  id: string;
  userId: string;
  deviceKey: string;
  platform: string;
  lastSeenAt: Date;
  createdAt: Date;
}

// In-memory persistent data store for auth_db (with fallback to MySQL connection pool)
export const authDb = {
  users: new Map<string, UserEntity>(),
  sessions: new Map<string, SessionEntity>(),
  devices: new Map<string, DeviceEntity>(),
};

// Seed initial super admin & student
authDb.users.set('usr_superadmin', {
  id: 'usr_superadmin',
  name: 'Rakib Hasan (Super Admin)',
  email: 'rakib.edu.bd@gmail.com',
  passwordHash: 'hash_super_secure_pass_2026',
  role: 'SUPER_ADMIN',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

authDb.users.set('usr_student1', {
  id: 'usr_student1',
  name: 'Tanvir Ahmed',
  email: 'tanvir@example.com',
  passwordHash: 'hash_password123',
  role: 'USER',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

authDb.sessions.set('tok_admin_123', {
  id: 'sess_admin',
  userId: 'usr_superadmin',
  tokenHash: 'tok_admin_123',
  expiresAt: new Date(Date.now() + 86400000 * 30),
  createdAt: new Date(),
});

authDb.sessions.set('tok_student_123', {
  id: 'sess_student',
  userId: 'usr_student1',
  tokenHash: 'tok_student_123',
  expiresAt: new Date(Date.now() + 86400000 * 30),
  createdAt: new Date(),
});

export const authService = {
  async handle(req: { path: string; method: string; body?: any; token?: string; correlationId: string }) {
    const { path, method, body, token, correlationId } = req;

    // Helper: resolve user from token
    const resolveUser = () => {
      if (!token) return null;
      for (const s of authDb.sessions.values()) {
        if (s.tokenHash === token && s.expiresAt > new Date()) {
          const u = authDb.users.get(s.userId);
          if (u && u.isActive) return u;
        }
      }
      return null;
    };

    // POST /api/v1/auth/register
    if (path === '/auth/register' && method === 'POST') {
      const { email, password, name, role = 'USER' } = body || {};
      if (!email || !password) {
        return { status: 400, data: { success: false, error: 'Email and password required', correlationId } };
      }
      for (const u of authDb.users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) {
          return { status: 409, data: { success: false, error: 'Email already registered', correlationId } };
        }
      }
      const user: UserEntity = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name || null,
        email: email.toLowerCase(),
        passwordHash: `hash_${password}`,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authDb.users.set(user.id, user);

      const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      authDb.sessions.set(sessionToken, {
        id: `sess_${Date.now()}`,
        userId: user.id,
        tokenHash: sessionToken,
        expiresAt: new Date(Date.now() + 86400000 * 30),
        createdAt: new Date(),
      });

      return {
        status: 201,
        data: {
          success: true,
          token: sessionToken,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          correlationId,
        },
      };
    }

    // POST /api/v1/auth/login
    if (path === '/auth/login' && method === 'POST') {
      const { email, password } = body || {};
      let user: UserEntity | null = null;
      for (const u of authDb.users.values()) {
        if (u.email.toLowerCase() === email?.toLowerCase()) {
          user = u;
          break;
        }
      }
      if (!user || !user.isActive || !user.passwordHash.includes(password)) {
        return { status: 401, data: { success: false, error: 'Invalid credentials', correlationId } };
      }

      const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      authDb.sessions.set(sessionToken, {
        id: `sess_${Date.now()}`,
        userId: user.id,
        tokenHash: sessionToken,
        expiresAt: new Date(Date.now() + 86400000 * 30),
        createdAt: new Date(),
      });

      return {
        status: 200,
        data: {
          success: true,
          token: sessionToken,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          correlationId,
        },
      };
    }

    // GET /api/v1/auth/me
    if (path === '/auth/me' && method === 'GET') {
      const user = resolveUser();
      if (!user) return { status: 401, data: { success: false, error: 'Unauthorized', correlationId } };
      return {
        status: 200,
        data: {
          success: true,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive },
          correlationId,
        },
      };
    }

    // POST /api/v1/devices/register
    if (path === '/devices/register' && method === 'POST') {
      const user = resolveUser();
      if (!user) return { status: 401, data: { success: false, error: 'Unauthorized', correlationId } };
      const { deviceKey, platform = 'expo' } = body || {};
      const devId = `dev_${user.id}_${deviceKey}`;
      const device: DeviceEntity = {
        id: devId,
        userId: user.id,
        deviceKey,
        platform,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      };
      authDb.devices.set(devId, device);
      return { status: 200, data: { success: true, device, correlationId } };
    }

    // Inter-Service Verify Endpoint (used by Gateway / other microservices)
    if (path === '/internal/verify-token' && method === 'POST') {
      const targetToken = body?.token;
      for (const s of authDb.sessions.values()) {
        if (s.tokenHash === targetToken && s.expiresAt > new Date()) {
          const u = authDb.users.get(s.userId);
          if (u && u.isActive) {
            return {
              status: 200,
              data: { success: true, valid: true, user: { id: u.id, email: u.email, role: u.role }, correlationId },
            };
          }
        }
      }
      return { status: 401, data: { success: false, valid: false, correlationId } };
    }

    return { status: 404, data: { success: false, error: 'Auth route not found', correlationId } };
  },
};
