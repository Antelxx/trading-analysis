require("dotenv").config();
const express = require("express");
const marketRoutes = require("./routes/market");
const analysisRoutes = require("./routes/analysis");

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});
app.use("/api/market", marketRoutes);
app.use("/api/analysis", analysisRoutes);

app.listen(3000, () => {
  console.log("API listening on http://localhost:3000");
});
