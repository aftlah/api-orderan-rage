import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import ordersRoute from "./routes/order.js";
import membersRoute from "./routes/member.js";
import windowsRoute from "./routes/window.js";
import authRoute from "./routes/auth.js";
import dashboardRoute from "./routes/dashboard.js";

const app = express();

// Middleware
app.use(cors({
  origin: ['https://rage-site.aftlah.my.id'],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

// Routes
app.use("/api/orders", ordersRoute);
app.use("/api/members", membersRoute);
app.use("/api/windows", windowsRoute);
app.use("/api/auth", authRoute);
app.use("/api/dashboard", dashboardRoute);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Order API backend is running!",
    version: "1.0.0",
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
