import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";


export const TRACKED_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const;

const inputSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

function normalizeUrl(raw: string): URL {
  let value = raw.trim();
  if (!/^https?:\/\//i.test(value)) value = "https://" + value;
  const u = new URL(value);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http and https URLs are supported");
  return u;
}


export const runScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const url = normalizeUrl(data.url);
    const httpsStatus = url.protocol === "https:";

   
    let responseTimeMs = 0;
    let headers: Record<string, string> = {};
    let fetchError: string | null = null;
    let sslValid = false;
    let sslIssuer: string | null = null;
    let sslExpiresAt: string | null = null;

    try {
      const started = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url.toString(), {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "SecureAudit/1.0" },
      });
      clearTimeout(timeout);
      responseTimeMs = Date.now() - started;
      res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
      
      if (httpsStatus) sslValid = true;
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Fetch failed";
      responseTimeMs = 15000;
    }

   
    if (httpsStatus && sslValid) {
      try {
        const host = url.hostname;
        const ctRes = await fetch(`https://crt.sh/?q=${encodeURIComponent(host)}&output=json`, {
          headers: { "user-agent": "SecureAudit/1.0" },
          signal: AbortSignal.timeout(6000),
        });
        if (ctRes.ok) {
          const list = (await ctRes.json()) as Array<{ not_after: string; issuer_name: string; name_value: string }>;
          const now = Date.now();
          const match = list
            .filter((c) => new Date(c.not_after).getTime() > now)
            .sort((a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime())[0];
          if (match) {
            sslExpiresAt = new Date(match.not_after).toISOString();
            sslIssuer = match.issuer_name;
          }
        }
      } catch {
        
      }
    }

    
    const headerResults = TRACKED_HEADERS.map((name) => ({
      name,
      present: !!headers[name],
      value: headers[name] ?? null,
    }));

    
    const headersPoints = Math.round((headerResults.filter((h) => h.present).length / TRACKED_HEADERS.length) * 40);
    const httpsPoints = httpsStatus ? 20 : 0;
    const sslPoints = sslValid ? 20 : 0;
    let responsePoints = 0;
    if (responseTimeMs > 0 && responseTimeMs < 400) responsePoints = 20;
    else if (responseTimeMs < 800) responsePoints = 15;
    else if (responseTimeMs < 1500) responsePoints = 10;
    else if (responseTimeMs < 3000) responsePoints = 5;
    const score = Math.max(0, Math.min(100, httpsPoints + sslPoints + headersPoints + responsePoints));

    
    const { supabase, userId } = context;
    const { data: scan, error: scanErr } = await supabase
      .from("scans")
      .insert({
        user_id: userId,
        website: url.toString(),
        https_status: httpsStatus,
        ssl_valid: sslValid,
        ssl_expires_at: sslExpiresAt,
        ssl_issuer: sslIssuer,
        security_score: score,
        response_time_ms: responseTimeMs,
      })
      .select()
      .single();
    if (scanErr || !scan) throw new Error(scanErr?.message || "Failed to save scan");

    const headerRows = headerResults.map((h) => ({
      scan_id: scan.id,
      header_name: h.name,
      present: h.present,
      value: h.value,
    }));
    await supabase.from("scan_headers").insert(headerRows);

    return {
      scan,
      headers: headerResults,
      fetchError,
    };
  });


export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("*")
      .order("scan_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });


export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getScanDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: scan, error } = await context.supabase.from("scans").select("*").eq("id", data.id).single();
    if (error || !scan) throw new Error(error?.message || "Not found");
    const { data: hdrs } = await context.supabase.from("scan_headers").select("*").eq("scan_id", data.id);
    return { scan, headers: hdrs ?? [] };
  });
