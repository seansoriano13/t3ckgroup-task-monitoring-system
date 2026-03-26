import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "../../../services/salesService";
import { useAuth } from "../../../context/AuthContext";
import ProtectedRoute from "../../../components/ProtectedRoute.jsx";
import toast from "react-hot-toast";
import { CheckCircle2, Circle, Loader2, Plus, Calendar as CalendarIcon, Save, AlertCircle } from "lucide-react";
import StatusBadge from "../../../components/StatusBadge.jsx";

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

function formatDateToYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DailyExecutionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  
  // Calculate the dates for the week (Mon-Sat)
  const weekDates = useMemo(() => {
     const start = getStartOfWeek(currentDateObj);
     const dates = [];
     for (let i = 0; i < 6; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        dates.push({
           label: d.toLocaleDateString('en-US', { weekday: 'short' }),
           dateStr: formatDateToYMD(d)
        });
     }
     return dates;
  }, [currentDateObj]);

  const [selectedDate, setSelectedDate] = useState(() => formatDateToYMD(new Date()));

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["dailyActivities", user?.id, selectedDate],
    queryFn: () => salesService.getDailyActivities(user.id, selectedDate),
    enabled: !!user?.id,
  });

  const plannedAM = useMemo(() => activities.filter(a => !a.is_unplanned && a.time_of_day === 'AM'), [activities]);
  const plannedPM = useMemo(() => activities.filter(a => !a.is_unplanned && a.time_of_day === 'PM'), [activities]);
  const unplannedAM = useMemo(() => activities.filter(a => a.is_unplanned && a.time_of_day === 'AM'), [activities]);
  const unplannedPM = useMemo(() => activities.filter(a => a.is_unplanned && a.time_of_day === 'PM'), [activities]);

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, details }) => salesService.markActivityDone(id, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivities", user?.id, selectedDate] });
      toast.success("Task Checked!");
    },
    onError: (err) => toast.error(err.message)
  });

  const handleToggleDone = (id, currentDetails) => {
    // If it's already done this allows it but DB just overwrites DONE. If they need to un-check, we'd need a backend un-done function.
    toggleStatusMutation.mutate({ id, details: currentDetails || 'Completed without remarks' });
  };

  const addUnplannedMutation = useMutation({
    mutationFn: (payload) => salesService.bulkUpsertActivities([payload]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyActivities", user?.id, selectedDate] });
      toast.success("Unplanned task added!");
    },
    onError: (err) => toast.error(err.message)
  });

  // Pull weekly plan so we know which days actually have tasks for the dot indicator
  const weekStartStr = formatDateToYMD(getStartOfWeek(currentDateObj));
  const { data: planWrapper } = useQuery({
    queryKey: ["weeklyPlanLoc", user?.id, weekStartStr],
    queryFn: () => salesService.getWeeklyPlan(user?.id, weekStartStr),
    enabled: !!user?.id,
  });
  const weeklyActivities = planWrapper?.sales_activities || [];
  const planStatus = planWrapper?.status || 'DRAFT';
  const isGreen = planStatus === 'SUBMITTED' || planStatus === 'APPROVED';

  const handleAddUnplanned = (payload) => {
    addUnplannedMutation.mutate({
      ...payload,
      employee_id: user.id,
      scheduled_date: selectedDate,
      status: 'DONE',
      is_unplanned: true
    });
  }

  if (isLoading || !user?.id) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center h-[80vh] text-gray-9 gap-3 font-bold">
           <Loader2 className="animate-spin" /> Fetching Daily Checklist...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto space-y-6 pb-10 px-2 sm:px-4">
        
        {/* HEADER & DATE PICKER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-4 pb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-12 flex items-center gap-3 tracking-tight">
              Daily Checklist
            </h1>
            <p className="text-gray-9 mt-1 font-medium text-sm">Tap the circles to cross off your planned calls and execution targets.</p>
          </div>
          <div className="bg-gray-2 border border-gray-4 rounded-lg px-3 py-2 flex items-center shadow-inner">
             <CalendarIcon size={16} className="text-gray-8 mr-2" />
             <input
               type="date"
               value={formatDateToYMD(currentDateObj)}
               onChange={(e) => {
                  const d = new Date(e.target.value);
                  setCurrentDateObj(d);
                  setSelectedDate(formatDateToYMD(d));
               }}
               className="bg-transparent text-gray-12 font-bold outline-none cursor-pointer text-sm"
             />
          </div>
        </div>

        {/* WEEK VIEW TABS (Mon-Sat) */}
        <div className="flex gap-2 overflow-x-auto pb-2">
           {weekDates.map(wd => {
             const hasTasks = weeklyActivities.some(a => a.scheduled_date === wd.dateStr && (a.activity_type !== 'None' || (a.account_name && a.account_name.trim() !== '')));
             return (
               <button
                  key={wd.dateStr}
                  onClick={() => setSelectedDate(wd.dateStr)}
                  className={`flex flex-col items-center justify-center min-w-[64px] h-16 rounded-2xl border transition-all ${selectedDate === wd.dateStr ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-gray-1 border-gray-4 text-gray-10 hover:border-gray-6'}`}
               >
                  <span className={`text-[10px] items-center justify-center flex font-bold uppercase tracking-widest ${selectedDate === wd.dateStr ? 'text-white/80' : 'text-gray-8'}`}>
                     {wd.label} {hasTasks && <div className={`w-1.5 h-1.5 rounded-full ${isGreen ? 'bg-green-500' : 'bg-yellow-500 shadow-yellow-500/50'} inline-block mb-1 ml-1 shadow-sm`} />}
                  </span>
                  <span className="text-xl font-black">{wd.dateStr.split('-')[2]}</span>
               </button>
             )
           })}
        </div>

        {/* IPHONE NOTES STYLE: 2 COLUMNS AM/PM */}
        {planStatus === 'DRAFT' ? (
           <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-10 text-center mt-8 shadow-sm">
             <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4 opacity-80" />
             <h2 className="text-2xl font-black text-yellow-600 dark:text-yellow-500 mb-2">Plan Execution Locked</h2>
             <p className="text-gray-10 font-medium">Your schedule for this week is still in <strong>DRAFT</strong> mode. You must formally submit the plan in your Sales Planner before you can check off activities.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              
              {/* AM COLUMN */}
              <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
                 <div className="bg-gray-2 p-3 border-b border-gray-4">
                   <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">AM Block</h2>
                 </div>
                 <div className="divide-y divide-gray-3">
                    {plannedAM.length === 0 && unplannedAM.length === 0 && (
                       <p className="p-6 text-center text-sm text-gray-8 italic">No morning tasks</p>
                    )}
                    {plannedAM.map(act => (
                       <ChecklistItem key={act.id} data={act} onToggle={handleToggleDone} />
                    ))}
                    {unplannedAM.map(act => (
                       <ChecklistItem key={act.id} data={act} onToggle={handleToggleDone} />
                    ))}
                 </div>
                 <div className="p-3 bg-gray-2 border-t border-gray-4">
                   <AddUnplannedForm timeOfDay="AM" onSave={handleAddUnplanned} />
                 </div>
              </div>

              {/* PM COLUMN */}
              <div className="bg-gray-1 border border-gray-4 rounded-2xl overflow-hidden shadow-sm">
                 <div className="bg-gray-2 p-3 border-b border-gray-4">
                   <h2 className="font-black text-gray-12 uppercase tracking-widest text-sm">PM Block</h2>
                 </div>
                 <div className="divide-y divide-gray-3">
                    {plannedPM.length === 0 && unplannedPM.length === 0 && (
                       <p className="p-6 text-center text-sm text-gray-8 italic">No afternoon tasks</p>
                    )}
                    {plannedPM.map(act => (
                       <ChecklistItem key={act.id} data={act} onToggle={handleToggleDone} />
                    ))}
                    {unplannedPM.map(act => (
                       <ChecklistItem key={act.id} data={act} onToggle={handleToggleDone} />
                    ))}
                 </div>
                 <div className="p-3 bg-gray-2 border-t border-gray-4">
                   <AddUnplannedForm timeOfDay="PM" onSave={handleAddUnplanned} />
                 </div>
              </div>

          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}

// Checklist Item mapping to iPhone notes style
function ChecklistItem({ data, onToggle }) {
  const isDone = data.status === 'DONE';
  const [details, setDetails] = useState(data.details_daily || "");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={`p-4 flex gap-4 transition-all ${isDone ? 'bg-gray-2/50 opacity-60' : 'bg-gray-1 hover:bg-gray-2/50'}`}>
       <button disabled={isDone} onClick={() => onToggle(data.id, details)} className="mt-1 shrink-0 text-primary transition-transform active:scale-90 disabled:cursor-not-allowed">
         {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} className="text-gray-6" />}
       </button>
       <div className="flex-1 min-w-0">
          <p className={`font-bold text-base truncate transition-all ${isDone ? 'line-through text-gray-8' : 'text-gray-12'}`}>
            {data.account_name} 
            {data.is_unplanned && <span className="ml-2 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full not-italic no-underline">EXTRA</span>}
          </p>
          {!isDone && (
            <p className="text-xs text-gray-9 mt-0.5 truncate">{data.activity_type} - {data.contact_person || 'No Contact'}</p>
          )}

          {/* Optional Details Input */}
          {!isDone && isEditing ? (
             <div className="mt-2 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Optional execution remarks..." 
                  value={details} 
                  onChange={e => setDetails(e.target.value)} 
                  className="flex-1 bg-white dark:bg-gray-3 border border-gray-4 rounded p-1.5 text-xs text-gray-12 outline-none focus:border-primary"
                  autoFocus
                  onBlur={() => setIsEditing(false)}
                />
             </div>
          ) : !isDone ? (
             <button onClick={() => setIsEditing(true)} className="mt-1 text-[10px] font-bold text-gray-8 hover:text-primary uppercase tracking-wider">
                {details ? `Details: ${details}` : '+ Add Note (Optional)'}
             </button>
          ) : data.details_daily && (
             <p className="text-xs text-gray-8 mt-1 line-through truncate">{data.details_daily}</p>
          )}
       </div>
    </div>
  )
}

