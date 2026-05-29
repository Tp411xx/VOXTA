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

router.get("/leaderboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT users.username,
        SUM(best.best_score) as total_score,
        SUM(best.nb_parties) as total_parties
      FROM (
        SELECT user_id, map_id, MAX(score) as best_score, COUNT(*) as nb_parties
        FROM scores
        GROUP BY user_id, map_id
      ) best
      JOIN users ON best.user_id = users.id
      GROUP BY users.id, users.username
      ORDER BY total_score DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/me/map/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT score, perfects, goods, misses, played_at
      FROM scores
      WHERE user_id = $1 AND map_id = $2
      ORDER BY played_at DESC
    `,
      [req.user.id, req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT DISTINCT ON (scores.map_id)
        scores.map_id,
        maps.title as map_title,
        MAX(scores.score) as best_score,
        COUNT(scores.id) OVER (PARTITION BY scores.map_id) as nb_parties
      FROM scores
      JOIN maps ON scores.map_id = maps.id
      WHERE scores.user_id = $1
      GROUP BY scores.map_id, maps.title, scores.id
      ORDER BY scores.map_id, best_score DESC
    `,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/map/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT users.username, scores.score, scores.perfects, scores.goods, scores.misses, scores.played_at
      FROM scores
      JOIN users ON scores.user_id = users.id
      WHERE scores.map_id = $1
      ORDER BY scores.score DESC
      LIMIT 10
    `,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
