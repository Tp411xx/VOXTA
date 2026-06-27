import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Lecture de la musique impossible"));
    reader.readAsDataURL(file);
  });
}

function filenameToTitle(file) {
  return file?.name?.replace(/\.[^.]+$/, "") || "";
}

function ImportMap() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState(120);
  const [chartFile, setChartFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioSrc, setAudioSrc] = useState("/song.mp3");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChartChange = (event) => {
    const file = event.target.files?.[0] || null;
    setChartFile(file);
    if (file && !title.trim()) setTitle(filenameToTitle(file));
  };

  const submitMap = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!chartFile) {
      setError("Choisis un fichier JSON de map.");
      return;
    }

    try {
      setSubmitting(true);
      const chartText = await readFileAsText(chartFile);
      const chart = JSON.parse(chartText);
      const music = audioFile ? await readFileAsDataUrl(audioFile) : audioSrc;

      const res = await axios.post(
        "/api/maps/import",
        {
          title,
          bpm,
          audioSrc: music,
          chart,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setMessage(
        `Map envoyee a l'admin avec ${res.data.note_count} notes a tester.`,
      );
      setChartFile(null);
      setAudioFile(null);
    } catch (err) {
      setError(err.response?.data?.error || "Import impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "760px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <h1>Importer une map</h1>
        <button onClick={() => navigate("/maps")}>Bibliotheque</button>
      </div>

      <form
        onSubmit={submitMap}
        style={{
          display: "grid",
          gap: "14px",
          padding: "18px",
          border: "1px solid #333",
          borderRadius: "8px",
          background: "#1a1a2e",
          textAlign: "left",
        }}
      >
        <label style={labelStyle}>
          Titre
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          BPM
          <input
            type="number"
            min="1"
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Fichier JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleChartChange}
            required
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Fichier musique
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Chemin ou URL de musique
          <input
            value={audioSrc}
            onChange={(event) => setAudioSrc(event.target.value)}
            disabled={Boolean(audioFile)}
            placeholder="/song.mp3"
            style={inputStyle}
          />
        </label>

        {error && <p style={{ color: "#e57373" }}>{error}</p>}
        {message && <p style={{ color: "#81c784" }}>{message}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px 16px",
            background: "#4fc3f7",
            color: "#08111a",
            border: "none",
            borderRadius: "6px",
            cursor: submitting ? "default" : "pointer",
            fontWeight: "bold",
          }}
        >
          {submitting ? "Import en cours..." : "Envoyer a l'admin"}
        </button>
      </form>
    </div>
  );
}

const labelStyle = {
  display: "grid",
  gap: "6px",
  color: "#ddd",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  background: "#111827",
  color: "white",
  border: "1px solid #444",
  borderRadius: "6px",
};

export default ImportMap;
