import L from 'leaflet';

/**
 * Creates custom crisp vector SVG marker icons with distinct colors and drop shadows
 */
export function createCustomMarkerIcon(color = '#3b82f6', isHighlighted = false) {
  const size = isHighlighted ? 38 : 32;
  const height = isHighlighted ? 46 : 38;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="${size}" height="${height}" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.5 14.2 23.2 14.8 23.7a1.6 1.6 0 0 0 2.4 0C17.8 39.2 32 26.5 32 16 32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="15" r="7" fill="#ffffff" />
      <circle cx="16" cy="15" r="3.5" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="transform: translate(-50%, -100%); cursor: pointer; transition: transform 0.15s ease;">${svg}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -height + 4],
  });
}

/**
 * Creates a pulsing target icon for temporary or active coordinate inspections
 */
export function createTargetPinIcon(color = '#06b6d4') {
  const html = `
    <div style="position: relative; transform: translate(-50%, -50%); pointer-events: none;">
      <div style="width: 24px; height: 24px; border-radius: 9999px; background: ${color}33; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${color}88;">
        <div style="width: 8px; height: 8px; border-radius: 9999px; background: ${color};"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-target-marker',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Creates measure vertex waypoint pin
 */
export function createMeasureVertexIcon(index: number) {
  const html = `
    <div style="transform: translate(-50%, -50%);">
      <div style="width: 22px; height: 22px; border-radius: 9999px; background: #0f172a; border: 2px solid #38bdf8; color: #38bdf8; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
        ${index + 1}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'measure-vertex-marker',
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}
