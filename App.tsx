import React, { useState, useEffect, useMemo } from 'react';
import { ICONS, CLIENT_COLORS } from './constants';
import { Client, Task, Subtask, TimeLog, TaskSummary, Status, UserProfile } from './types';
import { dataService } from './services/dataService';
import { Dashboard } from './components/Dashboard';
import { TaskModal } from './components/TaskModal';
import { NewTaskModal } from './components/NewTaskModal';
import { ClientsView } from './components/ClientsView';
import { TimesheetView } from './components/TimesheetView';
import { SettingsView } from './components/SettingsView';
import { Button } from './components/Button';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// Custom Logo Component mimicking the Blue Shield with Arrow
const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2563EB" />
        <stop offset="1" stopColor="#1E40AF" />
      </linearGradient>
    </defs>
    {/* Shield Shape */}
    <path d="M50 95C50 95 90 75 90 25V10H10V25C10 75 50 95 50 95Z" fill="url(#shieldGrad)" />
    {/* Inner White Arrow / Negative Space effect */}
    <path d="M50 25V65" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <path d="M35 50L50 65L65 50" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Main App Layout & Logic
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeView, setActiveView] = useState<'dashboard' | 'tasks' | 'clients' | 'timesheets' | 'settings'>('dashboard');
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [preselectedClientId, setPreselectedClientId] = useState<string | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);
  const [preselectedDueDate, setPreselectedDueDate] = useState<string | null>(null);

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', role: '', initials: '' });

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data Effect
  useEffect(() => {
    if (session) {
      const loadData = async () => {
        try {
          const [clientsData, tasksData, subtasksData, logsData, profileData] = await Promise.all([
            dataService.getClients(),
            dataService.getTasks(),
            dataService.getSubtasks(),
            dataService.getLogs(),
            dataService.getUserProfile()
          ]);
          setClients(clientsData);
          setTasks(tasksData);
          setSubtasks(subtasksData);
          setLogs(logsData);
          setUserProfile(profileData);
        } catch (error) {
          console.error("Error loading data:", error);
        }
      };
      loadData();
    }
  }, [session]);

  // Derived State (The Roll-ups)
  const taskSummaries: TaskSummary[] = useMemo(() => {
    return tasks.map(task => {
      const taskSubtasks = subtasks.filter(s => s.parentId === task.id);
      const taskLogs = logs.filter(l => l.taskId === task.id);
      
      const totalEstimated = taskSubtasks.length > 0 
        ? taskSubtasks.reduce((sum, s) => sum + s.estimatedHours, 0)
        : task.estimatedHours;
        
      const totalActual = taskLogs.reduce((sum, l) => sum + l.hours, 0);

      // Weighted completion calculation
      let calculatedProgress = 0;
      if (taskSubtasks.length > 0) {
        const totalWeightedProgress = taskSubtasks.reduce((sum, s) => sum + (s.percentComplete * s.estimatedHours), 0);
        calculatedProgress = totalEstimated > 0 ? totalWeightedProgress / totalEstimated : 0;
      } else {
        calculatedProgress = task.status === Status.COMPLETE ? 100 : task.status === Status.IN_PROGRESS ? 50 : 0;
      }

      let derivedStatus = task.status;
      if (taskSubtasks.length > 0) {
        const allComplete = taskSubtasks.every(s => s.status === Status.COMPLETE);
        const anyInProgress = taskSubtasks.some(s => s.status === Status.IN_PROGRESS || s.percentComplete > 0);
        
        if (allComplete && derivedStatus !== Status.COMPLETE) derivedStatus = Status.COMPLETE;
        else if (anyInProgress && derivedStatus !== Status.IN_PROGRESS && derivedStatus !== Status.COMPLETE) derivedStatus = Status.IN_PROGRESS;
      }

      return {
        ...task,
        status: derivedStatus,
        subtasks: taskSubtasks,
        timeLogs: taskLogs,
        calculatedProgress,
        totalActualHours: totalActual,
        estimatedHours: totalEstimated, 
        totalBillableAmount: task.isBillable ? totalActual * task.hourlyRate : 0,
        budgetStatus: totalActual > totalEstimated ? 'Over Budget' : 'On Track'
      };
    });
  }, [tasks, subtasks, logs]);

  // --- Handlers (CRUD) ---

  const handleCreateClient = async (client: Client) => {
    try {
      const newClient = await dataService.createClient(client);
      setClients([...clients, newClient]);
    } catch (e) {
      console.error(e);
      alert("Failed to create client");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      // Optimistic delete from UI first? Safer to wait for DB.
      await dataService.deleteClient(clientId);
      
      // Cascade Delete in State (DB does it via FK constraints, but UI needs sync)
      // Note: If DB has CASCADE, we just need to remove local items
      setClients(clients.filter(c => c.id !== clientId));
      setTasks(tasks.filter(t => t.clientId !== clientId));
      // Subtasks/Logs associated with those tasks would also be removed in a real refetch
      // For now, filtering tasks is the biggest visual impact
    } catch (e) {
      console.error(e);
      alert("Failed to delete client");
    }
  };

  const handleAddTask = async (task: Task) => {
    try {
      const newTask = await dataService.createTask(task);
      setTasks([...tasks, newTask]);
    } catch (e) {
      console.error(e);
      alert("Failed to create task");
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await dataService.updateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      
      // If currently selected, update it too
      if (selectedTask && selectedTask.id === taskId) {
         setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await dataService.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      setSubtasks(subtasks.filter(s => s.parentId !== taskId));
      setLogs(logs.filter(l => l.taskId !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete task");
    }
  };

  const handleUpdateSubtasks = async (taskId: string, newSubtasks: Subtask[]) => {
    try {
      // 1. Identify existing IDs
      const currentTaskSubtasks = subtasks.filter(s => s.parentId === taskId);
      const currentIds = new Set(currentTaskSubtasks.map(s => s.id));
      
      // 2. Identify new list IDs
      const newIds = new Set(newSubtasks.map(s => s.id));
      
      // 3. Delete removed subtasks
      const toDelete = currentTaskSubtasks.filter(s => !newIds.has(s.id));
      for (const s of toDelete) {
        await dataService.deleteSubtask(s.id);
      }

      // 4. Update or Create
      const updatedList: Subtask[] = [];
      for (const s of newSubtasks) {
        // If ID is simple random string (length < 20), assume new. UUID is 36 chars.
        // Or if it was not in current set.
        if (s.id.length > 20 && currentIds.has(s.id)) {
          // Update
          await dataService.updateSubtask(s.id, s);
          updatedList.push(s);
        } else {
          // Create
          const created = await dataService.createSubtask({ ...s, parentId: taskId });
          updatedList.push(created);
        }
      }

      // 5. Update Local State
      setSubtasks(prev => {
        const others = prev.filter(p => p.parentId !== taskId);
        return [...others, ...updatedList];
      });

    } catch (e) {
      console.error("Error syncing subtasks", e);
      alert("Failed to sync subtasks");
    }
  };

  const handleAddLog = async (log: TimeLog) => {
    try {
      const newLog = await dataService.createLog(log);
      setLogs([...logs, newLog]);
    } catch (e) {
      console.error(e);
      alert("Failed to log time");
    }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    try {
      await dataService.updateUserProfile(profile);
      setUserProfile(profile);
    } catch (e) {
      console.error(e);
      alert("Failed to update profile");
    }
  };

  // --- View Handlers ---

  const openNewTaskModal = (clientId?: string, initialDate?: string, initialDueDate?: string) => {
    setPreselectedClientId(clientId || null);
    setPreselectedDate(initialDate || null);
    setPreselectedDueDate(initialDueDate || null);
    setIsNewTaskModalOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
           <Logo />
           <div>
             <h1 className="font-bold text-white text-lg leading-tight tracking-tight">EHS Insider</h1>
             <p className="text-xs text-indigo-400 font-medium tracking-wide">WORK FLOW</p>
           </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            {ICONS.Dashboard} <span className="font-medium">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveView('clients')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            {ICONS.Clients} <span className="font-medium">Projects</span>
          </button>

          <button 
            onClick={() => setActiveView('tasks')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            {ICONS.Tasks} <span className="font-medium">All Tasks</span>
          </button>

          <button 
            onClick={() => setActiveView('timesheets')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeView === 'timesheets' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            {ICONS.Time} <span className="font-medium">Timesheets</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
             onClick={() => setActiveView('settings')}
             className={`flex items-center space-x-3 px-4 py-3 w-full rounded-lg transition-colors ${activeView === 'settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'}`}
          >
             <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
               {userProfile.initials}
             </div>
             <div className="text-left flex-1 min-w-0">
               <div className="text-sm font-bold text-white truncate">{userProfile.name || 'User'}</div>
               <div className="text-xs text-slate-500 truncate">{userProfile.role || 'Admin'}</div>
             </div>
             <div className="text-slate-500 hover:text-white transition-colors">
               {ICONS.Settings}
             </div>
          </button>
          <button onClick={handleLogout} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-2">
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 z-10 flex justify-between items-center shadow-sm">
           <h2 className="text-xl font-bold text-slate-800 capitalize">
             {activeView === 'clients' ? 'Client Projects' : activeView}
           </h2>
           <div className="flex items-center space-x-4">
             <div className="text-sm text-slate-500">
               {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
             </div>
             <Button icon={ICONS.Plus} onClick={() => openNewTaskModal()}>New Project</Button>
           </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          
          {activeView === 'dashboard' && <Dashboard tasks={taskSummaries} />}
          
          {activeView === 'clients' && (
            <ClientsView 
              clients={clients} 
              tasks={taskSummaries}
              onSelectTask={setSelectedTask}
              onUpdateTask={handleUpdateTask}
              onAddTask={openNewTaskModal}
              onCreateClient={handleCreateClient}
              onDeleteClient={handleDeleteClient}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeView === 'timesheets' && (
            <TimesheetView logs={logs} tasks={tasks} clients={clients} />
          )}

          {activeView === 'tasks' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Project / Task</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Progress</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taskSummaries.map(task => {
                       const client = clients.find(c => c.id === task.clientId);
                       return (
                        <tr 
                          key={task.id} 
                          onClick={() => setSelectedTask(task)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800">{task.title}</div>
                            <div className="text-xs text-slate-500">{task.projectName}</div>
                          </td>
                          <td className="px-6 py-4">
                            {client ? (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${client.color}`}>
                                {client.name}
                              </span>
                            ) : <span className="text-xs text-slate-400">Unknown</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                              task.status === Status.COMPLETE ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              task.status === Status.IN_PROGRESS ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                              task.status === Status.BLOCKED ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                            {task.dueDate}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end space-x-2">
                               <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${task.status === Status.COMPLETE ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${task.calculatedProgress}%` }}></div>
                               </div>
                               <span className="text-xs font-mono text-slate-500 w-8">{Math.round(task.calculatedProgress)}%</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button
                               onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                               className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                             >
                               {ICONS.Trash}
                             </button>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
             </div>
          )}

          {activeView === 'settings' && (
            <SettingsView userProfile={userProfile} onSave={handleUpdateProfile} />
          )}

        </div>
      </main>

      {/* Modals */}
      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)}
          onUpdateSubtasks={handleUpdateSubtasks}
          onAddLog={handleAddLog}
          onUpdateTaskStatus={(id, status) => handleUpdateTask(id, { status })}
          onUpdateTaskDetails={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {isNewTaskModalOpen && (
        <NewTaskModal 
          clients={clients} 
          initialClientId={preselectedClientId}
          initialStartDate={preselectedDate}
          initialDueDate={preselectedDueDate}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSave={handleAddTask}
        />
      )}
    </div>
  );
}