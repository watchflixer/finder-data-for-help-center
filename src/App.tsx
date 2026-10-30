import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Copy, Check } from 'lucide-react';

// Bounding box for Rizal region (generous so widescreen displays fill 100% edge-to-edge without black bars)
const RIZAL_BOUNDS = L.latLngBounds(
  [14.15, 120.85], // South-West
  [15.05, 121.75]  // North-East
);

const RIZAL_CENTER = {
  lat: 14.587295,
  lng: 121.176378, // Antipolo, Rizal
};

export default function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Selected Latitude and Longitude in Rizal
  const [lat, setLat] = useState<number>(RIZAL_CENTER.lat);
  const [lng, setLng] = useState<number>(RIZAL_CENTER.lng);
  const [cursorLat, setCursorLat] = useState<number | null>(null);
  const [cursorLng, setCursorLng] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Custom Leaflet pin icon
  const createPinIcon = () => {
    return L.divIcon({
      className: 'custom-leaflet-pin',
      html: `
        <div style="transform: translate(-50%, -100%); cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="34" height="42">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 14.2 23.2 14.8 23.7a1.6 1.6 0 0 0 2.4 0C17.8 39.2 32 26.5 32 16 32 7.163 24.837 0 16 0z" fill="#0284c7"/>
            <circle cx="16" cy="15" r="6" fill="#ffffff" />
            <circle cx="16" cy="15" r="3" fill="#0284c7" />
          </svg>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
      popupAnchor: [0, -38],
    });
  };

  // Update marker position
  const updateMarker = useCallback((targetLat: number, targetLng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([targetLat, targetLng]);
    } else {
      const marker = L.marker([targetLat, targetLng], {
        icon: createPinIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('dragend', (e: L.LeafletEvent) => {
        const pos = (e.target as L.Marker).getLatLng();
        const newLat = Number(pos.lat.toFixed(6));
        const newLng = Number(pos.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        updateMarker(newLat, newLng);
      });

      markerRef.current = marker;
    }
  }, []);

  // Initialize Map locked and centered on Rizal Province
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [RIZAL_CENTER.lat, RIZAL_CENTER.lng],
      zoom: 11,
      minZoom: 10,
      maxZoom: 19,
      maxBounds: RIZAL_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: true,
    });

    // Standard OpenStreetMap tile layer - loads full screen tiles without black edge bars
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Initial center on Rizal
    map.setView([RIZAL_CENTER.lat, RIZAL_CENTER.lng], 11);

    // Ensure Leaflet calculates the full viewport width and height immediately
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Track mouse coordinates live
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorLat(Number(e.latlng.lat.toFixed(6)));
      setCursorLng(Number(e.latlng.lng.toFixed(6)));
    });

    map.on('mouseout', () => {
      setCursorLat(null);
      setCursorLng(null);
    });

    // Click anywhere in Rizal to set Latitude & Longitude
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = Number(e.latlng.lat.toFixed(6));
      const clickLng = Number(e.latlng.lng.toFixed(6));
      setLat(clickLat);
      setLng(clickLng);
      updateMarker(clickLat, clickLng);
    });

    mapInstanceRef.current = map;
    updateMarker(RIZAL_CENTER.lat, RIZAL_CENTER.lng);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [updateMarker]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden select-none bg-slate-900 m-0 p-0">
      {/* 100% Fullscreen Leaflet Map Locked to Rizal */}
      <div ref={mapContainerRef} className="fixed inset-0 w-full h-full z-0 m-0 p-0" />

      {/* Clean Bottom Coordinates Bar */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400">Lat: </span>
              <span className="font-bold text-sky-400 text-sm">{lat.toFixed(6)}°</span>
            </div>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-slate-400">Lng: </span>
              <span className="font-bold text-sky-400 text-sm">{lng.toFixed(6)}°</span>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs font-sans"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Cursor Coordinate Indicator */}
      {cursorLat !== null && cursorLng !== null && (
        <div className="absolute bottom-4 right-16 z-[1000] pointer-events-none hidden sm:block">
          <div className="bg-slate-900/85 backdrop-blur-xs text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono tabular-nums shadow-md">
            Cursor: {cursorLat.toFixed(6)}°, {cursorLng.toFixed(6)}°
          </div>
        </div>
      )}
    </div>
  );
}
