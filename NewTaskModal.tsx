import React, { useState } from 'react';
import { Client, Task, Status } from '../types';
import { Button } from './Button';

interface NewTaskModalProps {
  clients: Client[];
  initialClientId?: string | null;
  initialStartDate?: string | null;
  initialDueDate?: string | null;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ clients, initialClientId, initialStartDate, initialDueDate, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    clientId: initialClientId || clients[0]?.id || '',
    projectName: '',
    category: 'Strategy',
    startDate: initialStartDate || new Date().toISOString().split('T')[0],
    dueDate: initialDueDate || '',
    estimatedHours: 10,
    hourlyRate: 150,
    isBillable: true,
    notes: '',
    status: Status.NOT_STARTED
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData as Task // Cast safe due to initial state
    };
    onSave(newTask);
    onClose();
  };

  const inputClass = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-800">New Project Task</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Task Name</label>
               <input 
                 required
                 className={inputClass}
                 value={formData.title}
                 onChange={e => setFormData({...formData, title: e.target.value})}
               />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                 <select 
                   className={inputClass}
                   value={formData.clientId}
                   onChange={e => setFormData({...formData, clientId: e.target.value})}
                 >
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                 <select 
                   className={inputClass}
                   value={formData.category}
                   onChange={e => setFormData({...formData, category: e.target.value})}
                 >
                    <option value="Strategy">Strategy</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Admin">Admin</option>
                    <option value="Marketing">Marketing</option>
                 </select>
               </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input 
                  required
                  className={inputClass}
                  value={formData.projectName}
                  onChange={e => setFormData({...formData, projectName: e.target.value})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                   <input 
                     type="date"
                     required
                     className={inputClass}
                     value={formData.startDate}
                     onChange={e => setFormData({...formData, startDate: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                   <input 
                     type="date"
                     required
                     className={inputClass}
                     value={formData.dueDate}
                     onChange={e => setFormData({...formData, dueDate: e.target.value})}
                   />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label>
                   <input 
                     type="number"
                     className={inputClass}
                     value={formData.estimatedHours}
                     onChange={e => setFormData({...formData, estimatedHours: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate ($)</label>
                   <input 
                     type="number"
                     className={inputClass}
                     value={formData.hourlyRate}
                     onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                   />
                </div>
             </div>
             
             <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                   <input 
                     type="checkbox"
                     checked={formData.isBillable}
                     onChange={e => setFormData({...formData, isBillable: e.target.checked})}
                     className="rounded text-indigo-600 focus:ring-indigo-500 bg-white"
                   />
                   <span>Billable Task</span>
                </label>
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className={inputClass}
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
             </div>

             <div className="pt-4 flex justify-end space-x-3">
               <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
               <Button variant="primary" type="submit">Create Project</Button>
             </div>
          </form>
       </div>
    </div>
  );
};