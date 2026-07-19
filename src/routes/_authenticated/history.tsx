import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listScans, deleteScan, getScanDetail } from "@/lib/scanner.functions";
import { generateReportPdf } from "@/lib/pdf-report";
import { Download, Trash2, Search, FileDown, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const listFn = useServerFn(listScans);
  const detailFn = useServerFn(getScanDetail);
  const delFn = useServerFn(deleteScan);
  const queryClient = useQueryClient();
  const { data: scans = [], isLoading } = useQuery({ queryKey: ["scans"], queryFn: () => listFn() });
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      if (query && !s.website.toLowerCase().includes(query.toLowerCase())) return false;
      if (from && new Date(s.scan_date) < new Date(from)) return false;
      if (to && new Date(s.scan_date) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [scans, query, from, to]);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Scan deleted"); queryClient.invalidateQueries({ queryKey: ["scans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadPdf = async (id: string) => {
    try {
      const { scan, headers } = await detailFn({ data: { id } });
      generateReportPdf(scan, headers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to build PDF");
    }
  };

  const exportCsv = () => {
    const header = ["website", "scan_date", "https", "ssl_valid", "score", "response_time_ms"];
    const rows = filtered.map((s) => [s.website, s.scan_date, s.https_status, s.ssl_valid, s.security_score, s.response_time_ms]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scans-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><HistoryIcon className="text-primary" /> Scan History</h1>
          <p className="text-muted-foreground mt-1">{scans.length} total scans</p>
        </div>
        <button onClick={exportCsv} disabled={!filtered.length}
          className="rounded-md border border-border px-3 py-2 text-sm inline-flex items-center gap-2 hover:bg-muted transition disabled:opacity-50">
          <FileDown size={16} /> Export CSV
        </button>
      </div>

      <div className="glass-card p-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
          <input placeholder="Search website…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md bg-input border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="rounded-md bg-input border border-border px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="rounded-md bg-input border border-border px-3 py-2 text-sm" />
      </div>

      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No scans found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">HTTPS</th>
                  <th className="px-4 py-3">SSL</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition">
                    <td className="px-4 py-3 max-w-[280px] truncate font-medium">{s.website}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.scan_date).toLocaleString()}</td>
                    <td className="px-4 py-3">{s.https_status ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}</td>
                    <td className="px-4 py-3">{s.ssl_valid ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}</td>
                    <td className="px-4 py-3"><ScoreBadge score={s.security_score} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{s.response_time_ms}ms</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => downloadPdf(s.id)} title="Download PDF"
                          className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"><Download size={16} /></button>
                        <button onClick={() => { if (confirm("Delete this scan?")) delMut.mutate(s.id); }} title="Delete"
                          className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-success/15 text-success" : score >= 50 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive";
  return <span className={`px-2 py-0.5 rounded font-semibold text-xs ${color}`}>{score}</span>;
}
