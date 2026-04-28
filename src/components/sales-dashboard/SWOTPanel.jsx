import { Shield, AlertTriangle, Lightbulb, Target } from "lucide-react";

/**
 * SWOT-inspired strategic insights panel.
 * Visible only to admins/CEO — never to regular sales employees.
 */
export default function SWOTPanel({ leaderboard, productData, activities }) {
  if (!leaderboard?.length) return null;

  // === STRENGTHS: Top performers by win rate (min 2 deals for statistical relevance) ===
  const qualifiedReps = leaderboard.filter(
    (e) => e.dealsWon + e.dealsLost >= 2
  );
  const topPerformers = [...qualifiedReps]
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
    .slice(0, 3);

  // === WEAKNESSES: Bottom performers by quota % (with at least some quota set) ===
  const withQuota = leaderboard.filter((e) => e.quota > 0);
  const bottomPerformers = [...withQuota]
    .sort((a, b) => a.quotaPct - b.quotaPct)
    .slice(0, 3);

  // === OPPORTUNITIES: Top products by deal count and revenue ===
  const topProducts = (productData || []).slice(0, 3);

  // === THREATS: Revenue concentration ===
  const totalRevenue = leaderboard.reduce((s, e) => s + e.revenueWon, 0);
  const topRepRevenue = leaderboard.length > 0
    ? Math.max(...leaderboard.map((e) => e.revenueWon))
    : 0;
  const concentrationPct =
    totalRevenue > 0 ? Math.round((topRepRevenue / totalRevenue) * 100) : 0;

  // Revenue from top product
  const totalProductRevenue = (productData || []).reduce(
    (s, p) => s + p.won,
    0
  );
  const topProductRevenue =
    productData?.length > 0 ? productData[0]?.won || 0 : 0;
  const productConcentrationPct =
    totalProductRevenue > 0
      ? Math.round((topProductRevenue / totalProductRevenue) * 100)
      : 0;

  // Activity completion rate across all reps
  const totalActivities = (activities || []).length;
  const completedActivities = (activities || []).filter(
    (a) => a.status === "DONE" || a.status === "APPROVED"
  ).length;
  const overallExecutionRate =
    totalActivities > 0
      ? Math.round((completedActivities / totalActivities) * 100)
      : null;

  const quadrants = [
    {
      title: "Strengths",
      icon: Shield,
      color: "text-green-9",
      border: "border-green-500/20",
      bg: "bg-green-9/5",
      items: topPerformers.length > 0
        ? topPerformers.map(
            (e) =>
              `${e.name} — ${e.winRate ?? 0}% win rate, ?${e.revenueWon.toLocaleString()} closed`
          )
        : ["Not enough data (min 2 closed deals per rep)"],
    },
    {
      title: "Weaknesses",
      icon: AlertTriangle,
      color: "text-destructive",
      border: "border-red-500/20",
      bg: "bg-destructive/5",
      items: [
        ...(bottomPerformers.length > 0
          ? bottomPerformers.map(
              (e) =>
                `${e.name} — ${e.quotaPct}% of quota (?${e.revenueWon.toLocaleString()} / ?${e.quota.toLocaleString()})`
            )
          : ["No underperformers flagged"]),
        ...(overallExecutionRate !== null && overallExecutionRate < 70
          ? [`Team execution rate: ${overallExecutionRate}% (below 70% threshold)`]
          : []),
      ],
    },
    {
      title: "Opportunities",
      icon: Lightbulb,
      color: "text-amber-9",
      border: "border-amber-500/20",
      bg: "bg-warning/5",
      items:
        topProducts.length > 0
          ? topProducts.map(
              (p) =>
                `${p.name} — ${p.count} deals, ?${p.won.toLocaleString()} revenue`
            )
          : ["No product data available"],
    },
    {
      title: "Threats",
      icon: Target,
      color: "text-plum-9",
      border: "border-purple-500/20",
      bg: "bg-plum-9/5",
      items: [
        concentrationPct > 50
          ? `? Revenue dependency: Top rep accounts for ${concentrationPct}% of total revenue`
          : `Revenue is diversified — top rep is ${concentrationPct}% of total`,
        productConcentrationPct > 60
          ? `? Product risk: Top product is ${productConcentrationPct}% of total revenue`
          : `Product mix is balanced — top product is ${productConcentrationPct}%`,
        ...(leaderboard.filter((e) => e.quotaPct < 30 && e.quota > 0).length > 2
          ? [
              `${leaderboard.filter((e) => e.quotaPct < 30 && e.quota > 0).length} reps below 30% quota — pipeline issue`,
            ]
          : []),
      ],
    },
  ];

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-6 shadow-lg">
      <h2 className="text-sm font-black text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
        <Shield size={16} className="text-primary" />
        Strategic Insights (SWOT)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map((q) => {
          const Icon = q.icon;
          return (
            <div
              key={q.title}
              className={`${q.bg} border ${q.border} rounded-xl p-5 relative overflow-hidden`}
            >
              <div className="absolute -top-3 -right-3 opacity-[0.04] pointer-events-none">
                <Icon size={80} />
              </div>
              <h3
                className={`text-xs font-black uppercase tracking-widest ${q.color} flex items-center gap-2 mb-3`}
              >
                <Icon size={14} />
                {q.title}
              </h3>
              <ul className="space-y-2">
                {q.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-sm text-mauve-11 font-medium leading-relaxed flex gap-2"
                  >
                    <span className="text-mauve-7 shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
