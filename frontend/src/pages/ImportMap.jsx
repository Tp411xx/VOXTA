import { useState, useRef } from "react";
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
    reader.onerror = () =>
      reject(new Error("Lecture de la musique impossible"));
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

  const chartInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const handleCreateFile = async () => {
    try {
      setError("");
      setMessage("");
      const res = await axios.post(
        "/api/maps/launch-engine",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setMessage(res.data.message || "CodenameEngine lancé !");
    } catch (err) {
      setError(
        err.response?.data?.error || "Impossible de lancer CodenameEngine.",
      );
    }
  };

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
        { title, bpm, audioSrc: music, chart },
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
        style={{ background: "#1a1a2e", gap: "14px", textAlign: "left" }}
      >
        <label style={labelStyle}>
          Titre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </label>

        <label style={labelStyle}>
          BPM
          <input
            type="number"
            min="1"
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
          />
        </label>

        <div style={labelStyle}>
          Fichier JSON
          <input
            ref={chartInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleChartChange}
            required
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
            <div
              style={fileRowStyle}
              onClick={() => chartInputRef.current?.click()}
            >
              <button type="button" tabIndex={-1} style={filePickerStyle}>
                Choisir un fichier
              </button>
              <span style={fileNameStyle}>
                {chartFile ? chartFile.name : "Aucun fichier choisi"}
              </span>
            </div>
            <button type="button" onClick={handleCreateFile}>
              Créer un fichier
            </button>
          </div>
        </div>

        <div style={labelStyle}>
          Fichier musique
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
          <div
            style={fileRowStyle}
            onClick={() => audioInputRef.current?.click()}
          >
            <button type="button" tabIndex={-1} style={filePickerStyle}>
              Choisir un fichier
            </button>
            <span style={fileNameStyle}>
              {audioFile ? audioFile.name : "Aucun fichier choisi"}
            </span>
          </div>
        </div>

        <label style={labelStyle}>
          Chemin ou URL de musique
          <input
            value={audioSrc}
            onChange={(e) => setAudioSrc(e.target.value)}
            disabled={Boolean(audioFile)}
            placeholder="/song.mp3"
          />
        </label>

        {error && <p style={{ color: "#e57373" }}>{error}</p>}
        {message && <p style={{ color: "#81c784" }}>{message}</p>}

        <button type="submit" disabled={submitting}>
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
  width: "100%",
};

const fileRowStyle = {
  display: "flex",
  alignItems: "stretch",
  background: "#16151f",
  border: "2px solid #2d2b38",
  borderRadius: "12px",
  overflow: "hidden",
  cursor: "pointer",
  flexGrow: 1,
  transition: "border-color 0.25s ease",
};

const filePickerStyle = {
  borderRadius: "10px 0 0 10px !important",
  flexShrink: 0,
  pointerEvents: "none",
};

const fileNameStyle = {
  display: "flex",
  alignItems: "center",
  padding: "0 14px",
  fontSize: "14px",
  color: "#888",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export default ImportMap;
