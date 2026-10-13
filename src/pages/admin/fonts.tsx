import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Type, Save, Loader2, Upload, RotateCcw } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  subscribeFontSettings,
  updateFontSettings,
  type FontSetting,
} from "../../lib/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";

const defaultFonts: FontSetting = {
  enabled: false,
  headingFamily: "",
  headingUrl: "",
  bodyFamily: "",
  bodyUrl: "",
};

export default function AdminFonts() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [form, setForm] = useState<FontSetting>(defaultFonts);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"heading" | "body" | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    const unsub = subscribeFontSettings((data) => {
      if (data) setForm({ ...defaultFonts, ...data });
      setLoading(false);
    });

    return unsub;
  }, [isAdmin, setLocation]);

  if (!isAdmin) return null;

  const set = (key: keyof FontSetting, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFontSettings(form);
      toast({ title: "Font tersimpan" });
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

  const handleReset = async () => {
    setSaving(true);
    try {
      setForm(defaultFonts);
      await updateFontSettings(defaultFonts);
      toast({
        title: "Kembali ke font default",
        description: "Judul: Plus Jakarta Sans, teks: Inter",
      });
    } catch (e) {
      toast({
        title: "Gagal reset",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };


  const handleUpload = async (
    target: "heading" | "body",
    file: File | null,
  ) => {
    if (!file) return;
    if (!/\.(ttf|otf|woff2?|)$/i.test(file.name)) {
      toast({
        title: "Format tidak didukung",
        description: "Gunakan file .ttf, .otf, .woff, atau .woff2",
        variant: "destructive",
      });
      return;
    }
    setUploading(target);
    try {
      const url = await uploadToCloudinary(file, "raw");
      const autoName = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9]+/g, "");
      setForm((prev) => ({
        ...prev,
        enabled: true,
        [target === "heading" ? "headingUrl" : "bodyUrl"]: url,
        [target === "heading" ? "headingFamily" : "bodyFamily"]:
          (target === "heading" ? prev.headingFamily : prev.bodyFamily) || autoName,
      }));
      toast({ title: "Font terupload", description: file.name });
    } catch (e) {
      toast({
        title: "Upload gagal",
        description: e instanceof Error ? e.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const uploadBox = (label: string, target: "heading" | "body") => (
    <label className="flex items-center gap-3 px-3 py-3 rounded-2xl border border-dashed border-card-border bg-card cursor-pointer hover:border-primary/50">
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={(e) => {
          handleUpload(target, e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {uploading === target ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : (
        <Upload className="w-4 h-4 text-primary" />
      )}
      <span className="text-xs font-bold text-foreground">{label}</span>
    </label>
  );

  const field = (
    label: string,
    key: keyof FontSetting,
    placeholder: string,
  ) => (
    <div>
      <label className="text-xs font-bold text-muted-foreground">{label}</label>
      <input
        value={String(form[key] ?? "")}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2.5 rounded-2xl border border-card-border bg-card text-sm outline-none focus:border-primary/50"
      />
    </div>
  );

  return (
    <AppLayout title="Font & Tipografi">
      <div className="space-y-5">
        <div className="rounded-3xl p-5 bg-card border border-card-border flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Import Font Kustom</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Default: Plus Jakarta Sans (judul) &amp; Inter (teks). Isi di bawah untuk menimpa.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 rounded-3xl p-5 bg-card border border-card-border">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm font-bold text-foreground">
                Aktifkan font kustom
              </span>
            </label>

            {field("Nama Font Judul", "headingFamily", "MyHeadingFont")}
            {field(
              "URL Font Judul (.ttf / .woff2)",
              "headingUrl",
              "https://.../font.woff2",
            )}
            {uploadBox("Upload file font judul dari penyimpanan", "heading")}
            {field("Nama Font Teks", "bodyFamily", "MyBodyFont")}
            {field(
              "URL Font Teks (.ttf / .woff2)",
              "bodyUrl",
              "https://.../font.woff2",
            )}
            {uploadBox("Upload file font teks dari penyimpanan", "body")}

            <div
              className="rounded-2xl border border-card-border p-4"
              style={
                form.enabled
                  ? ({
                      fontFamily: form.bodyFamily
                        ? `'${form.bodyFamily}', monospace`
                        : undefined,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <p
                className="text-lg font-extrabold text-foreground"
                style={
                  form.enabled && form.headingFamily
                    ? { fontFamily: `'${form.headingFamily}', sans-serif` }
                    : undefined
                }
              >
                Contoh Judul
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Contoh teks biasa 1234567890
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Simpan Font
            </button>

            <button
              onClick={handleReset}
              disabled={saving}
              className="w-full py-3 rounded-2xl border border-card-border bg-card text-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Kembali ke Font Default
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
