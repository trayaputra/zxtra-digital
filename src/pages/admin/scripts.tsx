import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Code2,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
  ToggleLeft,
  ToggleRight,
  PlayCircle,
  Download,
  ImagePlus,
  Video,
} from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  subscribeBotScripts,
  createBotScript,
  updateBotScript,
  deleteBotScript,
} from "../../lib/firestore";
import { uploadToCloudinary } from "../../lib/cloudinary";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import { useLocation } from "wouter";
import type { BotScript } from "../../types";

interface ScriptForm {
  name: string;
  description: string;
  imageUrl: string;
  previewVideoUrl: string;
  downloadUrl: string;
  category: string;
  version: string;
  size: string;
  available: boolean;
}

const defaultForm = (): ScriptForm => ({
  name: "",
  description: "",
  imageUrl: "",
  previewVideoUrl: "",
  downloadUrl: "",
  category: "Bot Panel",
  version: "",
  size: "",
  available: true,
});

export default function AdminScripts() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [scripts, setScripts] = useState<BotScript[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScriptForm>(defaultForm());
  const [saving, setSaving] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");

  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
      return;
    }

    return subscribeBotScripts(items => setScripts(items));
  }, [isAdmin, setLocation]);

  const resetFiles = () => {
    setImageFile(null);
    setVideoFile(null);
    setImagePreview("");
    setVideoPreview("");
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm());
    resetFiles();
    setShowForm(true);
  };

  const openEdit = (script: BotScript) => {
    setEditingId(script.id);
    setForm({
      name: script.name || "",
      description: script.description || "",
      imageUrl: script.imageUrl || "",
      previewVideoUrl: script.previewVideoUrl || "",
      downloadUrl: script.downloadUrl || "",
      category: script.category || "Bot Panel",
      version: script.version || "",
      size: script.size || "",
      available: script.available !== false,
    });
    resetFiles();
    setShowForm(true);
  };

  const handlePickImage = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "File harus berupa gambar", variant: "destructive" });
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePickVideo = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "File harus berupa video", variant: "destructive" });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nama script wajib diisi", variant: "destructive" });
      return;
    }

    if (!form.imageUrl.trim() && !imageFile) {
      toast({ title: "Gambar utama wajib diupload", variant: "destructive" });
      return;
    }

    if (!form.downloadUrl.trim()) {
      toast({ title: "Link download wajib diisi", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let imageUrl = form.imageUrl.trim();
      let previewVideoUrl = form.previewVideoUrl.trim();

      if (imageFile) {
        toast({ title: "Mengupload gambar..." });
        imageUrl = await uploadToCloudinary(imageFile, "image");
      }

      if (videoFile) {
        toast({ title: "Mengupload video..." });
        previewVideoUrl = await uploadToCloudinary(videoFile, "video");
      }

      const data: Omit<BotScript, "id"> = {
        name: form.name.trim(),
        description: form.description || "",
        imageUrl,
        previewVideoUrl,
        downloadUrl: form.downloadUrl.trim(),
        category: form.category || "Bot Panel",
        version: form.version || "",
        size: form.size || "",
        available: form.available,
      };

      if (editingId) {
        await updateBotScript(editingId, data);
        toast({ title: "Script diperbarui!" });
      } else {
        await createBotScript(data);
        toast({ title: "Script ditambahkan!" });
      }

      setShowForm(false);
      resetFiles();
    } catch (err) {
      toast({
        title: "Gagal menyimpan script",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus script ini?")) return;

    try {
      await deleteBotScript(id);
      toast({ title: "Script dihapus" });
    } catch (err) {
      toast({
        title: "Gagal menghapus script",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title="Kelola Script">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {scripts.length} Script
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola script bot, preview video, dan link download
            </p>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>

        <div className="space-y-3">
          {scripts.map(script => (
            <div
              key={script.id}
              className="bg-card rounded-3xl border border-card-border overflow-hidden"
            >
              <div className="aspect-video bg-muted">
                {script.imageUrl ? (
                  <img
                    src={script.imageUrl}
                    alt={script.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Code2 className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-foreground">
                      {script.name || "Script Tanpa Nama"}
                    </p>

                    <p className="text-xs text-muted-foreground mt-0.5">
                      {script.category || "Bot Panel"}
                      {script.version ? ` • v${script.version}` : ""}
                      {script.size ? ` • ${script.size}` : ""}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          script.available !== false
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {script.available !== false ? "Aktif" : "Nonaktif"}
                      </span>

                      {script.previewVideoUrl && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          Ada Video
                        </span>
                      )}

                      {script.downloadUrl && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Ada Download
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(script)}
                      className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(script.id)}
                      className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {script.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {script.description}
                  </p>
                )}
              </div>
            </div>
          ))}

          {scripts.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-card-border">
              <Code2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada script</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="relative bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-card-border my-4 overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-card-border sticky top-0 bg-card z-10">
                <h3 className="font-bold text-foreground">
                  {editingId ? "Edit Script" : "Tambah Script"}
                </h3>

                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-xl hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nama script"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Kategori, contoh: Bot WhatsApp"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.version}
                    onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="Versi, contoh: 1.0"
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />

                  <input
                    value={form.size}
                    onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                    placeholder="Ukuran, contoh: 12MB"
                    className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-2">
                    Gambar Utama 16:9
                  </label>

                  <label className="flex items-center justify-center gap-2 w-full bg-muted border-2 border-dashed border-input rounded-2xl px-4 py-4 text-sm font-bold text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
                    <ImagePlus className="w-5 h-5" />
                    Pilih Gambar dari Galeri
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handlePickImage(e.target.files?.[0])}
                    />
                  </label>

                  {(imagePreview || form.imageUrl) && (
                    <div className="mt-3 aspect-video rounded-2xl overflow-hidden bg-muted border border-card-border">
                      <img
                        src={imagePreview || form.imageUrl}
                        alt="Preview gambar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {imageFile && (
                    <p className="text-[11px] text-primary font-semibold mt-1">
                      File dipilih: {imageFile.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-2">
                    Video Preview
                  </label>

                  <label className="flex items-center justify-center gap-2 w-full bg-muted border-2 border-dashed border-input rounded-2xl px-4 py-4 text-sm font-bold text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
                    <Video className="w-5 h-5" />
                    Pilih Video dari Penyimpanan
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={e => handlePickVideo(e.target.files?.[0])}
                    />
                  </label>

                  {(videoPreview || form.previewVideoUrl) && (
                    <div className="mt-3 rounded-2xl overflow-hidden bg-black border border-card-border">
                      <video
                        src={videoPreview || form.previewVideoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full aspect-video object-cover"
                      />
                    </div>
                  )}

                  {videoFile && (
                    <p className="text-[11px] text-primary font-semibold mt-1">
                      File dipilih: {videoFile.name}
                    </p>
                  )}
                </div>

                <input
                  value={form.downloadUrl}
                  onChange={e => setForm(f => ({ ...f, downloadUrl: e.target.value }))}
                  placeholder="Link download script"
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />

                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Deskripsi script"
                  rows={5}
                  className="w-full bg-muted border border-input rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />

                <button
                  onClick={() => setForm(f => ({ ...f, available: !f.available }))}
                  className={`w-full py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                    form.available
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {form.available ? (
                    <span className="inline-flex items-center gap-2">
                      <ToggleRight className="w-4 h-4" />
                      Status: Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ToggleLeft className="w-4 h-4" />
                      Status: Nonaktif
                    </span>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={videoPreview || form.previewVideoUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      videoPreview || form.previewVideoUrl
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-border bg-muted text-muted-foreground pointer-events-none opacity-50"
                    }`}
                  >
                    <PlayCircle className="w-4 h-4" />
                    Cek Video
                  </a>

                  <a
                    href={form.downloadUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 ${
                      form.downloadUrl
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-border bg-muted text-muted-foreground pointer-events-none opacity-50"
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    Cek Link
                  </a>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Script
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}