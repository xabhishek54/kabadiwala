import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Check, X, Search, RefreshCw } from 'lucide-react';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number, address: string, locality: string) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat = 18.5204,
  initialLng = 73.8567,
  title = 'Select Exact Shop / Facility Location'
}) => {
  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [address, setAddress] = useState<string>('Kothrud, Pune, Maharashtra 411038');
  const [locality, setLocality] = useState<string>('Pune');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      reverseGeocode(initialLat, initialLng);
    }
  }, [isOpen, initialLat, initialLng]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        const display = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setAddress(display);
        const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.county || 'Pune';
        setLocality(city);
      }
    } catch (err) {
      console.warn('Reverse geocode error:', err);
      setAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)} (Pune District)`);
      setLocality('Pune');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentGPS = () => {
    if (!('geolocation' in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        reverseGeocode(newLat, newLng);
        setIsLocating(false);
      },
      (err) => {
        console.warn('GPS position error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const newLat = parseFloat(first.lat);
          const newLng = parseFloat(first.lon);
          setLat(newLat);
          setLng(newLng);
          setAddress(first.display_name);
          setLocality(first.display_name.split(',')[0]);
        }
      }
    } catch (err) {
      console.warn('Search geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation(lat, lng, address, locality);
    onClose();
  };

  if (!isOpen) return null;

  // OpenStreetMap Tile URL bounding box for embed
  const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-3 p-5 border border-stone-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
              <MapPin size={18} />
            </div>
            <h3 className="font-extrabold text-stone-900 text-sm">{title}</h3>
          </div>

          <button type="button" onClick={onClose} className="p-1 rounded-full text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>

        {/* Address Search Bar */}
        <form onSubmit={handleSearchAddress} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search area, road, or shop address..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-xl border border-stone-200 bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            />
          </div>
          <button
            type="submit"
            className="bg-stone-900 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl hover:bg-stone-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Live OpenStreetMap Tile View */}
        <div className="relative rounded-2xl overflow-hidden border border-stone-200 h-56 bg-stone-100 shadow-inner">
          <iframe
            title="OpenStreetMap Location Picker"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={osmEmbedUrl}
            className="w-full h-full"
          />

          {/* Map Pin Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="flex flex-col items-center -mt-6">
              <div className="bg-[#16A34A] text-white p-2 rounded-full shadow-lg border-2 border-white animate-bounce">
                <MapPin size={22} className="fill-white text-[#16A34A]" />
              </div>
              <div className="w-3 h-1.5 bg-black/40 rounded-full blur-[2px]" />
            </div>
          </div>

          {/* Use Current GPS Button */}
          <button
            type="button"
            onClick={handleGetCurrentGPS}
            disabled={isLocating}
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-stone-900 font-extrabold text-xs px-3 py-2 rounded-full shadow-lg border border-stone-200 flex items-center gap-1.5 hover:bg-white transition-all active:scale-95"
          >
            <Navigation size={14} className={isLocating ? 'animate-spin text-[#16A34A]' : 'text-[#16A34A]'} />
            <span>{isLocating ? 'Locating...' : 'Use My GPS Location'}</span>
          </button>
        </div>

        {/* Selected Coordinates & Geocoded Address Card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-900">
            <span>Selected Shop / Facility Address:</span>
            <span className="font-mono text-[10px] text-emerald-700 font-bold">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
          </div>

          <div className="text-xs font-bold text-stone-800 truncate">
            {isGeocoding ? (
              <span className="flex items-center gap-1 text-stone-500 italic">
                <RefreshCw size={12} className="animate-spin" /> Fetching address name...
              </span>
            ) : (
              address
            )}
          </div>
        </div>

        {/* Confirm Action */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[#16A34A] hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl shadow-md text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Check size={16} />
          <span>Confirm Exact Location</span>
        </button>

      </div>
    </div>
  );
};
