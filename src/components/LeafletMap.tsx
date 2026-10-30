import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LatLngCoord, Waypoint, MapMode, BaseLayerType } from '../types';
import { MAP_BASE_LAYERS } from '../utils/mapLayers';
import {
  createCustomMarkerIcon,
  createTargetPinIcon,
  createMeasureVertexIcon,
} from '../utils/leafletIcons';
import { toDMS, formatDMSString, formatDistanceUnits, formatAreaUnits } from '../utils/geo';
import { reverseGeocode } from '../services/nominatim';

interface LeafletMapProps {
  baseLayer: BaseLayerType;
  mapMode: MapMode;
  waypoints: Waypoint[];
  targetCoord: LatLngCoord | null;
  targetZoom?: number;
  userLocation: { coord: LatLngCoord; accuracy: number } | null;
  inspectedCoord: LatLngCoord | null;
  setInspectedCoord: (coord: LatLngCoord | null) => void;
  setCursorCoord: (coord: LatLngCoord | null) => void;
  setCenterCoord: (coord: LatLngCoord) => void;
  setZoomLevel: (zoom: number) => void;
  onMapClick: (coord: LatLngCoord) => void;
  measurePoints: LatLngCoord[];
  measureDistanceMeters: number;
  measureAreaSqMeters: number;
  radiusMeters: number;
  onOpenSaveModal: (coord: LatLngCoord, address?: string) => void;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  baseLayer,
  mapMode,
  waypoints,
  targetCoord,
  targetZoom,
  userLocation,
  inspectedCoord,
  setInspectedCoord,
  setCursorCoord,
  setCenterCoord,
  setZoomLevel,
  onMapClick,
  measurePoints,
  measureDistanceMeters,
  measureAreaSqMeters,
  radiusMeters,
  onOpenSaveModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);

  // Layers for features
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const inspectedMarkerRef = useRef<L.Marker | null>(null);
  const measureLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Manila default coordinates or global center
    const initialLat = 14.599512;
    const initialLng = 120.984222;
    const initialZoom = 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add scale control
    L.control.scale({ imperial: true, metric: true, position: 'bottomleft' }).addTo(map);

    // Initial tile layer
    const layerConfig = MAP_BASE_LAYERS.find((l) => l.id === baseLayer) || MAP_BASE_LAYERS[0];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    currentTileLayerRef.current = tileLayer;

    // Initialize layer groups
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);
    measureLayerGroupRef.current = L.layerGroup().addTo(map);
    userLocationLayerGroupRef.current = L.layerGroup().addTo(map);

    // Event listeners
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    map.on('mouseout', () => {
      setCursorCoord(null);
    });

    map.on('move', () => {
      const center = map.getCenter();
      setCenterCoord({ lat: center.lat, lng: center.lng });
      setZoomLevel(map.getZoom());
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Tile Layer on baseLayer change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const layerConfig = MAP_BASE_LAYERS.find((l) => l.id === baseLayer) || MAP_BASE_LAYERS[0];

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
      subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
    }).addTo(map);

    currentTileLayerRef.current = newTileLayer;
  }, [baseLayer]);

  // 3. Jump to target coordinate if specified
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !targetCoord) return;

    map.flyTo([targetCoord.lat, targetCoord.lng], targetZoom || 15, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [targetCoord, targetZoom]);

  // 4. Update Cursor Style depending on Map Mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapMode === 'measure_distance' || mapMode === 'measure_area' || mapMode === 'radius_circle') {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else if (mapMode === 'drop_pin') {
      mapContainerRef.current.style.cursor = 'cell';
    } else {
      mapContainerRef.current.style.cursor = 'grab';
    }
  }, [mapMode]);

  // 5. Render Waypoints on Map
  useEffect(() => {
    const layerGroup = waypointsLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    waypoints.forEach((wp) => {
      const icon = createCustomMarkerIcon(wp.color || '#3b82f6');
      const marker = L.marker([wp.lat, wp.lng], { icon });

      const dms = toDMS(wp.lat, wp.lng);
      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 12px; min-width: 220px; max-width: 280px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 13px; font-weight: 700; color: #f8fafc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${wp.name}
            </span>
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 2px 6px; border-radius: 4px;">
              ${wp.category}
            </span>
          </div>

          <div style="font-family: var(--font-mono); font-size: 11px; color: #38bdf8; font-weight: 600; margin-bottom: 4px; tabular-nums: true;">
            ${wp.lat.toFixed(6)}°, ${wp.lng.toFixed(6)}°
          </div>

          <div style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; margin-bottom: 6px;">
            ${formatDMSString(dms)}
          </div>

          ${wp.address ? `<div style="font-size: 11px; color: #cbd5e1; margin-bottom: 6px; line-height: 1.3;">📍 ${wp.address}</div>` : ''}
          ${wp.notes ? `<div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-bottom: 8px; border-left: 2px solid #475569; padding-left: 6px;">${wp.notes}</div>` : ''}

          <div style="padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.2); display: flex; justify-content: space-between; align-items: center;">
            <button id="copy-btn-${wp.id}" style="background: none; border: none; font-size: 10px; font-family: var(--font-mono); color: #38bdf8; cursor: pointer; padding: 0;">
              Copy Coordinates
            </button>
            <span style="font-size: 9px; color: #64748b; font-family: var(--font-mono);">GeoPoint</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const copyBtn = document.getElementById(`copy-btn-${wp.id}`);
        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(`${wp.lat.toFixed(6)}, ${wp.lng.toFixed(6)}`);
            copyBtn.innerText = 'Copied!';
            setTimeout(() => {
              copyBtn.innerText = 'Copy Coordinates';
            }, 1800);
          };
        }
      });

      marker.addTo(layerGroup);
    });
  }, [waypoints]);

  // 6. Inspected Point Marker & Reverse Geocoding Popup
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (inspectedMarkerRef.current) {
      map.removeLayer(inspectedMarkerRef.current);
      inspectedMarkerRef.current = null;
    }

    if (!inspectedCoord) return;

    const icon = createTargetPinIcon('#38bdf8');
    const marker = L.marker([inspectedCoord.lat, inspectedCoord.lng], { icon });

    const dms = toDMS(inspectedCoord.lat, inspectedCoord.lng);

    const initialPopupHtml = `
      <div style="font-family: var(--font-sans); padding: 12px; min-width: 220px; max-width: 280px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #f8fafc;">
            Target Point
          </span>
          <span style="font-size: 9px; color: #38bdf8; font-family: var(--font-mono);">
            LIVE COORDINATE
          </span>
        </div>

        <div style="font-family: var(--font-mono); font-size: 11px; color: #38bdf8; font-weight: 600; margin-bottom: 2px;">
          ${inspectedCoord.lat.toFixed(6)}°, ${inspectedCoord.lng.toFixed(6)}°
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: #94a3b8; margin-bottom: 8px;">
          ${formatDMSString(dms)}
        </div>

        <div id="inspected-address-box" style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
          <span style="opacity: 0.7;">Resolving location name...</span>
        </div>

        <div style="display: flex; gap: 6px; padding-top: 6px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
          <button id="inspected-save-btn" style="flex: 1; padding: 4px 8px; background: #0284c7; color: #ffffff; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Save Waypoint
          </button>
          <button id="inspected-copy-btn" style="padding: 4px 8px; background: rgba(51, 65, 85, 0.5); color: #f1f5f9; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 4px; font-size: 11px; font-weight: 500; cursor: pointer;">
            Copy
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(initialPopupHtml, { offset: [0, -10] });
    marker.addTo(map);
    marker.openPopup();
    inspectedMarkerRef.current = marker;

    let resolvedAddress = '';

    // Async reverse geocode
    reverseGeocode(inspectedCoord.lat, inspectedCoord.lng).then((addr) => {
      resolvedAddress = addr;
      const addrEl = document.getElementById('inspected-address-box');
      if (addrEl) {
        addrEl.innerHTML = `<span style="color: #cbd5e1;">📍 ${addr}</span>`;
      }
    });

    marker.on('popupopen', () => {
      const saveBtn = document.getElementById('inspected-save-btn');
      const copyBtn = document.getElementById('inspected-copy-btn');

      if (saveBtn) {
        saveBtn.onclick = () => {
          onOpenSaveModal(inspectedCoord, resolvedAddress);
        };
      }

      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(
            `${inspectedCoord.lat.toFixed(6)}, ${inspectedCoord.lng.toFixed(6)}`
          );
          copyBtn.innerText = 'Copied!';
          setTimeout(() => {
            copyBtn.innerText = 'Copy';
          }, 1800);
        };
      }
    });
  }, [inspectedCoord]);

  // 7. Measure Layer (Polylines, Polygons, Radius)
  useEffect(() => {
    const layerGroup = measureLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    if (measurePoints.length === 0) return;

    // Draw vertex markers
    measurePoints.forEach((pt, index) => {
      const icon = createMeasureVertexIcon(index);
      const marker = L.marker([pt.lat, pt.lng], { icon });
      marker.addTo(layerGroup);
    });

    const latLngArray: L.LatLngExpression[] = measurePoints.map((p) => [p.lat, p.lng]);

    // Distance mode: Draw polyline
    if (mapMode === 'measure_distance') {
      const polyline = L.polyline(latLngArray, {
        color: '#38bdf8',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.9,
      });

      if (measurePoints.length >= 2) {
        const dist = formatDistanceUnits(measureDistanceMeters);
        polyline.bindTooltip(`Total Distance: ${dist.kilometers} (${dist.miles})`, {
          permanent: true,
          direction: 'top',
          className: 'measure-tooltip',
        });
      }

      polyline.addTo(layerGroup);
    }

    // Area mode: Draw polygon
    if (mapMode === 'measure_area') {
      if (measurePoints.length >= 3) {
        const polygon = L.polygon(latLngArray, {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.25,
          weight: 2,
        });

        const area = formatAreaUnits(measureAreaSqMeters);
        polygon.bindTooltip(`Area: ${area.sqKm} (${area.acres})`, {
          permanent: true,
          direction: 'center',
          className: 'measure-tooltip',
        });

        polygon.addTo(layerGroup);
      } else {
        const polyline = L.polyline(latLngArray, {
          color: '#10b981',
          weight: 2,
          dashArray: '4, 4',
          opacity: 0.8,
        });
        polyline.addTo(layerGroup);
      }
    }

    // Radius circle mode
    if (mapMode === 'radius_circle' && measurePoints.length > 0) {
      const center = measurePoints[measurePoints.length - 1];
      const circle = L.circle([center.lat, center.lng], {
        radius: radiusMeters,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
        weight: 2,
      });

      const dist = formatDistanceUnits(radiusMeters);
      circle.bindTooltip(`Radius: ${dist.kilometers}`, {
        permanent: true,
        direction: 'center',
        className: 'measure-tooltip',
      });

      circle.addTo(layerGroup);
    }
  }, [measurePoints, mapMode, measureDistanceMeters, measureAreaSqMeters, radiusMeters]);

  // 8. User Geolocation Pin
  useEffect(() => {
    const layerGroup = userLocationLayerGroupRef.current;
    const map = mapInstanceRef.current;
    if (!layerGroup || !map) return;

    layerGroup.clearLayers();

    if (!userLocation) return;

    // Accuracy circle
    const circle = L.circle([userLocation.coord.lat, userLocation.coord.lng], {
      radius: userLocation.accuracy,
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      weight: 1.5,
    });
    circle.addTo(layerGroup);

    // High accuracy pulse marker
    const markerIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative; transform: translate(-50%, -50%);">
          <div style="width: 22px; height: 22px; border-radius: 9999px; background: rgba(56, 189, 248, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 9999px; background: #0284c7; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([userLocation.coord.lat, userLocation.coord.lng], { icon: markerIcon });
    marker.bindPopup(`
      <div style="font-family: var(--font-sans); padding: 8px; font-size: 11px;">
        <div style="font-weight: 700; color: #0284c7; margin-bottom: 2px;">Your GPS Location</div>
        <div style="font-family: var(--font-mono); color: #38bdf8;">${userLocation.coord.lat.toFixed(6)}°, ${userLocation.coord.lng.toFixed(6)}°</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Accuracy: ±${Math.round(userLocation.accuracy)} meters</div>
      </div>
    `);
    marker.addTo(layerGroup);
  }, [userLocation]);

  return <div ref={mapContainerRef} className="w-full h-full relative" />;
};
