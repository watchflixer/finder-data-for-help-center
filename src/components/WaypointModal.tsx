import React, { useState, useEffect } from 'react';
import { Waypoint, WaypointCategory, LatLngCoord } from '../types';
import { toDMS, formatDMSString } from '../utils/geo';
import { X, MapPin, Check } from 'lucide-react';

interface WaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  coord: LatLngCoord;
  initialName?: string;
  initialAddress?: string;
  onSave: (wp: Omit<Waypoint, 'id' | 'createdAt'>) => void;
}

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export const WaypointModal: React.FC<WaypointModalProps> = ({
  isOpen,
  onClose,
  coord,
  initialName,
  initialAddress,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WaypointCategory>('waypoint');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || `Waypoint (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`);
      setNotes('');
      setColor('#3b82f6');
      setCategory('waypoint');
    }
  }, [isOpen, coord, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || 'Untitled Waypoint',
      lat: coord.lat,
      lng: coord.lng,
      category,
      notes: notes.trim(),
      address: initialAddress || '',
      color,
    });
    onClose();
  };

  const dms = toDMS(coord.lat, coord.lng);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span>Save Location Point</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Coordinates Overview */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>DECIMAL DEGREES</span>
              <span className="text-sky-400 font-medium">WGS84</span>
            </div>
            <div className="text-slate-200 tabular-nums font-semibold">
              {coord.lat.toFixed(6)}°, {coord.lng.toFixed(6)}°
            </div>
            <div className="text-[11px] text-slate-500 truncate pt-0.5">
              {formatDMSString(dms)}
            </div>
            {initialAddress && (
              <div className="text-[11px] text-slate-400 font-sans truncate pt-1 border-t border-slate-800/80">
                📍 {initialAddress}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Waypoint Label / Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Survey Marker Alpha"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WaypointCategory)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            >
              <option value="waypoint">Waypoint</option>
              <option value="landmark">Landmark / POI</option>
              <option value="survey">Geodetic Survey</option>
              <option value="observation">Field Observation</option>
              <option value="personal">Personal Favorite</option>
            </select>
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Pin Marker Color</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Notes & Metadata (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add field notes, elevation details, or instructions..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
            >
              Save to Coordinates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
