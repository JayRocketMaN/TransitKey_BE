export interface LocationUpdateBody {
  tripId: string;
  lat: number;
  lng: number;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface TripWithLocation {
  id: string;
  occupied_seats: number;
  vehicle_locations: GeoJsonPoint;
}
