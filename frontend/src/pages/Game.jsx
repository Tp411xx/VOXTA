/* eslint-disable */
import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import * as Tone from "tone";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const LANES = 5;
const LANE_WIDTH = 120;
const CANVAS_HEIGHT = 600;
const NOTE_SPEED = 300;
const HIT_ZONE_Y = CANVAS_HEIGHT - 80;
const HIT_TOLERANCE = 0.12;
const KEYS = ["d", "f", " ", "j", "k"];
const COLORS = [0x4fc3f7, 0x81c784, 0xffffff, 0xffb74d, 0xf06292];

function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const playerRef = useRef(null);
  const notesRef = useRef([]);
  const scoreRef = useRef({ score: 0, perfects: 0, goods: 0, misses: 0 });
  const gameOverRef = useRef(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [judgment, setJudgment] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [started, setStarted] = useState(false);

  // Charger la map
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/maps/${id}`)
      .then((res) => setMapData(res.data))
      .catch(() => navigate("/maps"));
  }, [id]);

  // Init PixiJS + préparer les notes (sans lancer la musique)
  useEffect(() => {
    if (!mapData || !canvasRef.current) return;

    const timer = setTimeout(() => {
      const app = new PIXI.Application({
        width: LANES * LANE_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: 0x1a1a2e,
        view: canvasRef.current,
        antialias: true,
      });
      appRef.current = app;

      // Dessiner les lanes
      const graphics = new PIXI.Graphics();
      for (let i = 0; i < LANES; i++) {
        graphics.lineStyle(1, 0x444444);
        graphics.moveTo(i * LANE_WIDTH, 0);
        graphics.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
      }
      graphics.lineStyle(2, 0xffffff, 0.5);
      graphics.moveTo(0, HIT_ZONE_Y);
      graphics.lineTo(LANES * LANE_WIDTH, HIT_ZONE_Y);
      app.stage.addChild(graphics);

      // Labels touches
      KEYS.forEach((key, i) => {
        const text = new PIXI.Text(key.toUpperCase(), {
          fill: 0xffffff,
          fontSize: 16,
        });
        text.x = i * LANE_WIDTH + LANE_WIDTH / 2 - 8;
        text.y = HIT_ZONE_Y + 20;
        app.stage.addChild(text);
      });

      // Préparer les notes
      const noteSprites = mapData.notes.map((note) => {
        const g = new PIXI.Graphics();
        g.beginFill(COLORS[note.lane]);
        g.drawRoundedRect(0, 0, LANE_WIDTH - 10, 20, 5);
        g.endFill();
        g.x = note.lane * LANE_WIDTH + 5;
        g.y = -30;
        g.visible = false;
        app.stage.addChild(g);
        return { ...note, sprite: g, hit: false };
      });
      notesRef.current = noteSprites;

      // Préparer le player audio
      playerRef.current = new Tone.Player("/song.mp3").toDestination();
    }, 100);

    return () => {
      clearTimeout(timer);
      Tone.Transport.stop();
      Tone.Transport.cancel();
      if (playerRef.current) playerRef.current.dispose();
      if (appRef.current) appRef.current.destroy(true);
    };
  }, [mapData]);

  // Lancer la partie au clic
  const startGame = async () => {
    await Tone.start();
    setStarted(true);

    const app = appRef.current;
    const noteSprites = notesRef.current;

    // Lancer la musique
    await Tone.loaded();
    Tone.Transport.start();
    playerRef.current.sync().start(0);

    const lastNoteTime = Math.max(...mapData.notes.map((n) => n.time));

    // Game loop
    app.ticker.add(() => {
      if (gameOverRef.current) return;
      const now = Tone.Transport.seconds;

      noteSprites.forEach((note) => {
        if (note.hit) return;
        const timeUntilHit = note.time - now;
        const y = HIT_ZONE_Y - timeUntilHit * NOTE_SPEED;
        note.sprite.y = y;
        note.sprite.visible = y > -30 && y < CANVAS_HEIGHT;

        if (timeUntilHit < -HIT_TOLERANCE && !note.hit) {
          note.hit = true;
          scoreRef.current.misses++;
          showJudgment("Miss");
        }
      });

      const allDone = noteSprites.every((n) => n.hit);
      if (allDone && now > lastNoteTime + 1) endGame();
    });

    // Touches clavier
    const handleKey = (e) => {
      if (gameOverRef.current) return;
      const laneIndex = KEYS.indexOf(e.key.toLowerCase());
      if (laneIndex === -1) return;
      const now = Tone.Transport.seconds;

      let closest = null;
      let minDiff = Infinity;
      notesRef.current.forEach((note) => {
        if (note.hit || note.lane !== laneIndex) return;
        const diff = Math.abs(note.time - now);
        if (diff < minDiff) {
          minDiff = diff;
          closest = note;
        }
      });

      if (closest && minDiff <= HIT_TOLERANCE * 2) {
        closest.hit = true;
        closest.sprite.visible = false;
        if (minDiff <= HIT_TOLERANCE) {
          scoreRef.current.perfects++;
          scoreRef.current.score += 300;
          showJudgment("Perfect!");
        } else {
          scoreRef.current.goods++;
          scoreRef.current.score += 100;
          showJudgment("Good");
        }
        setDisplayScore(scoreRef.current.score);
      }
    };
    window.addEventListener("keydown", handleKey);
  };

  const showJudgment = (text) => {
    setJudgment(text);
    setTimeout(() => setJudgment(""), 500);
  };

  const endGame = async () => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    setGameOver(true);
    Tone.Transport.stop();
    const token = localStorage.getItem("token");
    await axios.post(
      "http://localhost:5000/api/scores",
      {
        map_id: id,
        ...scoreRef.current,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  };

  if (gameOver)
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <h1>Partie terminée !</h1>
        <p>Score : {scoreRef.current.score}</p>
        <p>
          Perfect : {scoreRef.current.perfects} | Good :{" "}
          {scoreRef.current.goods} | Miss : {scoreRef.current.misses}
        </p>
        <button onClick={() => navigate("/maps")}>Retour aux maps</button>
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <h2>{mapData?.title}</h2>
      <p>Score : {displayScore}</p>
      <p
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          minHeight: "30px",
          color:
            judgment === "Perfect!"
              ? "gold"
              : judgment === "Good"
                ? "lightgreen"
                : "red",
        }}
      >
        {judgment}
      </p>
      {!started && mapData && (
        <button
          onClick={startGame}
          style={{
            fontSize: "20px",
            padding: "10px 30px",
            marginBottom: "20px",
            cursor: "pointer",
          }}
        >
          ▶ Lancer la partie
        </button>
      )}
      <canvas
        ref={canvasRef}
        style={{ display: "block", border: "1px solid #444" }}
      />
    </div>
  );
}

export default Game;
