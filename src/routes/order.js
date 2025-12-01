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
  const payload = req.body;

  // 1. Terima dua format: array langsung atau { memberId, items, orderanke, delivered? }
  let rowsToInsert = [];
  let orderankeOverride = null;
  let deliveredFlag = false;

  if (Array.isArray(payload)) {
    rowsToInsert = payload;
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray(payload.items)
  ) {
    const memberId = parseInt(payload.memberId, 10);
    if (!memberId || memberId <= 0) {
      return res.status(400).json({ error: "memberId invalid" });
    }

    // 2. Cek member
    const { data: member, error: mErr } = await supabase
      .from("members")
      .select("nama, is_hangaround")
      .eq("id", memberId)
      .maybeSingle();
    if (mErr) return res.status(500).json({ error: mErr });
    if (!member)
      return res.status(404).json({ error: "member tidak ditemukan" });

    // 3. Cek order window kalau client tidak kirim orderanke
    if (!payload.orderanke) {
      const now = new Date().toISOString();
      const { data: win, error: wErr } = await supabase
        .from("order_windows")
        .select("orderanke")
        .eq("is_active", true)
        .lte("start_time", now)
        .gte("end_time", now)
        .order("orderanke", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (wErr || !win) {
        return res.status(400).json({ error: "Tidak ada periode order aktif" });
      }
      orderankeOverride = win.orderanke;
    } else {
      orderankeOverride = parseInt(payload.orderanke, 10);
    }

    // 4. Bangun rows
    const orderId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    rowsToInsert = payload.items
      .map((it) => ({
        order_id: orderId,
        member_id: memberId,
        nama: member.nama,
        item: String(it.itemName || it.itemId || "").trim(),
        qty: Number(it.qty || 0),
        orderanke: orderankeOverride,
        delivered: payload.delivered === true,
        waktu: new Date().toISOString(),
        harga: Number(it.harga || 0),
        subtotal: Number((it.harga || 0) * (it.qty || 0)),
        kategori: String(it.kategori || "").trim(),
      }))
      .filter((r) => r.item && r.qty > 0);

    if (rowsToInsert.length === 0) {
      return res.status(400).json({ error: "items kosong atau tidak valid" });
    }

    // 5. Validasi vest hangaround
    const isHang = member.is_hangaround;
    if (isHang) {
      const hasInvalidVest = rowsToInsert.some(
        (r) =>
          normItemName(r.item) === "VEST" &&
          !r.item.toUpperCase().includes("MEDIUM")
      );
      if (hasInvalidVest) {
        return res
          .status(400)
          .json({ error: "Hangaround hanya boleh VEST MEDIUM" });
      }
    }

    // 6. Validasi max 5 vest per orang di periode yg sama
    const vestInCart = rowsToInsert
      .filter((r) => isVestItem(r.item))
      .reduce((a, r) => a + r.qty, 0);
    if (vestInCart > 0) {
      const { data: existing } = await supabase
        .from("orders")
        .select("qty")
        .eq("nama", member.nama)
        .eq("orderanke", orderankeOverride)
        .ilike("item", "%VEST%");
      const existingVest = (existing || []).reduce(
        (a, r) => a + (r.qty || 0),
        0
      );
      if (existingVest + vestInCart > 5) {
        return res.status(400).json({
          error: `Maksimal VEST per orang 5. Tersisa ${Math.max(
            0,
            5 - existingVest
          )}.`,
        });
      }
    }

    // 7. Validasi qty max per item (jika client kirim maxQty)
    for (const it of payload.items) {
      if (typeof it.maxQty === "number") {
        const norm = normItemName(it.itemName || it.itemId);
        const cartQty = payload.items
          .filter((x) => normItemName(x.itemName || x.itemId) === norm)
          .reduce((a, x) => a + (x.qty || 0), 0);
        const { data: dbRows } = await supabase
          .from("orders")
          .select("qty")
          .eq("orderanke", orderankeOverride)
          .ilike("item", norm);
        const dbQty = (dbRows || []).reduce((a, r) => a + (r.qty || 0), 0);
        if (dbQty + cartQty > it.maxQty) {
          return res.status(400).json({
            error: `Maks ${it.itemName} ${it.maxQty}. Tersisa ${Math.max(
              0,
              it.maxQty - dbQty
            )}.`,
          });
        }
      }
    }
  } else {
    return res.status(400).json({
      error: "Body harus berupa array orders atau objek { memberId, items }",
    });
  }

  // 8. Insert
  const { data, error } = await supabase
    .from("orders")
    .insert(rowsToInsert)
    .select();
  if (error) return res.status(500).json({ error });
  res.json({ success: true, data });
});

// helper
function normItemName(name) {
  return String(name || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
function isVestItem(name) {
  return normItemName(name).includes("VEST");
}

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

router.get("/details", (req, res) => {
  const month = Number(req.query.month);
  const week = Number(req.query.week);
  const nameFilter = (req.query.name || "").toString().trim().toLowerCase();
  if (!month || !week)
    return res.status(400).json({ error: "month and week are required" });
  const orderanke = month * 10 + week;

  // Asumsikan 'orders' berisi { memberId, orderanke, items: [{ itemName, qty, harga }], created_at, order_no, delivered }
  const rows = [];
  for (const o of orders) {
    if (Number(o.orderanke) !== orderanke) continue;
    const mname =
      members.find((m) => String(m.id) === String(o.memberId))?.name ??
      "Unknown";
    if (nameFilter && !mname.toLowerCase().includes(nameFilter)) continue;
    for (const it of o.items || []) {
      rows.push({
        order_no:
          o.order_no ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        member_name: mname,
        created_at: o.created_at || new Date().toISOString(),
        item_name: it.itemName || it.itemId,
        qty: Number(it.qty || 0),
        subtotal: Number(it.harga || 0) * Number(it.qty || 0),
        delivered: Boolean(o.delivered),
      });
    }
  }
  // Urut terbaru
  rows.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json(rows);
});

export default router;

