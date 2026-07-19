import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listScans } from "@/lib/scanner.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { ScanSearch, History, User, TrendingUp, Clock, ShieldCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const scansFn = useServerFn(listScans);
  const profileFn = useServerFn(getMyProfile);
  const { data: scans = [] } = useQuery({ queryKey: ["scans"], queryFn: () => scansFn() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const total = scans.length;
  const avg = total ? Math.round(scans.reduce((a, s) => a + s.security_score, 0) / total) : 0;
  const last = scans[0];
  const chartData = [...scans].slice(0, 10).reverse().map((s, i) => ({
    idx: i + 1, score: s.security_score, host: new URL(s.website).hostname,
  }));

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold">Welcome back{profile?.profile?.username ? `, ${profile.profile.username}` : ""} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your website security scans.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Total Scans" value={String(total)} />
        <StatCard icon={TrendingUp} label="Average Score" value={`${avg} / 100`} accent />
        <StatCard icon={Clock} label="Last Scan" value={last ? new Date(last.scan_date).toLocaleDateString() : "—"} sub={last ? new URL(last.website).hostname : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard to="/scan" icon={ScanSearch} title="Scan a Website" desc="Run a new security audit." />
        <ActionCard to="/history" icon={History} title="Scan History" desc="Browse and manage previous scans." />
        <ActionCard to="/profile" icon={User} title="Profile" desc="Update username, email, and password." />
      </div>

      {chartData.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold">Score trend</div>
              <div className="text-sm text-muted-foreground">Last {chartData.length} scans</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid stroke="oklch(0.3 0.02 260)" strokeDasharray="3 3" />
                <XAxis dataKey="idx" stroke="oklch(0.68 0.02 260)" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="oklch(0.68 0.02 260)" fontSize={12} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.025 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="oklch(0.72 0.18 160)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="glass-card p-6 hover:-translate-y-0.5 transition">
      <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg mb-3 ${accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Icon size={20} />
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: { to: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <Link to={to} className="glass-card p-6 group hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition">
      <Icon className="text-primary mb-3" />
      <div className="font-semibold group-hover:text-primary transition">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{desc}</div>
    </Link>
  );
}
