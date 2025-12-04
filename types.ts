
export enum Status {
  NOT_STARTED = "Not Started",
  IN_PROGRESS = "In Progress",
  BLOCKED = "Blocked",
  COMPLETE = "Complete"
}

export enum Priority {
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low"
}

export interface Client {
  id: string;
  name: string;
  color: string;
  address?: string;
  logo?: string; // Data URL or Image path
}

export interface Task {
  id: string;
  clientId: string;
  projectName: string;
  title: string;
  category: string;
  startDate: string; // ISO Date
  dueDate: string; // ISO Date
  status: Status;
  estimatedHours: number; // Manual estimate if no subtasks, or roll-up
  hourlyRate: number;
  isBillable: boolean;
  notes: string;
}

export interface Subtask {
  id: string;
  parentId: string;
  title: string;
  priority: Priority;
  assignedTo: string;
  estimatedHours: number;
  percentComplete: number; // 0-100
  status: Status;
}

export interface TimeLog {
  id: string;
  taskId: string;
  subtaskId?: string; // Optional link to subtask
  date: string; // ISO Date
  hours: number;
  notes: string;
}

export interface UserProfile {
  name: string;
  role: string;
  initials: string;
}

// Helper Types for Views
export interface TaskSummary extends Task {
  subtasks: Subtask[];
  timeLogs: TimeLog[];
  calculatedProgress: number;
  totalActualHours: number;
  totalBillableAmount: number;
  budgetStatus: "On Track" | "Over Budget";
}
