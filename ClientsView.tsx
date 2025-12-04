
import React, { useMemo, useState, useEffect } from 'react';
import { Client, TaskSummary, Status, Task } from '../types';
import { Button } from './Button';
import { ICONS, CLIENT_COLORS } from '../constants';
import { X, Upload } from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  tasks: TaskSummary[];
  onSelectTask: (task: TaskSummary) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (clientId?: string, initialDate?: string, initialDueDate?: string) => void;
  onCreateClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ 
  clients, 
  tasks, 
  onSelectTask, 
  onUpdateTask, 
  onAddTask,
  onCreateClient,
  onDeleteClient,
  onDeleteTask
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  
  // Inline Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  // Add Client Modal State
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientLogo, setNewClientLogo] = useState<string | undefined>(undefined);
  const [newClientColor, setNewClientColor] = useState(CLIENT_COLORS[0]);

  // Delete Confirmation State
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const selectedClient = useMemo(() => 
    clients.find(c => c.id === selectedClientId), 
  [clients, selectedClientId]);

  useEffect(() => {
    setMonthFilter('ALL');
    setExpandedMonths({});
    setEditingTaskId(null);
  }, [selectedClientId]);

  const clientTasksByMonth = useMemo(() => {
    if (!selectedClientId) return {};

    const filtered = tasks.filter(t => t.clientId === selectedClientId);
    const groups: Record<string, { tasks: TaskSummary[], totalActual: number, totalPending: number, totalBillable: number }> = {};
    
    filtered.forEach(t => {
      const date = t.startDate || new Date().toISOString();
      const monthKey = date.substring(0, 7); // YYYY-MM
      
      if (!groups[monthKey]) {
        groups[monthKey] = { tasks: [], totalActual: 0, totalPending: 0, totalBillable: 0 };
      }
      
      const isComplete = t.status === Status.COMPLETE;
      const remaining = isComplete ? 0 : Math.max(0, t.estimatedHours - t.totalActualHours);

      groups[monthKey].tasks.push(t);
      groups[monthKey].totalActual += t.totalActualHours;
      groups[monthKey].totalPending += remaining;
      groups[monthKey].totalBillable += t.totalBillableAmount;
    });

    return groups;
  }, [tasks, selectedClientId]);

  const handleCreateTaskForMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = `${monthKey}-01`;
    // Get last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const dueDate = `${monthKey}-${lastDay}`;
    onAddTask(selectedClientId || undefined, startDate, dueDate);
  };

  const handleCreateTask = () => {
    if (monthFilter !== 'ALL') {
      handleCreateTaskForMonth(monthFilter);
    } else {
      onAddTask(selectedClientId || undefined);
    }
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !(prev[monthKey] ?? true)
    }));
  };

  const startEditing = (task: TaskSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      category: task.category,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      isBillable: task.isBillable,
    });
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(null);
    setEditForm({});
  };

  const saveEditing = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTask(taskId, editForm);
    setEditingTaskId(null);
  };

  const handleInputChange = (field: keyof Task, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewClientLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClientName,
      color: newClientColor,
      address: newClientAddress,
      logo: newClientLogo
    };
    onCreateClient(newClient);
    setIsAddClientOpen(false);
    setNewClientName('');
    setNewClientAddress('');
    setNewClientLogo(undefined);
    setNewClientColor(CLIENT_COLORS[0]);
  };

  const requestDeleteClient = (clientId: string) => {
    setClientToDelete(clientId);
  };

  const confirmDeleteClient = () => {
    if (clientToDelete) {
        if (selectedClientId === clientToDelete) {
            setSelectedClientId(null);
        }
        onDeleteClient(clientToDelete);
        setClientToDelete(null);
    }
  };

  const requestDeleteTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(taskId);
  }

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      onDeleteTask(taskToDelete);
      setTaskToDelete(null);
    }
  }

  // --- Render ---

  if (selectedClientId && selectedClient) {
    const allMonthKeys = Object.keys(clientTasksByMonth).sort().reverse();
    const visibleMonthKeys = monthFilter === 'ALL' 
      ? allMonthKeys 
      : allMonthKeys.filter(k => k === monthFilter);

    const formatMonth = (key: string) => {
      const [year, month] = key.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };
    
    return (
      <div className="space-y-6 animate-fade-in relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div className="flex items-start space-x-4">
              <button 
                onClick={() => setSelectedClientId(null)}
                className="mt-1 p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <div className="transform rotate-180">{ICONS.ChevronRight}</div>
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {selectedClient.logo ? (
                    <img src={selectedClient.logo} alt={selectedClient.name} className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200" />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${selectedClient.color}`}>
                      {selectedClient.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      {selectedClient.name}
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); requestDeleteClient(selectedClient.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-full transition-colors text-sm"
                        title="Delete Client"
                      >
                        {ICONS.Trash}
                      </button>
                    </h2>
                    {selectedClient.address && (
                      <div className="flex items-center text-sm text-slate-500 mt-0.5">
                        <span className="mr-1">{ICONS.MapPin}</span>
                        {selectedClient.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
           </div>
           
           <div className="flex items-center space-x-3">
             <div className="relative">
               <select 
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-3 pr-8 py-2 font-medium shadow-sm"
               >
                 <option value="ALL">All Time</option>
                 {allMonthKeys.map(key => (
                   <option key={key} value={key}>{formatMonth(key)}</option>
                 ))}
               </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  {ICONS.ChevronDown}
               </div>
             </div>

             <Button icon={ICONS.Plus} onClick={handleCreateTask}>
               New Project
             </Button>
           </div>
        </div>

        {allMonthKeys.length === 0 && (
           <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <h3 className="text-slate-500 font-medium">No projects found for this client.</h3>
              <p className="text-slate-400 text-sm mt-1">Create a new project to get started.</p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={handleCreateTask}>Create Project</Button>
              </div>
           </div>
        )}

        <div className="space-y-6">
          {visibleMonthKeys.map(monthKey => {
            const data = clientTasksByMonth[monthKey];
            const monthName = formatMonth(monthKey);
            const isExpanded = expandedMonths[monthKey] ?? true;

            return (
              <div key={monthKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-slide-in-right">
                <div 
                  className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4 group"
                >
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => toggleMonth(monthKey)}>
                    <div className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                      {ICONS.ChevronRight}
                    </div>
                    <div className="flex items-center space-x-2">
                      {ICONS.Calendar}
                      <span className="font-bold text-slate-700">{monthName}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm">
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Complete</span>
                       <span className="font-mono font-medium text-emerald-600">{data.totalActual.toFixed(1)}h</span>
                     </div>
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Pending</span>
                       <span className="font-mono font-medium text-amber-600">{data.totalPending.toFixed(1)}h</span>
                     </div>
                     <div className="flex flex-col items-end pl-4 border-l border-slate-200 mr-4">
                       <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Billable</span>
                       <span className="font-mono font-medium text-indigo-600">${data.totalBillable.toLocaleString()}</span>
                     </div>
                     
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       icon={ICONS.Plus} 
                       onClick={() => handleCreateTaskForMonth(monthKey)}
                       className="bg-white hover:bg-slate-200 text-slate-500"
                     >
                       Add
                     </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                     {data.tasks.map(task => {
                       const isEditing = editingTaskId === task.id;

                       return (
                         <div 
                            key={task.id} 
                            onClick={(e) => {
                              if (!isEditing) onSelectTask(task);
                            }}
                            className={`p-4 transition-colors ${isEditing ? 'bg-slate-50' : 'hover:bg-slate-50 cursor-pointer'} group flex flex-col md:flex-row md:items-center justify-between gap-4`}
                         >
                            {isEditing ? (
                              // Inline Edit Mode
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 w-full" onClick={e => e.stopPropagation()}>
                                <div className="col-span-1 md:col-span-2">
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                                  <input 
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    value={editForm.title} 
                                    onChange={e => handleInputChange('title', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                  <select 
                                     className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                     value={editForm.category}
                                     onChange={e => handleInputChange('category', e.target.value)}
                                  >
                                    <option value="Strategy">Strategy</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Design">Design</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Marketing">Marketing</option>
                                  </select>
                                </div>
                                <div className="flex items-center pt-5">
                                   <input 
                                     type="checkbox"
                                     className="h-4 w-4 text-indigo-600 bg-white border-gray-300 rounded"
                                     checked={editForm.isBillable}
                                     onChange={e => handleInputChange('isBillable', e.target.checked)}
                                   />
                                   <label className="ml-2 text-sm text-slate-700">Billable</label>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                                  <input 
                                    type="date"
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    value={editForm.startDate}
                                    onChange={e => handleInputChange('startDate', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
                                  <input 
                                    type="date"
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    value={editForm.dueDate}
                                    onChange={e => handleInputChange('dueDate', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">Est. Hours</label>
                                  <input 
                                    type="number"
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                    value={editForm.estimatedHours}
                                    onChange={e => handleInputChange('estimatedHours', Number(e.target.value))}
                                  />
                                </div>
                                <div className="flex items-end space-x-2">
                                  <button onClick={(e) => saveEditing(task.id, e)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                    {ICONS.Check}
                                  </button>
                                  <button onClick={(e) => cancelEditing(e)} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">
                                    {ICONS.X}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Read Only Mode
                              <>
                                <div className="flex-1 min-w-0 pr-4">
                                   <div className="flex items-center space-x-3 mb-1">
                                     <span className={`inline-block w-2 h-2 rounded-full ${
                                       task.status === Status.COMPLETE ? 'bg-emerald-500' :
                                       task.status === Status.IN_PROGRESS ? 'bg-indigo-500' :
                                       task.status === Status.BLOCKED ? 'bg-red-500' : 'bg-slate-300'
                                     }`} />
                                     <h4 className="text-sm font-semibold text-slate-800 truncate">{task.title}</h4>
                                     <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                       {task.category}
                                     </span>
                                   </div>
                                   <p className="text-xs text-slate-500 truncate pl-5">
                                     {task.projectName} • Due {task.dueDate}
                                   </p>
                                </div>
                                
                                <div className="flex items-center space-x-6">
                                   <div className="text-right hidden sm:block">
                                     <div className="text-xs text-slate-500">Progress</div>
                                     <div className="flex items-center space-x-2 w-24">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${task.calculatedProgress}%` }}></div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-700">{Math.round(task.calculatedProgress)}%</span>
                                     </div>
                                   </div>
                                   
                                   <div className="text-right">
                                      <div className="text-xs text-slate-500">Hours</div>
                                      <div className="font-mono text-sm font-medium text-slate-800">
                                        {task.totalActualHours.toFixed(1)} <span className="text-slate-400">/ {task.estimatedHours}</span>
                                      </div>
                                   </div>

                                   <div className="flex items-center space-x-1">
                                     <button 
                                        onClick={(e) => startEditing(task, e)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                                     >
                                       {ICONS.Edit}
                                     </button>
                                     <button 
                                        onClick={(e) => requestDeleteTask(task.id, e)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                     >
                                       {ICONS.Trash}
                                     </button>
                                   </div>
                                   
                                   <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                                     {ICONS.ChevronRight}
                                   </div>
                                </div>
                              </>
                            )}
                         </div>
                       );
                     })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Delete Confirmation Modal (Client) */}
        {clientToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Client?</h3>
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to delete this client? This will permanently remove the client and <strong>all associated tasks</strong>.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={() => setClientToDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteClient}>Delete Client</Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Task) */}
        {taskToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Task?</h3>
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to delete this task? This cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={() => setTaskToDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteTask}>Delete Task</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Grid View (Default)
  return (
    <>
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-lg font-bold text-slate-800">All Clients</h2>
         <Button 
           size="sm" 
           variant="secondary" 
           icon={ICONS.Plus}
           onClick={() => setIsAddClientOpen(true)}
         >
           Add Client
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in relative">
        {clients.map(client => {
          const clientTasks = tasks.filter(t => t.clientId === client.id);
          const activeCount = clientTasks.filter(t => t.status === Status.IN_PROGRESS).length;
          const totalRevenue = clientTasks.reduce((acc, t) => acc + t.totalBillableAmount, 0);
          const totalHours = clientTasks.reduce((acc, t) => acc + t.totalActualHours, 0);

          return (
            <div 
              key={client.id} 
              onClick={() => setSelectedClientId(client.id)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group relative"
            >
              {/* Isolated Delete Button Container */}
              <div 
                className="absolute top-4 right-4 z-20"
                onClick={(e) => e.stopPropagation()} 
              >
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); requestDeleteClient(client.id); }}
                  className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors shadow-sm border border-slate-200"
                  title="Delete Client"
                >
                  {ICONS.Trash}
                </button>
              </div>

              <div>
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center space-x-3">
                      {client.logo ? (
                        <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-md object-contain bg-slate-50 border border-slate-100" />
                      ) : (
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-bold ${client.color}`}>
                           {client.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800">{client.name}</div>
                        {client.address && (
                          <div className="text-xs text-slate-400 flex items-center mt-0.5 truncate max-w-[150px]">
                            <span className="mr-1 scale-75">{ICONS.MapPin}</span>
                            {client.address}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
                
                <div className="space-y-4">
                   <div>
                      <div className="text-slate-500 text-xs uppercase tracking-wide">Total Revenue</div>
                      <div className="text-2xl font-bold text-slate-800">${totalRevenue.toLocaleString()}</div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-slate-500 text-xs">Active Projects</div>
                        <div className="font-medium text-slate-800">{activeCount}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Total Hours</div>
                        <div className="font-medium text-slate-800">{totalHours.toFixed(1)}</div>
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="pt-4 mt-6 border-t border-slate-100">
                 <div className="text-xs text-slate-500 mb-2">Recent Projects</div>
                 <div className="space-y-1">
                   {clientTasks.slice(0, 3).map(t => (
                     <div key={t.id} className="text-sm text-slate-700 truncate">• {t.title}</div>
                   ))}
                   {clientTasks.length === 0 && <div className="text-xs text-slate-400 italic">No projects yet</div>}
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {isAddClientOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Add New Client</h3>
                <button onClick={() => setIsAddClientOpen(false)} className="text-slate-400 hover:text-slate-600">
                  {ICONS.X}
                </button>
             </div>
             
             <form onSubmit={handleSubmitNewClient} className="p-6 space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                   <input 
                      autoFocus
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      placeholder="e.g. Wayne Enterprises"
                      required
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                   <input 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                      value={newClientAddress}
                      onChange={e => setNewClientAddress(e.target.value)}
                      placeholder="e.g. 1007 Mountain Drive"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Company Logo</label>
                   <div className="flex items-center space-x-4">
                      {newClientLogo ? (
                        <div className="relative">
                          <img src={newClientLogo} alt="Preview" className="w-12 h-12 rounded object-cover border border-slate-200" />
                          <button 
                             type="button" 
                             onClick={() => setNewClientLogo(undefined)}
                             className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                            <div className="flex flex-col items-center justify-center pt-2 pb-3">
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <p className="text-[10px] text-slate-500">Click to upload</p>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                      )}
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Theme Color</label>
                   <div className="flex flex-wrap gap-2">
                      {CLIENT_COLORS.map(colorClass => (
                        <button
                           key={colorClass}
                           type="button"
                           onClick={() => setNewClientColor(colorClass)}
                           className={`w-8 h-8 rounded-full border-2 ${
                              newClientColor === colorClass ? 'border-indigo-600 ring-2 ring-offset-2 ring-indigo-200' : 'border-transparent'
                           }`}
                        >
                           <div className={`w-full h-full rounded-full ${colorClass.split(' ')[0]}`}></div>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                   <Button variant="secondary" type="button" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
                   <Button variant="primary" type="submit">Add Client</Button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Grid View Client) */}
      {clientToDelete && !selectedClientId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Client?</h3>
            <p className="text-slate-600 text-sm mb-6">
              Are you sure you want to delete this client? This will permanently remove the client and <strong>all associated tasks</strong>.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setClientToDelete(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeleteClient}>Delete Client</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
