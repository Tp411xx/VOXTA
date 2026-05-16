const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Route de test
app.get("/api/ping", (req, res) => {
  res.json({ message: "Backend OK !" });
});

const authMiddleware = require("./middlewares/auth");

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ message: "Connecté !", user: req.user });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("Serveur lancé sur http://localhost:" + port);
});

const mapsRoutes = require("./routes/maps");
app.use("/api/maps", mapsRoutes);

const scoresRoutes = require("./routes/scores");
app.use("/api/scores", scoresRoutes);

module.exports = app;
