import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Package,
  Server,
  Crown,
  ArrowRight,
  Zap,
  Shield,
  Headphones,
  Star,
  MessageCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { BroadcastCard } from "../components/BroadcastCard";
import { PromoBanner } from "../components/PromoBanner";
import { useAuth } from "../contexts/AuthContext";
import {
  getProducts,
  getPanels,
  getUserTransactions,
  getApkMods,
  subscribeBroadcast,
  subscribePromoBanner,
} from "../lib/firestore";
import { getNokosServices, extractServices } from "../lib/nokos-api";
import type { BroadcastSetting, PromoBannerSetting } from "../types";

const spring = { type: "spring" as const, stiffness: 220, damping: 24, mass: 0.7 };

const card = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring },
};

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { userProfile } = useAuth();

  const [broadcastHome, setBroadcastHome] =
    useState<BroadcastSetting | null>(null);

  const [promoBanner, setPromoBanner] =
    useState<PromoBannerSetting | null>(null);

  const [counts, setCounts] = useState({
    products: 0,
    panels: 0,
    transactions: 0,
    nokos: 0,
    apkMods: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    // Each source is resolved independently: one failing service (e.g. Nokos
    // provider offline) must never blank out the other counters.
    const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch(() => fallback);

    Promise.all([
      safe(getProducts(), [] as Awaited<ReturnType<typeof getProducts>>),
      safe(getPanels(), [] as Awaited<ReturnType<typeof getPanels>>),
      safe(
        getUserTransactions(userProfile.id),
        [] as Awaited<ReturnType<typeof getUserTransactions>>,
      ),
      safe(getNokosServices(), null as unknown),
      safe(getApkMods(), [] as Awaited<ReturnType<typeof getApkMods>>),
    ]).then(([products, panels, txs, nokosRaw, apkMods]) => {
      let nokosCount = 0;
      try {
        nokosCount = extractServices(nokosRaw as never).length;
      } catch {
        nokosCount = 0;
      }

      setCounts({
        products: products.filter((p) => p.available !== false).length,
        panels: panels
          .filter((p) => p.available !== false)
          .reduce((n, p) => n + (p.variants?.filter((v) => v.isActive).length || 0), 0),
        transactions: txs.length,
        nokos: nokosCount,
        apkMods: apkMods.filter((item) => item.available !== false).length,
      });

      setLoading(false);
    });
  }, [userProfile]);

  useEffect(() => {
    const unsub = subscribeBroadcast("broadcast_home", setBroadcastHome);
    const unsubPromo = subscribePromoBanner(setPromoBanner);
    return () => {
      unsub();
      unsubPromo();
    };
  }, []);

  const isReseller =
    userProfile?.role === "reseller" || userProfile?.role === "admin";

  const adminWa = import.meta.env.VITE_ADMIN_WHATSAPP || "6285782544861";

  const statCards = [
    {
      label: "Apk premium",
      value: counts.products,
      icon: Package,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      iconBg: "bg-emerald-100",
      href: "/products",
      desc: "Produk digital premium",
    },
    {
      label: "Panel Tersedia",
      value: counts.panels,
      icon: Server,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      iconBg: "bg-blue-100",
      href: "/panels",
      desc: "Panel bot WhatsApp",
    },
    {
      label: "Layanan Nokos",
      value: counts.nokos,
      icon: MessageCircle,
      color: "bg-green-50 text-green-600 border-green-100",
      iconBg: "bg-green-100",
      href: "/nokos",
      desc: "Nokos Dari Berbagai Negara",
    },
    {
      label: "APK Mod",
      value: counts.apkMods,
      icon: Zap,
      color: "bg-pink-50 text-pink-600 border-pink-100",
      iconBg: "bg-pink-100",
      href: "/apk-mod",
      desc: "Download APK mod premium",
    },
  ];

  const features = [
    {
      icon: Shield,
      label: "Bergaransi",
      desc: "Semua produk bergaransi resmi",
    },
    {
      icon: Zap,
      label: "Proses Cepat",
      desc: "Pengiriman otomatis & instan",
    },
    {
      icon: Star,
      label: "Harga Terbaik",
      desc: "Harga murah & transparan",
    },
    {
      icon: Headphones,
      label: "Support 24/7",
      desc: "Admin siap membantu kamu",
    },
  ];

  return (
    <AppLayout title="Dashboard TrayaStore">
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={card}>
          <BroadcastCard broadcast={broadcastHome} />
        </motion.div>

        <motion.div variants={card}>
          <PromoBanner banner={promoBanner} />
        </motion.div>

        {/* Greeting */}
        <motion.div
          variants={card}
          className="mint-gradient rounded-3xl p-5 sm:p-6 border border-primary/15 shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-primary/5 blur-xl" />

          <div className="relative">
            <p className="text-xs sm:text-sm text-primary/70 font-semibold tracking-wide uppercase">
              Selamat datang kembali
            </p>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 tracking-tight">
              {userProfile?.displayName} 👋
            </h2>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
                  userProfile?.role === "admin"
                    ? "bg-purple-100 text-purple-700"
                    : isReseller
                      ? "bg-blue-100 text-blue-700"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {userProfile?.role === "admin"
                  ? "Admin"
                  : isReseller
                    ? "✓ Reseller"
                    : "User"}
              </span>

              {!isReseller && (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={spring}
                  onClick={() => setLocation("/upgrade")}
                  className="text-[11px] text-primary font-bold flex items-center gap-1 bg-card/70 border border-primary/20 px-3 py-1.5 rounded-full"
                >
                  <Crown className="w-3 h-3" />
                  Upgrade Reseller
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Reseller expiry warning */}
        {isReseller && userProfile?.resellerExpiry && (
          <motion.div
            variants={card}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
          >
            <Crown className="w-5 h-5 text-amber-500 shrink-0" />

            <div>
              <p className="text-sm font-bold text-amber-800">
                Masa Aktif Reseller
              </p>

              <p className="text-xs text-amber-600">
                Berakhir:{" "}
                {new Date(userProfile.resellerExpiry).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          variants={listContainer}
          className="grid grid-cols-2 gap-3"
        >
          {statCards.map((s) => (
            <motion.button
              key={s.label}
              variants={card}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={() => setLocation(s.href)}
              data-testid={`stat-card-${s.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              className={`group relative flex flex-col items-start p-4 sm:p-5 rounded-3xl border text-left overflow-hidden shadow-xs hover:shadow-lg will-change-transform ${s.color}`}
            >
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-current opacity-[0.06]" />

              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shrink-0 ${s.iconBg}`}
              >
                <s.icon className="w-5 h-5" />
              </div>

              {loading ? (
                <div className="w-14 h-8 rounded-lg bg-current/10 skeleton-pulse mb-1" />
              ) : (
                <p className="text-3xl font-extrabold leading-none tracking-tight tabular-nums">
                  {s.value}
                </p>
              )}

              <p className="font-bold text-sm mt-2">{s.label}</p>

              <p className="text-[11px] opacity-70 mt-0.5 leading-snug">
                {s.desc}
              </p>

              <div className="flex items-center gap-1 mt-3 text-[11px] font-bold opacity-80">
                Lihat semua
                <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Why buy here */}
        <motion.div variants={listContainer}>
          <motion.h3
            variants={card}
            className="text-base font-bold text-foreground mb-3 tracking-tight"
          >
            Kenapa Beli di Sini?
          </motion.h3>

          <div className="grid grid-cols-2 gap-2.5">
            {features.map((f) => (
              <motion.div
                key={f.label}
                variants={card}
                whileHover={{ y: -3 }}
                transition={spring}
                className="bg-card rounded-2xl border border-card-border p-4 flex items-start gap-3 shadow-xs hover:shadow-md will-change-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>

                <div>
                  <p className="font-bold text-sm text-foreground">
                    {f.label}
                  </p>

                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={listContainer} className="grid grid-cols-2 gap-3">
          <motion.button
            variants={card}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => setLocation("/products")}
            data-testid="btn-browse-products"
            className="bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-primary/25 will-change-transform"
          >
            <Package className="w-5 h-5" />
            Beli Produk
          </motion.button>

          <motion.button
            variants={card}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => setLocation("/panels")}
            data-testid="btn-browse-panels"
            className="bg-card border border-primary/25 text-primary rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm shadow-xs will-change-transform"
          >
            <Server className="w-5 h-5" />
            Beli Panel
          </motion.button>
        </motion.div>

        {/* Contact admin */}
        <motion.a
          variants={card}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          href={`https://wa.me/${adminWa}?text=Halo admin PremiumStore, saya butuh bantuan.`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="btn-contact-admin"
          className="group flex items-center gap-3 bg-green-500 text-white rounded-3xl p-4 shadow-md shadow-green-500/25 will-change-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>

          <div>
            <p className="font-bold text-sm">Hubungi Admin</p>
            <p className="text-[11px] opacity-85">
              WhatsApp • Respon cepat
            </p>
          </div>

          <ArrowRight className="w-4 h-4 ml-auto transition-transform duration-300 group-hover:translate-x-1" />
        </motion.a>
      </motion.div>
    </AppLayout>
  );
}