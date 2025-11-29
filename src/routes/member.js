import express from "express";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

/*
----------------------------------------------------
 GET MEMBERS (optional search)
----------------------------------------------------
*/
router.get("/", async (req, res) => {
  const search = req.query.search || "";

  let query = supabase
    .from("members")
    .select("*")
    .order("nama", { ascending: true });

  if (search) query = query.ilike("nama", `%${search}%`);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error });
  res.json(data);
});

/*
----------------------------------------------------
 ADD NEW MEMBER
----------------------------------------------------
*/
router.post("/", async (req, res) => {
  const nama = req.body.nama?.trim();

  if (!nama) return res.status(400).json({ error: "Nama required" });

  const { data, error } = await supabase
    .from("members")
    .insert([{ nama }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json({ success: true, data });
});

export default router;
