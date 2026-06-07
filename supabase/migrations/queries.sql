CREATE OR REPLACE FUNCTION search_available_buses(
  user_lat FLOAT, 
  user_lng FLOAT, 
  dist_meters FLOAT
) 
RETURNS TABLE (
  trip_id UUID,
  bus_id TEXT,
  origin_name TEXT,
  destination_name TEXT,
  occupied_seats INTEGER,
  dist_meters FLOAT,
  location GEOGRAPHY
) LANGUAGE sql AS $$
  SELECT 
    t.id, 
    t.bus_id, 
    t.origin_name, 
    t.destination_name, 
    t.occupied_seats,
    ST_Distance(vl.location, ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography) AS dist_meters,
    vl.location
  FROM trips t
  JOIN vehicle_locations vl ON t.id = vl.trip_id
  WHERE 
    t.ride_status IN ('scheduled', 'in-progress') 
    AND ST_DWithin(vl.location, ST_SetSRID(ST_Point(user_lng, user_lat), 4326)::geography, dist_meters)
  ORDER BY dist_meters ASC;
$$;
