export interface LatLngCoord {
  lat: number;
  lng: number;
}

export interface DMSCoord {
  lat: {
    degrees: number;
    minutes: number;
    seconds: number;
    direction: 'N' | 'S';
  };
  lng: {
    degrees: number;
    minutes: number;
    seconds: number;
    direction: 'E' | 'W';
  };
}

export type WaypointCategory = 'landmark' | 'survey' | 'waypoint' | 'observation' | 'personal';

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: WaypointCategory;
  notes?: string;
  address?: string;
  elevation?: number;
  color?: string;
  createdAt: number;
}

export type MapMode = 'explore' | 'drop_pin' | 'measure_distance' | 'measure_area' | 'radius_circle';

export type BaseLayerType = 'dark' | 'light' | 'osm' | 'satellite' | 'topo';

export interface BaseLayerConfig {
  id: BaseLayerType;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export interface GeocodeResult {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

export interface MeasureResult {
  points: LatLngCoord[];
  totalDistanceMeters: number;
  bearingDeg?: number;
  areaSqMeters?: number;
}
