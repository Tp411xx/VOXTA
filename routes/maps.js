const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middlewares/auth");

// Lister les maps approuvées
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT maps.*, users.username as author FROM maps JOIN users ON maps.author_id = users.id WHERE maps.status = $1 ORDER BY maps.created_at DESC",
      ["APPROVED"],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Détail d'une map
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT maps.*, users.username as author FROM maps JOIN users ON maps.author_id = users.id WHERE maps.id = $1",
      [req.params.id],
    );
    if (!result.rows[0])
      return res.status(404).json({ error: "Map introuvable" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Ajouter une map (connecté uniquement)
router.post("/", authMiddleware, async (req, res) => {
  const { title, bpm, notes } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO maps (title, bpm, author_id, notes, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, bpm, req.user.id, notes, "PENDING"],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
