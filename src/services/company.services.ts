import { supabase } from '../config/supabase.js';

// src/services/company.services.ts

export const registerCompany = async (companyData: any, lat: number, lng: number) => {
  // Convert numeric lat/lng to PostGIS-compatible POINT string
  // Ensure the order is (Longitude Latitude)
  const parkPoint = `POINT(${lng} ${lat})`;

  const { data, error } = await supabase
    .from('companies')
    .insert({
      ...companyData,
      park_location: parkPoint // This matches your GEOGRAPHY column
    })
    .select()
    .single();

  if (error) throw new Error(`Registration failed: ${error.message}`);
  return data;
};


export const createDriverWithProfile = async (operator: any, formData: any) => {
  // 1. Create the User entry (Auth)
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  const { data: user, error: userError } = await supabase
    .from('my_users')
    .insert([{
      email: formData.email,
      full_name: formData.full_name,
      password_hash: 'PENDING_ACTIVATION', 
      role: 'driver',
      company_id: operator.company_id,
      activation_code: activationCode
    }])
    .select().single();

  if (userError) throw userError;

  // 2. Create the Driver Profile entry (Data from your form)
  const { error: profileError } = await supabase
    .from('driver_profiles')
    .insert([{
      user_id: user.id,
      phone_number: formData.phone_number,
      bus_plate_number: formData.bus_plate_number,
      bus_type: formData.bus_type,
      license_number: formData.license_number,
      license_type: formData.license_type,
      vehicle_class: formData.vehicle_class,
      years_of_experience: parseInt(formData.years_of_experience)
    }]);

  if (profileError) throw profileError;

  return activationCode;
};

export const fetchOperatorDashboardStats = async (companyId: string) => {
  // 1. Get total drivers for this company
  const { count: driverCount, error: driverError } = await supabase
    .from('my_users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('role', 'driver');

  // 2. Get active trips (scheduled or in-progress)
  const { count: activeTrips, error: tripError } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('ride_status', ['scheduled', 'in-progress']);

  // 3. Get recent bookings (to show in the 'Recent Activity' list)
  const { data: recentBookings, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      status,
      created_at,
      trips (origin_name, destination_name),
      my_users (full_name)
    `)
    .eq('trips.company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (driverError || tripError || bookingError) {
    throw new Error("Error aggregating dashboard data");
  }

  return {
    stats: {
      totalDrivers: driverCount || 0,
      activeTrips: activeTrips || 0,
      systemStatus: "Operational"
    },
    recentActivity: recentBookings
  };
};
