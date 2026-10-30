import { LatLngCoord, DMSCoord, Waypoint } from '../types';

/**
 * Convert Decimal Degrees (DD) to Degrees Minutes Seconds (DMS)
 */
export function toDMS(lat: number, lng: number): DMSCoord {
  const formatComponent = (val: number, posDir: 'N' | 'E', negDir: 'S' | 'W') => {
    const direction = val >= 0 ? posDir : negDir;
    const absVal = Math.abs(val);
    const degrees = Math.floor(absVal);
    const minutesDecimal = (absVal - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = Number(((minutesDecimal - minutes) * 60).toFixed(2));

    return { degrees, minutes, seconds, direction };
  };

  return {
    lat: formatComponent(lat, 'N', 'S') as DMSCoord['lat'],
    lng: formatComponent(lng, 'E', 'W') as DMSCoord['lng'],
  };
}

/**
 * Format DMS object to readable string
 */
export function formatDMSString(dms: DMSCoord): string {
  const latStr = `${dms.lat.degrees}° ${dms.lat.minutes}' ${dms.lat.seconds.toFixed(2)}" ${dms.lat.direction}`;
  const lngStr = `${dms.lng.degrees}° ${dms.lng.minutes}' ${dms.lng.seconds.toFixed(2)}" ${dms.lng.direction}`;
  return `${latStr}, ${lngStr}`;
}

/**
 * Format Decimal Degrees to Degrees Decimal Minutes (DDM)
 */
export function toDDM(lat: number, lng: number): string {
  const formatDDMPart = (val: number, pos: string, neg: string) => {
    const dir = val >= 0 ? pos : neg;
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60).toFixed(4);
    return `${deg}° ${min}' ${dir}`;
  };
  return `${formatDDMPart(lat, 'N', 'S')}, ${formatDDMPart(lng, 'E', 'W')}`;
}

/**
 * Parse DMS component to decimal degrees
 */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let dd = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    dd = -dd;
  }
  return Number(dd.toFixed(6));
}

/**
 * Convert Lat/Lng to approximate UTM (Universal Transverse Mercator)
 */
export function toUTM(lat: number, lng: number): { zone: string; easting: number; northing: number } {
  // Ellipsoid parameters for WGS84
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const e2 = 2 * f - f * f;
  const k0 = 0.9996;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  // Zone calculation
  let zoneNumber = Math.floor((lng + 180) / 6) + 1;
  if (lat >= 56.0 && lat < 64.0 && lng >= 3.0 && lng < 12.0) zoneNumber = 32;

  const centralLng = ((zoneNumber - 1) * 6 - 180 + 3) * (Math.PI / 180);
  const deltaLng = lngRad - centralLng;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = (e2 / (1 - e2)) * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * deltaLng;

  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad
    - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad)
    + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad)
    - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
  );

  const easting = k0 * N * (
    A + (1 - T + C) * (A * A * A) / 6 +
    (5 - 18 * T + T * T + 72 * C - 58 * (e2 / (1 - e2))) * (A * A * A * A * A) / 120
  ) + 500000.0;

  let northing = k0 * (
    M + N * Math.tan(latRad) * (
      (A * A) / 2 +
      (5 - T + 9 * C + 4 * C * C) * (A * A * A * A) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * (e2 / (1 - e2))) * (A * A * A * A * A * A) / 720
    )
  );

  if (lat < 0) {
    northing += 10000000.0; // False northing for southern hemisphere
  }

  const zoneLetter = lat >= 0 ? 'N' : 'S';

  return {
    zone: `${zoneNumber}${zoneLetter}`,
    easting: Math.round(easting),
    northing: Math.round(northing),
  };
}

/**
 * Calculate Great-Circle / Haversine distance between two coordinates in meters
 */
