import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Tag, Edit2, Trash2, X, Save, Loader2, Users, RefreshCw, Eye } from "lucide-react";
import { AppLayout } from "../../components/Layout/AppLayout";
import {
  getVouchers,
  getVoucherUsages,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../../lib/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/use-toast";
import type { Voucher, VoucherDiscountType } from "../../types";

type Form = {
  code: string;
  type: VoucherDiscountType;
  value: number;
  expiresAt: string;
  usageLimit: number;
  active: boolean;
};

type Usage = Record<string, unknown> & { id: string };

const emptyForm = (): Form => ({
  code: "",
  type: "percentage",
  value: 10,
  expiresAt: "",
  usageLimit: 10,
  active: true,
});

const formatRupiah = (value: number) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

const toInputDate = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDate = (value: unknown) => {
  if (!value) return "-";
  try {
    const d = value && typeof value === "object" && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
};

export default function AdminVouchers() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Voucher[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [usageCache, setUsageCache] = useState<Record<string, Usage[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showClaims, setShowClaims] = useState<Voucher | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const result = await getVouchers();
      setItems(result);

      const entries = await Promise.all(
        result.map(async voucher => {
          try {
            const usages = await getVoucherUsages(voucher.code);
            return [voucher.id, usages] as const;
          } catch (error) {
            console.error("Gagal memuat claim voucher", voucher.code, error);
            return [voucher.id, [] as Usage[]] as const;
          }
        }),
      );

      const nextCache: Record<string, Usage[]> = {};
      const nextCounts: Record<string, number> = {};
      for (const [id, usages] of entries) {
        nextCache[id] = usages;
        nextCounts[id] = usages.length;
      }
      setUsageCache(nextCache);
      setCounts(nextCounts);
    } catch (error) {
      toast({
        title: "Gagal memuat voucher",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (voucher: Voucher) => {
    setEditing(voucher.id);
    setForm({
      code: voucher.code || "",
      type: voucher.type || "percentage",
      value: Number(voucher.value || 0),
      expiresAt: toInputDate(voucher.expiresAt),
      usageLimit: Math.max(1, Number(voucher.usageLimit || 1)),
      active: voucher.active !== false,
    });
    setShowForm(true);
  };

  const saveVoucher = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const usageLimit = Number(form.usageLimit);

    if (!code) {
      toast({ title: "Kode voucher belum diisi", variant: "destructive" });
      return;
    }
    if (value <= 0 || (form.type === "percentage" && value > 100)) {
      toast({ title: "Nilai diskon tidak valid", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(usageLimit) || usageLimit < 1) {
      toast({ title: "Maksimal claim minimal 1 orang", variant: "destructive" });
      return;
    }
    if (!form.expiresAt) {
      toast({ title: "Tanggal expired wajib diisi", variant: "destructive" });
      return;
    }

    const expiresAt = new Date(form.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      toast({ title: "Tanggal expired tidak valid", description: "Pilih waktu yang masih akan datang.", variant: "destructive" });
      return;
    }

    const oldClaims = editing ? counts[editing] || 0 : 0;
    const oldVoucher = editing ? items.find(item => item.id === editing) : undefined;
    if (oldClaims > 0 && oldVoucher && oldVoucher.code !== code) {
      toast({
        title: "Kode tidak boleh diganti",
        description: "Voucher yang sudah pernah di-claim harus mempertahankan kode lamanya.",
        variant: "destructive",
      });
      return;
    }
    if (usageLimit < oldClaims) {
      toast({
        title: "Batas claim terlalu kecil",
        description: `Sudah ada ${oldClaims} orang yang claim. Batas tidak boleh di bawah jumlah tersebut.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const data = {
        code,
        type: form.type,
        value,
        expiresAt: expiresAt.toISOString(),
        minPurchase: 0,
        maxDiscount: 0,
        usageLimit,
        claimedCount: oldClaims,
        active: form.active,
      };

      if (editing) await updateVoucher(editing, data);
      else await createVoucher(data);

      toast({ title: editing ? "Voucher berhasil diperbarui" : "Voucher berhasil dibuat" });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm());
      await load();
    } catch (error) {
      toast({ title: "Gagal menyimpan voucher", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeVoucher = async (id: string) => {
    if (!window.confirm("Hapus voucher ini?")) return;
    try {
      await deleteVoucher(id);
      toast({ title: "Voucher berhasil dihapus" });
      await load();
    } catch (error) {
      toast({ title: "Gagal menghapus voucher", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout title="Kode Voucher">
        <div className="rounded-3xl border border-card-border bg-card p-10 text-center">
          <p className="font-bold text-foreground">Akses hanya untuk admin.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Kode Voucher">
      <div className="space-y-4 pb-8">
        <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2 text-primary">
                <Tag className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Redeem Code</span>
              </div>
              <h2 className="text-xl font-extrabold">Kode Voucher</h2>
              <p className="mt-1 text-xs text-muted-foreground">Atur diskon, expired, dan maksimal orang yang bisa claim.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={load} disabled={loading} className="rounded-2xl border border-card-border bg-card p-2.5 text-muted-foreground">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button type="button" onClick={openCreate} className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">
                <Plus className="h-4 w-4" /> Buat
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              <p className="mt-2 text-xs text-muted-foreground">Memuat voucher...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center">
              <Tag className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-bold">Belum ada voucher</p>
            </div>
          ) : items.map(voucher => {
            const claimed = counts[voucher.id] ?? Number(voucher.claimedCount || 0);
            const limit = Number(voucher.usageLimit || 0);
            const expired = !!voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= Date.now();
            const exhausted = limit > 0 && claimed >= limit;
            const active = voucher.active !== false && !expired && !exhausted;

            return (
              <div key={voucher.id} className="rounded-3xl border border-card-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold">{voucher.code}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {active ? "AKTIF" : exhausted ? "KUOTA HABIS" : expired ? "EXPIRED" : "NONAKTIF"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {voucher.type === "percentage" ? `Diskon ${voucher.value}%` : `Diskon ${formatRupiah(voucher.value)}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-1 font-bold">Claim {claimed}/{limit || "∞"}</span>
                      <span className="rounded-full bg-muted px-2 py-1">Expired {formatDate(voucher.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setShowClaims(voucher)} className="rounded-xl p-2 text-primary hover:bg-primary/10" title="Lihat claim">
                      <Users className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => openEdit(voucher)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeVoucher(voucher.id)} className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setShowForm(false)} />
            <motion.div className="relative my-4 w-full max-w-lg overflow-hidden rounded-3xl border border-card-border bg-card shadow-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="flex items-center justify-between border-b border-card-border p-5">
                <div>
                  <h3 className="font-extrabold">{editing ? "Edit Voucher" : "Buat Voucher"}</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">Kode, diskon, expired, dan batas claim.</p>
                </div>
                <button type="button" onClick={() => !saving && setShowForm(false)} className="rounded-xl p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-xs font-bold">Kode Voucher</label>
                  <input value={form.code} onChange={e => setForm(c => ({ ...c, code: e.target.value.toUpperCase().replace(/\s+/g, "") }))} placeholder="ADMIN-GTG" className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm font-bold uppercase outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold">Diskon</label>
                  <div className="grid grid-cols-[1fr_1.5fr] gap-2">
                    <select value={form.type} onChange={e => setForm(c => ({ ...c, type: e.target.value as VoucherDiscountType }))} className="rounded-2xl border border-input bg-muted px-4 py-3 text-sm font-semibold outline-none focus:border-primary">
                      <option value="percentage">Persen (%)</option>
                      <option value="fixed">Nominal (Rp)</option>
                    </select>
                    <input type="number" min="1" value={form.value} onChange={e => setForm(c => ({ ...c, value: Number(e.target.value) }))} className="rounded-2xl border border-input bg-muted px-4 py-3 text-sm outline-none focus:border-primary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold">Maksimal orang yang bisa claim</label>
                  <input type="number" min="1" value={form.usageLimit} onChange={e => setForm(c => ({ ...c, usageLimit: Number(e.target.value) }))} className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm font-bold outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold">Expired</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={e => setForm(c => ({ ...c, expiresAt: e.target.value }))} className="w-full rounded-2xl border border-input bg-muted px-4 py-3 text-sm outline-none focus:border-primary" />
                </div>
                <label className="flex items-center justify-between rounded-2xl border border-card-border bg-muted px-4 py-3">
                  <span className="text-xs font-bold">Voucher aktif</span>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(c => ({ ...c, active: e.target.checked }))} className="h-4 w-4 accent-primary" />
                </label>
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Preview</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-base font-extrabold">{form.code || "KODE VOUCHER"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{form.type === "percentage" ? `Diskon ${form.value || 0}%` : `Diskon ${formatRupiah(form.value)}`}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">Maks. {form.usageLimit || 0} claim</p>
                    </div>
                    <Tag className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <button type="button" onClick={saveVoucher} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Menyimpan..." : "Simpan Voucher"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClaims && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowClaims(null)} />
            <motion.div className="relative my-4 w-full max-w-lg overflow-hidden rounded-3xl border border-card-border bg-card shadow-2xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
              <div className="flex items-center justify-between border-b border-card-border p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Daftar Claim</p>
                  <h3 className="text-lg font-extrabold">{showClaims.code}</h3>
                </div>
                <button type="button" onClick={() => setShowClaims(null)} className="rounded-xl p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
                {(usageCache[showClaims.id] || []).length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm font-bold">Belum ada yang claim</p>
                  </div>
                ) : (usageCache[showClaims.id] || []).map((usage, index) => (
                  <div key={usage.id} className="rounded-2xl border border-card-border bg-muted/40 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-extrabold text-primary">{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{String(usage.userName || "User")}</p>
                        <p className="truncate text-xs text-muted-foreground">{String(usage.userEmail || usage.userId || "-")}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">Claim: {formatDate(usage.createdAt)}</p>
                        {usage.transactionId ? <p className="text-[10px] text-muted-foreground">Transaksi: {String(usage.transactionId)}</p> : <p className="text-[10px] font-bold text-primary">Belum ada transaksi</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
