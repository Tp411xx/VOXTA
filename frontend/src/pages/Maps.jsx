import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Maps() {
  const [maps, setMaps] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  useEffect(() => {
    axios
      .get(`/api/maps?userId=${user?.id}`)
      .then((res) => setMaps(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Bibliothèque de maps</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/maps/import")}>Importer</button>
          <button onClick={() => navigate("/dashboard")}>Dashboard</button>
        </div>
      </div>
      {maps.length === 0 && <p>Aucune map disponible</p>}
      {maps.map((map) => (
        <div
          key={map.id}
          style={{
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
            background: "#1a1a2e",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 6px" }}>{map.title}</h2>
              <p style={{ margin: 0, color: "#aaa" }}>
                BPM : {map.bpm} | Auteur : {map.author}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              {map.best_score ? (
                <p style={{ margin: "0 0 8px", color: "gold" }}>
                  Meilleur : {map.best_score} ({map.nb_parties} partie(s))
                </p>
              ) : (
                <p style={{ margin: "0 0 8px", color: "#666" }}>Jamais jouée</p>
              )}
              <button onClick={() => navigate(`/play/${map.id}`)}>
                {map.best_score ? "Rejouer" : "▶ Jouer"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Maps;
