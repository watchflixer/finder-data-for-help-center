import React, { useState } from 'react';
import { MapMode, BaseLayerType } from '../types';
import { MAP_BASE_LAYERS } from '../utils/mapLayers';
import {
  MousePointer,
  MapPin,
  Ruler,
  Hexagon,
  CircleDot,
  Layers,
  RotateCcw,
  Maximize2,
  Trash2,
  ChevronDown,
} from 'lucide-react';

interface MapToolbarProps {
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;
  baseLayer: BaseLayerType;
  setBaseLayer: (layer: BaseLayerType) => void;
  onResetView: () => void;
  onClearMeasurements: () => void;
  hasMeasurements: boolean;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  mapMode,
  setMapMode,
  baseLayer,
  setBaseLayer,
  onResetView,
  onClearMeasurements,
  hasMeasurements,
}) => {
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  const tools: { id: MapMode; label: string; icon: React.ReactNode; tooltip: string }[] = [
    {
      id: 'explore',
      label: 'Inspect',
      icon: <MousePointer className="w-4 h-4" />,
      tooltip: 'Explore and click any point to view coordinates & reverse address',
    },
    {
      id: 'drop_pin',
      label: 'Pin Drop',
      icon: <MapPin className="w-4 h-4" />,
      tooltip: 'Click anywhere to drop and save a waypoint coordinate',
    },
    {
      id: 'measure_distance',
      label: 'Distance',
      icon: <Ruler className="w-4 h-4" />,
      tooltip: 'Click multiple points to measure distance & bearing',
    },
    {
      id: 'measure_area',
      label: 'Area',
      icon: <Hexagon className="w-4 h-4" />,
      tooltip: 'Click 3+ points to calculate polygon surface area',
    },
    {
      id: 'radius_circle',
      label: 'Radius',
      icon: <CircleDot className="w-4 h-4" />,
      tooltip: 'Click a center point to measure proximity circle',
    },
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2 pointer-events-auto">
      {/* Primary Tool Mode Dock */}
      <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1">
        {tools.map((tool) => {
          const isActive = mapMode === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => setMapMode(tool.id)}
              title={tool.tooltip}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tool.icon}
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          );
        })}

        {hasMeasurements && (
          <button
            onClick={onClearMeasurements}
            title="Clear active distance / area measurement"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors ml-1 border-l border-slate-700/80"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Layer Switcher & Quick Map Actions */}
      <div className="flex items-center gap-2">
        {/* Layer Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            title="Change map style layer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:border-slate-600 transition-colors shadow-lg"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="capitalize">{baseLayer} Layer</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50">
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Tile Layers
              </div>
              {MAP_BASE_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => {
                    setBaseLayer(layer.id);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                    baseLayer === layer.id
                      ? 'bg-sky-600/20 text-sky-400 font-semibold border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{layer.name}</span>
                  {baseLayer === layer.id && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset View Button */}
        <button
          onClick={onResetView}
          title="Reset to default global view"
          className="p-2 bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 transition-colors shadow-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
