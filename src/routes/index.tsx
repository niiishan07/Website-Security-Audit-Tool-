import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, Gauge, FileCheck2, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Shield className="text-primary" /> SecureAudit
        </div>
        <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
          Sign in
        </Link>
      </nav>

      <section className="max-w-4xl mx-auto text-center px-6 pt-16 pb-24 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground mb-6">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-ring" /> Free security audits
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Audit any website's <span className="gradient-text">security posture</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Instantly check HTTPS, SSL certificates, security headers, and response time. Get a clear 0–100 score and a downloadable PDF report.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 transition shadow-[var(--shadow-glow)]">
            Get started free
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid md:grid-cols-4 gap-4 px-6 pb-24">
        {[
          { icon: Lock, title: "HTTPS & SSL", desc: "Verify TLS and inspect certificate validity." },
          { icon: FileCheck2, title: "Headers", desc: "CSP, HSTS, X-Frame-Options, and more." },
          { icon: Zap, title: "Response time", desc: "Measure latency to the origin." },
          { icon: Gauge, title: "Security score", desc: "A single 0–100 grade for every scan." },
        ].map((f) => (
          <div key={f.title} className="glass-card p-6">
            <f.icon className="text-primary mb-3" />
            <div className="font-semibold">{f.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
