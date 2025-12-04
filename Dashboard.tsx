
import React, { useState, useMemo } from 'react';
import { TaskSummary, Status } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell } from 'recharts';
import { ICONS } from '../constants';
import { Button } from './Button';

interface DashboardProps {
  tasks: TaskSummary[];
}

type ViewMode = 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

export const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [cursorDate, setCursorDate] = useState(new Date());

  // --- Date Range Logic ---
  const dateRange = useMemo(() => {
    const start = new Date(cursorDate);
    const end = new Date(cursorDate);

    if (viewMode === 'MONTH') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of month
    } else if (viewMode === 'QUARTER') {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      end.setMonth((q + 1) * 3, 0);
    } else if (viewMode === 'YEAR') {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
    }
    
    // Set times to boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }, [viewMode, cursorDate]);

  const handlePrev = () => {
    const newDate = new Date(cursorDate);
    if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'QUARTER') newDate.setMonth(newDate.getMonth() - 3);
    else if (viewMode === 'YEAR') newDate.setFullYear(newDate.getFullYear() - 1);
    setCursorDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(cursorDate);
    if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'QUARTER') newDate.setMonth(newDate.getMonth() + 3);
    else if (viewMode === 'YEAR') newDate.setFullYear(newDate.getFullYear() + 1);
    setCursorDate(newDate);
  };

  // --- Data Filtering ---
  const { filteredMetrics, clientDistribution, timeTrend, activeTasksInPeriod } = useMemo(() => {
    // 1. Filter Logs
    const allLogs = tasks.flatMap(t => t.timeLogs.map(l => ({ ...l, task: t })));
    
    const logsInRange = viewMode === 'ALL' 
      ? allLogs 
      : allLogs.filter(l => {
          const d = new Date(l.date);
          return d >= dateRange.start && d <= dateRange.end;
        });

    // 2. Metrics Calculation
    const totalRevenue = logsInRange.reduce((acc, l) => acc + (l.task.isBillable ? l.hours * l.task.hourlyRate : 0), 0);
    const totalHours = logsInRange.reduce((acc, l) => acc + l.hours, 0);
    
    // 3. Active Tasks Identification
    // Task is active if it has logs in range OR overlaps range (Start <= End AND Due >= Start)
    const activeTasks = tasks.filter(t => {
      if (viewMode === 'ALL') return t.status !== Status.NOT_STARTED;
      
      const hasLogs = t.timeLogs.some(l => {
        const d = new Date(l.date);
        return d >= dateRange.start && d <= dateRange.end;
      });
      if (hasLogs) return true;

      const start = new Date(t.startDate);
      const due = t.dueDate ? new Date(t.dueDate) : new Date('2099-12-31');
      
      // Simple Overlap check
      return start <= dateRange.end && due >= dateRange.start;
    });

    const tasksDueCount = activeTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return viewMode === 'ALL' 
        ? d >= new Date() // Future due
        : d >= dateRange.start && d <= dateRange.end;
    }).length;

    // 4. Client Distribution for Bar Chart
    const clientRevMap: Record<string, number> = {};
    logsInRange.forEach(l => {
      if (l.task.isBillable) {
        clientRevMap[l.task.clientId] = (clientRevMap[l.task.clientId] || 0) + (l.hours * l.task.hourlyRate);
      }
    });
    // Need client names - simplified here, assuming we can get from taskId join or just ID for now
    // Actually, dashboard has access to tasks, so we can find client ID. 
    // Ideally we pass Clients to Dashboard, but we can group by ClientID here.
    const clientData = Object.keys(clientRevMap).map((clientId, idx) => {
        // Attempt to find a task with this client to guess the name (since we don't have clients prop here)
        // In a real refactor, pass `clients` prop to Dashboard.
        const task = tasks.find(t => t.clientId === clientId);
        return {
            name: clientId, // Placeholder, would need Client Lookup
            displayName: task ? `Client ${clientId.substr(0,4)}...` : 'Unknown', // Fallback
            revenue: clientRevMap[clientId],
            color: COLORS[idx % COLORS.length]
        };
    }).sort((a,b) => b.revenue - a.revenue);

    // 5. Trend Chart Data
    // Group logs by date (or month if Year view)
    const trendMap: Record<string, number> = {};
    logsInRange.forEach(l => {
       if (!l.task.isBillable) return;
       const date = new Date(l.date);
       let key = '';
       if (viewMode === 'YEAR') {
         key = date.toLocaleString('default', { month: 'short' });
       } else {
         key = date.getDate().toString(); // Day of month
       }
       trendMap[key] = (trendMap[key] || 0) + (l.hours * l.task.hourlyRate);
    });

    // Fill gaps? For now just map keys
    const trendData = Object.keys(trendMap).map(k => ({
        name: k,
        amount: trendMap[k]
    }));
    
    // Sort logic for trend
    if (viewMode === 'YEAR') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      trendData.sort((a,b) => months.indexOf(a.name) - months.indexOf(b.name));
    } else {
      trendData.sort((a,b) => parseInt(a.name) - parseInt(b.name));
    }

    return {
      filteredMetrics: { totalRevenue, totalHours, tasksDueCount },
      clientDistribution: clientData,
      timeTrend: trendData,
      activeTasksInPeriod: activeTasks
    };
  }, [tasks, viewMode, dateRange]);

  const Card = ({ title, value, sub, color, icon }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="mt-1 text-slate-400 text-xs">{sub}</div>
      </div>
      <div className={`p-3 rounded-lg bg-slate-50 text-slate-400`}>
        {icon}
      </div>
    </div>
  );

  const getLabel = () => {
    if (viewMode === 'ALL') return 'All Time';
    if (viewMode === 'MONTH') return cursorDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (viewMode === 'YEAR') return cursorDate.getFullYear().toString();
    if (viewMode === 'QUARTER') {
       const q = Math.floor(cursorDate.getMonth() / 3) + 1;
       return `Q${q} ${cursorDate.getFullYear()}`;
    }
    return '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
         <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
            {(['MONTH', 'QUARTER', 'YEAR', 'ALL'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
         </div>

         {viewMode !== 'ALL' && (
           <div className="flex items-center space-x-4">
              <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <div className="transform rotate-180">{ICONS.ChevronRight}</div>
              </button>
              <span className="font-bold text-slate-800 min-w-[140px] text-center">{getLabel()}</span>
              <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                {ICONS.ChevronRight}
              </button>
           </div>
         )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Revenue" 
          value={`$${filteredMetrics.totalRevenue.toLocaleString()}`} 
          sub="In selected period"
          color="text-indigo-600"
          icon={ICONS.Dollar}
        />
        <Card 
          title="Hours Logged" 
          value={filteredMetrics.totalHours.toFixed(1)} 
          sub="Total hours worked"
          color="text-slate-800"
          icon={ICONS.Time}
        />
        <Card 
          title="Active Projects" 
          value={activeTasksInPeriod.length} 
          sub="With activity in period"
          color="text-emerald-600"
          icon={ICONS.Clients}
        />
        <Card 
          title="Deadlines" 
          value={filteredMetrics.tasksDueCount} 
          sub="Due in this period"
          color="text-amber-600"
          icon={ICONS.Alert}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="font-semibold text-slate-800">Revenue Trend</h3>
               <p className="text-xs text-slate-500">Financial performance over selected period</p>
             </div>
          </div>
          <div className="h-72">
             {timeTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeTrend}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-slate-400">No data for this period</div>
             )}
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-2">Revenue by Client</h3>
          <p className="text-xs text-slate-500 mb-6">Top contributors this period</p>
          <div className="h-72">
             {clientDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientDistribution} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" hide width={10} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      formatter={(val: number) => [`$${val.toLocaleString()}`, 'Revenue']}
                      labelStyle={{ color: '#64748b' }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {clientDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No data</div>
             )}
          </div>
          {/* Legendish list */}
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
             {clientDistribution.map((c, i) => (
               <div key={i} className="flex justify-between items-center text-xs">
                 <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: c.color }}></div>
                    <span className="text-slate-600 font-medium">Client {c.name.substring(0,6)}..</span>
                 </div>
                 <span className="font-mono text-slate-500">${c.revenue.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>

      </div>

      {/* Relevant Task List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-6">Top Projects in Period</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Task Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3 text-right">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeTasksInPeriod.slice(0, 5).map(task => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{task.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === Status.COMPLETE ? 'bg-emerald-100 text-emerald-800' : 
                        task.status === Status.IN_PROGRESS ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                       <div className="w-24 h-1.5 bg-slate-100 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.calculatedProgress}%`}}></div>
                       </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                       {task.totalActualHours.toFixed(1)}
                    </td>
                  </tr>
                ))}
                {activeTasksInPeriod.length === 0 && (
                   <tr><td colSpan={4} className="text-center py-6 text-slate-400">No active projects in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};
