import React, { useState } from 'react';
import { LatLngCoord, Waypoint, MapMode, GeocodeResult, WaypointCategory } from '../types';
import {
  toDMS,
  formatDMSString,
  toDDM,
  toUTM,
  dmsToDecimal,
  parseCoordinateString,
  formatDistanceUnits,
  formatAreaUnits,
  LANDMARK_PRESETS,
} from '../utils/geo';
import { searchPlaces } from '../services/nominatim';
import {
  Search,
  Navigation2,
  Maximize2,
  Copy,
  Check,
  MapPin,
  Trash2,
  Download,
  Upload,
  Ruler,
  Hexagon,
  Sparkles,
  ChevronRight,
  X,
  Compass,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'search' | 'converter' | 'measure' | 'waypoints';
  setActiveTab: (tab: 'search' | 'converter' | 'measure' | 'waypoints') => void;
  onJumpToCoord: (coord: LatLngCoord, zoom?: number, label?: string) => void;
  waypoints: Waypoint[];
  onSelectWaypoint: (wp: Waypoint) => void;
  onDeleteWaypoint: (id: string) => void;
  onImportWaypoints: (imported: Waypoint[]) => void;
  mapMode: MapMode;
  setMapMode: (mode: MapMode) => void;
  measurePoints: LatLngCoord[];
  measureDistanceMeters: number;
  measureAreaSqMeters: number;
  measureBearing?: { degrees: number; compass: string };
  onClearMeasurements: () => void;
  currentInspectedCoord: LatLngCoord | null;
  onSaveCurrentCoordAsWaypoint: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onJumpToCoord,
  waypoints,
  onSelectWaypoint,
  onDeleteWaypoint,
  onImportWaypoints,
  mapMode,
  setMapMode,
  measurePoints,
  measureDistanceMeters,
  measureAreaSqMeters,
  measureBearing,
  onClearMeasurements,
  currentInspectedCoord,
  onSaveCurrentCoordAsWaypoint,
}) => {
  // Jump & Search state
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [singleCoordInput, setSingleCoordInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  // Address search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Converter state
  const [convLat, setConvLat] = useState<number>(14.599512);
  const [convLng, setConvLng] = useState<number>(120.984222);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Waypoints filter
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [waypointSearch, setWaypointSearch] = useState('');

  // Handle direct Lat/Lng form jump
  const handleJumpDirect = (e: React.FormEvent) => {
    e.preventDefault();
    setCoordError(null);

    // If single unified input was filled:
    if (singleCoordInput.trim()) {
      const parsed = parseCoordinateString(singleCoordInput);
      if (parsed) {
        onJumpToCoord(parsed, 15, `Target: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`);
        return;
      }
      setCoordError('Invalid coordinate string. Example: 14.5995, 120.9842 or DMS format');
      return;
    }

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCoordError('Latitude must be a valid number between -90 and 90');
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setCoordError('Longitude must be a valid number between -180 and 180');
      return;
    }

    onJumpToCoord({ lat, lng }, 15, `Coordinate: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  // Handle Nominatim address search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const results = await searchPlaces(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleCopyText = (text: string, formatId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatId);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Export GeoJSON
  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: waypoints.map((wp) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [wp.lng, wp.lat],
        },
        properties: {
          id: wp.id,
          name: wp.name,
          category: wp.category,
          notes: wp.notes || '',
          address: wp.address || '',
          createdAt: wp.createdAt,
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geopoint_coordinates_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Latitude', 'Longitude', 'Category', 'Notes', 'Address'];
    const rows = waypoints.map((wp) => [
      `"${wp.name.replace(/"/g, '""')}"`,
      wp.lat.toFixed(6),
      wp.lng.toFixed(6),
      wp.category,
      `"${(wp.notes || '').replace(/"/g, '""')}"`,
      `"${(wp.address || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geopoint_coordinates_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.geojson') || file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const features = parsed.features || (parsed.type === 'Feature' ? [parsed] : []);
          const imported: Waypoint[] = features.map((f: any, idx: number) => ({
            id: `imported-${Date.now()}-${idx}`,
            name: f.properties?.name || f.properties?.title || `Point ${idx + 1}`,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            category: (f.properties?.category as WaypointCategory) || 'waypoint',
            notes: f.properties?.notes || f.properties?.description || '',
            address: f.properties?.address || '',
            color: '#38bdf8',
            createdAt: Date.now(),
          }));
          onImportWaypoints(imported);
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const imported: Waypoint[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 3) {
              const name = cols[0];
              const lat = parseFloat(cols[1]);
              const lng = parseFloat(cols[2]);
              if (!isNaN(lat) && !isNaN(lng)) {
                imported.push({
                  id: `imported-csv-${Date.now()}-${i}`,
                  name,
                  lat,
                  lng,
                  category: (cols[3] as WaypointCategory) || 'waypoint',
                  notes: cols[4] || '',
                  address: cols[5] || '',
                  color: '#38bdf8',
                  createdAt: Date.now(),
                });
              }
            }
          }
          onImportWaypoints(imported);
        }
      } catch (err) {
        alert('Failed to parse file. Please upload valid GeoJSON or CSV with columns: Name, Latitude, Longitude');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredWaypoints = waypoints.filter((wp) => {
    const matchesCategory = categoryFilter === 'all' || wp.category === categoryFilter;
    const matchesSearch =
      wp.name.toLowerCase().includes(waypointSearch.toLowerCase()) ||
      (wp.notes && wp.notes.toLowerCase().includes(waypointSearch.toLowerCase())) ||
      (wp.address && wp.address.toLowerCase().includes(waypointSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <aside className="fixed md:static inset-y-14 left-0 w-full sm:w-[380px] md:w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-2xl overflow-hidden">
      {/* Drawer Header with Tabs */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950/80 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'search'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Jump & Search
          </button>
          <button
            onClick={() => setActiveTab('converter')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'converter'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Converter
          </button>
          <button
            onClick={() => setActiveTab('measure')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'measure'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Measure
          </button>
          <button
            onClick={() => setActiveTab('waypoints')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'waypoints'
                ? 'bg-slate-800 text-sky-400 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Points ({waypoints.length})
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors ml-2"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* TAB 1: JUMP & SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Coordinate Jump Form */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Jump to Coordinates</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter exact Latitude and Longitude to fly directly to any spot on Earth.
                </p>
              </div>

              <form onSubmit={handleJumpDirect} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Latitude (-90 to 90)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-90"
                      max="90"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      placeholder="e.g. 14.599512"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Longitude (-180 to 180)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="-180"
                      max="180"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      placeholder="e.g. 120.984222"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 text-center font-medium">— OR PASTE FORMATTED STRING —</div>

                <div>
                  <input
                    type="text"
                    value={singleCoordInput}
                    onChange={(e) => setSingleCoordInput(e.target.value)}
                    placeholder="e.g. 14.5995, 120.9842 or 14°35'58&quot;N 120°59'3&quot;E"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {coordError && (
                  <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-900/50 p-2 rounded-lg">
                    {coordError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Navigation2 className="w-3.5 h-3.5" />
                  Jump to Coordinates
                </button>
              </form>
            </div>

            <div className="w-full h-px bg-slate-800" />

            {/* Place / Address Search */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Search Address or Place</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Find cities, landmarks, or streets worldwide via OpenStreetMap.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Manila, Philippines or Mount Fuji..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-16 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {isSearching ? 'Finding...' : 'Find'}
                </button>
              </form>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {searchResults.map((res) => (
                    <button
                      key={res.placeId}
                      onClick={() => onJumpToCoord({ lat: res.lat, lng: res.lng }, 15, res.name)}
                      className="w-full text-left p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 transition-colors flex items-start gap-2 text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <div className="truncate">
                        <div className="font-medium text-slate-200 truncate">{res.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{res.displayName}</div>
                        <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                          {res.lat.toFixed(5)}°, {res.lng.toFixed(5)}°
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full h-px bg-slate-800" />

            {/* Curated Landmark Quick Jumps */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Popular Landmarks
                </h4>
                <span className="text-[11px] text-slate-500">Click to explore</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {LANDMARK_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => onJumpToCoord({ lat: preset.lat, lng: preset.lng }, 14, preset.name)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 hover:bg-slate-800 border border-slate-800/60 transition-colors text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.color }} />
                      <span className="text-slate-200 group-hover:text-sky-300 font-medium truncate">
                        {preset.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0 ml-2">
                      {preset.lat.toFixed(2)}°, {preset.lng.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COORDINATE CONVERTER */}
        {activeTab === 'converter' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Geospatial Coordinate Converter</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Convert smoothly between Decimal Degrees, DMS, DDM, UTM, and GeoJSON formats.
              </p>
            </div>

            {/* Converter Inputs */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300">Base Coordinates (DD)</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={convLat}
                    onChange={(e) => setConvLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={convLng}
                    onChange={(e) => setConvLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {currentInspectedCoord && (
                <button
                  onClick={() => {
                    setConvLat(Number(currentInspectedCoord.lat.toFixed(6)));
                    setConvLng(Number(currentInspectedCoord.lng.toFixed(6)));
                  }}
                  className="w-full py-1 text-[11px] text-sky-400 hover:text-sky-300 bg-sky-950/40 rounded border border-sky-800/40 transition-colors"
                >
                  Use Currently Inspected Map Point ({currentInspectedCoord.lat.toFixed(4)}°, {currentInspectedCoord.lng.toFixed(4)}°)
                </button>
              )}
            </div>

            {/* Converted Formats List */}
            <div className="space-y-2.5">
              {/* Decimal Degrees */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>DECIMAL DEGREES (DD)</span>
                  <button
                    onClick={() => handleCopyText(`${convLat.toFixed(6)}, ${convLng.toFixed(6)}`, 'dd')}
                    className="hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    {copiedFormat === 'dd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFormat === 'dd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-sky-300 font-medium tabular-nums">
                  {convLat.toFixed(6)}, {convLng.toFixed(6)}
                </div>
              </div>

              {/* DMS */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>DEGREES MINUTES SECONDS (DMS)</span>
                  <button
                    onClick={() => handleCopyText(formatDMSString(toDMS(convLat, convLng)), 'dms')}
                    className="hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    {copiedFormat === 'dms' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFormat === 'dms' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-sky-300 font-medium tabular-nums">
                  {formatDMSString(toDMS(convLat, convLng))}
                </div>
              </div>

              {/* DDM */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>DEGREES DECIMAL MINUTES (DDM)</span>
                  <button
                    onClick={() => handleCopyText(toDDM(convLat, convLng), 'ddm')}
                    className="hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    {copiedFormat === 'ddm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFormat === 'ddm' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-sky-300 font-medium tabular-nums">
                  {toDDM(convLat, convLng)}
                </div>
              </div>

              {/* UTM */}
              {(() => {
                const utm = toUTM(convLat, convLng);
                const utmStr = `Zone ${utm.zone} · Easting ${utm.easting} · Northing ${utm.northing}`;
                return (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>UTM COORDINATES (WGS84)</span>
                      <button
                        onClick={() => handleCopyText(utmStr, 'utm')}
                        className="hover:text-slate-200 transition-colors flex items-center gap-1"
                      >
                        {copiedFormat === 'utm' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedFormat === 'utm' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-xs font-mono text-sky-300 font-medium tabular-nums">
                      {utmStr}
                    </div>
                  </div>
                );
              })()}

              {/* GeoJSON Array [lng, lat] */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>GEOJSON FORMAT [LNG, LAT]</span>
                  <button
                    onClick={() => handleCopyText(`[${convLng.toFixed(6)}, ${convLat.toFixed(6)}]`, 'geojson')}
                    className="hover:text-slate-200 transition-colors flex items-center gap-1"
                  >
                    {copiedFormat === 'geojson' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFormat === 'geojson' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-xs font-mono text-sky-300 font-medium tabular-nums">
                  [{convLng.toFixed(6)}, {convLat.toFixed(6)}]
                </div>
              </div>
            </div>

            <button
              onClick={() => onJumpToCoord({ lat: convLat, lng: convLng }, 15, `Converted: ${convLat.toFixed(4)}, ${convLng.toFixed(4)}`)}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Navigation2 className="w-3.5 h-3.5" />
              Plot & Center on Map
            </button>
          </div>
        )}

        {/* TAB 3: MEASURE DISTANCE & AREA */}
        {activeTab === 'measure' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">GIS Measurement Tools</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click points on the Leaflet map to calculate geodesic distance, bearing, and polygon area.
              </p>
            </div>

            {/* Measurement Mode Selector Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMapMode('measure_distance')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  mapMode === 'measure_distance'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                Distance Ruler
              </button>
              <button
                onClick={() => setMapMode('measure_area')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                  mapMode === 'measure_area'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-400'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Hexagon className="w-3.5 h-3.5" />
                Area Polygon
              </button>
            </div>

            {/* Measurement Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  {mapMode === 'measure_area' ? 'Polygon Area Metrics' : 'Distance Measurement'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {measurePoints.length} Point{measurePoints.length === 1 ? '' : 's'} placed
                </span>
              </div>

              {measurePoints.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Click anywhere on the map to place your first measurement vertex.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Distance Units Display */}
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400 font-mono">TOTAL DISTANCE</div>
                    {(() => {
                      const dist = formatDistanceUnits(measureDistanceMeters);
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                          <div className="bg-slate-900 p-2 rounded border border-slate-800 text-sky-400 font-semibold text-sm">
                            {dist.kilometers}
                          </div>
                          <div className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                            {dist.miles}
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                            {dist.meters}
                          </div>
                          <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                            {dist.nauticalMiles}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bearing Heading */}
                  {measureBearing && (
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-sky-400" />
                        Bearing / Direction:
                      </span>
                      <span className="font-mono font-medium text-slate-200">
                        {measureBearing.degrees}° ({measureBearing.compass})
                      </span>
                    </div>
                  )}

                  {/* Area Units Display */}
                  {mapMode === 'measure_area' && measurePoints.length >= 3 && (
                    <div className="space-y-1 pt-1 border-t border-slate-800">
                      <div className="text-[11px] text-slate-400 font-mono">ENCLOSED SURFACE AREA</div>
                      {(() => {
                        const area = formatAreaUnits(measureAreaSqMeters);
                        return (
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-emerald-400 font-semibold text-sm">
                              {area.sqKm}
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800 text-slate-200">
                              {area.hectares}
                            </div>
                            <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                              {area.acres}
                            </div>
                            <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                              {area.sqMeters}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Clear Button */}
                  <button
                    onClick={onClearMeasurements}
                    className="w-full py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 rounded-lg border border-rose-900/50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset Measurement Points
                  </button>
                </div>
              )}
            </div>

            {/* Instruction Tip */}
            <div className="text-xs text-slate-500 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              💡 <span className="text-slate-400 font-medium">Tip:</span> In distance mode, click continuously to add waypoints along a route. In area mode, placing 3 or more points will draw an enclosed geodesic polygon with live area calculation.
            </div>
          </div>
        )}

        {/* TAB 4: SAVED WAYPOINTS & EXPORT */}
        {activeTab === 'waypoints' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">Saved Waypoints</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage coordinates, pins, and export to GIS formats.
                </p>
              </div>

              {currentInspectedCoord && (
                <button
                  onClick={onSaveCurrentCoordAsWaypoint}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Save Pin
                </button>
              )}
            </div>

            {/* Search and Category Filter */}
            <div className="space-y-2">
              <input
                type="text"
                value={waypointSearch}
                onChange={(e) => setWaypointSearch(e.target.value)}
                placeholder="Filter saved waypoints..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />

              {/* Segmented Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
                {['all', 'landmark', 'survey', 'waypoint', 'observation'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded capitalize whitespace-nowrap transition-colors ${
                      categoryFilter === cat
                        ? 'bg-slate-800 text-sky-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Waypoints List */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {filteredWaypoints.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/30 rounded-lg border border-dashed border-slate-800">
                  No waypoints found. Click on the map or use "Pin Drop" mode to add one!
                </div>
              ) : (
                filteredWaypoints.map((wp) => (
                  <div
                    key={wp.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onSelectWaypoint(wp)}
                        className="text-left font-medium text-xs text-slate-200 hover:text-sky-400 transition-colors flex items-center gap-1.5 truncate"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: wp.color || '#38bdf8' }}
                        />
                        <span className="truncate">{wp.name}</span>
                      </button>

                      <button
                        onClick={() => onDeleteWaypoint(wp.id)}
                        title="Delete waypoint"
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] font-mono tabular-nums text-sky-400">
                      {wp.lat.toFixed(5)}°, {wp.lng.toFixed(5)}°
                    </div>

                    {wp.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {wp.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
                      <span className="capitalize">{wp.category}</span>
                      <button
                        onClick={() => onJumpToCoord({ lat: wp.lat, lng: wp.lng }, 15, wp.name)}
                        className="text-sky-400 hover:underline flex items-center gap-0.5"
                      >
                        Fly to <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Export & Import Action Buttons */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">GIS Data Exchange</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportGeoJSON}
                  disabled={waypoints.length === 0}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  Export GeoJSON
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={waypoints.length === 0}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Export CSV
                </button>
              </div>

              {/* Upload file */}
              <label className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Import GeoJSON / CSV</span>
                <input
                  type="file"
                  accept=".geojson,.json,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
