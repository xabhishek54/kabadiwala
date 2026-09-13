import React, { useState, useEffect } from 'react';
import { User, Store, Users, ShieldCheck, Phone, MapPin, Plus, CheckCircle, Award, ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface TeamMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  joinedAt: string;
}

export const ProfilePage: React.FC = () => {
  const [accountType, setAccountType] = useState<'independent' | 'shop' | 'sub_collector'>('shop');
  const [displayName] = useState<string>('Ramesh Kumar (Ganesh Kabadi Shop)');
  const [phone] = useState<string>('9876543210');
  const [locality] = useState<string>('Hadapsar, Pune');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: 'sub-1', name: 'Suresh Patil (Feriwala)', phone: '9822011223', role: 'Sub-collector', joinedAt: '2024-01-15' },
    { id: 'sub-2', name: 'Vikram Singh (Feriwala)', phone: '9822044556', role: 'Sub-collector', joinedAt: '2024-02-01' },
  ]);

  const [newFeriwalaName, setNewFeriwalaName] = useState<string>('');
  const [newFeriwalaPhone, setNewFeriwalaPhone] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedType = window.localStorage.getItem('kabadiwala_account_type') as any;
        if (savedType) setAccountType(savedType);
      }
    } catch {
      // safe fallback for SSR/node test env
    }
  }, []);

  const handleAccountTypeChange = (type: 'independent' | 'shop' | 'sub_collector') => {
    setAccountType(type);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('kabadiwala_account_type', type);
      }
    } catch {
      // safe fallback
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddFeriwala = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeriwalaPhone.trim()) return;
    const newMember: TeamMember = {
      id: `sub-${Date.now()}`,
      name: newFeriwalaName.trim() || `Feriwala (${newFeriwalaPhone.slice(-4)})`,
      phone: newFeriwalaPhone.trim(),
      role: 'Sub-collector',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setTeamMembers(prev => [...prev, newMember]);
    setNewFeriwalaName('');
    setNewFeriwalaPhone('');
    setShowInviteModal(false);
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Profile Card */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
            {accountType === 'shop' ? <Store size={28} /> : <User size={28} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900 leading-tight">{displayName}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="bg-brand-100 text-brand-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">
                {accountType === 'shop' ? 'Shop Owner (दुकानदार)' : accountType === 'sub_collector' ? 'Feriwala (फेरीवाला)' : 'Independent Collector'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-100">
          <div className="flex items-center space-x-1.5 text-stone-600">
            <Phone size={14} className="text-brand-600 shrink-0" />
            <span className="font-semibold">{phone}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-stone-600">
            <MapPin size={14} className="text-brand-600 shrink-0" />
            <span className="font-semibold">{locality}</span>
          </div>
        </div>
      </div>

      {/* Account Type Selection (Field Research Feriwala Model) */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center justify-between">
          <span>Account Structure (खाता प्रकार)</span>
          {savedSuccess && <span className="text-emerald-600 text-xs font-bold flex items-center"><CheckCircle size={14} className="mr-1" /> Saved</span>}
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleAccountTypeChange('independent')}
            className={`tap-target p-2.5 rounded-xl border text-center transition-all ${
              accountType === 'independent'
                ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User size={20} className="mx-auto mb-1 text-brand-600" />
            <span className="text-[11px] block font-semibold leading-tight">Independent</span>
          </button>

          <button
            type="button"
            onClick={() => handleAccountTypeChange('shop')}
            className={`tap-target p-2.5 rounded-xl border text-center transition-all ${
              accountType === 'shop'
                ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Store size={20} className="mx-auto mb-1 text-brand-600" />
            <span className="text-[11px] block font-semibold leading-tight">Shop Owner</span>
          </button>

          <button
            type="button"
            onClick={() => handleAccountTypeChange('sub_collector')}
            className={`tap-target p-2.5 rounded-xl border text-center transition-all ${
              accountType === 'sub_collector'
                ? 'bg-brand-50 border-brand-500 text-brand-800 font-bold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Users size={20} className="mx-auto mb-1 text-brand-600" />
            <span className="text-[11px] block font-semibold leading-tight">Feriwala</span>
          </button>
        </div>
      </div>

      {/* Feature 11: Digital Collection Authorization Badge */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-card p-4 shadow-soft space-y-2.5">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Award size={22} />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">Official License Badge</span>
              <h4 className="font-bold text-stone-900 text-sm leading-tight">Authorized Collection Agent</h4>
            </div>
          </div>
          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE ✓</span>
        </div>

        <p className="text-xs text-stone-700 font-medium">
          Issued by: <strong className="text-stone-900">EcoRecycle India (MPCB Verified)</strong><br />
          Ref No: <span className="font-mono text-stone-900 font-bold">AUTH-2024-8902</span>
        </p>

        <NavLink
          to="/verify/AUTH-2024-8902"
          className="tap-target w-full bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-800 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs"
        >
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>Verify Digital Authorization Badge</span>
          <ArrowRight size={14} />
        </NavLink>
      </div>

      {/* Feature 10: Shop Feriwala Team Roster */}
      {accountType === 'shop' && (
        <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
              <Users size={16} className="text-brand-600" />
              <span>Linked Feriwalas ({teamMembers.length})</span>
            </h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="tap-target px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow-xs"
            >
              <Plus size={14} />
              <span>Add Feriwala</span>
            </button>
          </div>

          <div className="space-y-2">
            {teamMembers.map(member => (
              <div key={member.id} className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-stone-900">{member.name}</h4>
                  <p className="text-[11px] text-stone-500">{member.phone} • Joined {member.joinedAt}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Linked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddFeriwala} className="bg-surface-card rounded-card border border-surface-border shadow-elevated p-5 max-w-md w-full space-y-3">
            <h3 className="font-bold text-stone-900 text-base">Add Feriwala / Sub-Collector</h3>
            <p className="text-xs text-stone-500">Link a door-to-door collector to your shop account for combined earnings tracking.</p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Feriwala Name:</label>
              <input
                type="text"
                placeholder="e.g. Suresh Patil"
                value={newFeriwalaName}
                onChange={e => setNewFeriwalaName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Mobile Phone Number:</label>
              <input
                type="tel"
                placeholder="e.g. 9822011223"
                value={newFeriwalaPhone}
                onChange={e => setNewFeriwalaPhone(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="flex-1 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs"
              >
                Link Feriwala
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
