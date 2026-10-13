/**
 * Runtime configuration store.
 *
 * Values are entered by the admin through the /setup form and kept in
 * localStorage, so the app can run without build-time env variables.
 * Any VITE_* env value still works as the default.
 */

export type AppConfig = {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  ramashopApiKey: string; // legacy field name; value is the RonzzPay API key
  ramashopBaseUrl: string; // legacy field name; points to RonzzPay
  nokosApiKey: string;
  nokosBaseUrl: string;
  adminWhatsapp: string;
};

const STORAGE_KEY = "app_runtime_config_v1";

const env = import.meta.env as Record<string, string | undefined>;

export const DEFAULT_CONFIG: AppConfig = {
  firebaseApiKey: env["VITE_FIREBASE_API_KEY"] ?? "AIzaSyB9ObOjRGjWwtD6I9VSI5HPX_pe9_CTqWo",
  firebaseAuthDomain: env["VITE_FIREBASE_AUTH_DOMAIN"] ?? "preset-13041.firebaseapp.com",
  firebaseProjectId: env["VITE_FIREBASE_PROJECT_ID"] ?? "preset-13041",
  firebaseStorageBucket:
    env["VITE_FIREBASE_STORAGE_BUCKET"] ?? "preset-13041.firebasestorage.app",
  firebaseMessagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"] ?? "424548967366",
  firebaseAppId:
    env["VITE_FIREBASE_APP_ID"] ?? "1:424548967366:web:0261044773ba60059248c7",
  cloudinaryCloudName: env["VITE_CLOUDINARY_CLOUD_NAME"] ?? "dqn8dtntr",
  cloudinaryUploadPreset: env["VITE_CLOUDINARY_UPLOAD_PRESET"] ?? "webstore",
  ramashopApiKey: "",
  ramashopBaseUrl: "https://pg.ronzzyt.id",
  nokosApiKey: "",
  nokosBaseUrl: "https://nokos.co.id/api",
  adminWhatsapp: env["VITE_ADMIN_WHATSAPP"] ?? "6285782544861",
};


export function getAppConfig(): AppConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveAppConfig(config: AppConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isFirebaseConfigured(): boolean {
  const c = getAppConfig();
  return Boolean(c.firebaseApiKey && c.firebaseProjectId && c.firebaseAppId);
}

/**
 * Attaches the stored API keys to the internal /api proxy calls, so the
 * original page/lib code keeps working untouched.
 */
let installed = false;

export function installApiKeyInterceptor(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.startsWith("/api/")) {
        const config = getAppConfig();
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        );

        if (url.startsWith("/api/payment/qris")) {
          if (!headers.get("x-qris-api-key") && config.ramashopApiKey) {
            headers.set("x-qris-api-key", config.ramashopApiKey);
          }
          if (config.ramashopBaseUrl) headers.set("x-qris-base-url", config.ramashopBaseUrl);
        }

        if (url.startsWith("/api/nokos")) {
          if (config.nokosApiKey) headers.set("x-nokos-api-key", config.nokosApiKey);
          if (config.nokosBaseUrl) headers.set("x-nokos-base-url", config.nokosBaseUrl);
        }

        return originalFetch(input, { ...init, headers });
      }
    } catch {
      /* fall through to the untouched request */
    }

    return originalFetch(input, init);
  };
}

if (typeof window !== "undefined") {
  installApiKeyInterceptor();
}
