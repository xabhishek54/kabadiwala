import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Factory, RefreshCw } from 'lucide-react';
import {
  fetchRecyclerProfile,
  updateRecyclerConfig,
  updateRecyclerRates,
} from '../../data/remote/apiClient';

export const RecyclerRatesPage: React.FC = () => {
  const [recyclerId, setRecyclerId] = useState('');
  const [recyclerName, setRecyclerName] = useState('Recycler');
  const [authorizationStatus, setAuthorizationStatus] = useState('');
  const [rates, setRates] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pickupAvailable, setPickupAvailable] = useState(false);
  const [serviceRadius, setServiceRadius] = useState<number>(25);
  const [materialsAccepted, setMaterialsAccepted] = useState<string[]>([]);

  const allMaterials = ['PCB', 'BATTERY', 'CABLE', 'LCD_PANEL', 'CRT', 'MOTOR_MAGNET', 'MIXED_PLASTIC', 'IRON', 'ALUMINIUM', 'NEWSPAPER'];

  const toggleMaterial = (cat: string) => {
    setMaterialsAccepted(prev => prev.includes(cat) ? prev.filter(m => m !== cat) : [...prev, cat]);
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const rawUser = window.localStorage?.getItem('kabadiwala_user');
        const user = rawUser ? JSON.parse(rawUser) : {};
        const id = user.recycler_id || (user.role === 'recycler' ? user.id : '');
        if (!id) throw new Error('Sign in with a recycler account to manage facility rates.');
        const profile = await fetchRecyclerProfile(id);
        if (!isMounted) return;
        setRecyclerId(profile.recycler_id);
        setRecyclerName(profile.name);
        setAuthorizationStatus(profile.authorization_status);
        setRates(Object.fromEntries(
          allMaterials.map(category => [category, profile.offered_rates[category] || 0]),
        ));
        setPickupAvailable(profile.pickup_available);
        setServiceRadius(profile.service_radius_km);
        setMaterialsAccepted(profile.materials_accepted);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load recycler profile.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void loadProfile();
    return () => { isMounted = false; };
  }, []);

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    PCB: { label: 'Circuit Board (PCB)', icon: '🔌' },
    BATTERY: { label: 'Battery / Cell', icon: '🔋' },
    CABLE: { label: 'Copper Cable', icon: '🧵' },
    LCD_PANEL: { label: 'LCD Screen', icon: '🖥️' },
    CRT: { label: 'CRT TV Vacuum Glass', icon: '📺' },
    MOTOR_MAGNET: { label: 'Motor / Magnet', icon: '🧲' },
    MIXED_PLASTIC: { label: 'Plastic Body', icon: '♻️' },
  };

  const handleRateChange = (cat: string, val: string) => {
    const num = parseFloat(val) || 0;
    setRates((prev) => ({ ...prev, [cat]: num }));
  };

  const handleSaveRates = async () => {
    setError('');
    const activeRates = Object.fromEntries(
      Object.entries(rates).filter(
        ([category, rate]) => materialsAccepted.includes(category) && Number.isFinite(rate) && rate > 0,
      ),
    );
    if (!recyclerId) {
      setError('Recycler account is not available. Sign in again and retry.');
      return;
    }
    if (Object.keys(activeRates).length === 0) {
      setError('Select an accepted material and enter a positive buying rate.');
      return;
    }
    setIsSaving(true);
    try {
      await updateRecyclerRates(recyclerId, activeRates);
      await updateRecyclerConfig(recyclerId, {
        pickup_available: pickupAvailable,
        service_radius_km: serviceRadius,
        materials_accepted: materialsAccepted,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save facility rates.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-card p-4 shadow-soft flex items-center justify-between border border-stone-800">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 mb-1">
            <Factory size={14} />
            <span>Rate Management Portal</span>
          </div>
          <h2 className="text-xl font-bold leading-tight">{recyclerName}</h2>
          <p className="text-xs text-stone-400 font-medium">खालील दर कबाड़ीवाल्यांच्या मॅचिंग अल्गोरिदमला अपडेट करतील</p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>दर यशस्वीरित्या अपडेट झाले! (Buying rates updated successfully!)</span>
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}
      {authorizationStatus === 'pending' && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Your authorization is pending review. Rates are saved, but your facility will not be shown in recycler matches until verified.
        </div>
      )}

      {/* Category Rate Inputs */}
      <div className="bg-surface-card rounded-card p-4 border border-surface-border shadow-soft space-y-3">
        <h3 className="font-bold text-stone-900 text-sm flex items-center justify-between">
          <span>खरेदी दर प्रति किलो (Buying Rate per kg)</span>
          <span className="text-stone-400 text-xs font-normal">INR ₹ / kg</span>
        </h3>

        <div className="space-y-2.5">
          {Object.keys(rates).map((cat) => {
            const meta = categoryLabels[cat] || { label: cat, icon: '📦' };

            return (
              <div key={cat} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">{meta.icon}</span>
                  <div>
                    <div className="font-bold text-stone-900 text-xs">{meta.label}</div>
                    <div className="text-[10px] text-stone-500 font-medium">Category: {cat}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-stone-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates[cat]}
                    onChange={(e) => handleRateChange(cat, e.target.value)}
                    className="w-20 p-2 text-sm font-black font-mono text-stone-900 border border-stone-300 rounded-lg text-right bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pickup & Service Config — matching engine inputs */}
        <div className="border-t border-stone-200 pt-3 mt-1 space-y-3">
          <h3 className="font-bold text-stone-900 text-sm">Pickup & Service Area Config</h3>

          {/* Pickup Toggle */}
          <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
            <div>
              <div className="font-bold text-stone-900 text-xs">🚚 Pickup Available</div>
              <div className="text-[10px] text-stone-500">Do you offer material pickup service?</div>
            </div>
            <button
              type="button"
              onClick={() => setPickupAvailable(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors ${pickupAvailable ? 'bg-emerald-500' : 'bg-stone-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pickupAvailable ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Service Radius */}
          {pickupAvailable && (
            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="font-bold text-stone-900 text-xs">📍 Service Radius</div>
              <select
                value={serviceRadius}
                onChange={e => setServiceRadius(Number(e.target.value))}
                className="text-xs font-bold p-2 rounded-lg border border-stone-300 bg-white focus:ring-2 focus:ring-amber-500"
              >
                {[5, 10, 20, 50, 100].map(r => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
            </div>
          )}

          {/* Materials Accepted */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
            <div className="font-bold text-stone-900 text-xs">✅ Materials Accepted</div>
            <div className="grid grid-cols-2 gap-1.5">
              {allMaterials.map(cat => {
                const meta = categoryLabels[cat] || { label: cat, icon: '📦' };
                const checked = materialsAccepted.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleMaterial(cat)}
                    className={`flex items-center space-x-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                      checked ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-stone-200 text-stone-500'
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span className="truncate">{meta.label.split('(')[0].trim()}</span>
                    {checked && <span className="ml-auto">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={isSaving || isLoading || !recyclerId}
          onClick={handleSaveRates}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all text-xs disabled:opacity-50 mt-4"
        >
          {isSaving || isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{isLoading ? 'Loading facility…' : isSaving ? 'अपडेट होत आहे...' : 'Save Rates & Config'}</span>
        </button>
      </div>
    </div>
  );
};
