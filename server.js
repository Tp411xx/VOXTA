const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Route de test
app.get("/api/ping", (req, res) => {
  res.json({ message: "Backend OK !" });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log("Serveur lancé sur http://localhost:" + port);
});

module.exports = app;
