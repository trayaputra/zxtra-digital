import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_BASE = "https://pg.ronzzyt.id";

/** Internal QRIS proxy mapped to RonzzPay. API key stays server-side. */
function mapPath(splat: string): { path: string; method: "GET" | "POST" } | null {
  const clean = splat.split("/").filter(Boolean).join("/");

  if (clean === "create" || clean === "transaction/create") {
    return { path: "/api/transaction/create", method: "POST" };
  }

  const statusParts = clean.split("/");
    const status =
      (statusParts[0] === "status" && statusParts.length >= 2) ||
      (statusParts[0] === "transaction" && statusParts[1] === "status" && statusParts.length >= 3);
  if (status) {
    return { path: "/api/transaction/status", method: "POST" };
  }

  if (clean === "balance" || clean === "profile") {
    return { path: "/api/profile", method: "POST" };
  }

  return null;
}

async function proxy(request: Request, params: { _splat?: string }) {
  const apiKey =
    process.env["RONZZPAY_API_KEY"] ||
    request.headers.get("x-qris-api-key") ||
    "";
  const base = (
    process.env["RONZZPAY_BASE_URL"] ||
    request.headers.get("x-qris-base-url") ||
    FALLBACK_BASE
  ).replace(/\/$/, "");

  if (!apiKey) {
    return Response.json(
      { success: false, message: "API key RonzzPay belum dikonfigurasi." },
      { status: 400 },
    );
  }

  const mapped = mapPath(params._splat ?? "");
  if (!mapped) {
    return Response.json(
      { success: false, message: `Endpoint QRIS tidak dikenal: ${params._splat ?? ""}` },
      { status: 404 },
    );
  }

  const init: RequestInit = {
    method: mapped.method,
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
  };

  let requestBody: Record<string, unknown> = {};
  try {
    requestBody = (await request.json()) as Record<string, unknown>;
  } catch {
    requestBody = {};
  }

  if (mapped.path === "/api/transaction/create") {
    const amount = Math.round(Number(requestBody.amount ?? 0));
    if (!amount || amount < 1) {
      return Response.json(
        { success: false, message: "Nominal pembayaran tidak valid." },
        { status: 400 },
      );
    }

    init.body = JSON.stringify({
      api_key: apiKey,
      code: "qris",
      amount,
      description: String(requestBody.description ?? "ZXtraStore Payment"),
      ...(requestBody.webhook_url
        ? { webhook_url: String(requestBody.webhook_url) }
        : {}),
    });
  } else if (mapped.path === "/api/transaction/status") {
    const reffId = String(
      requestBody.reff_id ??
        requestBody.reffId ??
        (params._splat ?? "").split("/").pop() ??
        "",
    ).trim();

    init.body = JSON.stringify({
      api_key: apiKey,
      reff_id: reffId,
    });
  } else {
    init.body = JSON.stringify({ api_key: apiKey });
  }

  try {
    const res = await fetch(`${base}${mapped.path}`, init);
    const text = await res.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { success: false, message: text };
    }

    const raw = (payload.data ?? {}) as Record<string, unknown>;
    const isCreate = mapped.path === "/api/transaction/create";
    const isStatus = mapped.path === "/api/transaction/status";

    const data = {
      ...raw,
      depositId: String(raw.reff_id ?? raw.depositId ?? raw.deposit_id ?? raw.id ?? ""),
      // RonzzPay:
      // get_amount = nominal dasar
      // fee       = biaya admin
      // amount    = nominal yang HARUS DIBAYAR (sudah termasuk fee)
      amount: Number(raw.get_amount ?? raw.amount ?? 0),
      totalAmount: Number(raw.amount ?? raw.totalAmount ?? raw.total_amount ?? raw.get_amount ?? 0),
      payAmount: Number(raw.amount ?? raw.totalAmount ?? raw.total_amount ?? raw.get_amount ?? 0),
      fee: Number(raw.fee ?? 0),
      qrImage: String(raw.qr_image ?? raw.qrImage ?? raw.qr_url ?? raw.qrUrl ?? ""),
      qrString: String(raw.qr_string ?? raw.qrString ?? ""),
      status: String(raw.status ?? "pending"),
      expiredAt: String(raw.expired_at ?? raw.expiredAt ?? ""),
      paymentName: String(raw.payment_name ?? raw.paymentName ?? "QRIS"),
      instructions: String(raw.instructions ?? ""),
    };

    // RonzzPay QR image kadang tidak bisa di-load langsung dari browser.
    // Ambil dari server lalu ubah menjadi data URL agar frontend selalu bisa menampilkannya.
    if (isCreate && data.qrImage && !data.qrImage.startsWith("data:")) {
      try {
        const qrRes = await fetch(data.qrImage, {
          headers: {
            accept: "image/png,image/jpeg,image/webp,image/*,*/*",
            "user-agent": "ZXtraStore/1.0",
          },
        });

        if (qrRes.ok) {
          const contentType = qrRes.headers.get("content-type") || "image/png";
          const buffer = Buffer.from(await qrRes.arrayBuffer());
          data.qrImage = `data:${contentType};base64,${buffer.toString("base64")}`;
        }
      } catch (qrError) {
        console.error("[RONZZPAY] QR image proxy failed:", qrError);
      }
    }

    const success = payload.status === true || payload.success === true || (res.ok && (isCreate || isStatus));

    return Response.json({ ...payload, success, data }, { status: res.status });
  } catch (error) {
    return Response.json(
      { success: false, message: error instanceof Error ? error.message : "Proxy error" },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/payment/qris/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxy(request, params),
      POST: ({ request, params }) => proxy(request, params),
    },
  },
});
