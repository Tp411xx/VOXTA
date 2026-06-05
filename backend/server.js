const express = require("express");
const cors = require("cors");
require("./config/env");

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

app.get("/api/ping", (req, res) => {
  res.json({ message: "Backend OK !" });
});

const authMiddleware = require("./middlewares/auth");

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ message: "Connecte !", user: req.user });
});

const port = process.env.PORT || 5001;
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`Serveur lance sur http://${host}:${port}`);
});

const mapsRoutes = require("./routes/maps");
app.use("/api/maps", mapsRoutes);

const scoresRoutes = require("./routes/scores");
app.use("/api/scores", scoresRoutes);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

module.exports = app;
