const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middlewares/auth");
const {
  ChartImportError,
  normalizeMapImport,
} = require("../services/chartImporter");

// Lister les maps approuvées
router.get("/", async (req, res) => {
  const userId = req.query.userId;
  try {
    let query;
    let params;

    if (userId) {
      query = `
        SELECT maps.*, users.username as author,
          best.best_score,
          best.nb_parties
        FROM maps
        JOIN users ON maps.author_id = users.id
        LEFT JOIN (
          SELECT map_id, MAX(score) as best_score, COUNT(*) as nb_parties
          FROM scores
          WHERE user_id = $1
          GROUP BY map_id
        ) best ON best.map_id = maps.id
        WHERE maps.status = 'APPROVED'
        ORDER BY maps.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT maps.*, users.username as author
        FROM maps
        JOIN users ON maps.author_id = users.id
        WHERE maps.status = 'APPROVED'
        ORDER BY maps.created_at DESC
      `;
      params = [];
    }

    const result = await pool.query(query, params);
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

router.post("/import", authMiddleware, async (req, res) => {
  try {
    const map = normalizeMapImport(req.body);
    const result = await pool.query(
      `
        INSERT INTO maps (
          title, bpm, author_id, notes, audio_src, key_count, note_count, status
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        map.title,
        map.bpm,
        req.user.id,
        JSON.stringify(map.notes),
        map.audioSrc,
        map.keyCount,
        map.noteCount,
        "PENDING",
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof ChartImportError) {
      return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/launch-engine", authMiddleware, async (req, res) => {
  // L'exe tourne sur la machine hôte Windows.
  // engine-launcher.js doit être lancé sur l'hôte : node engine-launcher.js
  // Docker accède à l'hôte via host.docker.internal (ou 172.17.0.1 en fallback).
  const hosts = [
    "http://host.docker.internal:9876/launch",
    "http://172.17.0.1:9876/launch",
  ];

  for (const url of hosts) {
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({ message: data.message || "CodenameEngine lancé !" });
      }
    } catch (_) {
      // essai suivant
    }
  }

  return res.status(503).json({
    error:
      "Impossible de joindre le lanceur local. Lancez engine-launcher.js sur votre machine Windows : node engine-launcher.js",
  });
});

module.exports = router;
