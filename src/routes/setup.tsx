import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CONFIG, getAppConfig, saveAppConfig, type AppConfig } from "@/lib/app-config";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Konfigurasi Aplikasi — Web Store Premium & Panel" },
      {
        name: "description",
        content:
          "Form pengisian konfigurasi Firebase, Cloudinary, API key RonzzPay, dan API key Nokos untuk Web Store.",
      },
      { property: "og:title", content: "Konfigurasi Aplikasi — Web Store" },
      {
        property: "og:description",
        content: "Isi konfigurasi Firebase, Cloudinary, RonzzPay, dan Nokos.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupPage,
});

type FieldDef = { key: keyof AppConfig; label: string; placeholder?: string };

const FIREBASE_FIELDS: FieldDef[] = [
  { key: "firebaseApiKey", label: "API Key", placeholder: "AIza..." },
  { key: "firebaseAuthDomain", label: "Auth Domain", placeholder: "project.firebaseapp.com" },
  { key: "firebaseProjectId", label: "Project ID", placeholder: "my-project" },
  { key: "firebaseStorageBucket", label: "Storage Bucket", placeholder: "my-project.appspot.com" },
  { key: "firebaseMessagingSenderId", label: "Messaging Sender ID", placeholder: "1234567890" },
  { key: "firebaseAppId", label: "App ID", placeholder: "1:123:web:abc" },
];

const CLOUDINARY_FIELDS: FieldDef[] = [
  { key: "cloudinaryCloudName", label: "Cloud Name", placeholder: "my-cloud" },
  { key: "cloudinaryUploadPreset", label: "Upload Preset (unsigned)", placeholder: "web-store" },
];

const API_FIELDS: FieldDef[] = [
  { key: "ramashopApiKey", label: "API Key RonzzPay (QRIS)", placeholder: "ronzzpay api key" },
  { key: "ramashopBaseUrl", label: "Base URL RonzzPay", placeholder: "https://pg.ronzzyt.id" },
  { key: "nokosApiKey", label: "API Key Nokos", placeholder: "nokos api key" },
  { key: "nokosBaseUrl", label: "Base URL Nokos", placeholder: "https://provider-nokos.com/api" },
  { key: "adminWhatsapp", label: "WhatsApp Admin", placeholder: "6285782544861" },
];

function SetupPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getAppConfig());
  }, []);

  const update = (key: keyof AppConfig, value: string) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveAppConfig(config);
    setSaved(true);
    toast({
      title: "Konfigurasi disimpan",
      description: "Muat ulang halaman agar konfigurasi baru dipakai.",
    });
  };

  const renderFields = (fields: FieldDef[]) =>
    fields.map((field) => (
      <div key={String(field.key)} className="space-y-2">
        <Label htmlFor={String(field.key)}>{field.label}</Label>
        <Input
          id={String(field.key)}
          value={config[field.key] ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => update(field.key, e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    ));

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Setup</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Konfigurasi Aplikasi</h1>
          <p className="text-sm text-muted-foreground">
            Isi konfigurasi Firebase, Cloudinary, API key RonzzPay, dan API key Nokos. Data
            disimpan di browser ini dan langsung dipakai oleh aplikasi.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Firebase</CardTitle>
            <CardDescription>
              Ambil dari Firebase Console → Project settings → Your apps (Web app).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">{renderFields(FIREBASE_FIELDS)}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cloudinary</CardTitle>
            <CardDescription>
              Dipakai untuk upload gambar/video produk. Upload preset harus mode unsigned.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {renderFields(CLOUDINARY_FIELDS)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Key Ramashop &amp; Nokos</CardTitle>
            <CardDescription>
              API key dipakai oleh proxy pembayaran QRIS (Ramashop) dan layanan nomor virtual
              (Nokos).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">{renderFields(API_FIELDS)}</CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" />
            Simpan Konfigurasi
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Tersimpan
            </span>
          )}
          <a href="/" className="ml-auto text-sm text-muted-foreground underline">
            Buka aplikasi
          </a>
        </div>
      </form>
    </div>
  );
}
