import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email and password required" });
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey)
      return res.status(500).json({ error: "Supabase configuration missing" });
    const client = createClient(supabaseUrl, anonKey);
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      return res
        .status(401)
        .json({ error: error.message || "invalid credentials" });
    const { user, session } = data || {};
    return res.json({
      success: true,
      user,
      token: session?.access_token || null,
      expires_in: session?.expires_in || null,
      refresh_token: session?.refresh_token || null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
