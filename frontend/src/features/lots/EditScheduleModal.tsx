import React, { useState } from 'react';
import { db } from '../../data/local/db';
import { Calendar, MapPin, Edit3, Check, X } from 'lucide-react';
import { LocationMapPicker } from '../../components/LocationMapPicker';

interface EditScheduleModalProps {
  lotId: string;
  initialDate?: string;
  initialExactTime?: string;
  initialWindow?: 'morning' | 'afternoon' | 'evening';
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  initialNotes?: string;
  recyclerId?: string;
  recyclerName?: string;
  onSaveSuccess: () => void;
  onClose: () => void;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  lotId,
  initialDate = new Date().toISOString().split('T')[0],
  initialExactTime = '14:30',
  initialWindow = 'afternoon',
  initialAddress = 'Wakad, Pune',
  initialLat = 18.5204,
  initialLng = 73.8567,
  initialNotes = '',
  recyclerId,
  recyclerName,
  onSaveSuccess,
  onClose,
}) => {
  const [pickupDate, setPickupDate] = useState<string>(initialDate);
  const [exactTime, setExactTime] = useState<string>(initialExactTime);
  const [pickupWindow, setPickupWindow] = useState<'morning' | 'afternoon' | 'evening'>(initialWindow);
  const [address, setAddress] = useState<string>(initialAddress);
  const [lat, setLat] = useState<number | undefined>(initialLat);
  const [lng, setLng] = useState<number | undefined>(initialLng);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    const nowIso = new Date().toISOString();

    // 1. Update local IndexedDB transaction
    await db.transactions.update(lotId, {
      pickup_scheduled_date: pickupDate,
      pickup_exact_time: exactTime,
      pickup_window: pickupWindow,
      pickup_notes: notes,
      collection_address: address,
      collection_lat: lat,
      collection_lng: lng,
      updated_at: nowIso,
    } as any);

    // 2. Update local IndexedDB material collection address
    await db.materials.update(lotId, {
      collection_address: address,
      collection_lat: lat,
      collection_lng: lng,
    } as any);

    // 3. Create notification for the recycler
    const targetRecyclerId = recyclerId || 'rec-pune-001';
    await db.notifications.add({
      recipient_id: targetRecyclerId,
      title: `🗓️ Pickup Schedule Updated`,
      message: `Collector updated pickup for Lot ${lotId.slice(0, 8)} to ${pickupDate} @ ${exactTime} at ${address}`,
      type: 'schedule_updated',
      lot_id: lotId,
      read: false,
      created_at: nowIso,
    });

    // 4. Queue in sync outbox
    await db.syncOutbox.add({
      client_uuid: lotId,
      entity_type: 'transaction',
      action: 'upsert',
      payload: {
        lot_id: lotId,
        pickup_scheduled_date: pickupDate,
        pickup_exact_time: exactTime,
        pickup_window: pickupWindow,
        pickup_notes: notes,
        collection_address: address,
        collection_lat: lat,
        collection_lng: lng,
      },
      created_at: nowIso,
      synced: false,
    });

    setIsSaving(false);
    onSaveSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border border-stone-200 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto font-sans text-stone-900">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">Edit Pickup & Location</h3>
              <p className="text-[11px] text-stone-500">Update schedule and location details anytime</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {recyclerName && (
          <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-2.5 text-xs flex items-center justify-between">
            <span className="text-stone-500 font-medium">Assigned Recycler:</span>
            <strong className="text-stone-900 font-bold">{recyclerName}</strong>
          </div>
        )}

        {/* Date & Time Picker */}
        <div className="space-y-3">
          <label className="block text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
            <Calendar size={14} className="text-[#16A34A]" />
            Set Exact Pickup Date & Time
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Date</span>
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Exact Time</span>
              <input
                type="time"
                value={exactTime}
                onChange={(e) => setExactTime(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
              />
            </div>
          </div>

          {/* Time Window Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { key: 'morning', label: 'Morning', time: '9am–12pm' },
              { key: 'afternoon', label: 'Afternoon', time: '12pm–4pm' },
              { key: 'evening', label: 'Evening', time: '4pm–7pm' },
            ].map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => {
                  setPickupWindow(w.key as any);
                  if (w.key === 'morning') setExactTime('09:30');
                  else if (w.key === 'afternoon') setExactTime('14:30');
                  else if (w.key === 'evening') setExactTime('17:30');
                }}
                className={`py-2 px-2 rounded-xl text-center border transition-all ${
                  pickupWindow === w.key
                    ? 'border-[#16A34A] bg-emerald-50 text-[#16A34A] ring-1 ring-[#16A34A]'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="text-[11px] font-bold">{w.label}</div>
                <div className="text-[9px] opacity-75">{w.time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Collection Address Selector */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-extrabold text-stone-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} className="text-[#16A34A]" />
              Collection Address & Map Pin
            </span>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="text-[11px] font-bold text-[#16A34A] hover:underline"
            >
              📍 Open Map Picker
            </button>
          </label>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-900 truncate">{address}</span>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="px-2.5 py-1 bg-white border border-stone-200 rounded-xl text-[10px] font-bold text-stone-700 hover:bg-stone-100 shrink-0"
            >
              Change
            </button>
          </div>
        </div>

        {/* Pickup Notes */}
        <div className="space-y-1 pt-1">
          <span className="block text-xs font-bold text-stone-700">Special Instructions / Gate Notes</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Call before coming, gate #2 near main landmark"
            className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
          />
        </div>

        {/* Action CTAs */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-stone-200 font-bold text-stone-700 hover:bg-stone-50 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={16} />
                <span>Save Changes & Notify</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <LocationMapPicker
          initialAddress={address}
          initialLat={lat}
          initialLng={lng}
          onSelect={(loc) => {
            setAddress(loc.address);
            if (loc.lat) setLat(loc.lat);
            if (loc.lng) setLng(loc.lng);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
};
