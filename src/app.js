import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import ordersRoute from "./routes/orders.js";
import membersRoute from "./routes/members.js";
import windowsRoute from "./routes/windows.js";

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Routes
app.use("/api/orders", ordersRoute);
app.use("/api/members", membersRoute);
app.use("/api/windows", windowsRoute);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Order API backend is running!",
    version: "1.0.0",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
