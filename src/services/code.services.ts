import { supabase } from "../config/supabase.js";
import { codeGenerator } from "../utils/codeGenerator.utils.js";

export class ReferenceService {
  static async createReferenceCode(userId: string, userName: string) {
    try {
      const { data, error } = await supabase
        .from("reference_code")
        .insert([
          {
            created_by: userId,
            creator_name: userName,
            code: codeGenerator(),
            is_used: false,
          },
        ])
        .select("code")
        .single();

  
      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }
}
