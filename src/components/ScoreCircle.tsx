interface Props { score: number; size?: number; label?: string }


export function ScoreCircle({ score, size = 160, label = "Security Score" }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 80 ? "var(--color-success)" : clamped >= 50 ? "var(--color-warning)" : "var(--color-destructive)";
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-muted)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
      </svg>
      <div className="-mt-[calc(50%+8px)] text-center pointer-events-none" style={{ transform: `translateY(-${size / 2}px)` }}>
        <div className="text-4xl font-bold" style={{ color }}>{clamped}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
