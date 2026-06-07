import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const createUser = async (userData: any) => {
  const { email, password, full_name, role } = userData;

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  const { data, error } = await supabase
    .from('my_users')
    .insert([{ email, password_hash, full_name, role }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const validateUser = async (email: string, password: string) => {
  const { data: user, error } = await supabase
    .from('my_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) throw new Error('Invalid email or password');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new Error('Invalid email or password');

  const token = jwt.sign(
    { id: user.id, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  return { token, user: { id: user.id, role: user.role, company_id: user.company_id } };
};


export const completeDriverActivation = async (code: string, newPassword: string) => {
  // 1. First, find the user associated with this activation code
  const { data: user, error: findError } = await supabase
    .from('my_users')
    .select('id, email')
    .eq('activation_code', code)
    .single();

  if (findError || !user) {
    throw new Error('Invalid or expired activation code.');
  }

  // 2. Hash the new password provided by the driver
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 3. Update the user: set the password, mark as activated, and clear the code
  const { error: updateError } = await supabase
    .from('my_users')
    .update({
      password_hash: hashedPassword,
      is_activated: true,
      activation_code: null // Clear the code so it's a one-time use
    })
    .eq('id', user.id);

  if (updateError) {
    throw new Error('Failed to update profile. Please try again.');
  }

  return { email: user.email, success: true };
};


export const fetchDriverDashboardData = async (userId: string) => {
  const { data, error } = await supabase
    .from('my_users')
    .select(`
      id,
      full_name,
      email,
      driver_profiles (
        phone_number,
        bus_plate_number,
        bus_type,
        vehicle_class,
        years_of_experience
      ),
      trips (
        id,
        origin_name,
        destination_name,
        ride_status,
        started_at
      )
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};
