import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Maps() {
  const [maps, setMaps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/maps")
      .then((res) => setMaps(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1>Bibliothèque de maps</h1>
      {maps.length === 0 && <p>Aucune map disponible</p>}
      {maps.map((map) => (
        <div
          key={map.id}
          style={{ border: "1px solid gray", margin: "10px", padding: "10px" }}
        >
          <h2>{map.title}</h2>
          <p>
            BPM : {map.bpm} | Auteur : {map.author}
          </p>
          <button onClick={() => navigate(`/play/${map.id}`)}>Jouer</button>
        </div>
      ))}
    </div>
  );
}

export default Maps;
