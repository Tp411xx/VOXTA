const { Server } = require("socket.io");
const { createServer } = require("http");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("./config/env");
const pool = require("./db");

const port = process.env.PORT || 5001;
const host = process.env.HOST || "0.0.0.0";

const origin = `http://${host}:${port}`;
const socketOrigin = process.env.CLIENT_ORIGIN || "*";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: socketOrigin,
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
app.use(cors());
app.use(express.json({ limit: "40mb" }));

const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

app.get("/api/ping", (req, res) => {
  res.json({ message: "Backend OK !" });
});

const authMiddleware = require("./middlewares/auth");

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ message: "Connecte !", user: req.user });
});

const mapsRoutes = require("./routes/maps");
app.use("/api/maps", mapsRoutes);

const scoresRoutes = require("./routes/scores");
app.use("/api/scores", scoresRoutes);

const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Token manquant"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query("SELECT id, role FROM users WHERE id = $1", [
      decoded.id,
    ]);
    const user = result.rows[0];

    if (!user) {
      return next(new Error("Utilisateur introuvable"));
    }

    if (user.role === "DISABLED") {
      return next(new Error("Compte desactive"));
    }

    socket.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(new Error("Token invalide"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  console.log(`connected user ${socket.user.id}`);

  socket.on("disconnect", () => {
    console.log(`disconnected user ${socket.user.id}`);
  });
});

if (require.main === module) {
  server.listen(port, host, () => {
    console.log(`Serveur lance sur ${origin}`);
  });
}

module.exports = app;
