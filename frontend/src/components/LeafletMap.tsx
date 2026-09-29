/**
 * LeafletMap — shared interactive map component using react-leaflet + OSM tiles.
 *
 * Usage:
 *   <LeafletMap lat={18.52} lng={73.85} height="h-56" />
 *
 * Props:
 *   lat / lng       — centre & marker position (required)
 *   height          — Tailwind height class, default "h-56"
 *   interactive     — if false, panning/zooming disabled (display-only mode)
 *   onLocationChange — called when user drags the marker (interactive only)
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix leaflet's missing default icon paths (a known Vite/Webpack issue) ────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom green pin icon to match app design
const greenIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path fill="#16A34A" stroke="#fff" stroke-width="1.5" d="M12 0C5.373 0 0 5.373 0 12c0 8.333 12 24 12 24S24 20.333 24 12C24 5.373 18.627 0 12 0z"/>
      <circle cx="12" cy="12" r="5" fill="white"/>
    </svg>`),
  iconSize: [24, 36],
  iconAnchor: [12, 36],
  popupAnchor: [0, -36],
  shadowUrl: markerShadow,
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});

/** Keeps the map centred when lat/lng props change */
function RecenterView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

/** Draggable marker that fires onLocationChange on drag-end */
function DraggableMarker({
  lat,
  lng,
  onLocationChange,
}: {
  lat: number;
  lng: number;
  onLocationChange?: (lat: number, lng: number) => void;
}) {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onLocationChange) {
          const { lat: newLat, lng: newLng } = marker.getLatLng();
          onLocationChange(newLat, newLng);
        }
      },
    }),
    [onLocationChange]
  );

  return (
    <Marker
      draggable={!!onLocationChange}
      eventHandlers={eventHandlers}
      position={[lat, lng]}
      icon={greenIcon}
      ref={markerRef}
    />
  );
}

export interface LeafletMapProps {
  lat: number;
  lng: number;
  /** Tailwind height utility class, e.g. "h-44", "h-56", "h-64" */
  height?: string;
  /** When false, disables all interaction (scroll, drag, click). Default true. */
  interactive?: boolean;
  /** Called with new coordinates when user drags the pin (only if interactive=true) */
  onLocationChange?: (lat: number, lng: number) => void;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  lat,
  lng,
  height = 'h-56',
  interactive = true,
  onLocationChange,
  className = '',
}) => {
  const centre: LatLngExpression = [lat, lng];

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-stone-200 shadow-inner ${className}`}>
      <MapContainer
        center={centre}
        zoom={14}
        scrollWheelZoom={interactive}
        zoomControl={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        keyboard={interactive}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <DraggableMarker lat={lat} lng={lng} onLocationChange={interactive ? onLocationChange : undefined} />
        <RecenterView lat={lat} lng={lng} />
      </MapContainer>

      {/* Subtle OSM attribution pill */}
      <div className="absolute bottom-1 right-1 z-[1000] bg-white/80 text-[9px] text-stone-500 px-1.5 py-0.5 rounded-md pointer-events-none">
        © OpenStreetMap
      </div>
    </div>
  );
};
