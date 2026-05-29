import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [allMaps, setAllMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [mapLeaderboard, setMapLeaderboard] = useState([]);

  useEffect(() => {
    axios
      .get("/api/scores/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setHistory(res.data));

    axios
      .get("/api/scores/leaderboard")
      .then((res) => setLeaderboard(res.data)); // ← cette ligne manquait

    axios.get("/api/maps").then((res) => setAllMaps(res.data));
  }, []);

  const selectMap = async (mapId) => {
    setSelectedMap(mapId);
    const res = await axios.get(`/api/scores/map/${mapId}`);
    setMapLeaderboard(res.data);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const [expandedMap, setExpandedMap] = useState(null);
  const [mapHistory, setMapHistory] = useState([]);

  const toggleMap = async (mapId) => {
    if (expandedMap === mapId) {
      setExpandedMap(null);
      return;
    }
    setExpandedMap(mapId);
    const res = await axios.get(`/api/scores/me/map/${mapId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setMapHistory(res.data);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Bienvenue {user?.username} !</h1>
        <div>
          <button
            onClick={() => navigate("/maps")}
            style={{ marginRight: "10px" }}
          >
            Jouer
          </button>
          <button onClick={handleLogout}>Se déconnecter</button>
        </div>
      </div>

      {user?.role === "ADMIN" && (
        <button
          onClick={() => navigate("/admin")}
          style={{ marginRight: "10px" }}
        >
          Panel Admin
        </button>
      )}

      <h2>Mes maps jouées</h2>
      {history.length === 0 && <p>Aucune partie jouée pour l'instant.</p>}
      {history.map((s) => (
        <div
          key={s.map_id}
          style={{
            marginBottom: "8px",
            border: "1px solid #333",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            onClick={() => toggleMap(s.map_id)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              background: "#1a1a2e",
            }}
          >
            <span>{s.map_title}</span>
            <span>
              Meilleur score : <strong>{s.best_score}</strong> | {s.nb_parties}{" "}
              partie(s) {expandedMap === s.map_id ? "▲" : "▼"}
            </span>
          </div>
          {expandedMap === s.map_id && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Score</th>
                  <th style={th}>Perfect</th>
                  <th style={th}>Good</th>
                  <th style={th}>Miss</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {mapHistory.map((h, i) => (
                  <tr key={i}>
                    <td style={td}>{h.score}</td>
                    <td style={td}>{h.perfects}</td>
                    <td style={td}>{h.goods}</td>
                    <td style={td}>{h.misses}</td>
                    <td style={td}>
                      {new Date(h.played_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <h2>Classement global</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Joueur</th>
            <th style={th}>Score total</th>
            <th style={th}>Parties</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((row, i) => (
            <tr
              key={i}
              style={{
                background:
                  row.username === user?.username ? "#2a2a4a" : "transparent",
              }}
            >
              <td style={td}>{i + 1}</td>
              <td style={td}>{row.username}</td>
              <td style={td}>{row.total_score}</td>
              <td style={td}>{row.total_parties}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Classement par map</h2>
      <select
        onChange={(e) => selectMap(e.target.value)}
        defaultValue=""
        style={{
          padding: "8px",
          marginBottom: "16px",
          background: "#1a1a2e",
          color: "white",
          border: "1px solid #444",
          borderRadius: "6px",
          width: "100%",
        }}
      >
        <option value="" disabled>
          Choisir une map...
        </option>
        {allMaps.map((map) => (
          <option key={map.id} value={map.id}>
            {map.title} — {map.bpm} BPM
          </option>
        ))}
      </select>

      {selectedMap &&
        (mapLeaderboard.length === 0 ? (
          <p>Aucun score sur cette map pour l'instant.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Joueur</th>
                <th style={th}>Meilleur score</th>
                <th style={th}>Perfect</th>
                <th style={th}>Good</th>
                <th style={th}>Miss</th>
              </tr>
            </thead>
            <tbody>
              {mapLeaderboard.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      row.username === user?.username
                        ? "#2a2a4a"
                        : "transparent",
                  }}
                >
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{row.username}</td>
                  <td style={td}>{row.score}</td>
                  <td style={td}>{row.perfects}</td>
                  <td style={td}>{row.goods}</td>
                  <td style={td}>{row.misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </div>
  );
}

const th = {
  padding: "8px",
  borderBottom: "1px solid #444",
  textAlign: "left",
  color: "#aaa",
};
const td = { padding: "8px", borderBottom: "1px solid #333" };

export default Dashboard;
