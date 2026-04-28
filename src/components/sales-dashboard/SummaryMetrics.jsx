import { TrendingUp, TrendingDown, Trophy, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SummaryMetrics({
  totalWon,
  totalLost,
  companyPct,
  winRate,
  showQuota,
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Completed Sales */}
      <StatCard
        title="Total Completed Sales"
        value={`₱${totalWon.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Revenue Won"
        icon={<TrendingUp size={20} className="text-green-500" />}
        color="emerald"
      />

      {/* Total Lost Sales */}
      <StatCard
        title="Total Lost Sales"
        value={`₱${totalLost.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="Missed Opportunity"
        icon={<TrendingDown size={20} className="text-destructive" />}
        color="destructive"
      />

      {/* Quota Achievement */}
      {showQuota && (
        <StatCard
          title="Quota Achievement"
          value={`${companyPct}%`}
          subtitle="Target Progress"
          icon={<Trophy size={20} className="text-amber-500" />}
          color="amber"
        />
      )}

      {/* Team Win Rate */}
      {winRate !== null && (
        <StatCard
          title="Team Win Rate"
          value={`${winRate}%`}
          subtitle="Conversion Ratio"
          icon={<Target size={20} className="text-violet-9" />}
          color="violet"
        />
      )}
    </div>
  );
}

// Reusable Sub-component for the cards (copied design from DashboardStats.jsx)
function StatCard({ title, value, subtitle, icon, color }) {
  const colorMap = {
    violet: "from-violet-500/15 to-transparent",
    amber: "from-amber-500/15 to-transparent",
    destructive: "from-red-500/15 to-transparent",
    emerald: "from-green-9/15 to-transparent",
    slate: "from-slate-500/15 to-transparent",
  };

  return (
    <Card className="p-5 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group border-border shadow-sm">
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorMap[color] || "from-slate-500/10 to-transparent"} -mr-8 -mt-8 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500`}
      />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </h3>
        </div>
        <div className="p-2.5 rounded-xl bg-muted/50 border border-border group-hover:bg-muted transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10">
        {subtitle}
      </p>
    </Card>
  );
}
