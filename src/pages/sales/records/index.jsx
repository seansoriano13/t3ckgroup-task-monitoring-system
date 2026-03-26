import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import { Search, Briefcase, FileText, CheckCircle2, Circle, AlertCircle, DollarSign, LayoutList } from "lucide-react";
import SalesTaskDetailsModal from "../../../components/SalesTaskDetailsModal.jsx";

export default function SalesRecordsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ACTIVITIES"); // ACTIVITIES or REVENUE
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmp, setFilterEmp] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const [selectedActivity, setSelectedActivity] = useState(null);

  // Fetch all activities
  const { data: rawActivities = [], isLoading: isActLoading } = useQuery({
    queryKey: ["allSalesActivities"],
    queryFn: () => salesService.getAllSalesActivities(),
    enabled: !!user?.id,
  });

  // Fetch all revenue logs
  const { data: rawRevenue = [], isLoading: isRevLoading } = useQuery({
    queryKey: ["allRevenueLogs"],
    queryFn: () => salesService.getAllRevenueLogs(),
    enabled: !!user?.id,
  });

  // Extract unique employees for dropdown (merging both sets for consistency)
  const uniqueEmployees = useMemo(() => {
    const map = new Map();
    rawActivities.forEach(act => {
      if (act.employees?.name && !map.has(act.employee_id)) {
        map.set(act.employee_id, act.employees.name);
      }
    });
    rawRevenue.forEach(rev => {
      if (rev.employees?.name && !map.has(rev.employee_id)) {
        map.set(rev.employee_id, rev.employees.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawActivities, rawRevenue]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = rawActivities;
    if (filterEmp !== "ALL") filtered = filtered.filter(a => a.employee_id === filterEmp);
    if (filterStatus !== "ALL") filtered = filtered.filter(a => a.status === filterStatus);
    if (filterType !== "ALL") filtered = filtered.filter(a => a.activity_type === filterType);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        (a.account_name && a.account_name.toLowerCase().includes(lower)) ||
        (a.employees?.name && a.employees.name.toLowerCase().includes(lower)) ||
        (a.details_daily && a.details_daily.toLowerCase().includes(lower))
      );
    }
    return filtered;
  }, [rawActivities, filterEmp, filterStatus, filterType, searchTerm]);

  // Filter revenue logs
  const filteredRevenue = useMemo(() => {
    let filtered = rawRevenue;
    if (filterEmp !== "ALL") filtered = filtered.filter(a => a.employee_id === filterEmp);
    if (filterStatus !== "ALL") {
       // Map the common filtering dropdown to Revenue exact terms
       if (filterStatus === 'DONE') filtered = filtered.filter(a => a.status.includes('COMPLETED') || a.status === 'Won');
       if (filterStatus === 'INCOMPLETE') filtered = filtered.filter(a => a.status.includes('LOST') || a.status === 'Lost');
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        (a.account && a.account.toLowerCase().includes(lower)) ||
        (a.product_item_sold && a.product_item_sold.toLowerCase().includes(lower)) ||
        (a.employees?.name && a.employees.name.toLowerCase().includes(lower))
      );
    }
    return filtered;
  }, [rawRevenue, filterEmp, filterStatus, searchTerm]);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 px-2 sm:px-4">
        
        {/* HEADER & TABS */}
        <div className="border-b border-gray-4 pb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 tracking-tight">
                <Briefcase className="text-primary" size={28} />
                Sales Master Log
              </h1>
              <p className="text-gray-9 mt-1 font-medium text-sm">Comprehensive filtering view for Sales Activities and Logged Revenue.</p>
            </div>
            <div className="text-right flex items-center gap-4">
               <div className="flex bg-gray-2 border border-gray-4 rounded-xl p-1 shadow-inner">
                  <button 
                    onClick={() => setActiveTab("ACTIVITIES")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === 'ACTIVITIES' ? 'bg-primary text-white shadow' : 'text-gray-9 hover:text-gray-12'}`}
                  >
                    <LayoutList size={14} /> Activities
                  </button>
                  <button 
                    onClick={() => setActiveTab("REVENUE")}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${activeTab === 'REVENUE' ? 'bg-green-600 text-white shadow' : 'text-gray-9 hover:text-gray-12'}`}
                  >
                    <DollarSign size={14} /> Revenue
                  </button>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm font-bold text-gray-11 w-full justify-end">
              <FileText size={16} /> {activeTab === "ACTIVITIES" ? filteredActivities.length : filteredRevenue.length} Records Found
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-gray-1 border border-gray-4 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
          
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-9" />
            <input 
              type="text"
              placeholder={activeTab === 'ACTIVITIES' ? "Search accounts, names, or remarks..." : "Search accounts, products, or reps..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-2 border border-gray-4 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-12 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <select 
              value={filterEmp} 
              onChange={(e) => setFilterEmp(e.target.value)}
              className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none"
            >
              <option value="ALL">All Representatives</option>
              {uniqueEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'ACTIVITIES' ? (
                 <>
                  <option value="INCOMPLETE">Planned / Incomplete</option>
                  <option value="DONE">Completed / Done</option>
                 </>
              ) : (
                 <>
                  <option value="DONE">Completed Sales</option>
                  <option value="INCOMPLETE">Lost Sales</option>
                 </>
              )}
            </select>

            {activeTab === "ACTIVITIES" && (
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 text-sm text-gray-12 outline-none focus:border-primary font-semibold flex-1 sm:flex-none"
              >
                <option value="ALL">All Types</option>
                <option value="Sales Call">Sales Call</option>
                <option value="In-House">In-House</option>
                <option value="None">Blank / None</option>
              </select>
            )}
          </div>
        </div>

        {/* TABLE BODY (ACTIVITIES) */}
        {activeTab === "ACTIVITIES" && (
          <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-gray-2 border-b border-gray-4">
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Date</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Employee</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Account</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Activity</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Details</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-4">
                      {isActLoading ? (
                         <tr><td colSpan="6" className="p-10 text-center text-gray-9 font-bold">Loading Activities...</td></tr>
                      ) : filteredActivities.length === 0 ? (
                         <tr><td colSpan="6" className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center"><AlertCircle/> No activities match the filters.</td></tr>
                      ) : (
                         filteredActivities.map((act) => (
                            <tr key={act.id} onClick={() => setSelectedActivity(act)} className="hover:bg-gray-3/50 cursor-pointer transition-colors">
                               <td className="p-4 flex flex-col items-start gap-1">
                                  <span className="font-mono text-sm font-bold text-gray-12">{act.scheduled_date}</span>
                                  <span className="text-[10px] bg-gray-4 px-2 py-0.5 rounded uppercase tracking-widest text-gray-11 font-black">{act.time_of_day}</span>
                               </td>
                               <td className="p-4">
                                  <p className="font-bold text-sm text-gray-12">{act.employees?.name || 'Unknown'}</p>
                                  <p className="text-[10px] font-bold text-gray-9 uppercase tracking-wider">{act.employees?.department}</p>
                               </td>
                               <td className="p-4 font-bold text-sm text-gray-12 max-w-[200px] truncate" title={act.account_name}>
                                  {act.account_name || <span className="text-gray-8 italic font-normal">No Account</span>}
                               </td>
                               <td className="p-4">
                                  <span className="text-xs font-semibold text-gray-11">{act.activity_type}</span>
                                  {act.is_unplanned && <span className="block mt-1 text-[10px] text-blue-500 bg-blue-500/10 w-max px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">Unplanned</span>}
                               </td>
                               <td className="p-4 text-xs text-gray-11 max-w-[250px] truncate" title={act.details_daily}>
                                  {act.details_daily || act.remarks_plan || <span className="text-gray-7 italic">Blank</span>}
                               </td>
                               <td className="p-4 text-center">
                                  {act.status === 'DONE' ? (
                                     <div className="flex flex-col items-center gap-1 text-green-500">
                                        <CheckCircle2 size={18} />
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded">DONE</span>
                                     </div>
                                  ) : (
                                     <div className="flex flex-col items-center gap-1 text-gray-8">
                                        <Circle size={18} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Incomplete</span>
                                     </div>
                                  )}
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* TABLE BODY (REVENUE) */}
        {activeTab === "REVENUE" && (
           <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-gray-2 border-b border-gray-4">
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Date</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Sales Rep</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Account</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider">Product Sold</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-right">Value (₱)</th>
                         <th className="p-4 text-xs font-bold text-gray-10 uppercase tracking-wider text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-4">
                      {isRevLoading ? (
                         <tr><td colSpan="6" className="p-10 text-center text-gray-9 font-bold">Loading Revenue Logs...</td></tr>
                      ) : filteredRevenue.length === 0 ? (
                         <tr><td colSpan="6" className="p-10 text-center text-gray-9 font-bold flex justify-center gap-2 items-center"><AlertCircle/> No log entries match the filters.</td></tr>
                      ) : (
                         filteredRevenue.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-3/50 transition-colors">
                               <td className="p-4 font-mono text-sm font-bold text-gray-12 whitespace-nowrap">{log.date}</td>
                               <td className="p-4 font-bold text-sm text-gray-12">{log.employees?.name || 'Unknown'}</td>
                               <td className="p-4 font-bold text-sm text-gray-12">{log.account}</td>
                               <td className="p-4 text-sm text-gray-11 max-w-[200px] truncate">{log.product_item_sold}</td>
                               <td className="p-4 font-mono text-right font-black text-gray-12">{Number(log.revenue_amount).toLocaleString()}</td>
                               <td className="p-4 text-center">
                                 {log.status === 'COMPLETED SALES' || log.status === 'Won' ? (
                                   <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest">COMPLETED</span>
                                 ) : (
                                   <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest">LOST</span>
                                 )}
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

      </div>

      {/* INJECT MODAL */}
      <SalesTaskDetailsModal 
         isOpen={!!selectedActivity} 
         onClose={() => setSelectedActivity(null)} 
         activity={selectedActivity} 
      />

    </ProtectedRoute>
  )
}
