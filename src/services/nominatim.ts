import { GeocodeResult } from '../types';

const cache = new Map<string, string>();

/**
 * Reverse geocode a latitude and longitude to get human-readable location
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Reverse geocode HTTP error ${res.status}`);
    }

    const data = await res.json();
    const address = data.display_name || `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
    cache.set(cacheKey, address);
    return address;
  } catch (err) {
    console.warn('Reverse geocode failed:', err);
    return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  }
}

/**
 * Search places by query string
 */
export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query.trim()
    )}&limit=7&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Geocode HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.map((item: any) => ({
      placeId: item.place_id ? String(item.place_id) : Math.random().toString(),
      name: item.name || item.display_name.split(',')[0],
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
    }));
  } catch (err) {
    console.warn('Place search failed:', err);
    return [];
  }
}
