import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Server,
  Shield,
  Zap,
  Headphones,
  DollarSign,
  MessageCircle,
  ShoppingCart,
  Loader2,
  Code2,
  Eye,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import {
  subscribePanels,
  subscribeBotScripts,
  createTransaction,
  updateTransaction,
  getRecentPendingTransaction,
} from "../lib/firestore";
import { createQrisPayment } from "../lib/ramashop";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import type { Panel, PanelVariant, BotScript } from "../types";

const features = [
  { icon: Shield, title: "Bergaransi", desc: "Setiap panel dijamin aktif dan stabil." },
  { icon: DollarSign, title: "Harga Murah", desc: "Harga bersaing, diskon khusus reseller." },
  { icon: Zap, title: "Setup Cepat", desc: "Admin proses dalam waktu singkat." },
  { icon: Headphones, title: "Support 24/7", desc: "Bantuan via WhatsApp kapan saja." },
];

type ActiveTab = "panel" | "script";

export default function PanelsPage() {
  const { isReseller, userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<ActiveTab>("panel");
  const [panels, setPanels] = useState<Panel[]>([]);
  const [scripts, setScripts] = useState<BotScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [buyingId, setBuyingId] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, number>>({});

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  useEffect(() => {
    return subscribePanels(ps => {
      setPanels(ps.filter(p => p.available !== false));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    return subscribeBotScripts(items => {
      setScripts(items.filter(item => item.available !== false));
      setScriptsLoading(false);
    });
  }, []);

  const getActiveVariants = (panel: Panel): PanelVariant[] =>
    panel.variants?.filter(v => v.isActive) ?? [];

  const getPrice = (variant: PanelVariant): number =>
    isReseller && variant.resellerPrice > 0 ? variant.resellerPrice : variant.price;

  const handleBuy = async (panel: Panel, forcedVariantIndex?: number) => {
    if (!userProfile) return;

    const activeVariants = getActiveVariants(panel);
    const idx = forcedVariantIndex ?? selectedVariants[panel.id] ?? 0;
    const variant = activeVariants[idx];

    if (!variant) return;

    const price = getPrice(variant);

    const finalAmount = price;
    if (finalAmount < 1000) {
      toast({ title: "Total pembayaran terlalu kecil", description: "Nominal pembayaran minimal Rp 1.000.", variant: "destructive" });
      return;
    }

    setBuyingId(`${panel.id}_${variant.id}`);

    try {
      const existingTx = await getRecentPendingTransaction(
        userProfile.id,
        "panel",
        {
          panelId: panel.id,
          panelVariantId: variant.id,
        },
      );

      if (existingTx?.qrisDepositId) {
        toast({ title: "Melanjutkan pembayaran sebelumnya" });
        setLocation(`/payment/${existingTx.id}`);
        return;
      }

      const txId = await createTransaction({
        userId: userProfile.id,
        userEmail: userProfile.email || "",
        userName: userProfile.displayName || "",
        type: "panel",
        amount: finalAmount,
        originalAmount: price,
        method: "qris",
        paymentStatus: "pending",
        orderStatus: "pending_payment",
        panelId: panel.id,
        panelName: panel.name,
        panelVariantId: variant.id,
        panelVariantName: variant.name,
      });

      const qres = await createQrisPayment(finalAmount);

      if (!qres.success && !qres.status) {
        const msg = qres.message || "";
        let userMsg = "Gagal membuat QRIS. Coba lagi.";

        if (!msg && !qres.data) {
          userMsg = "API Key QRIS belum dikonfigurasi. Set di Admin → Pengaturan.";
        } else if (msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("unauthorized")) {
          userMsg = "API Key tidak valid. Periksa Pengaturan Admin.";
        } else if (msg.toLowerCase().includes("balance") || msg.toLowerCase().includes("saldo")) {
          userMsg = "Saldo RamaShop tidak cukup. Hubungi admin.";
        } else if (msg) {
          userMsg = msg;
        }

        await updateTransaction(txId, {
          paymentStatus: "failed",
          orderStatus: "cancelled",
        });

        toast({
          title: "Gagal membuat QRIS",
          description: userMsg,
          variant: "destructive",
        });

        return;
      }

      if (!qres.data?.depositId) {
        await updateTransaction(txId, {
          paymentStatus: "failed",
          orderStatus: "cancelled",
        });

        toast({
          title: "Gagal membuat QRIS",
          description: "Response API kosong. Pastikan API Key QRIS benar.",
          variant: "destructive",
        });

        return;
      }

      await updateTransaction(txId, {
        amount: qres.data.payAmount || qres.data.totalAmount || finalAmount,
        qrisDepositId: qres.data.depositId,
        qrisImage: qres.data.qrImage || "",
        qrisString: qres.data.qrString || "",
        qrisExpiredAt: qres.data.expiredAt || "",
      });

      setLocation(`/payment/${txId}`);
    } catch (err) {
      toast({
        title: "Gagal membuat pembayaran",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBuyingId("");
    }
  };

  return (
    <AppLayout title="Panel">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mint-gradient rounded-3xl p-5 border border-primary/15"
        >
          <div className="flex items-center gap-2 mb-1">
            {activeTab === "panel" ? (
              <Server className="w-5 h-5 text-primary" />
            ) : (
              <Code2 className="w-5 h-5 text-primary" />
            )}
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              {activeTab === "panel" ? "Server Panel" : "Script Bot"}
            </span>
          </div>

          <h2 className="text-xl font-extrabold text-foreground">
            {activeTab === "panel" ? "Panel Bot & Server" : "Script Bot Panel"}
          </h2>

          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "panel"
              ? "Pilih RAM panel sesuai kebutuhan. Setiap RAM punya tombol beli sendiri."
              : "Pilih script bot, lihat preview video, lalu download dari halaman detail."}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border border-card-border rounded-2xl p-3.5"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-bold text-xs text-foreground">{f.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 bg-card border border-card-border rounded-3xl p-1.5">
          <button
            onClick={() => setActiveTab("panel")}
            className={`h-11 rounded-2xl text-sm font-extrabold transition-all ${
              activeTab === "panel"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Panel
          </button>

          <button
            onClick={() => setActiveTab("script")}
            className={`h-11 rounded-2xl text-sm font-extrabold transition-all ${
              activeTab === "script"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Script
          </button>
        </div>

        {activeTab === "panel" && (
          <>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-card rounded-3xl border border-card-border skeleton-pulse"
                  />
                ))}
              </div>
            ) : panels.length === 0 ? (
              <div className="text-center py-16">
                <Server className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Belum ada panel tersedia</p>
              </div>
            ) : (
              <motion.div
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                initial="hidden"
                animate="show"
                className="space-y-5"
              >
                {panels.map(panel => {
                  const activeVariants = getActiveVariants(panel);

                  return (
                    <motion.div
                      key={panel.id}
                      variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3 px-1">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-extrabold text-base text-foreground">{panel.name}</p>
                          {panel.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {panel.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {activeVariants.length > 0 ? (
                        <div className="space-y-2.5">
                          {activeVariants.map((variant, i) => {
                            const price = getPrice(variant);
                            const buying = buyingId === `${panel.id}_${variant.id}`;
                            const resellerActive = isReseller && variant.resellerPrice > 0;

                            return (
                              <div
                                key={variant.id}
                                className="bg-card rounded-3xl border border-card-border p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                                        <Server className="w-5 h-5 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-sm text-foreground truncate">
                                          {variant.name}
                                        </p>
                                        {variant.duration && (
                                          <p className="text-[11px] text-muted-foreground">
                                            Aktif {variant.duration}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {variant.description && (
                                      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                                        {variant.description}
                                      </p>
                                    )}

                                    <div className="mt-3">
                                    {resellerActive ? (
                                        <>
                                          <p className="text-xs text-muted-foreground line-through">
                                            Rp {variant.price.toLocaleString("id-ID")}
                                          </p>
                                          <p className="text-xl font-extrabold text-primary">
                                            Rp {variant.resellerPrice.toLocaleString("id-ID")}
                                          </p>
                                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">
                                            Harga Reseller
                                          </span>
                                        </>
                                      ) : (
                                        <p className="text-xl font-extrabold text-primary">
                                          Rp {price.toLocaleString("id-ID")}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setSelectedVariants(prev => ({ ...prev, [panel.id]: i }));
                                      handleBuy(panel, i);
                                    }}
                                    disabled={buying}
                                    className="bg-primary text-primary-foreground font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md shadow-primary/25 active:scale-[0.98] transition-all text-sm disabled:opacity-60 shrink-0"
                                  >
                                    {buying ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Membuat...
                                      </>
                                    ) : (
                                      <>
                                        <ShoppingCart className="w-4 h-4" />
                                        Beli
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-card rounded-3xl border border-card-border p-4 text-center">
                          <p className="text-xs text-muted-foreground">Tidak ada panel tersedia</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}

              </motion.div>
            )}
          </>
        )}

        {activeTab === "script" && (
          <>
            {scriptsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 bg-card rounded-3xl border border-card-border skeleton-pulse"
                  />
                ))}
              </div>
            ) : scripts.length === 0 ? (
              <div className="text-center py-16">
                <Code2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-semibold text-muted-foreground">Belum ada script tersedia</p>
              </div>
            ) : (
              <motion.div
                variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {scripts.map(script => (
                  <motion.div
                    key={script.id}
                    variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}
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
                          <Code2 className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                      )}

                      {script.version && (
                        <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                          v{script.version}
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-extrabold text-base text-foreground">
                        {script.name}
                      </h3>

                      {script.size && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ukuran {script.size}
                        </p>
                      )}

                      <button
                        onClick={() => setLocation(`/script/${script.id}`)}
                        className="mt-4 w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                      >
                        <Eye className="w-4 h-4" />
                        Lihat Detail
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        <a
          href={`https://wa.me/${adminWa}?text=Halo admin, saya tertarik membeli panel. Bisa dibantu?`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Butuh rekomendasi panel?</p>
            <p className="text-xs opacity-80">Chat admin via WhatsApp</p>
          </div>
        </a>
      </div>
    </AppLayout>
  );
}