import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { BarChart3, PieChart as PieIcon, Package } from "lucide-react";

const COLORS_WON = "#22c55e";
const COLORS_LOST = "#ef4444";
const PIE_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

const currencyFormatter = (value) => `₱${Number(value).toLocaleString()}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-1 border border-gray-4 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-black text-gray-12 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-bold">
          {entry.name}: ₱{Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/**
 * Revenue comparison bar chart — Won vs Lost per employee.
 */
export function RepRevenueChart({ leaderboard }) {
  if (!leaderboard?.length) return null;

  const data = leaderboard
    .filter((e) => e.revenueWon > 0 || e.revenueLost > 0)
    .slice(0, 10)
    .map((e) => ({
      name: e.name.split(" ")[0], // first name only for space
      fullName: e.name,
      Won: e.revenueWon,
      Lost: e.revenueLost,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-12 flex items-center gap-2 mb-4">
        <BarChart3 size={14} className="text-primary" />
        Revenue by Representative
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4} barCategoryGap="20%">
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
            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
            <Bar dataKey="Won" fill={COLORS_WON} radius={[6, 6, 0, 0]} />
            <Bar dataKey="Lost" fill={COLORS_LOST} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Product breakdown pie chart + ranked list.
 */
export function ProductBreakdownChart({ productData }) {
  if (!productData?.length) return null;

  const topProducts = productData.slice(0, 8);
  const pieData = topProducts.map((p) => ({
    name: p.name.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
    fullName: p.name,
    value: p.won,
  }));

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 shadow-sm">
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-12 flex items-center gap-2 mb-4">
        <Package size={14} className="text-primary" />
        Product Retail Revenue Breakdown
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Pie Chart */}
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
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

        {/* Ranked list */}
        <div className="space-y-2">
          {topProducts.map((p, i) => (
            <div
              key={p.name}
              className="flex items-center gap-3 bg-gray-2 rounded-lg p-2.5 border border-gray-3"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-bold text-gray-12 truncate"
                  title={p.name}
                >
                  {p.name}
                </p>
                <p className="text-[10px] text-gray-8 font-bold">
                  {p.count} deals
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-black text-gray-12 font-mono">
                  ₱{p.won.toLocaleString()}
                </p>
                {p.lost > 0 && (
                  <p className="text-[10px] text-red-500 font-bold font-mono">
                    -₱{p.lost.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Win Rate gauge — simple visual showing overall team win rate.
 */
export function WinRateGauge({ leaderboard }) {
  const totalWon = leaderboard.reduce((s, e) => s + e.dealsWon, 0);
  const totalLost = leaderboard.reduce((s, e) => s + e.dealsLost, 0);
  const totalDeals = totalWon + totalLost;
  const winRate =
    totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : null;

  if (winRate === null) return null;

  const pieData = [
    { name: "Won", value: totalWon },
    { name: "Lost", value: totalLost },
  ];

  return (
    <div className="bg-gray-1 border border-gray-4 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none">
        <PieIcon size={140} />
      </div>
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-12 flex items-center gap-2 mb-2">
        <PieIcon size={14} className="text-primary" />
        Team Win Rate
      </h3>
      <div className="flex items-center gap-6">
        <div className="h-[120px] w-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={55}
                innerRadius={38}
                paddingAngle={3}
                stroke="none"
              >
                <Cell fill={COLORS_WON} />
                <Cell fill={COLORS_LOST} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-4xl font-black text-gray-12">{winRate}%</p>
          <p className="text-[10px] font-bold text-gray-8 uppercase tracking-widest mt-1">
            {totalWon} won / {totalLost} lost / {totalDeals} total
          </p>
        </div>
      </div>
    </div>
  );
}
