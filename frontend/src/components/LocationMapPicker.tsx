import React, { useState } from 'react';
import { MapPin, Search, Crosshair, Check, X } from 'lucide-react';
import { reverseGeocode } from '../utils/geoUtils';

interface LocationMapPickerProps {
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  onSelect: (location: { address: string; lat?: number; lng?: number }) => void;
  onClose: () => void;
}

const POPULAR_PUNE_PRESETS = [
  { name: 'Wakad, Pune', lat: 18.5987, lng: 73.7688 },
  { name: 'Pimpri-Chinchwad Hub', lat: 18.6298, lng: 73.7997 },
  { name: 'Swargate Central, Pune', lat: 18.5018, lng: 73.8636 },
  { name: 'Hadapsar Industrial Zone', lat: 18.5089, lng: 73.9260 },
  { name: 'Kothrud, Pune', lat: 18.5074, lng: 73.8077 },
];

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  initialAddress = '',
  initialLat = 18.5204,
  initialLng = 73.8567,
  onSelect,
  onClose,
}) => {
  const [addressInput, setAddressInput] = useState(initialAddress || 'Wakad, Pune');
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const cLat = pos.coords.latitude;
          const cLng = pos.coords.longitude;
          setLat(cLat);
          setLng(cLng);
          const addr = await reverseGeocode(cLat, cLng);
          setAddressInput(addr);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        },
        { timeout: 8000 }
      );
    }
  };

  const handleSelectPreset = async (preset: { name: string; lat: number; lng: number }) => {
    setAddressInput(preset.name);
    setLat(preset.lat);
    setLng(preset.lng);
  };

  const handleConfirm = () => {
    onSelect({
      address: addressInput.trim() || `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl border border-stone-200 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
              <MapPin size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">Pick Collection Location</h3>
              <p className="text-[11px] text-stone-500">Interactive Pin & Address Selector</p>
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

        {/* Search input bar */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-700">Enter Street Address / Area</label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Search area, landmark or street name..."
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20 focus:border-[#16A34A]"
            />
          </div>
        </div>

        {/* Live GPS button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Crosshair size={15} className={isLocating ? 'animate-spin' : ''} />
          <span>{isLocating ? 'Locating device...' : 'Use My Current GPS Location'}</span>
        </button>

        {/* Interactive Map Visual Preview container */}
        <div className="relative h-44 w-full bg-stone-100 border border-stone-200 rounded-2xl overflow-hidden shadow-inner group">
          {/* Static OSM map image tile centered on coords */}
          <img
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=14&size=400x200&maptype=mapnik`}
            alt="Interactive map location"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback SVG map background if offline tile failed
              (e.target as HTMLElement).style.display = 'none';
            }}
          />

          {/* Centered Map Pin overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex flex-col items-center animate-bounce">
              <div className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin size={18} />
              </div>
              <div className="w-2 h-2 rounded-full bg-black/40 blur-xs mt-0.5" />
            </div>
          </div>

          {/* Coordinates overlay pill */}
          <div className="absolute bottom-2 left-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded-lg">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
        </div>

        {/* Area Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Popular Pune Hub Presets</span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_PUNE_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                  addressInput.includes(p.name.split(',')[0])
                    ? 'border-[#16A34A] bg-emerald-600 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                📍 {p.name}
              </button>
            ))}
          </div>
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
            onClick={handleConfirm}
            className="flex-[2] py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Check size={16} />
            <span>Confirm Location</span>
          </button>
        </div>

      </div>
    </div>
  );
};
