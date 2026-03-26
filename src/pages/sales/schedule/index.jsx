import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { Calendar as CalendarIcon, Save, Send, Loader2, ChevronDown, ChevronRight } from "lucide-react";

// Utility to get the next Monday
function getNextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
  return d;
}

function formatDateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function SalesSchedulePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0); // 0=Mon, 1=Tue...
  const [weekStartDate, setWeekStartDate] = useState(() => formatDateToYMD(getNextMonday()));

  const { data: planWrapper, isLoading } = useQuery({
    queryKey: ["weeklyPlan", user?.id, weekStartDate],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartDate),
    enabled: !!user?.id,
  });

  const plan = planWrapper || { status: 'DRAFT', sales_activities: [] };
  const isLocked = plan.status === 'SUBMITTED' || plan.status === 'APPROVED';
  const planStatus = plan?.status || 'DRAFT';
  const isGreen = planStatus === 'SUBMITTED' || planStatus === 'APPROVED';

  // State to hold form data spanning all 5 days * 10 slots (50 slots total)
  const [activitiesData, setActivitiesData] = useState([]);

  useEffect(() => {
    if (planWrapper && planWrapper.sales_activities) {
      // Re-assign _slot_index by sequentially mapping them within each day/time bucket.
      // This prevents the data from vanishing on draft refetch.
      const bucketCounts = {};
      const reconstructed = planWrapper.sales_activities.map(act => {
         const key = `${act.scheduled_date}-${act.time_of_day}`;
         if (bucketCounts[key] === undefined) bucketCounts[key] = 0;
         const updated = { ...act, _slot_index: bucketCounts[key] };
         bucketCounts[key]++;
         return updated;
      });
      setActivitiesData(reconstructed);
    } else {
      setActivitiesData([]);
    }
  }, [planWrapper]);

  // Generate the 5 dates of the week
  const weekDates = useMemo(() => {
    const dates = [];
    const [y, m, d] = weekStartDate.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + i);
        dates.push({
            label: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
            dateStr: formatDateToYMD(currentDate)
        });
    }
    return dates;
  }, [weekStartDate]);

  const { data: categories = [] } = useQuery({
    queryKey: ['salesCategories'],
    queryFn: async () => await salesService.getSalesCategories()
  });

 

  const getSlotData = (dateStr, timeOfDay, slotIndex) => {
    // Generate an artificial ID just to find it in the array, or find based on attributes
    const existing = activitiesData.find(a => a.scheduled_date === dateStr && a.time_of_day === timeOfDay && a._slot_index === slotIndex);
    if (existing) return existing;
    return {
      scheduled_date: dateStr,
      time_of_day: timeOfDay,
      _slot_index: slotIndex, // local tracker
      activity_type: 'None',
      account_name: '',
      contact_person: '',
      contact_number: '',
      email_address: '',
      address: '',
      remarks_plan: ''
    };
  };

  const updateSlotData = (dateStr, timeOfDay, slotIndex, field, value) => {
    setActivitiesData(prev => {
      const copy = [...prev];
      const idx = copy.findIndex(a => a.scheduled_date === dateStr && a.time_of_day === timeOfDay && a._slot_index === slotIndex);
      if (idx >= 0) {
        copy[idx] = { ...copy[idx], [field]: value };
      } else {
        const newSlot = getSlotData(dateStr, timeOfDay, slotIndex);
        newSlot[field] = value;
        copy.push(newSlot);
      }
      return copy;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (isSubmit = false) => {
      // 1.
    if (isSubmit) {
       const validTaskCount = activitiesData.filter(a => a.activity_type !== 'None' || (a.account_name && a.account_name.trim() !== '')).length;
       if (validTaskCount === 0) {
          toast.error("You must fill out at least one task before submitting the plan.");
          throw new Error("No tasks to submit."); // Throw an error to stop the mutation chain
       }
    }

    let currentPlanId = plan?.id;
      if (!currentPlanId) {
        const newPlan = await salesService.upsertWeeklyPlan(user.id, weekStartDate, 'DRAFT');
        currentPlanId = newPlan.id;
      }

      // 2. Prepare activities mapping plan_id and employee_id, filtering out pure blanks
      const toSave = activitiesData.filter(a => a.activity_type !== 'None' || (a.account_name && a.account_name.trim() !== '')).map(a => {
        const payload = { ...a, plan_id: currentPlanId, employee_id: user.id };
        delete payload._slot_index;
        if (!payload.id) {
           delete payload.id;
        }
        return payload;
      });

      if (toSave.length > 0) {
        await salesService.bulkUpsertActivities(toSave);
      }
      return currentPlanId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklyPlan", user.id, weekStartDate] });
      toast.success("Schedule saved as Draft!");
    },
    onError: (err) => toast.error(err.message)
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
       const planId = await saveMutation.mutateAsync(true);
       await salesService.submitPlan(planId);
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["weeklyPlan", user.id, weekStartDate] });
       toast.success("Schedule Submitted Successfully!");
    },
    onError: (err) => toast.error(err.message)
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-8" size={32} /></div>
      </ProtectedRoute>
    )
  }

  const currentDateObj = weekDates[activeTab];

  const mapDateToTasks = activitiesData.reduce((acc, a) => {
    if (a.activity_type !== 'None' || (a.account_name && a.account_name.trim() !== '')) {
       acc[a.scheduled_date] = (acc[a.scheduled_date] || 0) + 1;
    }
    return acc;
  }, {});
  const allDaysFilled = weekDates.every(d => mapDateToTasks[d.dateStr] > 0);

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] mx-auto space-y-6 pb-10 px-2 sm:px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12">Weekly Coverage Plan</h1>
            <p className="text-gray-9 mt-1 font-medium">Plan your tasks and sales calls for the upcoming week.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
               <CalendarIcon size={16} className="text-gray-8 mr-2" />
               <input
                 type="date"
                 value={weekStartDate}
                 onChange={(e) => setWeekStartDate(e.target.value)}
                 className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer"
               />
               <span className="ml-3 text-xs font-bold px-2 py-1 rounded bg-gray-3 border border-gray-4">Status: {plan.status}</span>
            </div>
          </div>
        </div>

        {!isLocked && (
          <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl flex items-center justify-between">
            <p className="text-sm font-bold text-blue-500">Remember to submit your schedule by Friday End of Day for the following week!</p>
            <div className="flex gap-3">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || submitMutation.isPending} className="px-4 py-2 bg-gray-2 hover:bg-gray-3 border border-gray-4 text-gray-12 rounded-lg font-bold flex items-center gap-2 transition-colors">
                 {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft
              </button>
              <button 
                 onClick={() => submitMutation.mutate()} 
                 disabled={saveMutation.isPending || submitMutation.isPending || !allDaysFilled} 
                 title={!allDaysFilled ? "Please plan at least 1 activity for ALL days of the week to unlock submission." : ""}
                 className={`px-4 py-2 ${allDaysFilled ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20 shadow-lg cursor-pointer' : 'bg-green-900/50 text-white/50 cursor-not-allowed'} text-white rounded-lg font-bold flex items-center gap-2 transition-colors`}
              >
                 <Send size={16} /> Submit Plan
              </button>
            </div>
          </div>
        )}

        {/* The Days Tabs */}
        <div className="flex gap-2 border-b border-gray-4 pb-0 overflow-x-auto">
           {weekDates.map((d, idx) => {
             const hasTasks = activitiesData.some(a => a.scheduled_date === d.dateStr && (a.activity_type !== 'None' || (a.account_name && a.account_name.trim() !== '')));
             return (
               <button
                 key={d.dateStr}
                 onClick={() => setActiveTab(idx)}
                 className={`px-6 py-3 font-bold text-sm tracking-wide border-b-2 transition-colors whitespace-nowrap ${activeTab === idx ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-9 hover:text-gray-12 hover:bg-gray-2'}`}
               >
                 {d.label} {hasTasks && <span className={`w-2 h-2 rounded-full ${isGreen ? 'bg-green-500' : 'bg-yellow-500'} inline-block ml-1 mb-0.5 shadow-sm`}></span>}
                 <span className="text-xs font-normal text-gray-8 block">{d.dateStr}</span>
               </button>
             )
           })}
        </div>

        {/* 2-Column Grid for the Active Day */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
           {/* AM COLUMN */}
           <div className="space-y-4">
             <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
               <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">MORNING (AM)</h3>
             </div>
             {[0,1,2,3,4].map(slotIdx => (
               <ActivitySlotBox 
                 key={`AM-${slotIdx}`} 
                 data={getSlotData(currentDateObj.dateStr, 'AM', slotIdx)} 
                 onChange={(field, val) => updateSlotData(currentDateObj.dateStr, 'AM', slotIdx, field, val)}
                 disabled={isLocked}
                 slotNum={slotIdx + 1}
                 availableCategories={categories}
               />
             ))}
           </div>

           {/* PM COLUMN */}
           <div className="space-y-4">
             <div className="bg-gray-2 border border-gray-4 rounded-t-xl p-3 border-b-0">
               <h3 className="font-black text-gray-12 tracking-widest uppercase text-center">AFTERNOON (PM)</h3>
             </div>
             {[0,1,2,3,4].map(slotIdx => (
               <ActivitySlotBox 
                 key={`PM-${slotIdx}`} 
                 data={getSlotData(currentDateObj.dateStr, 'PM', slotIdx)} 
                 onChange={(field, val) => updateSlotData(currentDateObj.dateStr, 'PM', slotIdx, field, val)}
                 disabled={isLocked}
                 slotNum={slotIdx + 1}
                 availableCategories={categories}
               />
             ))}
           </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function ActivitySlotBox({ data, onChange, disabled, slotNum, availableCategories = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFilled = data.activity_type !== 'None' || !!data.account_name;

  return (
    <div className={`bg-gray-1 border ${isFilled ? 'border-primary/50 shadow-md' : 'border-gray-4'} rounded-xl overflow-hidden transition-all delay-75`}>
       {/* Accordion Header */}
       <div 
         onClick={() => !disabled && setIsExpanded(!isExpanded)}
         className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-2 transition-colors ${disabled && 'cursor-not-allowed opacity-80'}`}
       >
         <div className="flex gap-3 items-center">
            <span className="bg-gray-3 text-gray-10 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0">{slotNum}</span>
            <div className="flex-1 min-w-[150px]">
               <select 
                 value={data.activity_type} 
                 onChange={e => onChange('activity_type', e.target.value)} 
                 disabled={disabled}
                 onClick={e => e.stopPropagation()}
                 className="bg-transparent font-bold text-sm text-gray-12 outline-none w-full"
               >
                 <option value="None">No Activity</option>
                 {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
               </select>
            </div>
            {isFilled && <span className="text-sm text-gray-12 font-medium truncate hidden sm:block max-w-[200px]">{data.account_name || 'Unnamed Account'}</span>}
         </div>
         {!disabled && (
           <span className="text-gray-8">
             {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
           </span>
         )}
       </div>

       {/* Form Body - Auto expanding if filled and disabled so they can read it, or if toggled */}
       {(isExpanded || (disabled && isFilled)) && (
         <div className="p-4 pt-0 border-t border-gray-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="sm:col-span-2 mt-4">
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Account</label>
               <input type="text" disabled={disabled} value={data.account_name} onChange={e => onChange('account_name', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Contact Person</label>
               <input type="text" disabled={disabled} value={data.contact_person} onChange={e => onChange('contact_person', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Contact Number</label>
               <input type="text" disabled={disabled} value={data.contact_number} onChange={e => onChange('contact_number', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary" />
             </div>
             <div className="sm:col-span-2">
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Email Address</label>
               <input type="email" disabled={disabled} value={data.email_address} onChange={e => onChange('email_address', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary" />
             </div>
             <div className="sm:col-span-2">
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Address</label>
               <input type="text" disabled={disabled} value={data.address} onChange={e => onChange('address', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary" />
             </div>
             <div className="sm:col-span-2">
               <label className="text-[10px] font-bold text-gray-9 uppercase tracking-wider block mb-1">Details (Plan)</label>
               <textarea disabled={disabled} value={data.remarks_plan} onChange={e => onChange('remarks_plan', e.target.value)} className="w-full bg-gray-2 border border-gray-4 rounded px-3 py-1.5 text-sm text-gray-12 outline-none focus:border-primary resize-none h-20" />
             </div>
         </div>
       )}
    </div>
  )
}
