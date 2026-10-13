import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_BASE = "https://nokos.co.id/api";

type Mapped = {
  action: string;
  method: "GET" | "POST";
  query?: Record<string, string>;
  form?: Record<string, string>;
};

/** Map our internal REST-ish paths onto the provider's ?action= API. */
async function mapRequest(
  request: Request,
  splat: string,
  search: URLSearchParams,
): Promise<Mapped | null> {
  const clean = splat.replace(/^\/+|\/+$/g, "");
  const qp = (keys: string[]) => {
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = search.get(k);
      if (v) out[k] = v;
    }
    return out;
  };

  if (clean === "balance") return { action: "getBalance", method: "GET" };
  if (clean === "services") return { action: "getServices", method: "GET" };
  if (clean === "countries") return { action: "getCountries", method: "GET" };
  if (clean === "prices") {
    return { action: "getPrices", method: "GET", query: qp(["service", "country", "server"]) };
  }

  const otp = clean.match(/^(?:otp|status)\/(.+)$/);
  if (otp) return { action: "getStatus", method: "GET", query: { id: otp[1] } };

  const cancel = clean.match(/^cancel\/(.+)$/);
  if (cancel) {
    return { action: "setStatus", method: "GET", query: { id: cancel[1], status: "8" } };
  }

  if (clean === "order" || clean === "number") {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const form: Record<string, string> = {};
    for (const k of ["service", "country", "server", "operator"]) {
      const v = body[k];
      if (v !== undefined && v !== null && String(v) !== "") form[k] = String(v);
    }

    return { action: "getNumber", method: "POST", form };
  }

  return null;
}

async function proxy(request: Request, params: { _splat?: string }) {
  // Server secret wins; the header is only a fallback for local overrides.
  const apiKey = process.env["NOKOS_API_KEY"] || request.headers.get("x-nokos-api-key") || "";
  const headerBase = request.headers.get("x-nokos-base-url") || "";
  // Ignore stale/incorrect stored base URLs that point at the payment gateway.
  const base = (headerBase.includes("nokos") ? headerBase : FALLBACK_BASE).replace(/\/+$/, "");

  if (!apiKey) {
    return Response.json(
      { success: false, error: "API key Nokos belum dikonfigurasi." },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const mapped = await mapRequest(request, params._splat ?? "", url.searchParams);

  if (!mapped) {
    return Response.json(
      { success: false, error: `Endpoint Nokos tidak tersedia: ${params._splat ?? ""}` },
      { status: 404 },
    );
  }

  const target = new URL(`${base}/`);
  target.searchParams.set("action", mapped.action);
  for (const [k, v] of Object.entries(mapped.query ?? {})) target.searchParams.set(k, v);

  const init: RequestInit = {
    method: mapped.method,
    headers: {
      "X-API-Key": apiKey,
      accept: "application/json",
      ...(mapped.method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
  };

  if (mapped.method === "POST") {
    init.body = new URLSearchParams(mapped.form ?? {}).toString();
  }

  try {
    const res = await fetch(target.toString(), init);
    const text = await res.text();

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { message: text };
    }

    const success = payload["success"] === true || (payload["success"] === undefined && res.ok);

    // Always answer 200 so the client renders an in-app message instead of
    // bubbling an HTTP error up to the route error boundary (blank screen).
    return Response.json({
      ...payload,
      success,
      data: payload["data"] ?? (success ? payload : []),
      upstreamStatus: res.status,
    });
  } catch (error) {
    return Response.json({
      success: false,
      data: [],
      error:
        error instanceof Error && /fetch failed|ENOTFOUND|EAI_AGAIN/i.test(error.message)
          ? "Server penyedia Nokos sedang tidak dapat dihubungi. Coba lagi nanti."
          : error instanceof Error
            ? error.message
            : "Proxy error",
    });
  }
}

export const Route = createFileRoute("/api/nokos/$")({
  server: {
    handlers: {
      GET: ({ request, params }) => proxy(request, params),
      POST: ({ request, params }) => proxy(request, params),
    },
  },
});
