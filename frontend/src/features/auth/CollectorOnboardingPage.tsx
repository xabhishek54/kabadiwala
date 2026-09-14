import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, User, Store, Users, QrCode, ArrowRight, CheckCircle2,
  Camera, ShieldCheck, Loader2, AlertCircle, Copy, CheckCheck,
} from 'lucide-react';
import { signupCollector, linkFeriwalaToShop } from '../../data/remote/apiClient';

export const CollectorOnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [district, setDistrict] = useState('Pune');
  const [accountType, setAccountType] = useState<'independent' | 'shop' | 'sub_collector'>('shop');
  const [inputShopCode, setInputShopCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkedSuccess, setLinkedSuccess] = useState(false);
  const [linkedShopName, setLinkedShopName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // After signup, assigned shopCode from backend
  const [assignedShopCode, setAssignedShopCode] = useState('');
  const [assignedCollectorId, setAssignedCollectorId] = useState('');
  const [copied, setCopied] = useState(false);

  const districts = ['Pune', 'Pimpri-Chinchwad', 'Mumbai', 'Thane', 'Nagpur', 'Nashik'];

  const getProvisionalUser = () => {
    try {
      const raw = localStorage.getItem('kabadiwala_user');
      return raw ? JSON.parse(raw) : { name: 'Ramesh Kumar', phone: '9876543210', role: 'collector' };
    } catch {
      return { name: 'Ramesh Kumar', phone: '9876543210', role: 'collector' };
    }
  };

  // Step 2→3: create account in DB
  const handleGoToStep3 = async () => {
    const user = getProvisionalUser();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await signupCollector({
        phone_number: user.phone,
        display_name: user.name,
        operating_locality: district,
        account_type: accountType,
      });

      setAssignedCollectorId(result.collector_id);
      if (result.shop_code) setAssignedShopCode(result.shop_code);

      // Persist to localStorage
      const updated = {
        ...user,
        id: result.collector_id,
        accountType,
        shopCode: result.shop_code || null,
        district,
        isNew: false,
      };
      localStorage.setItem('kabadiwala_user', JSON.stringify(updated));
      localStorage.setItem('kabadiwala_district', district);
      localStorage.setItem('kabadiwala_account_type', accountType);
      if (result.shop_code) localStorage.setItem('kabadiwala_shop_code', result.shop_code);

      setStep(3);
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateScanQR = () => {
    setIsScanning(true);
    setLinkError('');
    setTimeout(() => {
      setInputShopCode('SHOP-9876');
      setIsScanning(false);
    }, 1500);
  };

  const handleLinkShop = async () => {
    if (!inputShopCode.trim()) return;
    setIsSubmitting(true);
    setLinkError('');
    try {
      const result = await linkFeriwalaToShop(assignedCollectorId, inputShopCode.trim().toUpperCase());
      setLinkedSuccess(true);
      setLinkedShopName(result.shop_name);

      // Update localStorage with linked shop info
      const raw = localStorage.getItem('kabadiwala_user');
      if (raw) {
        const u = JSON.parse(raw);
        u.parentShopCode = result.shop_code;
        localStorage.setItem('kabadiwala_user', JSON.stringify(u));
      }
    } catch (err: any) {
      setLinkError(err?.message || 'Invalid shop code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (assignedShopCode) {
      navigator.clipboard.writeText(assignedShopCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between px-4 py-8 max-w-md mx-auto">
      {/* Step Header */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft mb-4">
        <span className="font-bold text-stone-900 text-sm">
          कचरा संग्राहक सेटअप (Collector Setup) ({step}/3)
        </span>
        <button type="button" onClick={handleFinish} className="text-xs text-stone-400 font-semibold hover:text-stone-700">
          Skip
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1: Location / District Selector                                */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-5 my-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <MapPin size={32} />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-stone-900">आपला जिल्हा निवडा (Select Location)</h2>
            <p className="text-xs text-stone-500 font-medium">आपल्या परिसरातील लाइव्ह बाजारभाव मिळवण्यासाठी जिल्हा निवडा</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {districts.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDistrict(d)}
                className={`p-3 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                  district === d
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <MapPin size={16} className={district === d ? 'text-amber-600' : 'text-stone-400'} />
                <span className="text-xs">{d}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all mt-4"
          >
            <span>आगे बढ़ें (Next Step)</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 2: Account Structure Selection                                 */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-5 my-auto">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-stone-900">खाता प्रकार निवडा (Account Structure)</h2>
            <p className="text-xs text-stone-500 font-medium">आपल्या काम करण्याच्या पद्धतीनुसार पर्याय निवडा</p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'shop',
                title: 'Shop Owner (दुकानदार)',
                desc: 'माझे स्वतःचे दुकान आहे व माझ्यासोबत फेरीवाले जोडलेले आहेत',
                icon: <Store size={24} className="text-brand-600" />,
              },
              {
                id: 'sub_collector',
                title: 'Feriwala / Door-to-Door (फेरीवाला)',
                desc: 'मी घरोघरी जाऊन ई-कचरा गोळा करतो व दुकानाला देतो',
                icon: <Users size={24} className="text-amber-600" />,
              },
              {
                id: 'independent',
                title: 'Independent Collector (स्वतंत्र कबाड़ी)',
                desc: 'मी स्वतंत्रपणे काम करतो',
                icon: <User size={24} className="text-emerald-600" />,
              },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setAccountType(type.id as any)}
                className={`w-full p-4 rounded-xl border text-left flex items-start space-x-3 transition-all ${
                  accountType === type.id
                    ? 'bg-brand-50 border-brand-500 ring-2 ring-brand-500/20'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="mt-0.5">{type.icon}</div>
                <div>
                  <div className="font-bold text-stone-900 text-sm">{type.title}</div>
                  <div className="text-xs text-stone-500 mt-0.5 font-medium">{type.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800">{error}</p>
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="py-3.5 px-4 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleGoToStep3}
              disabled={isSubmitting}
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 size={16} className="animate-spin" /><span>Creating Account...</span></>
              ) : (
                <><span>आगे बढ़ें</span><ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Step 3: QR / Shop Code Display (shop) or Link to Shop (feriwala)   */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="bg-surface-card rounded-2xl p-6 border border-surface-border shadow-soft space-y-5 my-auto text-center">
          {/* SHOP OWNER — show their generated code */}
          {accountType === 'shop' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
                <QrCode size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-900">आपला Shop QR & Pairing Code</h2>
              <p className="text-xs text-stone-500">फेरीवाल्यांना जोडण्यासाठी हा कोड द्या किंवा QR कोड दाखवा</p>

              <div className="bg-stone-900 text-white p-4 rounded-2xl space-y-3 border border-stone-800">
                <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Your Unique Shop Code</div>
                <div className="text-3xl font-black font-mono tracking-widest text-white">
                  {assignedShopCode || 'SHOP-????'}
                </div>
                <div className="text-[11px] text-stone-400">Share this code with your door-to-door feriwalas</div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center justify-center space-x-1.5 mx-auto bg-stone-700 hover:bg-stone-600 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                >
                  {copied ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 text-left space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <span>How Feriwala Linking Works:</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Feriwalas scan your QR code or enter <strong className="font-mono">{assignedShopCode}</strong> in their app. They'll be linked under your shop account!
                </p>
              </div>
            </div>
          )}

          {/* FERIWALA — scan/enter shop code to link */}
          {accountType === 'sub_collector' && (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <QrCode size={32} />
              </div>
              <h2 className="text-xl font-bold text-stone-900">दुकानदाराशी जोडा (Link to Shop)</h2>
              <p className="text-xs text-stone-500">दुकानदाराचा QR स्कॅन करा किंवा कोड टाका</p>

              {isScanning ? (
                <div className="bg-stone-900 text-white p-6 rounded-2xl space-y-2 animate-pulse">
                  <Camera size={36} className="mx-auto text-amber-400 animate-bounce" />
                  <div className="text-xs font-bold">Scanning Shop QR Code...</div>
                </div>
              ) : linkedSuccess ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-emerald-800 space-y-1">
                  <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                  <div className="font-bold text-sm">Linked to {linkedShopName || inputShopCode}!</div>
                  <div className="text-xs text-emerald-700">आपले खाते दुकानाशी यशस्वीरित्या जोडले गेले आहे.</div>
                </div>
              ) : (
                <div className="space-y-3 text-left">
                  <button
                    type="button"
                    onClick={handleSimulateScanQR}
                    className="w-full bg-stone-900 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-95 transition-all text-xs"
                  >
                    <Camera size={18} />
                    <span>Shop QR Code स्कॅन करा (Scan Shop QR)</span>
                  </button>

                  <div className="text-xs text-stone-400 font-semibold text-center">किंवा कोड मॅन्युअली टाका (or enter code)</div>

                  <input
                    type="text"
                    placeholder="e.g. SHOP-9876"
                    value={inputShopCode}
                    onChange={(e) => { setInputShopCode(e.target.value.toUpperCase()); setLinkError(''); }}
                    className="w-full text-center text-lg font-mono font-bold p-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  {linkError && (
                    <div className="flex items-start space-x-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-800">{linkError}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleLinkShop}
                    disabled={!inputShopCode.trim() || isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>Verify & Link Shop</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INDEPENDENT */}
          {accountType === 'independent' && (
            <div className="space-y-3 py-4">
              <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
              <h2 className="text-xl font-bold text-stone-900">सेटअप पूर्ण झाले! (Setup Ready)</h2>
              <p className="text-xs text-stone-500">
                आपण आता {district} मधील थेट बाज़ारभाव पाहू शकता आणि डिजिटल लॉट तयार करू शकता.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleFinish}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all mt-4"
          >
            <CheckCircle2 size={20} />
            <span>सेटअप पूर्ण करा (Complete & Start)</span>
          </button>
        </div>
      )}
    </div>
  );
};
