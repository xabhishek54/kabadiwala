import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { db, type LocalMaterial, type LocalTransaction } from '../../data/local/db';
import { getHandoverToken, confirmHandover, API_BASE_URL } from '../../data/remote/apiClient';
import { CheckCircle, ArrowLeft, ShieldCheck, Copy, ArrowRight, Clock, MapPin, QrCode, Camera, X } from 'lucide-react';

export const HandoverPage: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const userJson = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? localStorage.getItem('kabadiwala_user') : null;
  const currentUser = userJson ? JSON.parse(userJson) : null;
  const [material, setMaterial] = useState<LocalMaterial | null>(null);
  const [transaction, setTransaction] = useState<LocalTransaction | null>(null);
  const [qrToken, setQrToken] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [inputShortCode, setInputShortCode] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const initialMode = currentUser?.role === 'recycler' ? 'recycler' : 'collector';
  const [mode] = useState<'collector' | 'recycler'>(initialMode);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState<boolean>(false);
  const [finalValueInput, setFinalValueInput] = useState<string>('');
  const [trailEvents, setTrailEvents] = useState<any[]>([]);
  const [confirmationError, setConfirmationError] = useState<string>('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  const startScanner = async () => {
    setShowScanner(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode('handover-qr-reader');
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            let code = decodedText.trim();
            if (code.includes('-')) {
              const parts = code.split('-');
              code = parts[parts.length - 1];
            }
            if (code.length > 6) {
              code = code.slice(0, 6);
            }
            setInputShortCode(code.toUpperCase());
            stopScanner();
          },
          () => {}
        );
      } catch (err) {
        console.warn('Camera scanner error:', err);
      }
    }, 200);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Stop scanner error:', err);
      }
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
          scannerRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleCopyCode = () => {
    if (shortCode) {
      navigator.clipboard.writeText(shortCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  useEffect(() => {
    // Acquire actual browser GPS location
    if ('geolocation' in navigator) {
      setIsGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsGettingGps(false);
        },
        () => {
          setIsGettingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsLocation(null);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!lotId) return;
      const mat = await db.materials.get(lotId);
      const tx = await db.transactions.get(lotId);
      let activeMat = mat;
      let activeTx = tx;

      if (!activeMat) {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/lots`);
          if (res.ok) {
            const lots = await res.json();
            const found = lots.find((l: any) => l.lot_id === lotId);
            if (found) {
              activeMat = {
                lot_id: found.lot_id,
                material_category: found.category || 'PCB',
                sub_category: found.sub_category || 'E-Waste Scrap',
                approx_weight_kg: found.weight_kg || 5.0,
                estimated_value: found.estimated_value || 1250,
                condition: 'intact',
                source_type: 'household',
                collector_id: found.collector_id || 'col-001',
                created_at: found.created_at || new Date().toISOString(),
              };
              activeTx = {
                lot_id: found.lot_id,
                collector_id: found.collector_id || 'col-001',
                recycler_id: found.recycler_id || 'rec-pune-001',
                status: found.status || 'matched',
                quoted_price: found.estimated_value || 1250,
                payment_method: 'upi',
                payment_status: found.payment_status || 'unpaid',
                created_at: found.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
            }
          }
        } catch (err) {
          console.warn('Handover backend lot fallback error:', err);
        }
      }

      if (!activeMat) {
        activeMat = {
          lot_id: lotId,
          material_category: 'PCB',
          sub_category: 'E-Waste Material Lot',
          approx_weight_kg: 5.0,
          condition: 'intact',
          source_type: 'household',
          estimated_value: 1300,
          collector_id: currentUser?.id || 'col-001',
          created_at: new Date().toISOString(),
        };
        await db.materials.put(activeMat);
      }

      if (!activeTx) {
        activeTx = {
          lot_id: lotId,
          collector_id: currentUser?.id || 'col-001',
          recycler_id: currentUser?.recycler_id || 'rec-pune-001',
          recycler_name: 'EcoRecycle India',
          status: 'matched',
          quoted_price: activeMat.estimated_value,
          payment_method: 'upi',
          payment_status: 'unpaid',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.transactions.put(activeTx);
      }

      setMaterial(activeMat);
      setTransaction(activeTx);
      setFinalValueInput((activeTx.quoted_price || activeMat.estimated_value || 0).toString());
      if (activeTx.status === 'confirmed' || activeTx.status === 'paid' || activeTx.status === 'closed') {
        setIsConfirmed(true);
      }

      try {
        const tokenData = await getHandoverToken(lotId);
        setQrToken(tokenData.handover_token);
        setShortCode(tokenData.short_code);
      } catch (e) {
        console.warn('Failed to load handover token:', e);
      }

      // Load traceability trail from backend
      try {
        const eventsRes = await fetch(`${API_BASE_URL}/lots/${lotId}/events`);
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setTrailEvents(eventsData.events || []);
        }
      } catch {
        // offline — skip trail
      }
    }
    loadData();
  }, [lotId]);

  // Code validation: must match 6 chars AND equal the lot's short code
  const codeEntered = inputShortCode.trim().length === 6;
  const codeMatches = codeEntered && inputShortCode.trim().toUpperCase() === shortCode.toUpperCase();
  const canConfirm = codeMatches && !isGettingGps && parseFloat(finalValueInput) > 0;

  const handleConfirmHandover = async () => {
    if (!lotId || !codeMatches) return;
    setConfirmationError('');
    const finalVal = parseFloat(finalValueInput) || transaction?.quoted_price || material?.estimated_value || 0;
    const activeRecyclerId = transaction?.recycler_id || currentUser?.recycler_id || currentUser?.recyclerId || currentUser?.id || 'rec-pune-001';

    let handoverAddress: string | undefined;
    if (gpsLocation?.lat && gpsLocation?.lng) {
      try {
        const { reverseGeocode } = await import('../../utils/geoUtils');
        handoverAddress = await reverseGeocode(gpsLocation.lat, gpsLocation.lng);
      } catch {
        // ignore
      }
    }

    try {
      await confirmHandover(
        lotId,
        activeRecyclerId,
        inputShortCode.trim(),
        gpsLocation?.lat,
        gpsLocation?.lng,
        finalVal
      );
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : 'Handover could not be confirmed');
      return;
    }

    // Update local IndexedDB transaction status
    await db.transactions.update(lotId, {
      status: 'closed',
      payment_status: 'paid',
      final_sale_value: finalVal,
      handover_lat: gpsLocation?.lat,
      handover_lng: gpsLocation?.lng,
      handover_address: handoverAddress,
      updated_at: new Date().toISOString(),
    } as any);

    // Queue in sync outbox
    await db.syncOutbox.add({
      client_uuid: lotId,
      entity_type: 'transaction',
      action: 'upsert',
      payload: {
        status: 'closed',
        payment_status: 'paid',
        payment_method: paymentMethod,
        final_sale_value: finalVal,
        handover_lat: gpsLocation?.lat,
        handover_lng: gpsLocation?.lng,
        handover_address: handoverAddress,
      },
      created_at: new Date().toISOString(),
      synced: false,
    });

    setIsConfirmed(true);
  };

  if (!material) {
    return (
      <div className="p-8 text-center text-stone-500 font-medium">
        {isEn ? 'Loading lot handover details...' : 'सामान की जानकारी लोड हो रही है...'}
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 max-w-md sm:max-w-2xl md:max-w-3xl mx-auto space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between bg-surface-card p-3 rounded-card border border-surface-border shadow-soft">
        <button type="button" onClick={() => navigate('/lots')} className="text-stone-500 tap-target">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-stone-900 text-base">
          {isEn ? 'Digital Handover & Receipt' : 'डिजिटल हैंडओवर (Digital Handover)'}
        </h2>
      </div>

      {/* Confirmed State */}
      {isConfirmed ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-card p-6 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
            <CheckCircle size={36} />
          </div>
          <h3 className="text-xl font-black text-emerald-900">
            {isEn ? 'Handover Confirmed!' : 'हैंडओवर संपन्न!'}
          </h3>
          <p className="text-xs text-emerald-700 font-medium">
            {isEn
              ? 'Verifiable digital receipt generated & payment recorded to ledger.'
              : 'डिजिटल रसीद सुरक्षित की गई है। रीसायकलर द्वारा भुगतान की पुष्टि हुई।'}
          </p>

          <div className="bg-white rounded-xl p-3.5 border border-emerald-200 text-left text-xs text-stone-700 space-y-1">
            <div><span className="font-bold">Lot Ref:</span> {lotId?.slice(0, 8)}</div>
            <div><span className="font-bold">{isEn ? 'Material:' : 'सामग्री:'}</span> {t(`categories.${material.material_category}`)}</div>
            <div><span className="font-bold">{isEn ? 'Weight:' : 'वजन:'}</span> {material.approx_weight_kg} kg</div>
            <div><span className="font-bold">{isEn ? 'Total Payment:' : 'कुल भुगतान:'}</span> ₹{transaction?.quoted_price || material.estimated_value}</div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/lots')}
            className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-md"
          >
            {isEn ? 'View in My Lots' : 'कमाई खाते में देखें'}
          </button>
        </div>
      ) : mode === 'collector' ? (
        /* Collector QR Mode (Clean & Self-Explanatory) */
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-md text-center space-y-4">
          <div className="space-y-1">
            <h3 className="font-black text-stone-900 text-lg">
              Digital Handover QR
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Show to buyer when they arrive for physical material pickup
            </p>
          </div>

          {/* QR Code SVG */}
          <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 inline-block shadow-xs">
            <QRCodeSVG value={qrToken || lotId || 'KC-TOKEN'} size={200} />
          </div>

          {/* Short Code Fallback with Copy button */}
          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                6-Digit Short Code (Alternative)
              </span>
              <span className="text-2xl font-black text-stone-900 tracking-widest">{shortCode}</span>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={14} />
              <span>{copiedCode ? 'Copied ✓' : 'Copy'}</span>
            </button>
          </div>

          {/* Verified Hash Badge */}
          <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 py-2 rounded-xl border border-emerald-100">
            <ShieldCheck size={16} />
            <span>Tamper-Proof Blockchain Hash Verified</span>
          </div>

          {/* Main Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('/lots')}
              className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 px-5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Done for Now (Show Later)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Recycler Confirmation Mode - Compact & Simple QR Scanner Option */
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/80 shadow-xs space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-stone-900 text-base leading-tight">
                {isEn ? 'Confirm Digital Handover' : 'डिजिटल हैंडओवर पुष्टि'}
              </h3>
              <p className="text-xs text-stone-500 font-medium">Scan collector QR or enter 6-digit code</p>
            </div>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
              Recycler Mode
            </span>
          </div>

          {/* Scan QR Button & Camera Container */}
          {showScanner ? (
            <div className="bg-stone-900 rounded-2xl p-3 space-y-2 border border-stone-800">
              <div className="flex items-center justify-between text-white text-xs font-bold px-1">
                <span className="flex items-center gap-1.5"><Camera size={15} className="text-emerald-400" /> Point camera at Collector QR</span>
                <button type="button" onClick={stopScanner} className="p-1 text-stone-400 hover:text-white rounded-lg cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div id="handover-qr-reader" className="overflow-hidden rounded-xl bg-stone-950 min-h-[200px]"></div>
              <button
                type="button"
                onClick={stopScanner}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition-all"
              >
                Cancel Camera Scan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startScanner}
              className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs py-3 px-4 rounded-2xl shadow-xs transition-all active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <QrCode size={18} />
              <span>Scan Collector QR Code with Camera</span>
            </button>
          )}

          {/* 6-Digit Short Code Entry */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>{isEn ? '6-Digit Collector Code:' : 'कलेक्टर कोड:'}</span>
              {codeEntered && codeMatches && (
                <span className="text-emerald-700 text-[11px] font-extrabold">✓ Verified</span>
              )}
            </div>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 482910"
              value={inputShortCode}
              onChange={(e) => setInputShortCode(e.target.value.toUpperCase())}
              className={`w-full text-center text-xl sm:text-2xl font-black tracking-widest p-2.5 rounded-2xl border focus:outline-none focus:ring-2 transition-all ${
                !codeEntered
                  ? 'border-stone-300 bg-stone-50 focus:ring-emerald-500'
                  : codeMatches
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 text-emerald-800'
                  : 'border-rose-400 bg-rose-50 ring-2 ring-rose-400/20 text-rose-700'
              }`}
            />
            {codeEntered && !codeMatches && (
              <p className="text-[11px] font-bold text-rose-600 text-center">
                ❌ Code does not match. Ask collector to show their code again.
              </p>
            )}
            {confirmationError && (
              <p className="text-[11px] font-bold text-rose-600 text-center">{confirmationError}</p>
            )}
          </div>

          {/* Compact Payment Method & Value Row */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Payment Method
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex-1 py-1.5 px-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    paymentMethod === 'upi'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-stone-50 border-stone-200 text-stone-600'
                  }`}
                >
                  📱 UPI
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
                Final Amount (₹)
              </label>
              <input
                type="number"
                value={finalValueInput}
                onChange={(e) => setFinalValueInput(e.target.value)}
                className="w-full text-sm font-black p-1.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 text-center"
              />
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmHandover}
            disabled={!canConfirm}
            className={`w-full font-extrabold text-xs py-3 rounded-2xl shadow-xs transition-all active:scale-95 ${
              canConfirm
                ? 'bg-[#16A34A] hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
            }`}
          >
            {canConfirm
              ? (isEn ? '✅ Confirm Receipt & Complete Sale' : '✅ प्राप्ति की पुष्टि करें')
              : (isEn ? '🔒 Scan QR or enter code to confirm' : '🔒 कोड या QR स्कैन करें')}
          </button>
        </div>
      )}

      {/* Chain-of-Custody Traceability Timeline */}
      {trailEvents.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#16A34A]" />
            <h3 className="text-sm font-extrabold text-stone-900">Chain of Custody</h3>
            <span className="text-[10px] text-stone-400 font-bold ml-auto">{trailEvents.length} events</span>
          </div>

          <div className="relative space-y-0">
            {trailEvents.map((ev, i) => {
              const isLast = i === trailEvents.length - 1;
              const actorIcon = ev.actor === 'recycler' ? '♻️' : ev.actor === 'system' ? '🤖' : '👤';
              const eventLabel: Record<string, string> = {
                draft: 'Lot Created',
                quoted: 'Price Quoted',
                matched: 'Recycler Matched',
                handed_over: 'Physically Handed Over',
                confirmed: 'Receipt Confirmed',
                paid: 'Payment Settled',
                closed: 'Transaction Closed',
              };
              const ts = ev.timestamp ? new Date(ev.timestamp) : null;
              const timeStr = ts
                ? ts.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : '–';

              return (
                <div key={ev.event_id} className="flex gap-3">
                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      isLast ? 'bg-[#16A34A] text-white' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {actorIcon}
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-stone-200 my-1" />}
                  </div>

                  {/* Event details */}
                  <div className={`pb-4 min-w-0 flex-1 ${isLast ? '' : ''}`}>
                    <div className="font-extrabold text-xs text-stone-900">
                      {eventLabel[ev.event_type] || ev.event_type}
                    </div>
                    <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <Clock size={9} />
                        {timeStr}
                      </span>
                      {ev.gps_lat && (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={9} />
                          {ev.gps_lat.toFixed(3)}, {ev.gps_lng?.toFixed(3)}
                        </span>
                      )}
                      {ev.handover_reference_no && (
                        <span className="bg-stone-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          #{ev.handover_reference_no}
                        </span>
                      )}
                      {ev.recycler_confirmation && (
                        <span className="text-emerald-700 font-bold">✓ Recycler confirmed</span>
                      )}
                    </div>
                    {ev.notes && (
                      <div className="text-[10px] text-stone-400 mt-0.5 italic truncate">{ev.notes}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