function AddUnplannedForm({ timeOfDay, onSave }) {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState({ activity_type: 'Sales Call', account_name: '', details_daily: '' });

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="w-full text-xs font-bold text-gray-9 hover:text-primary transition-colors flex items-center gap-1">
        <Plus size={14} /> NEW UNPLANNED ITEM
      </button>
    )
  }

  const handleSave = () => {
    onSave({ ...payload, time_of_day: timeOfDay });
    setIsOpen(false);
    setPayload({ activity_type: 'Sales Call', account_name: '', details_daily: '' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-gray-3 rounded-lg border border-gray-4 mt-1 space-y-3">
      <div>
        <input autoFocus required type="text" placeholder="Account Name (Required)" value={payload.account_name} onChange={e => setPayload({...payload, account_name: e.target.value})} className="w-full bg-gray-1 border border-gray-4 rounded px-2 py-1.5 text-xs outline-none focus:border-primary" />
      </div>
      <div className="flex gap-2">
        <select value={payload.activity_type} onChange={e => setPayload({...payload, activity_type: e.target.value})} className="flex-1 bg-gray-1 border border-gray-4 rounded px-2 py-1.5 text-xs outline-none">
           <option value="Sales Call">Sales Call</option>
           <option value="In-House">In-House</option>
        </select>
        <input type="text" placeholder="Optional details..." value={payload.details_daily} onChange={e => setPayload({...payload, details_daily: e.target.value})} className="flex-[2] bg-gray-1 border border-gray-4 rounded px-2 py-1.5 text-xs outline-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={() => setIsOpen(false)} className="flex-1 py-1 text-xs font-bold text-gray-9 hover:text-gray-12">Cancel</button>
        <button disabled={!payload.account_name} onClick={handleSave} className="flex-1 py-1 rounded bg-primary text-white text-xs font-bold shadow disabled:opacity-50">Add Item</button>
      </div>
    </div>
  )
}
