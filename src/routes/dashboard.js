import express from "express";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const month = req.query.month ? Number(req.query.month) : null;
  const week = req.query.week ? Number(req.query.week) : null;
  const nameFilter = (req.query.name || "").toString().trim().toLowerCase();
  let orderanke = req.query.orderanke ? Number(req.query.orderanke) : null;
  if (!orderanke) {
    if (!month || !week) return res.status(400).json({ error: "orderanke atau (month dan week) diperlukan" });
    orderanke = month * 10 + week;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("nama,item,qty,harga,subtotal,orderanke")
    .eq("orderanke", orderanke);
  if (error) return res.status(500).json({ error });

  const grouped = new Map();
  for (const row of data || []) {
    const mname = row.nama || "Unknown";
    if (nameFilter && !mname.toLowerCase().includes(nameFilter)) continue;
    if (!grouped.has(mname)) grouped.set(mname, []);
    grouped.get(mname).push(row);
  }

  const result = [];
  for (const [mname, list] of grouped.entries()) {
    const itemAgg = new Map();
    let total = 0;
    for (const r of list) {
      const key = r.item || "Unknown";
      const prev = itemAgg.get(key) || { qty: 0, subtotal: 0 };
      prev.qty += Number(r.qty || 0);
      prev.subtotal += Number(r.subtotal || (Number(r.harga || 0) * Number(r.qty || 0)) || 0);
      itemAgg.set(key, prev);
      total += Number(r.subtotal || (Number(r.harga || 0) * Number(r.qty || 0)) || 0);
    }
    result.push({
      member_name: mname,
      items: Array.from(itemAgg.entries()).map(([name, v]) => ({ name, qty: v.qty, subtotal: v.subtotal })),
      total,
    });
  }

  res.json(result);
});

router.post("/discord", async (req, res) => {
  res.json({ ok: true });
});

export default router;
