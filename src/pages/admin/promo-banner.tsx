import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Megaphone, Save, Loader2, ImagePlus } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import { PromoBanner, defaultPromoBanner } from "../../components/PromoBanner";
import { getPromoBanner, updatePromoBanner } from "../../lib/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { PromoBannerSetting } from "../../types";

export default function AdminPromoBanner() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState<PromoBannerSetting>(defaultPromoBanner);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    getPromoBanner()
      .then((data) => {
        if (data) setForm({ ...defaultPromoBanner, ...data });
      })
      .finally(() => setLoading(false));
  }, [isAdmin, setLocation]);

  if (!isAdmin) return null;

  const set = (key: keyof PromoBannerSetting, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, "image");
      set("imageUrl", url);
      toast({ title: "Gambar terupload" });
    } catch (e) {
      toast({
        title: "Upload gagal",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePromoBanner({
        enabled: form.enabled,
        title: form.title,
        subtitle: form.subtitle,
        rateText: form.rateText,
        exampleText: form.exampleText,
        imageUrl: form.imageUrl,
        buttonText: form.buttonText,
        buttonUrl: form.buttonUrl,
      });
      toast({ title: "Banner promosi disimpan" });
    } catch (e) {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <AppLayout title="Banner Promosi">
      <div className="space-y-5">
        <div className="rounded-3xl bg-card border border-card-border p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Pengaturan Banner</p>
              <p className="text-xs text-muted-foreground">
                Banner tampil di halaman utama
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-40 rounded-2xl bg-muted skeleton-pulse" />
          ) : (
            <>
              <label className="flex items-center justify-between rounded-2xl border border-card-border p-3">
                <span className="text-sm font-semibold text-foreground">
                  Aktifkan banner
                </span>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => set("enabled", e.target.checked)}
                  className="h-5 w-5 accent-emerald-600"
                  data-testid="input-promo-enabled"
                />
              </label>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Judul
                  </label>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Deskripsi
                  </label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form.subtitle}
                    onChange={(e) => set("subtitle", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Rate
                    </label>
                    <input
                      className={inputClass}
                      value={form.rateText}
                      onChange={(e) => set("rateText", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Contoh perhitungan
                    </label>
                    <input
                      className={inputClass}
                      value={form.exampleText}
                      onChange={(e) => set("exampleText", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      Teks tombol
                    </label>
                    <input
                      className={inputClass}
                      value={form.buttonText}
                      onChange={(e) => set("buttonText", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">
                      URL tombol join
                    </label>
                    <input
                      className={inputClass}
                      placeholder="https://..."
                      value={form.buttonUrl}
                      onChange={(e) => set("buttonUrl", e.target.value)}
                      data-testid="input-promo-url"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Gambar banner
                  </label>
                  <input
                    className={inputClass}
                    placeholder="URL gambar (kosongkan untuk gambar default)"
                    value={form.imageUrl}
                    onChange={(e) => set("imageUrl", e.target.value)}
                  />

                  <label className="mt-2 inline-flex items-center gap-2 rounded-xl border border-dashed border-card-border px-3 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:border-primary">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                    {uploading ? "Mengupload..." : "Upload gambar"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload(e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                data-testid="btn-save-promo"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Banner
              </button>
            </>
          )}
        </div>

        <div>
          <p className="text-sm font-bold text-foreground mb-2">Preview</p>
          <PromoBanner banner={form} />
        </div>
      </div>
    </AppLayout>
  );
}
