const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middlewares/auth");

router.post("/", authMiddleware, async (req, res) => {
  const { map_id, score, perfects, goods, misses } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO scores (user_id, map_id, score, perfects, goods, misses) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.user.id, map_id, score, perfects, goods, misses],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
