import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Sparkles,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";

const API_BASE = "https://api.qsr.web.id";

type Step = 1 | 2 | 3;

export default function AmPremPage() {
  const [, navigate] = useLocation();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearNotice = () => {
    setError("");
    setMessage("");
  };

  const sendMagicLink = async () => {
    const cleanEmail = email.trim().toLowerCase();

    clearNotice();

    if (!cleanEmail) {
      setError("Masukkan alamat email terlebih dahulu.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/alight/send?apikey=qsr&email=${encodeURIComponent(cleanEmail)}`
      );

      const data = await response.json();

      if (!response.ok || !data?.status) {
        throw new Error(data?.message || "Gagal mengirim Magic Link.");
      }

      setEmail(cleanEmail);
      setMessage(data?.message || "Magic Link berhasil dikirim ke email!");
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim Magic Link."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPremium = async () => {
    const cleanLink = magicLink.trim();

    clearNotice();

    if (!cleanLink) {
      setError("Tempel Magic Link terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/alight/verify?apikey=qsr&email=${encodeURIComponent(
          email
        )}&link=${encodeURIComponent(cleanLink)}`
      );

      const data = await response.json();

      if (!response.ok || !data?.status) {
        throw new Error(data?.message || "Gagal mengaktifkan Premium.");
      }

      setMessage(data?.message || "Premium berhasil diaktifkan!");
      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat verifikasi."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!magicLink) return;

    try {
      await navigator.clipboard.writeText(magicLink);
      setMessage("Magic Link berhasil disalin.");
    } catch {
      setMessage("Link siap disalin secara manual.");
    }
  };

  const reset = () => {
    setStep(1);
    setEmail("");
    setMagicLink("");
    setMessage("");
    setError("");
  };

  const steps = [
    { number: 1, label: "Email" },
    { number: 2, label: "Magic Link" },
    { number: 3, label: "Selesai" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 overflow-hidden px-4 sm:px-6">
          {/* Abstract header decoration */}
          <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute right-24 top-2 h-20 w-20 rotate-12 rounded-[2rem] border border-primary/10 bg-primary/5" />

          <button
            type="button"
            onClick={() => navigate("/")}
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/30 hover:bg-primary/5 active:scale-95"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="relative z-10 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              <h1 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">
                AM Prem Gratis
              </h1>
            </div>
            <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">
              Alight Motion Premium gratis
            </p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
        {/* Main abstract hero */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-primary/15 bg-card shadow-sm">
          {/* Abstract artwork */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-primary/15 blur-2xl" />
            <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

            <div className="absolute right-5 top-5 h-28 w-28 rotate-12 rounded-[2.5rem] border border-primary/10 bg-primary/5" />
            <div className="absolute right-20 top-16 h-16 w-16 -rotate-12 rounded-full border border-primary/15 bg-primary/10" />

            <svg
              className="absolute right-0 top-0 h-full w-1/2 opacity-50"
              viewBox="0 0 500 300"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M500 0C420 45 430 85 350 105C265 126 300 195 210 205C140 213 105 257 0 300"
                stroke="currentColor"
                className="text-primary/20"
                strokeWidth="2"
              />
              <path
                d="M500 35C430 75 430 112 365 130C290 151 305 211 220 228C145 243 90 275 15 300"
                stroke="currentColor"
                className="text-primary/10"
                strokeWidth="12"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="relative grid gap-7 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                PREMIUM GRATIS
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Alight Motion{" "}
                <span className="text-primary">Premium</span>
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Aktifkan Alight Motion Premium secara gratis menggunakan
                sistem Magic Link. Cepat, sederhana, dan tanpa perlu
                memasukkan password.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Gratis",
                  "Tanpa Password",
                  "Magic Link",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-background/70 px-3 py-1.5 text-xs font-bold text-muted-foreground backdrop-blur"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto hidden md:block">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <div className="absolute inset-0 rounded-[2.5rem] rotate-6 bg-primary/10" />
                <div className="absolute inset-3 rounded-[2rem] -rotate-6 border border-primary/20 bg-background/80 shadow-lg backdrop-blur" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                  <WandSparkles className="h-10 w-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step progress */}
        <div className="mx-auto mt-6 flex max-w-2xl items-center">
          {steps.map((item, index) => {
            const active = step >= item.number;
            const current = step === item.number;

            return (
              <div key={item.number} className="flex min-w-0 flex-1 items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "border-border bg-card text-muted-foreground",
                      current ? "ring-4 ring-primary/10" : "",
                    ].join(" ")}
                  >
                    {step > item.number ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      item.number
                    )}
                  </div>

                  <span
                    className={[
                      "hidden truncate text-xs font-bold sm:block",
                      active ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {item.label}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div className="mx-2 h-px flex-1 bg-border sm:mx-4">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{
                        width: step > item.number ? "100%" : "0%",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <section className="mx-auto mt-6 max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm"
              >
                <div className="border-b border-border/70 px-6 py-5 sm:px-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>

                    <div>
                      <h3 className="font-extrabold tracking-tight">
                        Masukkan Email
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        Gunakan email yang ingin kamu jadikan akun Alight
                        Motion Premium.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6 sm:p-7">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Alamat Email
                    </label>

                    <div className="group flex h-13 items-center gap-3 rounded-2xl border border-input bg-background px-4 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <Mail className="h-5 w-5 shrink-0 text-muted-foreground transition group-focus-within:text-primary" />

                      <input
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          clearNotice();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            sendMagicLink();
                          }
                        }}
                        placeholder="contoh@gmail.com"
                        autoComplete="email"
                        className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={sendMagicLink}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/15 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengirim Magic Link...
                      </>
                    ) : (
                      <>
                        Lanjutkan
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Tidak perlu memasukkan password
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm"
              >
                <div className="relative overflow-hidden border-b border-border/70 px-6 py-6 sm:px-7">
                  <div className="pointer-events-none absolute -right-10 -top-14 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

                  <div className="relative flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-extrabold tracking-tight">
                        Magic Link Terkirim
                      </h3>
                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6 sm:p-7">
                  <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>

                      <div>
                        <p className="text-sm font-extrabold">
                          Cek inbox email kamu
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Periksa Inbox, Spam, Junk, atau Promosi. Buka Magic
                          Link dari email tersebut, lalu salin URL-nya.
                        </p>
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
                      {message}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Magic Link
                    </label>

                    <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-input bg-background px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                      <ExternalLink className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />

                      <input
                        type="url"
                        value={magicLink}
                        onChange={(event) => {
                          setMagicLink(event.target.value);
                          clearNotice();
                        }}
                        placeholder="Tempel URL Magic Link di sini..."
                        className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium outline-none placeholder:text-muted-foreground"
                      />

                      <button
                        type="button"
                        onClick={copyLink}
                        disabled={!magicLink}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/20 hover:text-primary disabled:opacity-40"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Salin
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={verifyPremium}
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/15 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      <>
                        Verifikasi & Aktifkan
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setMagicLink("");
                      clearNotice();
                    }}
                    className="mx-auto block text-xs font-bold text-muted-foreground transition hover:text-primary"
                  >
                    ← Gunakan email lain
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.98, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card shadow-sm"
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

                <div className="relative px-6 py-10 text-center sm:px-8 sm:py-12">
                  <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/20">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                  </div>

                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    PREMIUM AKTIF
                  </div>

                  <h3 className="text-2xl font-black tracking-tight sm:text-3xl">
                    Berhasil! 🎉
                  </h3>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    Alight Motion Premium berhasil diaktifkan untuk:
                  </p>

                  <div className="mx-auto mt-5 max-w-md rounded-2xl border border-border bg-background px-4 py-3">
                    <p className="break-all text-sm font-extrabold">
                      {email}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {["Premium Aktif", "Tanpa Password", "Gratis"].map(
                      (item) => (
                        <span
                          key={item}
                          className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {item}
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={reset}
                    className="mx-auto mt-8 flex h-11 items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 text-sm font-extrabold transition hover:border-primary/20 hover:bg-primary/5"
                  >
                    Aktivasi Email Lain
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* How it works */}
        <section className="mx-auto mt-6 max-w-2xl">
          <div className="mb-3 px-1">
            <h3 className="text-sm font-extrabold">Cara kerja</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Aktivasi dilakukan dalam tiga langkah sederhana.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              {
                icon: Mail,
                title: "Masukkan Email",
                desc: "Masukkan email yang ingin diaktifkan.",
              },
              {
                icon: ExternalLink,
                title: "Buka Magic Link",
                desc: "Cek email dan salin link aktivasi.",
              },
              {
                icon: CheckCircle2,
                title: "Premium Aktif",
                desc: "Verifikasi dan selesai.",
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/20 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
                        {index + 1}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-extrabold">{item.title}</p>
                      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
