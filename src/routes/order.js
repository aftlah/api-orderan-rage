import express from "express";
import { supabase } from "../lib/supabase.js";
import fetch from "node-fetch";

const router = express.Router();

/*
----------------------------------------------------
 GET ALL ORDERS
----------------------------------------------------
*/
router.get("/", async (req, res) => {
  const limit = parseInt(req.query.limit || "500", 10);

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("waktu", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error });
  res.json(data);
});

/*
----------------------------------------------------
 ADD MULTIPLE ORDERS
----------------------------------------------------
*/
router.post("/", async (req, res) => {
  const rows = req.body;

  if (!Array.isArray(rows))
    return res.status(400).json({ error: "Body must be an array of orders" });

  const { data, error } = await supabase.from("orders").insert(rows).select();

  if (error) return res.status(500).json({ error });
  res.json({ success: true, data });
});

/*
----------------------------------------------------
 GET ORDERS BY MEMBER
----------------------------------------------------
*/
router.get("/member/:id", async (req, res) => {
  const memberId = parseInt(req.params.id);
  const orderanke = req.query.orderanke ? parseInt(req.query.orderanke) : null;

  let query = supabase
    .from("orders")
    .select("*")
    .eq("member_id", memberId)
    .order("waktu", { ascending: false });

  if (orderanke) query = query.eq("orderanke", orderanke);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error });
  res.json(data);
});

/*
----------------------------------------------------
 ITEM TOTALS (untuk rekap kota)
----------------------------------------------------
*/
router.get("/totals", async (req, res) => {
  const orderanke = req.query.orderanke;

  if (!orderanke) return res.status(400).json({ error: "orderanke required" });

  const { data, error } = await supabase
    .from("orders")
    .select("item, qty")
    .eq("orderanke", orderanke);

  if (error) return res.status(500).json({ error });

  const totals = {};

  data.forEach((row) => {
    const key = row.item.toUpperCase();
    totals[key] = (totals[key] || 0) + row.qty;
  });

  res.json(totals);
});

/*
----------------------------------------------------
 POST TO DISCORD CHANNEL
----------------------------------------------------
*/
router.post("/notify", async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: "message is required" });

  const url = process.env.DISCORD_WEBHOOK_URL;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send Discord message" });
  }
});

export default router;
