import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Clock, 
  Settings, 
  Briefcase,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  Wand2,
  PieChart,
  Edit2,
  Check,
  X,
  Upload,
  MapPin
} from 'lucide-react';

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Tasks: <CheckSquare size={20} />,
  Time: <Clock size={20} />,
  Settings: <Settings size={20} />,
  Clients: <Briefcase size={20} />,
  ChevronRight: <ChevronRight size={16} />,
  ChevronDown: <ChevronDown size={16} />,
  Plus: <Plus size={16} />,
  Trash: <Trash2 size={16} />,
  Calendar: <Calendar size={14} />,
  Dollar: <DollarSign size={14} />,
  Alert: <AlertCircle size={14} />,
  Magic: <Wand2 size={16} />,
  Chart: <PieChart size={20} />,
  Edit: <Edit2 size={16} />,
  Check: <Check size={16} />,
  X: <X size={16} />,
  Upload: <Upload size={16} />,
  MapPin: <MapPin size={14} />
};

export const CLIENT_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
];
