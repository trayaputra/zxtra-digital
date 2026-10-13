import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import {
  getTransaction,
  updateTransaction,
  createManualOrder,
  upgradeUserToReseller,
  getResellerPackages,
} from "../lib/firestore";
import { checkDepositStatus, isDepositSuccess } from "../lib/ramashop";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import type { Transaction } from "../types";

type TransactionExtra = Transaction & {
  qrisDepositId?: string;
  qrisImage?: string;
  qrisString?: string;
  qrisExpiredAt?: string;
  expiredReason?: string;
  resellerActiveUntil?: string | null;
};

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [tx, setTx] = useState<TransactionExtra | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const manualOrderCreatedRef = useRef(false);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadTx = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const data = await getTransaction(id);

      if (!data) {
        toast({
          title: "Transaksi tidak ditemukan",
          variant: "destructive",
        });
        navigate("/history");
        return;
      }

      if (data.userId !== userProfile?.id) {
        toast({
          title: "Transaksi bukan milik akun ini",
          variant: "destructive",
        });
        navigate("/history");
        return;
      }

      setTx(data as TransactionExtra);
    } catch (err) {
      toast({
        title: "Gagal memuat transaksi",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, userProfile?.id, toast, navigate]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);

  const isExpired = useCallback((data: TransactionExtra | null) => {
    if (!data?.qrisExpiredAt) return false;
    return new Date(data.qrisExpiredAt).getTime() <= Date.now();
  }, []);

  const markExpired = useCallback(async () => {
    if (!tx?.id || processingRef.current) return;

    processingRef.current = true;

    try {
      stopPoll();
      stopTimer();

      await updateTransaction(tx.id, {
        paymentStatus: "expired",
        orderStatus: "cancelled",
        expiredReason: "Pembayaran melewati batas waktu",
      });

      setTx(prev =>
        prev
          ? {
              ...prev,
              paymentStatus: "expired",
              orderStatus: "cancelled",
              expiredReason: "Pembayaran melewati batas waktu",
            }
          : prev,
      );

      toast({
        title: "Pembayaran kadaluarsa",
        description: "Waktu pembayaran sudah habis.",
        variant: "destructive",
      });
    } catch (err) {
      processingRef.current = false;
      console.error(err);
    }
  }, [tx, stopPoll, stopTimer, toast]);

  const handleCheckStatus = useCallback(
    async (silent = false) => {
      if (!tx?.qrisDepositId) return;
      if (tx.paymentStatus !== "pending") return;

      if (!silent) setChecking(true);

      try {
        const res = await checkDepositStatus(tx.qrisDepositId);

        if (isDepositSuccess(res.status)) {
          stopPoll();
          stopTimer();

          const isResellerUpgrade =
            tx.type === "reseller_upgrade" ||
            Boolean(tx.resellerPackageId) ||
            Boolean(tx.resellerPackageName);

          if (isResellerUpgrade) {
            const packages = await getResellerPackages();
            const resellerPackage = packages.find(p => p.id === tx.resellerPackageId);

            if (!resellerPackage) {
              throw new Error("Paket reseller tidak ditemukan.");
            }

            const expiry = await upgradeUserToReseller(tx.userId, resellerPackage);

            await updateTransaction(tx.id, {
              paymentStatus: "paid",
              orderStatus: "done",
              resellerActiveUntil: expiry,
            });

            setTx(prev =>
              prev
                ? {
                    ...prev,
                    paymentStatus: "paid",
                    orderStatus: "done",
                    resellerActiveUntil: expiry,
                  }
                : prev,
            );

            toast({
              title: "Upgrade Reseller Berhasil 🎉",
              description: `Paket ${resellerPackage.name} sudah aktif di akun kamu.`,
            });

            return;
          }

          await updateTransaction(tx.id, {
            paymentStatus: "paid",
            orderStatus: tx.orderStatus === "done" ? "done" : "waiting_admin",
          });

          if (!manualOrderCreatedRef.current) {
            manualOrderCreatedRef.current = true;

            await createManualOrder({
              userId: tx.userId,
              userName: tx.userName || userProfile?.name || "",
              userEmail: tx.userEmail || userProfile?.email || "",
              buyerWhatsapp: tx.buyerWhatsapp || "",

              transactionId: tx.id,

              type: tx.productName ? "product" : tx.panelName ? "panel" : "reseller_upgrade",

              productId: tx.productId || "",
              panelId: tx.panelId || "",

              productName: tx.productName || "",
              panelName: tx.panelName || "",
              resellerPackageName: tx.resellerPackageName || "",

              variantName: tx.variantName || "",
              panelVariantName: tx.panelVariantName || "",

              amount: tx.amount || 0,

              status: "waiting",
              adminNote: "",
              deliveredFields: [],
            });
          }

          setTx(prev =>
            prev
              ? {
                  ...prev,
                  paymentStatus: "paid",
                  orderStatus: prev.orderStatus === "done" ? "done" : "waiting_admin",
                }
              : prev,
          );

          toast({
            title: "Pembayaran diterima",
            description: "Pesanan sedang diproses admin.",
          });

          return;
        }

        if (isExpired(tx)) {
          await markExpired();
          return;
        }

        if (!silent) {
          toast({
            title: "Belum terbayar",
            description: "Selesaikan pembayaran lalu cek kembali.",
          });
        }
      } catch (err) {
        if (!silent) {
          toast({
            title: "Gagal cek status",
            description: err instanceof Error ? err.message : "Terjadi kesalahan.",
            variant: "destructive",
          });
        }
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [tx, stopPoll, stopTimer, toast, isExpired, markExpired, userProfile?.name, userProfile?.email],
  );

  useEffect(() => {
    if (!tx?.qrisExpiredAt || tx.paymentStatus !== "pending") {
      stopTimer();
      return;
    }

    const calc = () =>
      Math.max(
        0,
        Math.floor((new Date(tx.qrisExpiredAt!).getTime() - Date.now()) / 1000),
      );

    setTimeLeft(calc());

    stopTimer();

    timerRef.current = setInterval(() => {
      const left = calc();
      setTimeLeft(left);

      if (left <= 0) {
        markExpired();
      }
    }, 1000);

    return () => stopTimer();
  }, [tx, stopTimer, markExpired]);

  useEffect(() => {
    if (!tx?.qrisDepositId || tx.paymentStatus !== "pending") {
      stopPoll();
      return;
    }

    stopPoll();
    handleCheckStatus(true);
    pollRef.current = setInterval(() => handleCheckStatus(true), 5000);

    return () => stopPoll();
  }, [tx, handleCheckStatus, stopPoll]);

  useEffect(
    () => () => {
      stopPoll();
      stopTimer();
    },
    [stopPoll, stopTimer],
  );

  const handleCopy = (text: string, label = "Disalin!") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const handleDownloadQr = () => {
    if (!tx?.qrisImage) return;

    const a = document.createElement("a");
    a.href = tx.qrisImage;
    a.download = `QRIS-${tx.qrisDepositId || tx.id}.png`;
    a.target = "_blank";
    a.click();
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const fmtDate = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <AppLayout title="Pembayaran">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!tx) return null;

  const title = tx.productName || tx.panelName || tx.resellerPackageName || "Pembayaran";
  const subtitle = tx.variantName || tx.panelVariantName || "";
  const expired = tx.paymentStatus === "expired" || isExpired(tx);
  const paid = tx.paymentStatus === "paid";
  const failed = tx.paymentStatus === "failed";

  const isResellerUpgrade =
    tx.type === "reseller_upgrade" ||
    Boolean(tx.resellerPackageId) ||
    Boolean(tx.resellerPackageName);

  const timerColor = expired
    ? "#ef4444"
    : timeLeft < 30
      ? "#ef4444"
      : timeLeft < 120
        ? "#f59e0b"
        : "#10b981";

  const timerBg = expired
    ? "rgba(239,68,68,0.1)"
    : timeLeft < 30
      ? "rgba(239,68,68,0.1)"
      : timeLeft < 120
        ? "rgba(245,158,11,0.08)"
        : "rgba(16,185,129,0.08)";

  return (
    <AppLayout title="Pembayaran">
      <div className="space-y-4 max-w-md mx-auto pb-6">
        <button
          onClick={() => navigate("/history")}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Riwayat
        </button>

        <div className="bg-card rounded-3xl border border-card-border overflow-hidden shadow-sm">
          <div className="p-5 border-b border-card-border">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
              Status Pembayaran
            </p>
            <h1 className="font-extrabold text-lg text-foreground mt-1">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="p-5 space-y-4">
            <div
              className="rounded-2xl p-4 text-center"
              style={{
                background:
                  "linear-gradient(135deg, hsl(152,60%,42%), hsl(160,55%,35%))",
              }}
            >
              <p className="text-white/75 text-[10px] font-semibold uppercase tracking-widest">
                Total Pembayaran
              </p>
              <p className="text-white text-3xl font-extrabold mt-1">
                Rp {Number(tx.amount || 0).toLocaleString("id-ID")}
              </p>
            </div>

            {paid && (
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-bold text-primary">
                    {isResellerUpgrade ? "Upgrade Reseller Berhasil 🎉" : "Pembayaran Diterima"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isResellerUpgrade
                      ? `Paket ${tx.resellerPackageName || "Reseller"} telah aktif di akun kamu. Sekarang kamu bisa menikmati harga reseller dan benefit paket.`
                      : "Pesanan sedang diproses admin."}
                  </p>
                </div>
              </div>
            )}

            {paid && isResellerUpgrade && (
              <div className="bg-muted rounded-2xl p-4 border border-card-border">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Detail Reseller
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-bold text-foreground text-right">
                      {tx.resellerPackageName || "Reseller"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-bold text-primary text-right">Aktif</span>
                  </div>

                  {tx.resellerActiveUntil && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Aktif sampai</span>
                      <span className="font-bold text-foreground text-right">
                        {fmtDate(tx.resellerActiveUntil)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-card-border space-y-1 text-xs text-muted-foreground">
                  <p>✓ Harga reseller sudah terbuka</p>
                  <p>✓ Benefit paket reseller sudah aktif</p>
                  <p>✓ Badge reseller aktif di akun kamu</p>
                </div>
              </div>
            )}

            {failed && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex gap-3">
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-bold text-destructive">Gagal Bayar</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Jika dana terpotong, hubungi admin.
                  </p>
                </div>
              </div>
            )}

            {tx.qrisExpiredAt && !paid && (
              <div
                className="flex items-center justify-between rounded-2xl px-4 py-3"
                style={{
                  background: timerBg,
                  border: `1.5px solid ${timerColor}30`,
                }}
              >
                <div className="flex items-center gap-2">
                  {expired ? (
                    <AlertTriangle className="w-4 h-4" style={{ color: timerColor }} />
                  ) : (
                    <Clock className="w-4 h-4" style={{ color: timerColor }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: timerColor }}>
                    {expired ? "Pembayaran kadaluarsa" : "Sisa waktu bayar"}
                  </span>
                </div>

                <span
                  className="font-mono font-extrabold text-base tabular-nums"
                  style={{ color: timerColor }}
                >
                  {expired ? "00:00" : fmtTime(timeLeft)}
                </span>
              </div>
            )}

            <div className="relative mx-auto w-56 h-56">
              <span
                className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl"
                style={{ borderColor: timerColor }}
              />
              <span
                className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl"
                style={{ borderColor: timerColor }}
              />
              <span
                className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl"
                style={{ borderColor: timerColor }}
              />
              <span
                className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl"
                style={{ borderColor: timerColor }}
              />

              <div className="absolute inset-2 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                {tx.qrisImage ? (
                  <img
                    src={tx.qrisImage}
                    alt="QRIS"
                    className="w-full h-full object-contain p-1 transition-all duration-300"
                    style={{
                      filter:
                        expired || paid || failed ? "grayscale(1) opacity(0.35)" : "none",
                    }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground text-center px-4">
                    QRIS tidak tersedia.
                  </p>
                )}

                {(expired || paid || failed) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[2px]">
                    {paid ? (
                      <CheckCircle2 className="w-9 h-9 text-primary" />
                    ) : (
                      <AlertTriangle className="w-9 h-9 text-red-500" />
                    )}
                    <p
                      className={`text-xs font-bold text-center px-2 ${
                        paid ? "text-primary" : "text-red-500"
                      }`}
                    >
                      {paid ? "Pembayaran Berhasil" : "QRIS Tidak Aktif"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-muted rounded-2xl p-3 text-center space-y-1">
              {tx.qrisDepositId && (
                <p className="text-[10px] font-mono text-muted-foreground">
                  REF: {tx.qrisDepositId.toUpperCase()}
                </p>
              )}
              <p className="text-[10px] font-mono text-muted-foreground">
                TRX: {tx.id.slice(0, 10).toUpperCase()}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCopy(tx.qrisString || "", "QRIS String disalin!")}
                disabled={!tx.qrisString || expired || paid || failed}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-border bg-muted hover:border-primary/40 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                Salin QRIS
              </button>

              <button
                onClick={handleDownloadQr}
                disabled={!tx.qrisImage || expired || paid || failed}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border-2 border-border bg-muted hover:border-primary/40 transition-colors text-xs font-semibold disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>

            <button
              onClick={() => handleCheckStatus(false)}
              disabled={checking || expired || paid || failed || !tx.qrisDepositId}
              className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-primary/25 disabled:opacity-60 text-sm"
            >
              {checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengecek...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Cek Status Pembayaran
                </>
              )}
            </button>

            {tx.paymentStatus === "pending" && (
              <p className="text-center text-[11px] text-muted-foreground">
                Status otomatis dicek setiap 5 detik.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}