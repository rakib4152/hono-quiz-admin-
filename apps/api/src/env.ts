/**
 * Cloudflare Worker Environment Bindings Interface
 */
export interface CloudflareHyperdriveBinding {
  connectionString: string;
}

export interface CloudflareKVBinding {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CloudflareR2Binding {
  get(key: string): Promise<any | null>;
  put(key: string, value: any): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface AppEnv {
  Bindings: {
    // Hyperdrive binding for Hostinger MySQL
    HYPERDRIVE?: CloudflareHyperdriveBinding;
    // Direct or fallback connection string (e.g. for local dev with wrangler)
    DATABASE_URL?: string;
    // Workers KV namespace for caching / session revocation
    CACHE_KV?: CloudflareKVBinding;
    // Cloudflare R2 bucket for assets
    ASSETS_R2?: CloudflareR2Binding;
    // Configuration vars
    ENVIRONMENT: string;
    API_VERSION: string;
    CORS_ALLOWED_ORIGINS?: string;
    JWT_SECRET?: string;
  };
  Variables: {
    requestId: string;
    startTime: number;
  };
}
