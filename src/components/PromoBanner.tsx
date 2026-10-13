import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Mail,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import defaultPromoImage from "../assets/promo-freelance-gmail.jpg";
import type { PromoBannerSetting } from "../types";

export const defaultPromoBanner: PromoBannerSetting = {
  enabled: true,
  title: "Freelance Job Gmail",
  subtitle:
    "Setor Gmail, dibayar cepat. Makin banyak setor, makin besar ratenya!",
  rateText: "Rp 4.000 / Gmail",
  exampleText: "Contoh: setor 10 × 4rb = Rp 40.000",
  imageUrl: "",
  buttonText: "Join Sekarang",
  buttonUrl: "https://wa.me/6285782544861",
};

interface PromoBannerProps {
  banner: PromoBannerSetting | null;
}

type Slide =
  | {
      type: "promo";
      data: PromoBannerSetting;
    }
  | {
      type: "am-prem";
    };

export function PromoBanner({ banner }: PromoBannerProps) {
  const data = banner ?? defaultPromoBanner;

  const slides: Slide[] = [
    {
      type: "promo",
      data,
    },
    {
      type: "am-prem",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!data.enabled) return null;

  const previousSlide = () => {
    setActiveIndex(
      (current) => (current - 1 + slides.length) % slides.length,
    );
  };

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div
      className="relative mb-4"
    >
      <div className="relative overflow-hidden rounded-3xl">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeIndex}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              const offset = info.offset.x;
              const velocity = info.velocity.x;

              if (offset < -50 || velocity < -500) {
                setActiveIndex((current) => (current + 1) % slides.length);
              } else if (offset > 50 || velocity > 500) {
                setActiveIndex(
                  (current) => (current - 1 + slides.length) % slides.length,
                );
              }
            }}
            className="cursor-grab touch-pan-y active:cursor-grabbing"
          >
            {slides[activeIndex].type === "promo" ? (
              <PromoSlide data={slides[activeIndex].data} />
            ) : (
              <AmPremSlide />
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {slides.length > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Ke banner ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromoSlide({ data }: { data: PromoBannerSetting }) {
  const image = data.imageUrl?.trim()
    ? data.imageUrl
    : defaultPromoImage;

  const handleJoin = () => {
    const url = data.buttonUrl?.trim();
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card shadow-sm"
    >
      <div className="relative h-40 w-full overflow-hidden sm:h-48">
        <img
          src={image}
          alt={data.title || "Banner promosi freelance Gmail"}
          loading="lazy"
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold text-primary-foreground shadow">
          <Sparkles className="h-3 w-3" />
          PROMO FREELANCE
        </div>

        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow sm:text-xl">
            {data.title}
          </h3>

          {data.subtitle && (
            <p className="mt-1 line-clamp-2 text-[11px] text-white/85 sm:text-xs">
              {data.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 bg-card p-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <Mail className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Rate
              </span>
            </div>

            <p className="mt-1 text-sm font-extrabold text-emerald-800 dark:text-emerald-200">
              {data.rateText}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                Makin Banyak
              </span>
            </div>

            <p className="mt-1 text-[11px] font-bold leading-snug text-amber-800 dark:text-amber-200">
              {data.exampleText}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleJoin}
          data-testid="btn-promo-join"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 transition-transform active:scale-[0.98]"
        >
          {data.buttonText || "Join Sekarang"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function AmPremSlide() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-[360px] overflow-hidden rounded-3xl border border-primary/20 bg-card"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute right-[-45px] top-[-35px] h-40 w-40 rotate-12 rounded-[2rem] border border-primary/20 bg-primary/5" />
        <div className="absolute right-[35px] top-[30px] h-24 w-24 -rotate-12 rounded-3xl border border-primary/15 bg-primary/10" />

        <svg
          className="absolute inset-0 h-full w-full opacity-40"
          viewBox="0 0 600 400"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M-20 300C90 220 120 340 230 255C340 170 390 250 470 155C530 85 570 115 630 55"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
          />
          <path
            d="M-30 335C90 255 140 375 250 290C355 210 405 280 490 185C550 120 590 150 640 90"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/40"
          />
        </svg>

        <div className="absolute right-8 top-8 grid grid-cols-5 gap-2 opacity-30">
          {Array.from({ length: 25 }).map((_, index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-[360px] flex-col justify-between p-5 sm:p-7">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Special Offer
          </div>

          <div className="mt-6 max-w-[310px]">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <Zap className="h-6 w-6" />
            </div>

            <h3 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl">
              Alight Motion
              <span className="block text-primary">Premium Gratis</span>
            </h3>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Dapatkan akses premium Alight Motion secara gratis. Ikuti proses
              singkat dan aktifkan akunmu sekarang.
            </p>
          </div>
        </div>

        <div className="mt-7 flex items-center gap-2">
          <Link
            href="/am-prem"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Klaim Sekarang
            <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="hidden rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-center sm:block">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Akses
            </p>
            <p className="text-xs font-extrabold text-primary">
              GRATIS
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
