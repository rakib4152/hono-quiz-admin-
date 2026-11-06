import React, { createContext, useContext, useEffect, useRef } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-react';
import { apiFetch, registerClerkAuthContext } from '../../lib/api/client.js';

interface ClerkAuthContextValue {
  isClerkEnabled: boolean;
}

const ClerkAuthContext = createContext<ClerkAuthContextValue>({
  isClerkEnabled: false,
});

export function useClerkEnabled(): boolean {
  return useContext(ClerkAuthContext).isClerkEnabled;
}

const INVALID_FABRICATED_KEYS = new Set([
  'pk_test_YXBwLTNsYXZmdzdhNWNjYjcwYnd3ZWFwaHZwNzd3bi5jbGVyay5hY2NvdW50cy5kZXYk',
]);

function isValidClerkPublishableKey(key: string | undefined): key is string {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed || INVALID_FABRICATED_KEYS.has(trimmed)) {
    return false;
  }
  if (!trimmed.startsWith('pk_test_') && !trimmed.startsWith('pk_live_')) {
    return false;
  }

  const encodedDomain = trimmed.replace(/^pk_(test|live)_/, '');
  if (!encodedDomain || encodedDomain.includes('YOUR_') || encodedDomain.includes('...')) {
    return false;
  }

  try {
    const decoded = atob(encodedDomain);
    // Clerk Frontend API domains end with '$' and must not be a synthetic app-<id> hostname
    if (!decoded.endsWith('$')) return false;
    const host = decoded.slice(0, -1);
    if (!host || /^app-[a-z0-9]+\.clerk\.accounts\.dev$/i.test(host)) {
      return false;
    }
    return host.includes('.');
  } catch {
    return false;
  }
}

interface ClerkErrorBoundaryState {
  hasError: boolean;
}

class ClerkErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ClerkErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ClerkErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const ClerkSessionBridge: React.FC = () => {
  const { getToken, userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    registerClerkAuthContext({
      getToken: () => getToken(),
      getUserId: () => userId ?? null,
    });
    return () => {
      registerClerkAuthContext(null);
    };
  }, [getToken, userId]);

  useEffect(() => {
    if (!isSignedIn || !user) {
      syncedUserIdRef.current = null;
      return;
    }
    const syncKey = `${user.id}:${user.updatedAt ? new Date(user.updatedAt).getTime() : ''}`;
    if (syncedUserIdRef.current === syncKey) {
      return;
    }
    syncedUserIdRef.current = syncKey;

    const primaryEmail =
      user.primaryEmailAddress?.emailAddress || `${user.id}@clerk.local`;
    const displayName =
      user.fullName || user.firstName || user.username || 'Clerk User';

    apiFetch('/auth/clerk-sync', {
      method: 'POST',
      body: {
        clerkUserId: user.id,
        email: primaryEmail,
        name: displayName,
        avatarUrl: user.imageUrl,
      },
    }).catch(() => {
      // Non-blocking sync; retry on next session mount if needed
    });
  }, [isSignedIn, user]);

  return null;
};

export const ClerkAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
  const validKey = isValidClerkPublishableKey(rawKey) ? rawKey.trim() : null;

  if (!validKey) {
    return (
      <ClerkAuthContext.Provider value={{ isClerkEnabled: false }}>
        {children}
      </ClerkAuthContext.Provider>
    );
  }

  return (
    <ClerkErrorBoundary
      fallback={
        <ClerkAuthContext.Provider value={{ isClerkEnabled: false }}>
          {children}
        </ClerkAuthContext.Provider>
      }
    >
      <ClerkProvider publishableKey={validKey} afterSignOutUrl="/">
        <ClerkSessionBridge />
        <ClerkAuthContext.Provider value={{ isClerkEnabled: true }}>
          {children}
        </ClerkAuthContext.Provider>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
};
