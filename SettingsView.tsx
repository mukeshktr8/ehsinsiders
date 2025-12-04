
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Button } from './Button';

interface SettingsViewProps {
  userProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userProfile, onSave }) => {
  const [formData, setFormData] = useState(userProfile);

  // Sync state if props change (though usually this view mounts fresh)
  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Visual feedback could go here
    alert('Profile updated successfully!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4">User Profile</h3>
        <p className="text-sm text-slate-500 mb-6">Update your personal information displayed in the sidebar.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input 
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role / Title</label>
                <input 
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  required
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initials (Sidebar)</label>
                <input 
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                  value={formData.initials}
                  onChange={e => setFormData({...formData, initials: e.target.value})}
                  maxLength={3}
                  required
                />
             </div>
          </div>
          <div className="pt-4 flex justify-end">
             <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
