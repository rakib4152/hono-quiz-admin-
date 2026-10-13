/**
 * Cloudflare Worker Environment Types & Bindings
 */

export interface KVNamespaceLike {
  get(key: string, options?: any): Promise<string | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
  [key: string]: any;
}

export interface R2BucketLike {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: any): Promise<any>;
  [key: string]: any;
}

export interface AppEnv {
  Bindings: {
    // Hyperdrive connection pool for Hostinger MySQL (u427015050_quiz)
    HYPERDRIVE?: {
      connectionString: string;
      host?: string;
      port?: number;
      database?: string;
      user?: string;
    };
    // KV Namespace for sessions, rate-limiting, and short-term caches
    CACHE_KV?: KVNamespaceLike;
    // R2 Bucket for quiz assets, question media, and exports
    ASSETS_R2?: R2BucketLike;
    // Direct MySQL connection URL fallback
    DATABASE_URL?: string;
    QUIZ_DATABASE_URL?: string;
    // Environment configurations
    ENVIRONMENT?: string;
    API_VERSION?: string;
    CORS_ALLOWED_ORIGINS?: string;
    [key: string]: any;
  };
}
