import express from "express";
import { supabase } from "../lib/supabase.js";

const   router = express.Router();

/*
----------------------------------------------------
 GET ALL ORDER WINDOWS
----------------------------------------------------
*/
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("order_windows")
    .select("*")
    .order("start_time", { ascending: false });

  if (error) return res.status(500).json({ error });
  res.json(data);
});

router.get("/active", async (req, res) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("order_windows")
    .select("*")
    .eq("is_active", true)
    .lte("start_time", now)
    .gte("end_time", now)
    .order("orderanke", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error });
  res.json(data || null);
});

/*
----------------------------------------------------
 CREATE NEW WINDOW
----------------------------------------------------
*/
router.post("/", async (req, res) => {
  const row = req.body;

  const { data, error } = await supabase
    .from("order_windows")
    .insert([row])
    .select();

  if (error) return res.status(500).json({ error });
  res.json({ success: true, data });
});

/*
----------------------------------------------------
 UPDATE WINDOW
----------------------------------------------------
*/
router.put("/:id", async (req, res) => {
  const id = req.params.id;

  const { data, error } = await supabase
    .from("order_windows")
    .update(req.body)
    .eq("id", id)
    .select();

  if (error) return res.status(500).json({ error });
  res.json({ success: true, data });
});

/*
----------------------------------------------------
 DELETE WINDOW
----------------------------------------------------
*/
router.delete("/:id", async (req, res) => {
  const id = req.params.id;

  const { data, error } = await supabase
    .from("order_windows")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error });
  res.json({ success: true });
});

export default router;
