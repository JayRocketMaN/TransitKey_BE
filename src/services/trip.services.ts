import { supabase } from '../config/supabase.js';


/**
 * Transition a trip from 'scheduled' to 'in-progress'.
 

* This trigger shifts the map pin from the Company Park to the Driver's Live GPS.
 */
export const startTrip = async (tripId: string, startLat: number, startLng: number) => {
  const point = `POINT(${startLng} ${startLat})`;

  const { data, error } = await supabase.rpc('start_trip_transaction', {
    p_trip_id: tripId,
    p_location: point
  });

  if (error) throw new Error(`Handshake failed: ${error.message}`);
  return data;
};
