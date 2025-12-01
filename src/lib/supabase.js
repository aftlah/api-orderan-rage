import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ENV ERROR:", { supabaseUrl, supabaseKey });
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
