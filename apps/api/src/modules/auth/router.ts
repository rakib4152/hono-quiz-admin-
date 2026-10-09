/**
 * Authentication & Session API Module
 * Models: User, Session, Device
 */

import { dbStore, UserRecord, SessionRecord, DeviceRecord } from '../../services/store.js';

export function handleAuthRoutes(path: string, method: string, body: any, headers: Headers) {
  // Extract token from Authorization: Bearer <token>
  const authHeader = headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Helper to authenticate user by token
  const getAuthUser = (): UserRecord | null => {
    if (!token) return null;
    for (const session of dbStore.sessions.values()) {
      if (session.tokenHash === token && session.expiresAt > new Date()) {
        const user = dbStore.users.get(session.userId);
        if (user && user.isActive) return user;
      }
    }
    return null;
  };

  // POST /auth/register
  if (path === '/auth/register' && method === 'POST') {
    const { email, password, name, role = 'USER' } = body || {};
    if (!email || !password) {
      return { status: 400, data: { success: false, error: 'Email and password are required' } };
    }

    // Check unique email
    for (const u of dbStore.users.values()) {
      if (u.email?.toLowerCase() === email.toLowerCase()) {
        return { status: 409, data: { success: false, error: 'User with this email already exists' } };
      }
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name || null,
      email: email.toLowerCase(),
      passwordHash: `hash_${password}`, // In real worker, crypto.subtle PBKDF2/Argon2
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbStore.users.set(newUser.id, newUser);

    // Create session
    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const session: SessionRecord = {
      id: `sess_${Date.now()}`,
      tokenHash: sessionToken,
      userId: newUser.id,
      expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days
      createdAt: new Date(),
    };
    dbStore.sessions.set(session.id, session);

    return {
      status: 201,
      data: {
        success: true,
        message: 'User registered successfully',
        token: sessionToken,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      },
    };
  }

  // POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    const { email, password } = body || {};
    if (!email || !password) {
      return { status: 400, data: { success: false, error: 'Email and password are required' } };
    }

    let foundUser: UserRecord | null = null;
    for (const u of dbStore.users.values()) {
      if (u.email?.toLowerCase() === email.toLowerCase()) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser || !foundUser.isActive) {
      return { status: 401, data: { success: false, error: 'Invalid credentials or inactive account' } };
    }

    // Simple hash check for demonstration
    if (foundUser.passwordHash !== `hash_${password}` && !foundUser.passwordHash?.includes(password)) {
      return { status: 401, data: { success: false, error: 'Invalid password' } };
    }

    const sessionToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const session: SessionRecord = {
      id: `sess_${Date.now()}`,
      tokenHash: sessionToken,
      userId: foundUser.id,
      expiresAt: new Date(Date.now() + 86400000 * 30),
      createdAt: new Date(),
    };
    dbStore.sessions.set(session.id, session);

    return {
      status: 200,
      data: {
        success: true,
        token: sessionToken,
        user: { id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role },
      },
    };
  }

  // GET /auth/me
  if (path === '/auth/me' && method === 'GET') {
    const user = getAuthUser();
    if (!user) {
      return { status: 401, data: { success: false, error: 'Unauthorized or expired session' } };
    }

    // Gather user's devices & badges
    const userBadges = Array.from(dbStore.userBadges.values())
      .filter((ub) => ub.userId === user.id)
      .map((ub) => dbStore.badges.get(ub.badgeId));

    return {
      status: 200,
      data: {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          badges: userBadges,
        },
      },
    };
  }

  // POST /auth/logout
  if (path === '/auth/logout' && method === 'POST') {
    if (token) {
      for (const [key, sess] of dbStore.sessions.entries()) {
        if (sess.tokenHash === token) {
          dbStore.sessions.delete(key);
          break;
        }
      }
    }
    return { status: 200, data: { success: true, message: 'Logged out successfully' } };
  }

  // POST /auth/device
  if (path === '/auth/device' && method === 'POST') {
    const user = getAuthUser();
    if (!user) return { status: 401, data: { success: false, error: 'Unauthorized' } };

    const { deviceKey, platform = 'expo' } = body || {};
    if (!deviceKey) return { status: 400, data: { success: false, error: 'deviceKey is required' } };

    const deviceId = `dev_${user.id}_${deviceKey}`;
    const device: DeviceRecord = {
      id: deviceId,
      userId: user.id,
      deviceKey,
      platform,
      lastSeenAt: new Date(),
      createdAt: dbStore.devices.get(deviceId)?.createdAt || new Date(),
    };
    dbStore.devices.set(deviceId, device);

    return { status: 200, data: { success: true, device } };
  }

  return null;
}
