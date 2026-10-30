import React, { useState } from 'react';
import { LatLngCoord } from '../types';
import { toDMS, formatDMSString, toUTM } from '../utils/geo';
import { Copy, Check, Crosshair, ZoomIn, Globe } from 'lucide-react';

interface CoordinatesHUDProps {
  cursorCoord: LatLngCoord | null;
  centerCoord: LatLngCoord;
  zoomLevel: number;
}

export const CoordinatesHUD: React.FC<CoordinatesHUDProps> = ({
  cursorCoord,
  centerCoord,
  zoomLevel,
}) => {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<'DD' | 'DMS' | 'UTM'>('DD');

  // If cursor is off map, fallback to center point
  const activeCoord = cursorCoord || centerCoord;

  const getFormattedCoord = (coord: LatLngCoord) => {
    if (format === 'DD') {
      const latDir = coord.lat >= 0 ? 'N' : 'S';
      const lngDir = coord.lng >= 0 ? 'E' : 'W';
      return `${Math.abs(coord.lat).toFixed(6)}° ${latDir}, ${Math.abs(coord.lng).toFixed(6)}° ${lngDir}`;
    }
    if (format === 'DMS') {
      const dms = toDMS(coord.lat, coord.lng);
      return formatDMSString(dms);
    }
    if (format === 'UTM') {
      const utm = toUTM(coord.lat, coord.lng);
      return `Zone ${utm.zone} · E ${utm.easting} · N ${utm.northing}`;
    }
    return '';
  };

  const handleCopy = () => {
    const textToCopy =
      format === 'DD'
        ? `${activeCoord.lat.toFixed(6)}, ${activeCoord.lng.toFixed(6)}`
        : getFormattedCoord(activeCoord);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] max-w-[94vw] sm:max-w-max pointer-events-auto">
      <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-xl flex items-center flex-wrap gap-2.5 sm:gap-4 text-xs text-slate-200">
        {/* Live Coordinate Display */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-sky-400 font-mono font-medium">
            <Crosshair className="w-3.5 h-3.5 shrink-0 animate-pulse text-sky-400" />
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-sans font-medium">
              {cursorCoord ? 'Cursor' : 'Center'}:
            </span>
            <span className="font-mono tabular-nums text-slate-100 font-semibold tracking-tight text-xs sm:text-sm">
              {getFormattedCoord(activeCoord)}
            </span>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy coordinates to clipboard"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            {copied ? (
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                <Check className="w-3.5 h-3.5" />
                Copied
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-4 bg-slate-700" />

        {/* Format Selector Pills (Interactive control buttons) */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
          {(['DD', 'DMS', 'UTM'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                format === fmt
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="hidden sm:block w-px h-4 bg-slate-700" />

        {/* Zoom Level Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono tabular-nums text-[11px]">
          <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
          <span>Zoom: {zoomLevel}</span>
        </div>
      </div>
    </div>
  );
};