export function haversineDistance(p1: LatLngCoord, p2: LatLngCoord): number {
  const R = 6371008.8; // Earth mean radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate forward bearing / azimuth from p1 to p2 in degrees (0-360)
 */
export function calculateBearing(p1: LatLngCoord, p2: LatLngCoord): { degrees: number; compass: string } {
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const compassPoints = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(brng / 22.5) % 16;

  return {
    degrees: Number(brng.toFixed(1)),
    compass: compassPoints[index],
  };
}

/**
 * Calculate area of a polygon on sphere in square meters using spherical excess
 */
export function calculatePolygonArea(coords: LatLngCoord[]): number {
  if (coords.length < 3) return 0;
  const R = 6371008.8; // meters
  let totalAngle = 0;

  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const p3 = coords[(i + 2) % coords.length];

    const bearing1 = (calculateBearing(p2, p1).degrees * Math.PI) / 180;
    const bearing2 = (calculateBearing(p2, p3).degrees * Math.PI) / 180;
    let interiorAngle = bearing2 - bearing1;
    if (interiorAngle < 0) interiorAngle += 2 * Math.PI;
    if (interiorAngle > 2 * Math.PI) interiorAngle -= 2 * Math.PI;

    totalAngle += interiorAngle;
  }

  // Planar approximation for modest polygons (< 1000km span) is also very fast and stable:
  // Using surveyor's formula on projected flat surface
  let area = 0;
  const avgLatRad = ((coords.reduce((acc, c) => acc + c.lat, 0) / coords.length) * Math.PI) / 180;
  const metersPerDegLat = 111132.954;
  const metersPerDegLng = 111412.84 * Math.cos(avgLatRad);

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const xi = coords[i].lng * metersPerDegLng;
    const yi = coords[i].lat * metersPerDegLat;
    const xj = coords[j].lng * metersPerDegLng;
    const yj = coords[j].lat * metersPerDegLat;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area) / 2;
}

/**
 * Format distance in multiple units
 */
export function formatDistanceUnits(meters: number): {
  meters: string;
  kilometers: string;
  miles: string;
  nauticalMiles: string;
} {
  const km = meters / 1000;
  const miles = meters * 0.000621371;
  const nm = meters * 0.000539957;

  return {
    meters: `${meters.toLocaleString('en-US', { maximumFractionDigits: 1 })} m`,
    kilometers: `${km.toLocaleString('en-US', { maximumFractionDigits: 2 })} km`,
    miles: `${miles.toLocaleString('en-US', { maximumFractionDigits: 2 })} mi`,
    nauticalMiles: `${nm.toLocaleString('en-US', { maximumFractionDigits: 2 })} NM`,
  };
}

/**
 * Format area in multiple units
 */
export function formatAreaUnits(sqMeters: number): {
  sqMeters: string;
  hectares: string;
  sqKm: string;
  acres: string;
} {
  const ha = sqMeters / 10000;
  const sqKm = sqMeters / 1000000;
  const acres = sqMeters * 0.000247105;

  return {
    sqMeters: `${sqMeters.toLocaleString('en-US', { maximumFractionDigits: 1 })} m²`,
    hectares: `${ha.toLocaleString('en-US', { maximumFractionDigits: 2 })} ha`,
    sqKm: `${sqKm.toLocaleString('en-US', { maximumFractionDigits: 3 })} km²`,
    acres: `${acres.toLocaleString('en-US', { maximumFractionDigits: 2 })} ac`,
  };
}

/**
 * Flexible coordinate parser for text strings:
 * Handles:
 * - "14.5995, 120.9842"
 * - "14.5995 120.9842"
 * - "[120.9842, 14.5995]" (GeoJSON [lng, lat])
 * - "14° 35' 58\" N, 120° 59' 3\" E"
 * - "14 35.97 N 120 59.05 E"
 */
