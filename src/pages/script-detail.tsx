import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Code2,
  Download,
  Loader2,
  PlayCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { getBotScript } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import type { BotScript } from "../types";

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [script, setScript] = useState<BotScript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScript = async () => {
      if (!id) return;

      setLoading(true);

      try {
        const data = await getBotScript(id);

        if (!data) {
          toast({
            title: "Script tidak ditemukan",
            variant: "destructive",
          });
          setLocation("/panels");
          return;
        }

        setScript(data);
      } catch (err) {
        toast({
          title: "Gagal memuat script",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadScript();
  }, [id, setLocation, toast]);

  const handleDownload = () => {
    if (!script?.downloadUrl) {
      toast({
        title: "Link download belum tersedia",
        variant: "destructive",
      });
      return;
    }

    window.open(script.downloadUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <AppLayout title="Detail Script">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!script) return null;

  return (
    <AppLayout title="Detail Script">
      <div className="space-y-5 pb-6">
        <button
          onClick={() => setLocation("/panels")}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Panel
        </button>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-card-border overflow-hidden shadow-sm"
        >
          <div className="relative aspect-video bg-muted overflow-hidden">
            {script.imageUrl ? (
              <img
                src={script.imageUrl}
                alt={script.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Code2 className="w-12 h-12 text-muted-foreground/40" />
              </div>
            )}

            {script.version && (
              <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                v{script.version}
              </span>
            )}
          </div>

          <div className="p-5">
            <h1 className="text-xl font-extrabold text-foreground">
              {script.name}
            </h1>

            {script.size && (
              <p className="text-xs text-muted-foreground mt-1">
                Ukuran file: {script.size}
              </p>
            )}

            <button
              onClick={handleDownload}
              className="mt-4 w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/25 active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" />
              Download Script
            </button>
          </div>
        </motion.div>

        {script.previewVideoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="bg-card rounded-3xl border border-card-border p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-5 h-5 text-primary" />
              <h2 className="font-extrabold text-base text-foreground">
                Preview Video
              </h2>
            </div>

            <video
              src={script.previewVideoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-2xl bg-black aspect-video object-cover"
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card rounded-3xl border border-card-border p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="w-5 h-5 text-primary" />
            <h2 className="font-extrabold text-base text-foreground">
              Deskripsi Script
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {script.description || "Belum ada deskripsi."}
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}