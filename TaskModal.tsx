
import React, { useState } from 'react';
import { TaskSummary, Subtask, TimeLog, Status, Priority, Task } from '../types';
import { ICONS } from '../constants';
import { Button } from './Button';
import { generateSubtasks, generateBillingSummary } from '../services/geminiService';

interface TaskModalProps {
  task: TaskSummary;
  onClose: () => void;
  onUpdateSubtasks: (taskId: string, subtasks: Subtask[]) => void;
  onAddLog: (log: TimeLog) => void;
  onUpdateTaskStatus: (taskId: string, status: Status) => void;
  onUpdateTaskDetails: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
  task, 
  onClose, 
  onUpdateSubtasks, 
  onAddLog, 
  onUpdateTaskStatus,
  onUpdateTaskDetails,
  onDeleteTask
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'logs'>('subtasks');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New Subtask Form State
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskHours, setNewSubtaskHours] = useState(1);
  const [newSubtaskPriority, setNewSubtaskPriority] = useState<Priority>(Priority.MEDIUM);

  // New Log Form State
  const [logHours, setLogHours] = useState(0.5);
  const [logNotes, setLogNotes] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const handleGeminiGenerate = async () => {
    setIsGenerating(true);
    const suggested = await generateSubtasks(task, `Current Subtasks: ${task.subtasks.length}`);
    setIsGenerating(false);
    
    if (suggested.length > 0) {
       // Convert partials to full subtasks with new IDs
       const newItems: Subtask[] = suggested.map(s => ({
         ...s,
         id: Math.random().toString(36).substr(2, 9),
         parentId: task.id,
         percentComplete: 0,
         status: Status.NOT_STARTED,
         assignedTo: 'Me',
       } as Subtask));
       
       onUpdateSubtasks(task.id, [...task.subtasks, ...newItems]);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle) return;
    const newItem: Subtask = {
      id: Math.random().toString(36).substr(2, 9),
      parentId: task.id,
      title: newSubtaskTitle,
      priority: newSubtaskPriority,
      estimatedHours: Number(newSubtaskHours),
      assignedTo: 'Me',
      percentComplete: 0,
      status: Status.NOT_STARTED
    };
    onUpdateSubtasks(task.id, [...task.subtasks, newItem]);
    setNewSubtaskTitle('');
  };

  const handleSubtaskChange = (id: string, updates: Partial<Subtask>) => {
    const updated = task.subtasks.map(s => s.id === id ? { ...s, ...updates } : s);
    onUpdateSubtasks(task.id, updated);
  };

  const handleAddLog = () => {
    const newLog: TimeLog = {
      id: Math.random().toString(36).substr(2, 9),
      taskId: task.id,
      date: logDate,
      hours: Number(logHours),
      notes: logNotes
    };
    onAddLog(newLog);
    setLogNotes('');
    setLogHours(0.5);
  };

  const handleGenerateInvoiceSummary = async () => {
    const summary = await generateBillingSummary(task.title, task.timeLogs);
    alert(`Generated Invoice Description:\n\n${summary}`);
  };

  const handleDeleteRequest = () => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
                <input 
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors w-1/3 text-slate-900 px-2 py-0.5 rounded-md"
                  value={task.projectName}
                  onChange={(e) => onUpdateTaskDetails(task.id, { projectName: e.target.value })}
                  placeholder="Project Name"
                />
                <span>•</span>
                <select
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors text-slate-900 px-2 py-0.5 rounded-md"
                  value={task.category}
                  onChange={(e) => onUpdateTaskDetails(task.id, { category: e.target.value })}
                >
                    <option value="Strategy">Strategy</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Admin">Admin</option>
                    <option value="Marketing">Marketing</option>
                </select>
              </div>
              <input 
                className="text-2xl font-bold text-slate-900 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors w-full px-2 py-1 rounded-md mt-1"
                value={task.title}
                onChange={(e) => onUpdateTaskDetails(task.id, { title: e.target.value })}
                placeholder="Task Title"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleDeleteRequest}
                className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-full transition-colors"
                title="Delete Task"
              >
                {ICONS.Trash}
              </button>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                {ICONS.ChevronRight}
              </button>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-6 text-sm">
             <div className="flex flex-col">
               <span className="text-slate-500">Status</span>
               <select 
                 className="mt-1 bg-transparent font-medium text-slate-800 border-none p-0 focus:ring-0 cursor-pointer"
                 value={task.status}
                 onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as Status)}
               >
                 {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
               </select>
             </div>
             <div className="flex flex-col">
               <span className="text-slate-500">Progress</span>
               <span className="mt-1 font-medium text-slate-800">{Math.round(task.calculatedProgress)}%</span>
             </div>
             <div className="flex flex-col">
               <span className="text-slate-500">Budget</span>
               <span className={`mt-1 font-medium ${task.budgetStatus === 'Over Budget' ? 'text-red-600' : 'text-green-600'}`}>
                 {task.totalActualHours.toFixed(1)} / {task.estimatedHours} hrs
               </span>
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {['details', 'subtasks', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {activeTab === 'subtasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Work Breakdown Structure</h3>
                <Button 
                   variant="secondary" 
                   size="sm" 
                   icon={isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent"/> : ICONS.Magic}
                   onClick={handleGeminiGenerate}
                   disabled={isGenerating}
                >
                  {isGenerating ? 'Thinking...' : 'AI Suggest'}
                </Button>
              </div>

              {/* Subtask List */}
              <div className="space-y-3">
                {task.subtasks.map(sub => (
                   <div key={sub.id} className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <input 
                           type="text" 
                           value={sub.title} 
                           onChange={(e) => handleSubtaskChange(sub.id, { title: e.target.value })}
                           className="bg-transparent font-medium text-slate-800 w-full focus:outline-none focus:underline"
                        />
                        <button 
                          onClick={() => onUpdateSubtasks(task.id, task.subtasks.filter(s => s.id !== sub.id))}
                          className="text-slate-400 hover:text-red-500 ml-2"
                        >
                          {ICONS.Trash}
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-600">
                        <div className="flex items-center space-x-2">
                          <span>Hours:</span>
                          <input 
                            type="number" 
                            className="w-12 p-1 border rounded bg-white text-slate-900"
                            value={sub.estimatedHours}
                            onChange={(e) => handleSubtaskChange(sub.id, { estimatedHours: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <span>Progress:</span>
                          <input 
                            type="range" 
                            min="0" max="100" step="10"
                            className="w-24"
                            value={sub.percentComplete}
                            onChange={(e) => {
                               const val = Number(e.target.value);
                               handleSubtaskChange(sub.id, { 
                                 percentComplete: val,
                                 status: val === 100 ? Status.COMPLETE : val > 0 ? Status.IN_PROGRESS : Status.NOT_STARTED
                               });
                            }}
                          />
                          <span>{sub.percentComplete}%</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded ${
                          sub.priority === Priority.HIGH ? 'bg-red-100 text-red-700' : 'bg-slate-200'
                        }`}>
                          {sub.priority}
                        </span>
                      </div>
                   </div>
                ))}
                {task.subtasks.length === 0 && (
                  <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                    No subtasks yet. Add one or ask AI to help.
                  </div>
                )}
              </div>

              {/* Add New Subtask */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Add Subtask</h4>
                <div className="flex gap-2">
                   <input 
                     placeholder="New subtask name..."
                     className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                     value={newSubtaskTitle}
                     onChange={(e) => setNewSubtaskTitle(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                   />
                   <input 
                     type="number"
                     placeholder="Hrs"
                     className="w-20 border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                     value={newSubtaskHours}
                     onChange={(e) => setNewSubtaskHours(Number(e.target.value))}
                   />
                   <Button onClick={handleAddSubtask} icon={ICONS.Plus}>Add</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="font-semibold text-slate-800">Time Entries</h3>
                 <Button variant="ghost" size="sm" onClick={handleGenerateInvoiceSummary} className="text-indigo-600">
                    Draft Invoice Description
                 </Button>
              </div>
              
              <div className="space-y-0 divide-y divide-slate-100 border rounded-lg overflow-hidden">
                 {task.timeLogs.map(log => (
                   <div key={log.id} className="p-4 bg-white flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{log.notes || 'No notes'}</div>
                        <div className="text-xs text-slate-500">{log.date}</div>
                      </div>
                      <div className="font-mono text-sm font-semibold text-slate-700">
                        {log.hours}h
                      </div>
                   </div>
                 ))}
                 {task.timeLogs.length === 0 && (
                   <div className="p-8 text-center text-slate-400">No time logged yet.</div>
                 )}
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <h4 className="text-sm font-medium text-slate-700 mb-3">Log Time</h4>
                 <div className="grid grid-cols-2 gap-3 mb-3">
                   <input 
                     type="date"
                     className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                     value={logDate}
                     onChange={(e) => setLogDate(e.target.value)}
                   />
                   <div className="flex items-center bg-white border border-slate-300 rounded-md px-3">
                     <span className="text-slate-500 text-sm mr-2">Hours:</span>
                     <input 
                        type="number"
                        className="w-full py-2 text-sm focus:outline-none bg-white text-slate-900"
                        step="0.25"
                        value={logHours}
                        onChange={(e) => setLogHours(Number(e.target.value))}
                     />
                   </div>
                 </div>
                 <textarea 
                   placeholder="What did you work on?"
                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-3 bg-white text-slate-900"
                   rows={2}
                   value={logNotes}
                   onChange={(e) => setLogNotes(e.target.value)}
                 />
                 <Button onClick={handleAddLog} className="w-full">Save Entry</Button>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700">Description / Notes</label>
                   <textarea
                     className="mt-1 w-full p-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 min-h-[100px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                     value={task.notes}
                     onChange={(e) => onUpdateTaskDetails(task.id, { notes: e.target.value })}
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700">Start Date</label>
                      <input 
                        type="date"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900"
                        value={task.startDate}
                        onChange={(e) => onUpdateTaskDetails(task.id, { startDate: e.target.value })}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700">Due Date</label>
                      <input 
                        type="date"
                        className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-slate-900"
                        value={task.dueDate}
                        onChange={(e) => onUpdateTaskDetails(task.id, { dueDate: e.target.value })}
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700">Hourly Rate</label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 sm:text-sm border-slate-300 rounded-md py-2 bg-white text-slate-900"
                          value={task.hourlyRate}
                          onChange={(e) => onUpdateTaskDetails(task.id, { hourlyRate: Number(e.target.value) })}
                        />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700">Estimated Hours</label>
                       <input
                          type="number"
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 bg-white text-slate-900"
                          value={task.estimatedHours}
                          onChange={(e) => onUpdateTaskDetails(task.id, { estimatedHours: Number(e.target.value) })}
                        />
                   </div>
                   <div className="flex items-center pt-6">
                      <input
                        id="isBillable"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-white"
                        checked={task.isBillable}
                        onChange={(e) => onUpdateTaskDetails(task.id, { isBillable: e.target.checked })}
                      />
                      <label htmlFor="isBillable" className="ml-2 block text-sm text-gray-900">
                        Billable Task
                      </label>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
