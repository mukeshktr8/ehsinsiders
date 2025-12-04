import React, { useMemo, useState } from 'react';
import { TimeLog, Task, Client } from '../types';
import { ICONS } from '../constants';

interface TimesheetViewProps {
  logs: TimeLog[];
  tasks: Task[];
  clients: Client[];
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({ logs, tasks, clients }) => {
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  // Extract all unique months for the filter dropdown
  const availableMonths = useMemo(() => {
    const dates = logs.map(l => l.date.substring(0, 7)); // YYYY-MM
    return Array.from(new Set(dates)).sort().reverse();
  }, [logs]);

  // Filter logs based on selection before grouping
  const filteredLogs = useMemo(() => {
    if (monthFilter === 'ALL') return logs;
    return logs.filter(l => l.date.substring(0, 7) === monthFilter);
  }, [logs, monthFilter]);

  const groupedData = useMemo(() => {
    // Enrich logs with Task and Client details for easy grouping
    const enriched = filteredLogs.map(log => {
      const task = tasks.find(t => t.id === log.taskId);
      const client = task ? clients.find(c => c.id === task.clientId) : null;
      return {
        ...log,
        taskTitle: task?.title || 'Unknown Task',
        clientId: client?.id || 'unknown',
        clientName: client?.name || 'Unknown Client',
        clientColor: client?.color || 'bg-gray-100 text-gray-800',
        isBillable: task?.isBillable || false,
        hourlyRate: task?.hourlyRate || 0,
        billableAmount: task?.isBillable ? (log.hours * task.hourlyRate) : 0,
        monthKey: log.date.substring(0, 7) // Format: YYYY-MM
      };
    });

    // Structure: ClientID -> { totals, months: { MonthKey -> { totals, logs } } }
    const byClient: Record<string, {
      name: string;
      color: string;
      totalHours: number;
      totalBillable: number;
      months: Record<string, {
        totalHours: number;
        totalBillable: number;
        logs: typeof enriched;
      }>
    }> = {};

    enriched.forEach(log => {
      if (!byClient[log.clientId]) {
        byClient[log.clientId] = {
          name: log.clientName,
          color: log.clientColor,
          totalHours: 0,
          totalBillable: 0,
          months: {}
        };
      }

      const clientGroup = byClient[log.clientId];
      clientGroup.totalHours += log.hours;
      clientGroup.totalBillable += log.billableAmount;

      if (!clientGroup.months[log.monthKey]) {
        clientGroup.months[log.monthKey] = {
          totalHours: 0,
          totalBillable: 0,
          logs: []
        };
      }

      const monthGroup = clientGroup.months[log.monthKey];
      monthGroup.totalHours += log.hours;
      monthGroup.totalBillable += log.billableAmount;
      monthGroup.logs.push(log);
    });

    return byClient;
  }, [filteredLogs, tasks, clients]);

  const clientIds = Object.keys(groupedData).sort((a, b) => 
    groupedData[a].name.localeCompare(groupedData[b].name)
  );

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Filter */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <h3 className="font-bold text-slate-800">Time Logs Report</h3>
         <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500 font-medium">Filter by:</span>
            <div className="relative">
              <select 
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-3 pr-8 py-2 font-medium"
              >
                <option value="ALL">All Time</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonth(m)}</option>
                ))}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  {ICONS.ChevronDown}
               </div>
            </div>
         </div>
      </div>

      {clientIds.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          No time logs found for the selected period.
        </div>
      ) : (
        clientIds.map(clientId => {
          const client = groupedData[clientId];
          const isExpanded = expandedClients[clientId] ?? true; // Default expanded
          const monthKeys = Object.keys(client.months).sort().reverse(); // Newest months first

          return (
            <div key={clientId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-slide-in-right">
              {/* Client Header Row */}
              <div 
                className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors select-none"
                onClick={() => toggleClient(clientId)}
              >
                <div className="flex items-center space-x-3">
                   <button className="text-slate-400 p-1 rounded hover:bg-slate-200">
                     {isExpanded ? ICONS.ChevronDown : ICONS.ChevronRight}
                   </button>
                   <span className={`px-3 py-1 rounded-full text-sm font-semibold ${client.color}`}>
                     {client.name}
                   </span>
                </div>
                <div className="flex items-center space-x-8">
                   <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Hours</div>
                      <div className="text-sm font-bold text-slate-800">{client.totalHours.toFixed(1)}</div>
                   </div>
                   <div className="text-right min-w-[100px]">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Billable</div>
                      <div className="text-sm font-bold text-indigo-600">${client.totalBillable.toLocaleString()}</div>
                   </div>
                </div>
              </div>

              {/* Expandable Client Content */}
              {isExpanded && (
                <div className="bg-white">
                   {monthKeys.map(monthKey => {
                      const monthData = client.months[monthKey];
                      const monthName = formatMonth(monthKey);

                      return (
                        <div key={monthKey} className="group">
                          {/* Month Header */}
                          <div className="bg-slate-50/50 px-6 py-2 flex justify-between items-center border-b border-slate-100">
                             <div className="flex items-center space-x-2">
                                {ICONS.Calendar}
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{monthName}</span>
                             </div>
                             <div className="flex space-x-6 text-xs font-medium text-slate-600">
                               <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                 {monthData.totalHours.toFixed(1)} Hrs
                               </span>
                               <span className="text-slate-400">|</span>
                               <span className="text-indigo-600">
                                 ${monthData.totalBillable.toLocaleString()}
                               </span>
                             </div>
                          </div>

                          {/* Logs List for Month */}
                          <div className="divide-y divide-slate-50">
                            {monthData.logs
                               .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                               .map(log => (
                                 <div key={log.id} className="px-6 py-3 flex items-start hover:bg-slate-50 transition-colors">
                                    <div className="w-32 pt-0.5 text-xs text-slate-400 font-mono">{log.date}</div>
                                    <div className="flex-1 pr-4">
                                       <div className="flex items-baseline justify-between">
                                          <div className="font-medium text-sm text-slate-700">{log.taskTitle}</div>
                                       </div>
                                       <div className="text-sm text-slate-500 mt-0.5">{log.notes}</div>
                                    </div>
                                    <div className="text-right w-24 pt-0.5">
                                       <div className="font-mono text-sm font-semibold text-slate-700">{log.hours}h</div>
                                       {log.isBillable && (
                                         <div className="text-[10px] text-indigo-400 mt-0.5">${log.billableAmount.toFixed(0)}</div>
                                       )}
                                    </div>
                                 </div>
                            ))}
                          </div>
                        </div>
                      );
                   })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};