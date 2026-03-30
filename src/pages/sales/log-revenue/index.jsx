import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { DollarSign, Save } from "lucide-react";

export default function LogRevenuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    account: '',
    product_item_sold: '',
    revenue_amount: '',
    reference_number: '',
    remarks: '',
    status: 'COMPLETED SALES'
  });

  const mutation = useMutation({
    mutationFn: (payload) => salesService.logRevenue(payload),
    onSuccess: () => {
       toast.success("Revenue Logged Successfully!");
       // reset generic fields
       setFormData(f => ({ ...f, account: '', product_item_sold: '', revenue_amount: '', reference_number: '', remarks: '' }));
       // invalidate queries if Dashboard relies on them
       queryClient.invalidateQueries({ queryKey: ["revenueLogs"] });
    },
    onError: (err) => toast.error(err.message)
  });

  const { data: appSettings } = useQuery({
     queryKey: ["appSettings"],
     queryFn: () => salesService.getAppSettings()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(formData.revenue_amount);
    if (isNaN(num)) return toast.error("Invalid revenue amount");

    // Magician Security Lock - If verification is globally flipped ON, force the row into an unverified state
    const isVerifiedPayload = appSettings?.require_revenue_verification ? false : true;

    mutation.mutate({
       ...formData,
       employee_id: user.id,
       revenue_amount: num,
       is_verified: isVerifiedPayload
    });
  }

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6 pb-10 px-2 sm:px-4">
        <div className="border-b border-gray-4 pb-4">
          <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3">
             <DollarSign size={28} className="text-green-500" /> Log Sales Revenue
          </h1>
          <p className="text-gray-9 mt-1 font-medium">Record Completed Sale operations to contribute to your monthly Quota Rankings.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-1 border border-gray-4 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Purchase Date</label>
                <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500 font-bold" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Status</label>
                <div className="flex bg-gray-2 border border-gray-4 rounded-lg p-1">
                   <button 
                     type="button"
                     onClick={() => setFormData({...formData, status: 'COMPLETED SALES'})}
                     className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-widest rounded-md transition-all ${formData.status === 'COMPLETED SALES' ? 'bg-green-600 text-white shadow-md' : 'text-gray-9 hover:text-gray-12'}`}
                   >
                     COMPLETED
                   </button>
                   <button 
                     type="button"
                     onClick={() => setFormData({...formData, status: 'LOST SALES'})}
                     className={`flex-1 py-2 px-3 text-xs font-black uppercase tracking-widest rounded-md transition-all ${formData.status === 'LOST SALES' ? 'bg-red-500 text-white shadow-md' : 'text-gray-9 hover:text-gray-12'}`}
                   >
                     LOST
                   </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Account / Client Name</label>
                <input required type="text" placeholder="e.g. CDRRMO - Cabadbaran City" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Product / Item</label>
                <input required type="text" placeholder="e.g. Heavy Duty Double Jacketed Hose" value={formData.product_item_sold} onChange={e => setFormData({...formData, product_item_sold: e.target.value})} className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Revenue Amount (PHP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-8">₱</span>
                  <input required type="number" step="0.01" placeholder="72800.00" value={formData.revenue_amount} onChange={e => setFormData({...formData, revenue_amount: e.target.value})} className="w-full bg-gray-2 border border-green-900/40 text-green-500 font-black text-xl rounded-lg pl-10 pr-4 py-3 outline-none focus:border-green-500 shadow-inner" />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Ref #</label>
                <input type="text" placeholder="Optional" value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500" />
              </div>

              <div className="sm:col-span-1">
                <label className="text-xs font-bold text-gray-9 uppercase block mb-1">Remarks</label>
                <textarea placeholder="Any additional notes?" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full bg-gray-2 border border-gray-4 text-gray-12 rounded-lg p-3 outline-none focus:border-green-500 resize-none h-12" />
              </div>
           </div>

           <div className="pt-4 border-t border-gray-4">
             <button disabled={mutation.isPending} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-lg py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50 transition-colors">
               <Save size={24} /> {mutation.isPending ? 'Logging...' : 'Save Revenue Entry'}
             </button>
           </div>
        </form>

      </div>
    </ProtectedRoute>
  )
}
