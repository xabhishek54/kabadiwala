import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerRecycler } from '../../data/remote/apiClient';
import { db } from '../../data/local/db';
import { Building, Phone, ShieldCheck, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';

export const RecyclerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('GreenEarth Recyclers Pune');
  const [phone, setPhone] = useState('9823011223');
  const [mpcbRef, setMpcbRef] = useState('MPCB/E-WASTE/2024/099');
  const [district, setDistrict] = useState('Pune');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [rates, setRates] = useState<Record<string, number>>({
    PCB: 280,
    BATTERY: 95,
    CABLE: 155,
    LCD_PANEL: 110,
    CRT: 40,
    MOTOR_MAGNET: 75,
    MIXED_PLASTIC: 25,
  });

  const districts = ['Pune', 'Mumbai', 'Thane', 'Nagpur', 'Nashik', 'Pimpri-Chinchwad'];

  const categoryLabels: Record<string, string> = {
    PCB: t('categories.PCB'),
    BATTERY: t('categories.BATTERY'),
    CABLE: t('categories.CABLE'),
    LCD_PANEL: t('categories.LCD_PANEL'),
    CRT: t('categories.CRT'),
    MOTOR_MAGNET: t('categories.MOTOR_MAGNET'),
    MIXED_PLASTIC: t('categories.MIXED_PLASTIC'),
  };

  const handleRateChange = (cat: string, val: string) => {
    const num = parseFloat(val) || 0;
    setRates((prev) => ({ ...prev, [cat]: num }));
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const response = await registerRecycler({
        name,
        contact_phone: phone,
        authorization_ref_no: mpcbRef,
        facility_lat: 18.5204,
        facility_lng: 73.8567,
        offered_rates: rates,
        materials_accepted: Object.keys(rates),
      });

      const userObj = {
        name,
        phone,
        role: 'recycler',
        recycler_id: response.recycler_id || 'rec-001',
        mpcb_ref: mpcbRef,
        district,
      };

      // Save to local IndexedDB so matching engine can find it offline too
      await db.recyclers.put({
        recycler_id: response.recycler_id || `rec-${Date.now()}`,
        name,
        authorization_status: 'verified',
        authorization_ref_no: mpcbRef,
        contact_phone: phone,
        facility_lat: 18.5204,
        facility_lng: 73.8567,
        offered_rates: rates,
        pickup_available: true,
        service_radius_km: 30.0,
        materials_accepted: Object.keys(rates),
      }).catch(() => {});

      localStorage.setItem('kabadiwala_user', JSON.stringify(userObj));
      localStorage.setItem('kabadiwala_district', district);

      window.dispatchEvent(new Event('district_changed'));
      navigate('/recycler');
    } catch (err) {
      alert(isEn ? 'Failed to register recycler account. Please check connection.' : 'नोंदणी अयशस्वी. नेटवर्क तपासा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center p-4 max-w-md mx-auto">
      {/* Header Badge */}
      <div className="text-center mb-6 space-y-1">
        <div className="inline-flex items-center space-x-1.5 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
          <ShieldCheck size={14} />
          <span>{isEn ? 'MPCB Authorized Recycler Onboarding' : 'MPCB अधिकृत रीसायकलर नोंदणी'}</span>
        </div>
        <h1 className="text-2xl font-black text-white">{isEn ? 'Recycler Facility Portal' : 'रीसायकलर सुविधा पोर्टल'}</h1>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center space-x-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              step >= s ? 'bg-amber-400 w-8' : 'bg-stone-800 w-3'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Business Details */}
      {step === 1 && (
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-4 my-auto">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-stone-900">
              {isEn ? 'Recycler Facility Profile' : 'व्यवसाय माहिती (Recycler Facility Profile)'}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {isEn ? 'Recycling center name & MPCB authorization license details' : 'रीसायकलिंग सेंटर आणि MPCB परवाना तपशील'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isEn ? 'Company / Facility Name:' : 'कंपनी / रीसायकलिंग सेंटर नाव:'}
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isEn ? 'Contact Mobile Number:' : 'संपर्क मोबाईल नंबर:'}
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-3 text-stone-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                {isEn ? 'MPCB Authorization Ref Number:' : 'MPCB Authorization Ref Number:'}
              </label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-3 text-emerald-600" />
                <input
                  type="text"
                  required
                  placeholder="e.g. MPCB/E-WASTE/2024/099"
                  value={mpcbRef}
                  onChange={(e) => setMpcbRef(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all mt-4 text-xs"
          >
            <span>{isEn ? 'Select Operating Location' : 'आगे बढ़ें (Select Operating Location)'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Location Selection */}
      {step === 2 && (
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-5 my-auto">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-stone-900">
              {isEn ? 'Select Operating District' : 'कार्यक्षेत्र निवडा (Operating District)'}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {isEn ? 'Which district does your recycling facility buy materials from?' : 'आपली संस्था कोणत्या जिल्ह्यात माल खरेदी करते?'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {districts.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDistrict(d)}
                className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                  district === d
                    ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-md'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <MapPin size={16} className={district === d ? 'text-amber-400' : 'text-stone-400'} />
                <span className="text-xs">{d}</span>
              </button>
            ))}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3.5 px-4 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs"
            >
              {isEn ? 'Back' : 'मागे'}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all text-xs"
            >
              <span>{isEn ? 'Configure Buying Rates' : 'दर निश्चित करा (Set Rates)'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Buying Rates */}
      {step === 3 && (
        <div className="bg-surface-card rounded-2xl p-5 border border-surface-border shadow-soft space-y-4 my-auto max-h-[80vh] overflow-y-auto">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-stone-900">
              {isEn ? 'Set Offered Buying Rates' : 'खरेदी दर निश्चित करा (Set Buying Rates)'}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {isEn ? 'These rates will appear on the live Price Board & buyer matching' : 'हे दर कबाड़ीवाल्यांच्या मॅचिंग रिझल्टमध्ये दिसतील'}
            </p>
          </div>

          <div className="space-y-2">
            {Object.keys(rates).map((cat) => (
              <div key={cat} className="flex items-center justify-between bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-800">{categoryLabels[cat] || cat}</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-bold text-stone-500">₹</span>
                  <input
                    type="number"
                    step="1"
                    value={rates[cat]}
                    onChange={(e) => handleRateChange(cat, e.target.value)}
                    className="w-20 p-1 text-xs font-bold font-mono text-stone-900 border border-stone-300 rounded-lg text-right bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-stone-400">/kg</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleFinish}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all text-xs disabled:opacity-50 mt-2"
          >
            <CheckCircle2 size={18} />
            <span>
              {isSubmitting
                ? (isEn ? 'Registering Facility...' : 'नोंदणी होत आहे...')
                : (isEn ? 'Register & Launch Recycler Hub' : 'खाते नोंदवा व सुरू करा (Register & Launch)')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
