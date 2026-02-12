export interface GeoPoint {
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
  ip: string;
  hits: number;
  last_seen: string | null;
  is_vpn: boolean;
  username: string;
  user_id: string;
  server: string;
}

export interface GeoMapData {
  points: GeoPoint[];
  total: number;
}

export interface CountryCount {
  code: string;
  count: number;
}

export interface GeoStats {
  geolocated_ips: number;
  ungeolocated_ips: number;
  vpn_ips: number;
  users_with_geo: number;
  countries: CountryCount[];
}
