import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../services/salesService";
import { useAuth } from "../../context/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { Crown, Save, DollarSign, Loader2 } from "lucide-react";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Ensure it defaults to the 1st of the current month in 'YYYY-MM-DD' formatting for Supabase
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

  // 1. Fetch Sales Employees
  const { data: salesEmployees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ["salesEmployees"],
    queryFn: () => salesService.getSalesEmployees(),
  });

  // 2. Fetch Quotas for the Selected Month
  const { data: quotas = [], isLoading: loadingQuotas } = useQuery({
    queryKey: ["quotas", selectedMonth],
    queryFn: () => salesService.getQuotasByMonth(selectedMonth),
  });

  const mutation = useMutation({
    mutationFn: ({ employeeId, amount }) => salesService.upsertQuota(employeeId, amount, selectedMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotas", selectedMonth] });
      toast.success("Quota updated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  // Calculate Map of Employee ID -> Current Quota
  const quotaMap = useMemo(() => {
    return quotas.reduce((acc, q) => {
      acc[q.employee_id] = q.amount_target;
      return acc;
    }, {});
  }, [quotas]);

  const handleUpdateQuota = (employeeId, amount) => {
    // Basic validation
    let num = parseFloat(amount);
    if (isNaN(num)) num = 0;
    mutation.mutate({ employeeId, amount: num });
  };

  if (loadingEmps || loadingQuotas) {
    return (
      <ProtectedRoute requireSuperAdmin={true}>
        <div className="flex h-[80vh] items-center justify-center space-x-2 text-gray-9">
          <Loader2 className="animate-spin" />
          <p className="font-bold">Syncing Super Admin Metrics...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireSuperAdmin={true}>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 px-2 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12 flex items-center gap-2">
               <Crown size={32} className="text-purple-500" /> Super Admin Control
            </h1>
            <p className="text-gray-9 mt-1 font-medium">
              Manage Sales Quotas, configure tracking rules, and review department activities.
            </p>
          </div>
          
          <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
             <span className="text-xs font-bold text-gray-9 mr-3 uppercase">Target Month:</span>
             <input
               type="month"
               value={selectedMonth.substring(0, 7)}
               onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
               className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer"
             />
          </div>
        </div>

        <div className="bg-gray-1 border border-primary/20 p-6 rounded-xl shadow-lg border-t-4 border-t-purple-600">
          <h2 className="text-xl font-bold text-gray-12 mb-4">Set Sales Quotas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {salesEmployees.map(emp => {
               const target = quotaMap[emp.id] || 0;
               return (
                 <QuotaCard 
                   key={emp.id} 
                   employee={emp} 
                   currentQuota={target}
                   onSave={(val) => handleUpdateQuota(emp.id, val)}
                   isSaving={mutation.isPending}
                 />
               );
            })}
          </div>
          {salesEmployees.length === 0 && (
            <p className="text-gray-9 italic">No employees found matching 'Sales' department criteria.</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function QuotaCard({ employee, currentQuota, onSave, isSaving }) {
  const [val, setVal] = useState(currentQuota);

  return (
    <div className="bg-gray-2 border border-gray-4 p-4 rounded-xl flex flex-col justify-between">
      <div>
         <p className="font-bold text-gray-12 text-lg truncate">{employee.name}</p>
         <p className="text-xs text-gray-9 font-bold uppercase tracking-wide mb-4 truncate">{employee.sub_department || employee.department || 'Sales Rep'}</p>
      </div>
      
      <div className="flex gap-2 items-center">
         <div className="relative flex-1">
            <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-8" />
            <input 
              type="number" 
              value={val}
              onChange={e => setVal(e.target.value)}
              className="w-full bg-gray-1 border border-gray-4 text-gray-12 rounded-lg pl-8 pr-3 py-2 text-sm font-bold outline-none focus:border-purple-500 transition-colors"
            />
         </div>
         <button 
           onClick={() => onSave(val)}
           disabled={isSaving || val == currentQuota}
           className="bg-purple-600 hover:bg-purple-800 disabled:bg-gray-5 disabled:text-gray-8 text-white p-2 rounded-lg transition-colors font-bold flex items-center"
         >
           <Save size={18} />
         </button>
      </div>
    </div>
  );
}
