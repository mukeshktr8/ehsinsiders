import { supabase } from '../supabaseClient';
import { Client, Task, Subtask, TimeLog, UserProfile, Status, Priority } from '../types';

// Helper to map DB snake_case to App camelCase
const mapClient = (row: any): Client => ({
  id: row.id,
  name: row.name,
  color: row.color,
  address: row.address,
  logo: row.logo
});

const mapTask = (row: any): Task => ({
  id: row.id,
  clientId: row.client_id,
  projectName: row.project_name,
  title: row.title,
  category: row.category,
  startDate: row.start_date,
  dueDate: row.due_date,
  status: row.status as Status,
  estimatedHours: Number(row.estimated_hours),
  hourlyRate: Number(row.hourly_rate),
  isBillable: row.is_billable,
  notes: row.notes
});

const mapSubtask = (row: any): Subtask => ({
  id: row.id,
  parentId: row.parent_id,
  title: row.title,
  priority: row.priority as Priority,
  assignedTo: row.assigned_to,
  estimatedHours: Number(row.estimated_hours),
  percentComplete: row.percent_complete,
  status: row.status as Status
});

const mapLog = (row: any): TimeLog => ({
  id: row.id,
  taskId: row.task_id,
  subtaskId: row.subtask_id,
  date: row.date,
  hours: Number(row.hours),
  notes: row.notes
});

export const dataService = {
  // --- READ ---
  getClients: async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) throw error;
    return data.map(mapClient);
  },

  getTasks: async () => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data.map(mapTask);
  },

  getSubtasks: async () => {
    const { data, error } = await supabase.from('subtasks').select('*');
    if (error) throw error;
    return data.map(mapSubtask);
  },

  getLogs: async () => {
    const { data, error } = await supabase.from('time_logs').select('*');
    if (error) throw error;
    return data.map(mapLog);
  },

  getUserProfile: async (): Promise<UserProfile> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { name: '', role: '', initials: '' };

    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    // If profile doesn't exist, return default or empty
    if (error || !data) return { name: user.email?.split('@')[0] || 'User', role: 'Admin', initials: 'ME' };
    
    return {
      name: data.name,
      role: data.role,
      initials: data.initials
    };
  },

  // --- CREATE ---
  createClient: async (client: Client) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.from('clients').insert([{
      // Remove ID to let DB generate UUID, or keep if UUID matches DB
      user_id: user.id,
      name: client.name,
      color: client.color,
      address: client.address,
      logo: client.logo
    }]).select().single();

    if (error) throw error;
    return mapClient(data);
  },

  createTask: async (task: Task) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.from('tasks').insert([{
      user_id: user.id,
      client_id: task.clientId,
      project_name: task.projectName,
      title: task.title,
      category: task.category,
      start_date: task.startDate,
      due_date: task.dueDate,
      status: task.status,
      estimated_hours: task.estimatedHours,
      hourly_rate: task.hourlyRate,
      is_billable: task.isBillable,
      notes: task.notes
    }]).select().single();

    if (error) throw error;
    return mapTask(data);
  },

  createSubtask: async (subtask: Subtask) => {
    const { data, error } = await supabase.from('subtasks').insert([{
      parent_id: subtask.parentId,
      title: subtask.title,
      priority: subtask.priority,
      assigned_to: subtask.assignedTo,
      estimated_hours: subtask.estimatedHours,
      percent_complete: subtask.percentComplete,
      status: subtask.status
    }]).select().single();

    if (error) throw error;
    return mapSubtask(data);
  },

  createLog: async (log: TimeLog) => {
    const { data, error } = await supabase.from('time_logs').insert([{
      task_id: log.taskId,
      subtask_id: log.subtaskId,
      date: log.date,
      hours: log.hours,
      notes: log.notes
    }]).select().single();

    if (error) throw error;
    return mapLog(data);
  },

  // --- UPDATE ---
  updateTask: async (id: string, updates: Partial<Task>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
    if (updates.isBillable !== undefined) dbUpdates.is_billable = updates.isBillable;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.projectName !== undefined) dbUpdates.project_name = updates.projectName;

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
    if (error) throw error;
  },

  updateSubtask: async (id: string, updates: Partial<Subtask>) => {
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.percentComplete !== undefined) dbUpdates.percent_complete = updates.percentComplete;
    if (updates.estimatedHours !== undefined) dbUpdates.estimated_hours = updates.estimatedHours;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { error } = await supabase.from('subtasks').update(dbUpdates).eq('id', id);
    if (error) throw error;
  },

  updateUserProfile: async (profile: UserProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert profile
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: profile.name,
      role: profile.role,
      initials: profile.initials
    });
    if (error) throw error;
  },

  // --- DELETE ---
  deleteClient: async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
  
  deleteSubtask: async (id: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', id);
    if (error) throw error;
  },
  
  // No explicit log delete in UI yet, but easy to add
};