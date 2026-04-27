import { FileText } from "lucide-react";
import StatusBadge from "../StatusBadge.jsx";

export function RevenueLogsTable({ logs }) {
  return (
    <div className="bg-mauve-1 border border-mauve-4 rounded-2xl p-6 shadow-xl overflow-hidden mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <FileText className="text-primary" size={16} /> Approved Sales Logs
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-mauve-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-mauve-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-mauve-4">
              <th className="p-3">Date</th>
              <th className="p-3">Sales Rep</th>
              <th className="p-3">Account</th>
              <th className="p-3">Product</th>
              <th className="p-3 text-right">Value (₱)</th>
              <th className="p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-4">
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="p-6 text-center text-muted-foreground py-10 font-medium"
                >
                  No sales logged for this month view.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-mauve-2 transition-colors">
                  <td className="p-3 font-mono text-xs text-mauve-11 whitespace-nowrap">
                    {log.date}
                  </td>
                  <td className="p-3 font-bold text-[13px] text-foreground">
                    {log.employees?.name}
                  </td>
                  <td
                    className="p-3 text-[13px] text-foreground font-medium truncate max-w-[200px]"
                    title={log.account}
                  >
                    {log.account}
                  </td>
                  <td className="p-3 text-[13px] text-mauve-11 truncate max-w-[200px]">
                    {log.product_item_sold}
                  </td>
                  <td className="p-3 font-mono text-sm text-right font-black text-foreground">
                    {Number(log.revenue_amount).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge status={log.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
