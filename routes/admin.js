const express = require("express");
const router = express.Router();
const pool = require("../db");
const authMiddleware = require("../middlewares/auth");

// Middleware admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== "ADMIN")
    return res.status(403).json({ error: "Accès refusé" });
  next();
};

// Lister toutes les maps (tous statuts)
router.get("/maps", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT maps.*, users.username as author
      FROM maps
      JOIN users ON maps.author_id = users.id
      ORDER BY maps.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Valider ou refuser une map
router.patch(
  "/maps/:id/status",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    const { status } = req.body;
    if (!["APPROVED", "REJECTED"].includes(status))
      return res.status(400).json({ error: "Statut invalide" });
    try {
      const result = await pool.query(
        "UPDATE maps SET status = $1 WHERE id = $2 RETURNING *",
        [status, req.params.id],
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  },
);

// Lister tous les utilisateurs
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Désactiver un utilisateur
router.patch(
  "/users/:id/disable",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      await pool.query("UPDATE users SET role = $1 WHERE id = $2", [
        "DISABLED",
        req.params.id,
      ]);
      res.json({ message: "Utilisateur désactivé" });
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur" });
    }
  },
);

module.exports = router;
