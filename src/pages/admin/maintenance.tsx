import { useEffect, useState } from "react";
import {
  Wrench,
  Power,
  CheckCircle2,
  AlertTriangle,
  Package,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  subscribeMaintenanceStatus,
  updateMaintenanceStatus,
  subscribeProducts,
} from "../../lib/firestore";
import type { Product } from "../../types";
import { useToast } from "../../hooks/use-toast";

type MaintenanceItem = {
  id: string;
  name: string;
  type: "service" | "product";
};

export default function AdminMaintenance() {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    return subscribeProducts(setProducts);
  }, []);

  const items: MaintenanceItem[] = [
    {
      id: "nokos",
      name: "Nokos",
      type: "service",
    },
    ...products.map((product) => ({
      id: `product_${product.id}`,
      name: product.name,
      type: "product" as const,
    })),
  ];

  useEffect(() => {
    const unsubscribers = items.map((item) =>
      subscribeMaintenanceStatus(item.id, (status) => {
        setStatuses((prev) => ({
          ...prev,
          [item.id]: status?.maintenance === true,
        }));
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [products]);

  const toggleMaintenance = async (item: MaintenanceItem) => {
    const next = !statuses[item.id];

    setSaving(item.id);

    try {
      await updateMaintenanceStatus(
        item.id,
        item.name,
        next
      );

      toast({
        title: next
          ? "Maintenance diaktifkan"
          : "Maintenance dimatikan",
        description: `${item.name} sekarang ${
          next ? "sedang maintenance" : "kembali normal"
        }.`,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "Gagal mengubah status",
        description: "Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppLayout title="Maintenance Produk">
      <div className="space-y-6">

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
              <Wrench className="h-6 w-6 text-orange-500" />
            </div>

            <div>
              <h1 className="text-xl font-black">
                Maintenance Produk
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Atur layanan atau produk yang sedang mengalami
                maintenance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600" />

          <div className="text-sm">
            <p className="font-bold text-yellow-700 dark:text-yellow-400">
              Informasi
            </p>

            <p className="mt-1 text-muted-foreground">
              Produk yang maintenance tetap terlihat oleh user,
              tetapi transaksi akan dinonaktifkan.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {items.map((item) => {
            const active = statuses[item.id] === true;
            const isSaving = saving === item.id;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition ${
                  active
                    ? "border-red-500/40 bg-red-500/5"
                    : "bg-card"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      active
                        ? "bg-red-500/10 text-red-500"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.type === "service" ? (
                      <Wrench className="h-5 w-5" />
                    ) : (
                      <Package className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {item.name}
                    </p>

                    <p
                      className={`text-xs font-semibold ${
                        active
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {active
                        ? "SEDANG MAINTENANCE"
                        : "AKTIF / NORMAL"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => toggleMaintenance(item)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${
                    active
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {active ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Aktifkan"}
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" />
                      {isSaving ? "Menyimpan..." : "Maintenance"}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </AppLayout>
  );
}
