import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerRecycler, loginUser } from '../../data/remote/apiClient';
import { db } from '../../data/local/db';
import { Building, Phone, ShieldCheck, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';

export const RecyclerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const provisionalUserStr = typeof window !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const provisionalUser = provisionalUserStr ? JSON.parse(provisionalUserStr) : null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(provisionalUser?.name || '');
  const [phone, setPhone] = useState(provisionalUser?.phone || '');
  const [mpcbRef, setMpcbRef] = useState('');
  const [district, setDistrict] = useState(provisionalUser?.district || 'Pune');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFindingLocation, setIsFindingLocation] = useState(false);
  const [facilityLocation, setFacilityLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [rates, setRates] = useState<Record<string, number>>({
    PCB: 0,
    BATTERY: 0,
    CABLE: 0,
    LCD_PANEL: 0,
    CRT: 0,
    MOTOR_MAGNET: 0,
    MIXED_PLASTIC: 0,
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

  const requestFacilityLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError(isEn ? 'This browser cannot provide facility location.' : 'या ब्राउझरमध्ये स्थान उपलब्ध नाही.');
      return;
    }
    setIsFindingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFacilityLocation({ lat: coords.latitude, lng: coords.longitude });
        setIsFindingLocation(false);
      },
      (geoError) => {
        setError(geoError.message || (isEn ? 'Could not get facility location.' : 'स्थान मिळू शकले नाही.'));
        setIsFindingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const continueToLocation = () => {
    if (!name.trim() || !/^\d{10}$/.test(phone) || !mpcbRef.trim()) {
      setError(isEn
        ? 'Enter the facility name, a 10-digit phone number, and authorization reference.'
        : 'सुविधेचे नाव, १० अंकी फोन क्रमांक आणि अधिकृतता संदर्भ भरा.');
      return;
    }
    setError('');
    setStep(2);
  };

  const continueToRates = () => {
    if (!district || !facilityLocation) {
      setError(isEn
        ? 'Choose the operating district and capture the facility GPS location.'
        : 'कार्यक्षेत्र निवडा आणि सुविधेचे GPS स्थान नोंदवा.');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleFinish = async () => {
    setError('');
    const offeredRates = Object.fromEntries(
      Object.entries(rates).filter(([, rate]) => Number.isFinite(rate) && rate > 0),
    );
    if (!name.trim() || !/^\d{10}$/.test(phone) || !mpcbRef.trim() || !district) {
      setError(isEn ? 'Complete the facility details before registering.' : 'नोंदणीपूर्वी सुविधा तपशील पूर्ण करा.');
      return;
    }
    if (!facilityLocation) {
      setError(isEn ? 'Capture the facility location before registering.' : 'नोंदणीपूर्वी सुविधेचे स्थान नोंदवा.');
      return;
    }
    if (Object.keys(offeredRates).length === 0) {
      setError(isEn ? 'Enter at least one positive buying rate.' : 'किमान एक सकारात्मक खरेदी दर भरा.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await registerRecycler({
        name: name.trim(),
        contact_phone: phone,
        authorization_ref_no: mpcbRef.trim(),
        facility_lat: facilityLocation.lat,
        facility_lng: facilityLocation.lng,
        offered_rates: offeredRates,
        materials_accepted: Object.keys(offeredRates),
      });

      const session = await loginUser(phone, 'recycler').catch(() => null);
      if (session?.access_token) localStorage.setItem('kabadiwala_access_token', session.access_token);

      const rid = response.recycler_id || `rec-${Date.now()}`;
      const userObj = {
        id: rid,
        recycler_id: rid,
        recyclerId: rid,
        name,
        phone,
        role: 'recycler',
        mpcb_ref: mpcbRef,
        district,
      };

      try {
        await db.recyclers.put({
          recycler_id: response.recycler_id,
          name: name.trim(),
          authorization_status: response.authorization_status,
          authorization_ref_no: mpcbRef.trim(),
          contact_phone: phone,
          facility_lat: facilityLocation.lat,
          facility_lng: facilityLocation.lng,
          offered_rates: offeredRates,
          pickup_available: false,
          service_radius_km: 30.0,
          materials_accepted: Object.keys(offeredRates),
        });
      } catch (cacheError) {
        console.error('Recycler facility registered, but offline cache could not be saved.', cacheError);
      }

      window.localStorage?.setItem('kabadiwala_user', JSON.stringify(userObj));
      window.localStorage?.setItem('kabadiwala_district', district);

      window.dispatchEvent(new Event('district_changed'));
      navigate('/recycler');
    } catch (err) {
      setError(err instanceof Error
        ? err.message
        : (isEn ? 'Could not register facility. Please check your connection and retry.' : 'नोंदणी अयशस्वी. नेटवर्क तपासा.'));
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
          <span>{isEn ? 'Recycler Facility Registration' : 'रीसायकलर सुविधा नोंदणी'}</span>
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

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

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
            onClick={continueToLocation}
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

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
            <p className="text-xs text-stone-600">
              {isEn
                ? 'Share the facility’s current GPS location. It is used to calculate nearby recycler matches.'
                : 'जवळचे जुळणारे व्यवहार शोधण्यासाठी सुविधेचे सध्याचे GPS स्थान द्या.'}
            </p>
            <button
              type="button"
              onClick={requestFacilityLocation}
              disabled={isFindingLocation}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-800 disabled:opacity-60"
            >
              {isFindingLocation
                ? (isEn ? 'Getting location…' : 'स्थान घेत आहे…')
                : (isEn ? 'Use current facility location' : 'सध्याचे सुविधा स्थान वापरा')}
            </button>
            {facilityLocation && (
              <p role="status" className="text-[11px] text-emerald-700">
                {isEn ? 'Facility location captured.' : 'सुविधेचे स्थान नोंदवले.'}
              </p>
            )}
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
              onClick={continueToRates}
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
                ? (isEn ? 'Submitting facility...' : 'नोंदणी होत आहे...')
                  : (isEn ? 'Submit facility for verification' : 'सुविधा पडताळणीसाठी पाठवा')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
