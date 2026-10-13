import { lazy, Suspense, useEffect, useState } from "react";

import { installApiKeyInterceptor, isFirebaseConfigured } from "@/lib/app-config";

const StoreApp = lazy(() => import("@/App"));

/**
 * The store is a client-rendered SPA (wouter + Firebase), so it is mounted
 * only after hydration — and only once Firebase has been configured in /setup.
 */
export default function StoreClient() {
  const [mounted, setMounted] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    installApiKeyInterceptor();
    setConfigured(isFirebaseConfigured());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">Konfigurasi belum diisi</h1>
          <p className="text-sm text-muted-foreground">
            Isi dulu konfigurasi Firebase, Cloudinary, API key Ramashop, dan API key Nokos
            supaya toko bisa berjalan.
          </p>
          <a
            href="/setup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Buka Form Konfigurasi
          </a>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <StoreApp />
    </Suspense>
  );
}
