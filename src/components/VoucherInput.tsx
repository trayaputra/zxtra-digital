import { useState } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { claimVoucherUsage, getVoucherByCode, hasUserUsedVoucher } from "../lib/firestore";
import { useAuth } from "../contexts/AuthContext";
import type { Voucher } from "../types";

export interface AppliedVoucher {
  voucher: Voucher;
  discount: number;
  finalAmount: number;
}

export function calculateDiscount(voucher: Voucher, amount: number) {
  if (voucher.type === "percentage") {
    const raw = Math.floor(amount * Math.min(100, Math.max(0, voucher.value)) / 100);
    return voucher.maxDiscount && voucher.maxDiscount > 0
      ? Math.min(raw, voucher.maxDiscount)
      : raw;
  }
  return Math.min(Math.max(0, voucher.value), amount);
}

export default function VoucherInput({
  amount,
  onApplied,
  global = false,
}: {
  amount: number;
  onApplied: (value: AppliedVoucher | null) => void;
  global?: boolean;
}) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [applied, setApplied] = useState<AppliedVoucher | null>(null);

  const apply = async () => {
    if (!userProfile?.id) return;
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      toast({ title: "Masukkan kode voucher", variant: "destructive" });
      return;
    }

    setChecking(true);
    try {
      const voucher = await getVoucherByCode(normalized);
      if (!voucher || !voucher.active) {
        throw new Error("Voucher tidak ditemukan atau sudah tidak aktif.");
      }

      const now = Date.now();
      if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now) {
        throw new Error("Voucher belum mulai berlaku.");
      }
      if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < now) {
        throw new Error("Voucher sudah kedaluwarsa.");
      }

      // Untuk form global Panel, harga baru diketahui ketika user memilih RAM.
      // Untuk produk/upgrade, validasi minimum langsung terhadap harga item.
      if (!global && amount < (voucher.minPurchase || 0)) {
        throw new Error(`Minimal pembelian Rp ${(voucher.minPurchase || 0).toLocaleString("id-ID")}.`);
      }

      if (await hasUserUsedVoucher(normalized, userProfile.id)) {
        throw new Error("Voucher ini sudah pernah kamu claim.");
      }

      const discount = global
        ? 0
        : Math.min(calculateDiscount(voucher, amount), amount);

      if (!global && discount <= 0) {
        throw new Error("Voucher tidak memberikan diskon.");
      }

      // Claim dicatat atomic di Firestore sekarang, sehingga kuota dan one-user-one-claim
      // benar-benar ditegakkan dan tidak bisa diakali hanya dengan refresh halaman.
      await claimVoucherUsage(normalized, userProfile.id, {
        userName: userProfile.displayName || userProfile.name || "",
        userEmail: userProfile.email || "",
      });

      const value = {
        voucher,
        discount,
        finalAmount: global ? 0 : Math.max(0, amount - discount),
      };

      setApplied(value);
      onApplied(value);

      toast({
        title: "Voucher berhasil diklaim 🎉",
        description: global
          ? "Voucher aktif untuk pilihan RAM yang kamu beli."
          : `Hemat Rp ${discount.toLocaleString("id-ID")}.`,
      });
    } catch (err) {
      setApplied(null);
      onApplied(null);
      toast({
        title: "Voucher tidak bisa digunakan",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const remove = () => {
    // Claim tidak dibatalkan. Ini memang sistem redeem-code: sekali claim = terpakai.
    setApplied(null);
    setCode("");
    onApplied(null);
  };

  return (
    <div className="rounded-2xl border border-card-border bg-card p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Tag className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-extrabold text-foreground">Kode Voucher</p>
          <p className="text-[10px] text-muted-foreground">
            {global ? "Satu kode hanya bisa diklaim sekali per akun" : "Dapatkan diskon sebelum bayar"}
          </p>
        </div>
      </div>

      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-primary truncate">{applied.voucher.code}</p>
            <p className="text-[10px] text-muted-foreground">
              {global
                ? "Voucher aktif untuk semua RAM"
                : `Hemat Rp ${applied.discount.toLocaleString("id-ID")} • Total Rp ${applied.finalAmount.toLocaleString("id-ID")}`}
            </p>
          </div>
          <button type="button" onClick={remove} className="p-1.5 rounded-lg hover:bg-card text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === "Enter") apply(); }}
            placeholder="Contoh: HEMAT10"
            className="min-w-0 flex-1 bg-muted border border-input rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={apply}
            disabled={checking}
            className="shrink-0 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-3.5 h-3.5 inline mr-1" />Pakai</>}
          </button>
        </div>
      )}
    </div>
  );
}
