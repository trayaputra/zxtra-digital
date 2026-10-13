import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Store,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const { login, loginWithGoogle, register, checkEmailVerification } = useAuth();
  const { toast } = useToast();

  // Detect verification automatically. When Firebase marks the account as
  // verified after the email link is opened, AuthContext creates/loads the
  // profile and the normal auth routing can open the dashboard.
  useEffect(() => {
    if (!verificationEmail) return;
    let stopped = false;
    let checking = false;

    const check = async () => {
      if (checking || stopped) return;
      checking = true;
      try {
        const verified = await checkEmailVerification();
        if (verified && !stopped) {
          setVerificationEmail(null);
          toast({
            title: "Email berhasil diverifikasi!",
            description: "Akun kamu sudah aktif. Mengarahkan ke dashboard...",
          });
        }
      } catch (error) {
        console.error("Gagal memeriksa verifikasi email:", error);
      } finally {
        checking = false;
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [verificationEmail, checkEmailVerification, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);

        toast({
          title: "Berhasil masuk!",
          description: "Selamat datang kembali di Zxtraa Store.",
        });
      } else {
        if (!name.trim()) {
          throw new Error("Nama tidak boleh kosong");
        }

        await register(email, password, name);
        setVerificationEmail(email.trim());
        return;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan";

      const friendly =
        msg.includes("user-not-found") ||
        msg.includes("wrong-password") ||
        msg.includes("invalid-credential")
          ? "Email atau password salah."
          : msg.includes("email-already-in-use")
            ? "Email sudah digunakan."
            : msg.includes("weak-password")
              ? "Password minimal 6 karakter."
              : msg.includes("invalid-email")
                ? "Format email tidak valid."
                : msg;

      toast({
        title: "Gagal",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);

    try {
      await loginWithGoogle();

      toast({
        title: "Login Google berhasil!",
        description: "Selamat datang di Zxtraa Store.",
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";

      const msg =
        err instanceof Error
          ? err.message
          : "Gagal login dengan Google.";

      const friendly =
        code === "auth/popup-closed-by-user"
          ? "Login Google dibatalkan."
          : code === "auth/popup-blocked"
            ? "Popup Google diblokir browser. Izinkan popup lalu coba lagi."
            : code === "auth/account-exists-with-different-credential"
              ? "Email tersebut sudah terdaftar dengan metode login lain."
              : msg;

      toast({
        title: "Login Google gagal",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  if (verificationEmail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="rounded-3xl border border-emerald-200/70 dark:border-emerald-800 bg-card p-6 sm:p-8 shadow-xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Mail className="h-8 w-8" />
            </div>
            <div className="text-center">
              <div className="mb-2 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Verifikasi email diperlukan
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">Cek email kamu</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Link verifikasi sudah dikirim ke alamat email berikut. Buka email dari Firebase, lalu tekan tombol verifikasi untuk mengaktifkan akunmu.
              </p>
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-300/70 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Email terdaftar</p>
              <p className="mt-1 break-all text-sm font-extrabold text-emerald-950 dark:text-emerald-100">{verificationEmail}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-800/80 dark:text-emerald-300/80">
                Tidak menemukan emailnya? Periksa folder Spam atau Promosi.
              </p>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menunggu verifikasi email otomatis...
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Halaman ini akan mendeteksi verifikasi secara otomatis. Jangan tutup halaman ini.
            </p>
            <button
              type="button"
              onClick={async () => { setVerificationEmail(null); setMode("login"); setPassword(""); }}
              className="mt-3 w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Kembali ke login
            </button>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">ZXtraStore · Verifikasi akun yang aman</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary shadow-lg shadow-primary/30 mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-extrabold text-foreground">
            Zxtraa Store
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Digital Product & Panel Shop
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl shadow-xl border border-card-border p-6">
          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                data-testid={`tab-${m}`}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{
                opacity: 0,
                x: mode === "login" ? -20 : 20,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: mode === "login" ? 20 : -20,
              }}
              transition={{ duration: 0.22 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === "register" && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                  <input
                    type="text"
                    placeholder="Nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-name"
                    className="w-full bg-muted border border-input rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  className="w-full bg-muted border border-input rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                  className="w-full bg-muted border border-input rounded-2xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                data-testid="btn-submit-auth"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-primary/25 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "login"
                      ? "Masuk"
                      : "Buat Akun"}

                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              atau
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full bg-background border border-input hover:bg-muted text-foreground font-semibold py-3 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.93v2.44h3.14c1.84-1.69 2.92-4.18 2.92-7.24Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 21.7c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.74 9.74 0 0 0 12 21.7Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.54 13.8a5.86 5.86 0 0 1 0-3.6V7.68H3.3a9.72 9.72 0 0 0 0 8.64l3.24-2.52Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6.17c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.22 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.38l3.24 2.52C7.31 7.89 9.46 6.17 12 6.17Z"
                  />
                </svg>

                <span>
                  Lanjutkan dengan Google
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Dengan masuk, kamu menyetujui syarat & ketentuan
          Zxtraa Store.
        </p>
      </motion.div>
    </div>
  );
}
