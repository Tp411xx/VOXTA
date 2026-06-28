/**
 * Lanceur local pour CodenameEngine.exe
 * A exécuter sur la machine Windows hôte : node engine-launcher.js
 * Écoute sur le port 9876 et lance CodenameEngine.exe à la demande.
 */
const http = require("http");
const path = require("path");
const { exec } = require("child_process");

const PORT = 9876;
const exePath = path.resolve(
  __dirname,
  "Codename.Engine-Windows",
  "CodenameEngine.exe",
);

const server = http.createServer((req, res) => {
  // CORS pour autoriser les appels depuis Docker
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "POST" && req.url === "/launch") {
    console.log("[launcher] Lancement de CodenameEngine.exe...");
    exec(`"${exePath}"`, { cwd: path.dirname(exePath) }, (error) => {
      if (error) console.error("[launcher] Erreur:", error.message);
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ message: "CodenameEngine lancé !" }));
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[launcher] En écoute sur http://127.0.0.1:${PORT}`);
  console.log(`[launcher] Exe cible : ${exePath}`);
});
