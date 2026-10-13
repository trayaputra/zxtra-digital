import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ImagePlus, Loader2, MessageSquareQuote, Send, Star, ShoppingBag, X } from "lucide-react";
import { AppLayout } from "../components/Layout/AppLayout";
import { useAuth } from "../contexts/AuthContext";
import { createTestimonial, subscribeUserTransactions, subscribeTestimonials } from "../lib/firestore";
import { uploadToCloudinary } from "../lib/cloudinary";
import type { Testimonial, Transaction } from "../types";
import { useToast } from "../hooks/use-toast";

function formatDate(value: unknown) {
  if (!value) return "Baru saja";
  if (typeof value === "string" || typeof value === "number") return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const ts = value as { seconds?: number };
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return "Baru saja";
}

function Stars({ value, interactive = false, onChange }: { value: number; interactive?: boolean; onChange?: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={!interactive} onClick={() => onChange?.(i)} className={interactive ? "p-0.5 hover:scale-110 transition-transform" : "p-0.5"} aria-label={`${i} bintang`}>
          <Star className={`w-5 h-5 ${i <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/25"}`} />
        </button>
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
  const { firebaseUser, userProfile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [productKey, setProductKey] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const unTx = subscribeUserTransactions(firebaseUser.uid, txs => {
      setTransactions(txs.filter(tx =>
        tx.type === "product" &&
        !!tx.productId &&
        (tx.paymentStatus === "paid" || tx.orderStatus === "done") &&
        tx.orderStatus === "done"
      ));
      setLoading(false);
    });
    const unTestimonials = subscribeTestimonials(items => {
      setTestimonials(items.filter(item => item.status === "approved" || item.userId === firebaseUser.uid));
    });
    return () => { unTx(); unTestimonials(); };
  }, [firebaseUser?.uid]);

  const purchases = useMemo(() => {
    const map = new Map<string, Transaction>();
    for (const tx of transactions) {
      const key = `${tx.productId}:${tx.variantId || ""}`;
      if (!map.has(key)) map.set(key, tx);
    }
    return Array.from(map.values());
  }, [transactions]);

  const reviewedTransactionIds = useMemo(() => new Set(
    testimonials.filter(t => t.userId === firebaseUser?.uid && !!t.transactionId).map(t => t.transactionId as string)
  ), [testimonials, firebaseUser?.uid]);

  const reviewablePurchases = useMemo(() => purchases.filter(tx => !reviewedTransactionIds.has(tx.id)), [purchases, reviewedTransactionIds]);
  const selectedPurchase = reviewablePurchases.find(tx => `${tx.productId}:${tx.variantId || ""}` === productKey);

  const average = testimonials.filter(t => t.status === "approved").length
    ? testimonials.filter(t => t.status === "approved").reduce((sum, t) => sum + Number(t.rating || 0), 0) / testimonials.filter(t => t.status === "approved").length
    : 0;

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto terlalu besar", description: "Maksimal 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      setImageUrl(await uploadToCloudinary(file));
    } catch (err) {
      toast({ title: "Upload gagal", description: (err as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!selectedPurchase?.productId) return toast({ title: "Pilih produk", description: "Pilih produk yang pernah kamu beli.", variant: "destructive" });
    if (message.trim().length < 5) return toast({ title: "Testimoni terlalu singkat", description: "Tulis minimal 5 karakter.", variant: "destructive" });
    setSaving(true);
    try {
      await createTestimonial({
        userId: firebaseUser!.uid,
        userName: userProfile?.displayName || firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "User",
        userEmail: userProfile?.email || firebaseUser?.email || "",
        userAvatar: userProfile?.photoURL || firebaseUser?.photoURL || "",
        productId: selectedPurchase.productId,
        productName: selectedPurchase.productName || "Produk",
        variantId: selectedPurchase.variantId,
        variantName: selectedPurchase.variantName,
        transactionId: selectedPurchase.id,
        rating,
        message: message.trim(),
        imageUrl,
        status: "pending",
        verifiedPurchase: true,
        featured: false,
      });
      toast({ title: "Testimoni terkirim!", description: "Testimoni kamu menunggu persetujuan admin." });
      setShowForm(false); setProductKey(""); setRating(5); setMessage(""); setImageUrl("");
    } catch (err) {
      toast({ title: "Gagal mengirim", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const myPending = testimonials.filter(t => t.userId === firebaseUser?.uid && t.status === "pending");
  const approved = testimonials.filter(t => t.status === "approved");

  return (
    <AppLayout title="Testimoni">
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl mint-gradient border border-primary/15 p-5">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10" />
          <div className="relative flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><MessageSquareQuote className="w-5 h-5 text-primary" /></div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Review Pengguna</p>
              <h2 className="text-xl font-extrabold text-foreground mt-0.5">Apa kata mereka?</h2>
              <p className="text-xs text-muted-foreground mt-1">Bagikan pengalaman setelah menggunakan produk kami.</p>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-3">
            <div className="bg-card/80 backdrop-blur-sm rounded-2xl px-3 py-2.5 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400 fill-amber-400" /><span className="font-extrabold text-lg">{average ? average.toFixed(1) : "5.0"}</span><span className="text-[10px] text-muted-foreground">/ 5 • {approved.length} review</span></div>
            <button onClick={() => setShowForm(true)} disabled={loading || reviewablePurchases.length === 0} className="ml-auto inline-flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl text-xs font-bold shadow-sm disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Tulis Testimoni</button>
          </div>
        </motion.div>

        {reviewablePurchases.length === 0 && !loading && (
          <div className="bg-card border border-card-border rounded-3xl p-5 text-center">
            <ShoppingBag className="w-9 h-9 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-bold text-sm">Belum ada pembelian yang bisa direview</p>
            <p className="text-xs text-muted-foreground mt-1">Setelah pesanan produk selesai, kamu bisa memberikan testimoni terverifikasi. Satu pembelian hanya bisa direview sekali.</p>
          </div>
        )}

        {myPending.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 dark:bg-amber-950/20 dark:border-amber-900/50">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">⏳ {myPending.length} testimoni menunggu moderasi</p>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-300/70 mt-0.5">Testimoni akan tampil setelah disetujui admin.</p>
          </div>
        )}

        <div className="grid gap-3">
          {approved.map((item, index) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }} className="bg-card border border-card-border rounded-3xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 text-primary font-extrabold text-sm">
                  {item.userAvatar ? <img src={item.userAvatar} alt="" className="w-full h-full object-cover" /> : item.userName?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2"><div><p className="font-bold text-sm truncate">{item.userName}</p><Stars value={item.rating} /></div><span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(item.createdAt)}</span></div>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 text-primary rounded-full px-2 py-1 text-[10px] font-bold"><ShoppingBag className="w-3 h-3" /> {item.productName}{item.variantName ? ` • ${item.variantName}` : ""}</div>
                  <p className="text-sm text-foreground/90 leading-relaxed mt-2.5">“{item.message}”</p>
                  {item.imageUrl && <img src={item.imageUrl} alt="Foto testimoni" className="mt-3 rounded-2xl max-h-64 w-full object-cover" />}
                  {item.verifiedPurchase && <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Pembelian terverifikasi</div>}
                </div>
              </div>
            </motion.div>
          ))}
          {approved.length === 0 && <div className="text-center py-12 text-muted-foreground"><MessageSquareQuote className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm font-semibold">Belum ada testimoni publik</p><p className="text-xs mt-1">Jadilah yang pertama memberikan review.</p></div>}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && setShowForm(false)} />
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative w-full max-w-lg bg-card border border-card-border rounded-3xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4"><div><h3 className="font-extrabold text-base">Tulis Testimoni</h3><p className="text-xs text-muted-foreground mt-0.5">Hanya pembelian yang terverifikasi.</p></div><button onClick={() => setShowForm(false)} disabled={saving} className="p-2 rounded-xl hover:bg-muted"><X className="w-4 h-4" /></button></div>
              <div className="space-y-4">
                <div><label className="text-xs font-bold block mb-1.5">Produk yang dibeli</label><select value={productKey} onChange={e => setProductKey(e.target.value)} className="w-full bg-background border border-card-border rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:border-primary"><option value="">Pilih produk...</option>{reviewablePurchases.map(tx => <option key={`${tx.productId}:${tx.variantId || ""}`} value={`${tx.productId}:${tx.variantId || ""}`}>{tx.productName}{tx.variantName ? ` • ${tx.variantName}` : ""}</option>)}</select></div>
                <div><label className="text-xs font-bold block mb-1.5">Rating</label><Stars value={rating} interactive onChange={setRating} /></div>
                <div><label className="text-xs font-bold block mb-1.5">Testimoni</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} maxLength={500} placeholder="Ceritakan pengalaman kamu..." className="w-full resize-none bg-background border border-card-border rounded-2xl px-3.5 py-3 text-sm focus:outline-none focus:border-primary" /><p className="text-[10px] text-muted-foreground text-right mt-1">{message.length}/500</p></div>
                <div><label className="text-xs font-bold block mb-1.5">Foto pengalaman <span className="font-normal text-muted-foreground">(opsional)</span></label>{imageUrl ? <div className="relative rounded-2xl overflow-hidden"><img src={imageUrl} alt="Preview" className="w-full max-h-48 object-cover" /><button onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/60 text-white rounded-xl p-2"><X className="w-4 h-4" /></button></div> : <label className="flex items-center justify-center gap-2 border border-dashed border-card-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors"><input type="file" accept="image/*" className="hidden" onChange={handleImage} />{uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><ImagePlus className="w-4 h-4" /> Upload foto</>}</label>}</div>
                <button onClick={submit} disabled={saving || uploading || !productKey || message.trim().length < 5} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-2xl py-3 font-bold text-sm disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {saving ? "Mengirim..." : "Kirim Testimoni"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
