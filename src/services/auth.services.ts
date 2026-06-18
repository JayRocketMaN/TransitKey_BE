import { supabase } from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CustomJwtPayload } from "../types/express.js";

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export class AuthService {
  /**
   * Registers a new user (Passenger / Operator fallback / Driver manual creation context)
   * FIXED: Enforces phone_number insertion matching your passenger fields and removes double-hashing
   */
  static async createUser(userData: any) {
    const { email, password, full_name, phone_number, role } = userData;

    // Early fallback check: If password was not hashed by input middleware yet, handle it here safely
    let finalHash = password;
    if (!password.startsWith('$2b$') && !password.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      finalHash = await bcrypt.hash(password, salt);
    }

    const { data, error } = await supabase
      .from('my_users')
      .insert([{ 
        email: email.trim().toLowerCase(), 
        password_hash: finalHash, 
        full_name: full_name ? full_name.trim() : null, 
        // FIXED: Maps your custom request phone value into the database column structure safely
        phone_number: phone_number ? phone_number.trim() : null,
        role: role || 'passenger' // Automatically marks unregistered roles as public passenger accounts
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * FIXED: Validates credentials and returns a token + payload
   * MULTI-CHANNEL: Replaced the .eq('email') check with a flexible .or() query 
   * to seamlessly look up users by their Email OR Phone Number matching your front-end targets
   */
  static async validateUser(identifier: string, password: string) {
    const cleanIdentifier = identifier.trim();

    const { data: user, error } = await supabase
      .from('my_users')
      .select('*')
      .or(`email.eq.${cleanIdentifier.toLowerCase()},phone_number.eq.${cleanIdentifier}`)
      .maybeSingle(); // Prevents raw array crash blocks if multiple records cross reference

    if (error || !user) throw new Error('Invalid email, phone number, or password');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new Error('Invalid email, phone number, or password');

    // Create payload matching your CustomJwtPayload interface
    const payload: CustomJwtPayload = { 
      id: user.id, 
      user_role: user.role, 
      company_id: user.company_id,
      email: user.email 
    };

    const token = this.generateAccessToken(payload);

    return { token, user: payload };
  }

  /**
   * For Drivers: First time login/activation via code
   */
  static async completeDriverActivation(code: string, newPassword: string) {
    const { data: user, error: findError } = await supabase
      .from('my_users')
      .select('id, email')
      .eq('activation_code', code)
      .single();

    if (findError || !user) {
      throw new Error('Invalid or expired activation code.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('my_users')
      .update({
        password_hash: hashedPassword,
        is_activated: true,
        activation_code: null 
      })
      .eq('id', user.id);

    if (updateError) throw new Error('Failed to update profile.');

    return { email: user.email, success: true };
  }

  /**
   * Fetches profile data for the Driver App dashboard using updated table paths
   * Resolves my_users -> driver_profiles -> trips seamlessly to match your new schema
   */
  static async fetchDriverDashboardData(userId: string) {
    const { data, error } = await supabase
      .from('my_users')
      .select(`
        id,
        full_name,
        email,
        driver_profiles!driver_profiles_user_id_fkey (
          id,
          phone_number,
          bus_plate_number,
          bus_type,
          vehicle_class,
          years_of_experience,
          trips!trips_driver_id_fkey (
            id,
            origin_name,
            destination_name,
            ride_status,
            started_at
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Utility: Generates a JWT based on the typed payload
   */
  static generateAccessToken(payload: CustomJwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: "8h", 
    });
  }

  /**
   * Utility: Standard cookie security settings
   */
  static getCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? "strict" : "lax") as "strict" | "lax",
      maxAge: 8 * 60 * 60 * 1000, 
    };
  }
}
