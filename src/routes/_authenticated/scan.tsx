import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { runScan } from "@/lib/scanner.functions";
import { generateReportPdf } from "@/lib/pdf-report";
import { ScoreCircle } from "@/components/ScoreCircle";
import { toast } from "sonner";
import { Check, X, Loader2, Download, ScanSearch, Lock, ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

function ScanPage() {
  const scanFn = useServerFn(runScan);
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const mutation = useMutation({
    mutationFn: (input: { url: string }) => scanFn({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scans"] }),
    onError: (e: Error) => toast.error(e.message || "Scan failed"),
  });
  const result = mutation.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    mutation.mutate({ url });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><ScanSearch className="text-primary" /> Scan Website</h1>
        <p className="text-muted-foreground mt-1">Enter a URL to audit HTTPS, SSL, security headers, and response time.</p>
      </div>

      <form onSubmit={submit} className="glass-card p-6 flex flex-col md:flex-row gap-3">
        <input type="text" placeholder="https://example.com" value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={mutation.isPending}
          className="flex-1 rounded-md bg-input border border-border px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={mutation.isPending || !url.trim()}
          className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {mutation.isPending ? <><Loader2 className="animate-spin" size={18} /> Scanning…</> : <>Scan now</>}
        </button>
      </form>

      {mutation.isPending && (
        <div className="glass-card p-8">
          <div className="shimmer h-4 rounded mb-4" />
          <div className="shimmer h-4 rounded w-3/4 mb-4" />
          <div className="shimmer h-4 rounded w-1/2" />
          <p className="text-center text-muted-foreground mt-6 text-sm">Analyzing target website…</p>
        </div>
      )}

      {result && (
        <div className="grid gap-6 md:grid-cols-[280px_1fr] animate-fade-in-up">
          <div className="glass-card p-6 flex flex-col items-center">
            <ScoreCircle score={result.scan.security_score} />
            <button onClick={() => generateReportPdf(result.scan, result.headers)}
              className="mt-4 rounded-md border border-border px-4 py-2 text-sm inline-flex items-center gap-2 hover:bg-muted transition">
              <Download size={16} /> Download PDF
            </button>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-5">
              <div className="text-sm text-muted-foreground mb-3">Result for</div>
              <div className="font-semibold break-all">{result.scan.website}</div>
              {result.fetchError && <div className="mt-2 text-sm text-destructive">Warning: {result.fetchError}</div>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                <MetricPill icon={Lock} label="HTTPS" ok={result.scan.https_status} okLabel="Secure" failLabel="Not Secure" />
                <MetricPill icon={ShieldCheck} label="SSL" ok={result.scan.ssl_valid} okLabel="Valid" failLabel="Invalid" />
                <MetricPill icon={Clock} label="Response" ok={result.scan.response_time_ms < 1500} okLabel={`${result.scan.response_time_ms} ms`} failLabel={`${result.scan.response_time_ms} ms`} />
              </div>
              {result.scan.ssl_expires_at && (
                <div className="mt-4 text-sm text-muted-foreground">
                  SSL expires <span className="text-foreground">{new Date(result.scan.ssl_expires_at).toLocaleDateString()}</span>
                  {result.scan.ssl_issuer && <> · Issuer: <span className="text-foreground">{result.scan.ssl_issuer}</span></>}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <div className="font-semibold mb-3">Security Headers</div>
              <ul className="space-y-2">
                {result.headers.map((h) => (
                  <li key={h.name} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{h.name}</span>
                    {h.present
                      ? <span className="inline-flex items-center gap-1 text-success"><Check size={16} /> Present</span>
                      : <span className="inline-flex items-center gap-1 text-destructive"><X size={16} /> Missing</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({ icon: Icon, label, ok, okLabel, failLabel }: { icon: React.ElementType; label: string; ok: boolean; okLabel: string; failLabel: string }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
      <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Icon size={14} /> {label}</div>
      <div className={`text-sm font-semibold mt-1 ${ok ? "text-success" : "text-destructive"}`}>{ok ? okLabel : failLabel}</div>
    </div>
  );
}