export function parseCoordinateString(input: string): LatLngCoord | null {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // Try GeoJSON array format [lng, lat]
  if (clean.startsWith('[') && clean.endsWith(']')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        const lng = Number(parsed[0]);
        const lat = Number(parsed[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    } catch {
      // continue to regex
    }
  }

  // Try standard DD numbers: "14.5995, 120.9842" or "14.5995 120.9842"
  const ddMatch = clean.match(/^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/);
  if (ddMatch) {
    const lat = parseFloat(ddMatch[1]);
    const lng = parseFloat(ddMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // Try DMS with compass letters: e.g. 14° 35' 58" N, 120° 59' 3" E
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["]?\s*([NSEWnsew])[,\s]+(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["]?\s*([NSEWnsew])/;
  const dmsMatch = clean.match(dmsRegex);
  if (dmsMatch) {
    const d1 = parseFloat(dmsMatch[1]);
    const m1 = parseFloat(dmsMatch[2]);
    const s1 = parseFloat(dmsMatch[3]);
    const dir1 = dmsMatch[4].toUpperCase();

    const d2 = parseFloat(dmsMatch[5]);
    const m2 = parseFloat(dmsMatch[6]);
    const s2 = parseFloat(dmsMatch[7]);
    const dir2 = dmsMatch[8].toUpperCase();

    let lat = 0;
    let lng = 0;

    if (dir1 === 'N' || dir1 === 'S') {
      lat = dmsToDecimal(d1, m1, s1, dir1);
      lng = dmsToDecimal(d2, m2, s2, dir2);
    } else {
      lng = dmsToDecimal(d1, m1, s1, dir1);
      lat = dmsToDecimal(d2, m2, s2, dir2);
    }

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Curated Global and Philippines Landmark Presets for quick exploration
 */
export const LANDMARK_PRESETS: Waypoint[] = [
  {
    id: 'preset-manila',
    name: 'Rizal Park, Manila',
    lat: 14.58316,
    lng: 120.97944,
    category: 'landmark',
    notes: 'Historic urban park situated at the heart of Manila, Philippines. Km 0 point.',
    address: 'Ermita, Manila, Metro Manila, Philippines',
    color: '#3b82f6',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-mayon',
    name: 'Mayon Volcano',
    lat: 13.2570,
    lng: 123.6856,
    category: 'landmark',
    notes: 'Renowned world-wide for its symmetric "perfect cone" shape.',
    address: 'Albay, Bicol Region, Philippines',
    color: '#ef4444',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-banaue',
    name: 'Banaue Rice Terraces',
    lat: 16.9205,
    lng: 121.0583,
    category: 'landmark',
    notes: '2,000-year-old terraces carved into the mountains of Ifugao.',
    address: 'Ifugao, Cordillera, Philippines',
    color: '#10b981',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-boracay',
    name: 'White Beach, Boracay',
    lat: 11.9674,
    lng: 121.9248,
    category: 'landmark',
    notes: 'Famous 4-kilometer stretch of powdery white sand and turquoise waters.',
    address: 'Malay, Aklan, Philippines',
    color: '#06b6d4',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-tokyo',
    name: 'Tokyo Tower',
    lat: 35.6586,
    lng: 139.7454,
    category: 'landmark',
    notes: 'Communications and observation tower in the Shiba-koen district of Minato, Tokyo.',
    address: 'Minato City, Tokyo, Japan',
    color: '#f97316',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-eiffel',
    name: 'Eiffel Tower',
    lat: 48.8584,
    lng: 2.2945,
    category: 'landmark',
    notes: 'Wrought-iron lattice tower on the Champ de Mars in Paris, France.',
    address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
    color: '#8b5cf6',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-everest',
    name: 'Mount Everest Peak',
    lat: 27.9881,
    lng: 86.9250,
    category: 'landmark',
    notes: 'Highest point on Earth above sea level at 8,848.86 meters.',
    address: 'Mahalangur Himal, Himalayas, Nepal / China Border',
    color: '#ec4899',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-greenwich',
    name: 'Royal Observatory Greenwich (Prime Meridian 0°)',
    lat: 51.4769,
    lng: 0.0005,
    category: 'landmark',
    notes: 'The historic location of the Prime Meridian (0° 0\' 0" longitude).',
    address: 'Blackheath Ave, London SE10 8XJ, United Kingdom',
    color: '#6366f1',
    createdAt: 1700000000000,
  },
  {
    id: 'preset-grandcanyon',
    name: 'Grand Canyon South Rim',
    lat: 36.0544,
    lng: -112.1401,
    category: 'landmark',
    notes: 'Iconic steep-sided canyon carved by the Colorado River in Arizona.',
    address: 'Grand Canyon Village, Arizona, United States',
    color: '#eab308',
    createdAt: 1700000000000,
  },
];
