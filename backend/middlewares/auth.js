const jwt = require("jsonwebtoken");
const pool = require("../db");

module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token manquant" });

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: "Token invalide" });
  }

  try {
    const result = await pool.query("SELECT id, role FROM users WHERE id = $1", [
      decoded.id,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }

    if (user.role === "DISABLED") {
      return res.status(403).json({ error: "Compte desactive" });
    }

    req.user = { ...decoded, role: user.role };
    next();
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
};
