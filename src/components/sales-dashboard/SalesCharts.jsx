import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  Package,
  Activity,
} from "lucide-react";

// ── Color tokens ──────────────────────────────────────────────────────────────
const COLOR_WON = "#111827"; // Dark Charcoal
const COLOR_LOST = "#E5E7EB"; // Soft muted gray

// Curated muted palette — no pure primaries
const PIE_COLORS = [
  "#334155", // dark slate
  "#64748b", // medium slate
  "#a7b3c0", // slate-gray
  "#c5926a", // earthy terracotta
  "#6b8fa3", // dull teal-blue
  "#8d7c9e", // muted mauve
  "#b07a6e", // soft coral-brown
  "#7a9e8e", // sage green
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const currencyFormatter = (value) => `₱${Number(value).toLocaleString()}`;

/** Convert any string to Title Case */
const toTitleCase = (str) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

import {
  USE_LOCAL_DEMO_DATA,
  MOCK_LEADERBOARD,
  MOCK_PRODUCT_DATA,
} from "./salesChartsMockData";
import { useMemo } from "react";

// ── Shared tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-black text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{ color: entry.color || "#111827" }}
          className="font-bold"
        >
          {entry.name}: ₱{Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ── Custom Legend — top-right, 8px circles, dark gray text ───────────────────
const CustomBarLegend = ({ payload }) => {
  if (!payload?.length) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 16,
        marginBottom: 8,
      }}
    >
      {payload.map((entry, i) => (
        <span
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: entry.color,
              flexShrink: 0,
            }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );
};

// ── 0. Revenue Trend Area Chart ────────────────────────────────────────────────
export function RevenueTrendChart({ revenueLogs }) {
  const data = useMemo(() => {
    if (!revenueLogs?.length) return [];
    const daily = {};
    revenueLogs.forEach((log) => {
      const d = log.date;
      const val = Number(log.revenue_amount) || 0;
      if (!daily[d]) daily[d] = 0;
      daily[d] += val;
    });
    return Object.entries(daily)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [revenueLogs]);

  if (data.length < 2) return null;

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2 mb-6">
        <Activity size={14} style={{ color: "#111827" }} />
        Daily Revenue Performance
      </h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111827" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#F3F4F6"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => d.split("-").slice(1).join("/")}
            />
            <YAxis
              tickFormatter={currencyFormatter}
              tick={{ fill: "#888", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              name="Revenue"
              stroke="#111827"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 1. Bar Chart — Revenue by Representative ──────────────────────────────────
export function RepRevenueChart({ leaderboard }) {
  const sourceLeaderboard = USE_LOCAL_DEMO_DATA
    ? MOCK_LEADERBOARD
    : leaderboard;
  if (!sourceLeaderboard?.length) return null;

  const data = sourceLeaderboard
    .filter((e) => e.revenueWon > 0 || e.revenueLost > 0)
    .slice(0, 10)
    .map((e) => ({
      name: e.name.split(" ")[0],
      fullName: e.name,
      Won: e.revenueWon,
      Lost: e.revenueLost,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2 mb-4">
        {/* Dark Charcoal icon — no red/green */}
        <BarChart3 size={14} style={{ color: "#111827" }} />
        Revenue by Representative
      </h3>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="35%">
            {/* Horizontal grid — virtually invisible dashed lines */}
            <CartesianGrid
              vertical={false}
              stroke="#F3F4F6"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: "#888", fontSize: 11, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={currencyFormatter}
              tick={{ fill: "#888", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Legend moved to top-right with circles */}
            <Legend
              verticalAlign="top"
              align="right"
              content={<CustomBarLegend />}
            />
            {/* Sleek 28px-wide bars — pillar shaped */}
            <Bar
              dataKey="Won"
              fill={COLOR_WON}
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
            <Bar
              dataKey="Lost"
              fill={COLOR_LOST}
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 2. Win Rate Donut ─────────────────────────────────────────────────────────
export function WinRateGauge({ leaderboard }) {
  const sourceLeaderboard = USE_LOCAL_DEMO_DATA
    ? MOCK_LEADERBOARD
    : leaderboard;
  if (!sourceLeaderboard?.length) return null;

  const totalWon = sourceLeaderboard.reduce((s, e) => s + e.dealsWon, 0);
  const totalLost = sourceLeaderboard.reduce((s, e) => s + e.dealsLost, 0);
  const totalDeals = totalWon + totalLost;
  const winRate =
    totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : null;

  if (winRate === null) return null;

  const pieData = [
    { name: "Won", value: totalWon },
    { name: "Lost", value: totalLost },
  ];

  // Thin ring: outerRadius=65, innerRadius=54 → ring width = 11px
  const OUTER = 65;
  const INNER = 54;

  return (
    /* No 'overflow-hidden' so the watermark div is simply gone */
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-5 shadow-sm">
      {/* Watermark (faded PieIcon) removed */}
      <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2 mb-4">
        {/* Dark Charcoal icon */}
        <PieIcon size={14} style={{ color: "#111827" }} />
        Team Win Rate
      </h3>

      {/* Donut with centered label — using position relative/absolute */}
      <div
        className="mx-auto"
        style={{ position: "relative", width: 140, height: 140 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={OUTER}
              innerRadius={INNER}
              paddingAngle={3}
              stroke="none"
            >
              <Cell fill={COLOR_WON} />
              <Cell fill={COLOR_LOST} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centered text inside the donut hole */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1,
            }}
          >
            {winRate}%
          </p>
        </div>
      </div>

      {/* Sub-label below the donut */}
      <div className="mt-4 space-y-2 border-t border-mauve-3 pt-4">
        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-mauve-11 uppercase tracking-tight">
            Won Deals
          </span>
          <span className="text-foreground">{totalWon}</span>
        </div>
        <div className="w-full bg-mauve-3 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#111827]"
            style={{ width: `${winRate}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-mauve-11 uppercase tracking-tight">
            Lost Deals
          </span>
          <span className="text-foreground">{totalLost}</span>
        </div>
        <p className="text-[10px] font-bold text-mauve-8 uppercase tracking-widest text-center pt-2">
          {totalDeals} total opportunities
        </p>
      </div>
    </div>
  );
}

// ── 3. Product Breakdown Pie ──────────────────────────────────────────────────
export function ProductBreakdownChart({ productData }) {
  const sourceProductData = USE_LOCAL_DEMO_DATA
    ? MOCK_PRODUCT_DATA
    : productData;
  if (!sourceProductData?.length) return null;

  const topProducts = sourceProductData.slice(0, 8);
  const pieData = topProducts.map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
    fullName: p.name,
    value: p.won,
  }));

  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2 mb-4">
        {/* Dark Charcoal icon */}
        <Package size={14} style={{ color: "#111827" }} />
        Product Retail Revenue Breakdown
      </h3>
      <div className="flex flex-col gap-4">
        {/* Pie Chart — muted curated colors */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
                stroke="none"
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={currencyFormatter}
                contentStyle={{
                  background: "#111",
                  border: "1px solid #333",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Ranked list — flat, no background boxes, bottom-border separators */}
        <div className="max-h-[100px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-mauve-4 scrollbar-track-transparent">
          {topProducts.map((p, i) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom:
                  i < topProducts.length - 1 ? "1px solid #F3F4F6" : "none",
              }}
            >
              {/* Color dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                }}
              />
              {/* Name + deal count */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#111827",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={p.name}
                >
                  {toTitleCase(p.name)}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#9CA3AF",
                  }}
                >
                  {p.count} {p.count === 1 ? "deal" : "deals"}
                </p>
              </div>
              {/* Revenue — far right */}
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#111827",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                ₱{p.won.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
