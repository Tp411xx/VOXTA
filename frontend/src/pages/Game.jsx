/* eslint-disable */
import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import * as Tone from "tone";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const LANES = 4;
const LANE_WIDTH = 120;
const CANVAS_HEIGHT = 600;
const NOTE_SPEED = 300;
const HIT_ZONE_Y = CANVAS_HEIGHT - 80;
const HIT_TOLERANCE = 0.12;
const KEYS = ["d", "f", "j", "k"];
const KEY_LABELS = ["D", "F", "J", "K"];
const COLORS = [0x4fc3f7, 0x81c784, 0xffb74d, 0xf06292];

function Game() {
  const { id } = useParams();
  const navigate = useNavigate();
  const gameAreaRef = useRef(null);
  const appRef = useRef(null);
  const playerRef = useRef(null);
  const keyHandlerRef = useRef(null);
  const keyUpHandlerRef = useRef(null);
  const tickerHandlerRef = useRef(null);
  const notesRef = useRef([]);
  const activeHoldsRef = useRef(new Map());
  const scoreRef = useRef({ score: 0, perfects: 0, goods: 0, misses: 0 });
  const gameOverRef = useRef(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [judgment, setJudgment] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [mapData, setMapData] = useState(null);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ perfects: 0, goods: 0, misses: 0 });

  const removeKeyboardListener = () => {
    if (keyHandlerRef.current) {
      window.removeEventListener("keydown", keyHandlerRef.current);
      keyHandlerRef.current = null;
    }

    if (keyUpHandlerRef.current) {
      window.removeEventListener("keyup", keyUpHandlerRef.current);
      keyUpHandlerRef.current = null;
    }
  };

  // Charger la map et repartir d'un etat propre a chaque navigation.
  useEffect(() => {
    let cancelled = false;

    setMapData(null);
    setStarted(false);
    setGameOver(false);
    setDisplayScore(0);
    setJudgment("");
    setStats({ perfects: 0, goods: 0, misses: 0 });
    gameOverRef.current = false;
    scoreRef.current = { score: 0, perfects: 0, goods: 0, misses: 0 };
    notesRef.current = [];
    activeHoldsRef.current.clear();
    removeKeyboardListener();

    axios
      .get(`/api/maps/${id}`)
      .then((res) => {
        if (!cancelled) setMapData(res.data);
      })
      .catch(() => {
        if (!cancelled) navigate("/maps");
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // Init PixiJS + preparer les notes (sans lancer la musique).
  useEffect(() => {
    const container = gameAreaRef.current;
    if (!mapData || !container) return;

    container.innerHTML = "";

    const app = new PIXI.Application({
      width: LANES * LANE_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    appRef.current = app;
    container.appendChild(app.view);

    // Dessiner les lanes.
    const graphics = new PIXI.Graphics();
    for (let i = 0; i <= LANES; i++) {
      graphics.lineStyle(1, 0x444444);
      graphics.moveTo(i * LANE_WIDTH, 0);
      graphics.lineTo(i * LANE_WIDTH, CANVAS_HEIGHT);
    }
    graphics.lineStyle(2, 0xffffff, 0.5);
    graphics.moveTo(0, HIT_ZONE_Y);
    graphics.lineTo(LANES * LANE_WIDTH, HIT_ZONE_Y);
    app.stage.addChild(graphics);

    // Labels des touches.
    KEY_LABELS.forEach((label, i) => {
      const text = new PIXI.Text(label, {
        fill: 0xffffff,
        fontSize: label === "SPACE" ? 13 : 16,
      });
      text.anchor.set(0.5);
      text.x = i * LANE_WIDTH + LANE_WIDTH / 2;
      text.y = HIT_ZONE_Y + 30;
      app.stage.addChild(text);
    });

    const notes = Array.isArray(mapData.notes) ? mapData.notes : [];

    // Preparer les notes.
    notesRef.current = notes.map((note) => {
      const laneFromNote = Number.isFinite(Number(note.lane))
        ? Number(note.lane)
        : Number(note.id) - 1;
      const lane = Number.isInteger(laneFromNote) ? laneFromNote : -1;
      const time = Number(note.time);
      const holdSeconds = Math.max(
        0,
        Number(note.sLen ?? note.duration ?? note.holdTime ?? 0),
      );

      if (lane < 0 || lane >= LANES || !Number.isFinite(time)) {
        return null;
      }

      const noteHeight = Math.max(20, 20 + holdSeconds * NOTE_SPEED);
      const g = new PIXI.Graphics();
      g.beginFill(COLORS[lane] ?? 0xffffff);
      g.drawRoundedRect(0, -noteHeight + 20, LANE_WIDTH - 10, noteHeight, 5);
      g.endFill();
      g.x = lane * LANE_WIDTH + 5;
      g.y = -30;
      g.visible = false;
      app.stage.addChild(g);
      return {
        ...note,
        lane,
        time,
        sLen: holdSeconds,
        renderHeight: noteHeight,
        sprite: g,
        hit: false,
        started: false,
      };
    }).filter(Boolean);

    playerRef.current = new Tone.Player(
      mapData.audio_src || mapData.audioSrc || "/song.mp3",
    ).toDestination();

    return () => {
      Tone.Transport.stop();
      Tone.Transport.cancel();
      removeKeyboardListener();

      if (tickerHandlerRef.current) {
        app.ticker.remove(tickerHandlerRef.current);
        tickerHandlerRef.current = null;
      }

      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      app.destroy(true, { children: true });
      if (appRef.current === app) appRef.current = null;
    };
  }, [mapData]);

  // Lancer la partie au clic.
  const startGame = async () => {
    if (!appRef.current || !playerRef.current || !mapData || started) return;

    await Tone.start();
    setStarted(true);

    const app = appRef.current;
    const noteSprites = notesRef.current;

    await Tone.loaded();
    Tone.Transport.start();
    playerRef.current.sync().start(0);

    const lastNoteTime =
      noteSprites.length > 0
        ? Math.max(...noteSprites.map((n) => n.time + n.sLen))
        : 0;

    const finishNote = (note, text, points) => {
      if (note.hit) return;

      note.hit = true;
      note.sprite.visible = false;
      activeHoldsRef.current.delete(note.lane);

      if (text === "Perfect!") {
        scoreRef.current.perfects++;
      } else {
        scoreRef.current.goods++;
      }

      scoreRef.current.score += points;
      showJudgment(text);
      setDisplayScore(scoreRef.current.score);
      setStats({
        perfects: scoreRef.current.perfects,
        goods: scoreRef.current.goods,
        misses: scoreRef.current.misses,
      });
    };

    const missNote = (note) => {
      if (note.hit) return;

      note.hit = true;
      note.sprite.visible = false;
      activeHoldsRef.current.delete(note.lane);
      scoreRef.current.misses++;
      showJudgment("Miss");
      setStats({
        perfects: scoreRef.current.perfects,
        goods: scoreRef.current.goods,
        misses: scoreRef.current.misses,
      });
    };

    const completeHold = (note, endDiff = 0) => {
      const diff = Math.max(note.startDiff ?? 0, endDiff);
      if (diff <= HIT_TOLERANCE) {
        finishNote(note, "Perfect!", 400);
      } else {
        finishNote(note, "Good", 150);
      }
    };

    const tickerHandler = () => {
      if (gameOverRef.current) return;
      const now = Tone.Transport.seconds;

      noteSprites.forEach((note) => {
        if (note.hit) return;
        const timeUntilHit = note.time - now;
        const y = HIT_ZONE_Y - timeUntilHit * NOTE_SPEED;
        note.sprite.y = y;
        note.sprite.visible =
          y > -note.renderHeight - 30 && y < CANVAS_HEIGHT + 30;

        if (note.sLen > 0) {
          const endTime = note.time + note.sLen;

          if (!note.started && timeUntilHit < -HIT_TOLERANCE) {
            missNote(note);
            return;
          }

          if (note.started && now >= endTime - HIT_TOLERANCE) {
            completeHold(note, Math.abs(endTime - now));
          }

          return;
        }

        if (timeUntilHit < -HIT_TOLERANCE) {
          missNote(note);
        }
      });

      const allDone = noteSprites.every((n) => n.hit);
      if (allDone && now > lastNoteTime + 1) endGame();
    };

    tickerHandlerRef.current = tickerHandler;
    app.ticker.add(tickerHandler);

    const handleKey = (e) => {
      if (gameOverRef.current || e.repeat) return;
      const laneIndex = KEYS.indexOf(e.key.toLowerCase());
      if (laneIndex === -1) return;

      e.preventDefault();
      const now = Tone.Transport.seconds;

      let closest = null;
      let minDiff = Infinity;
      notesRef.current.forEach((note) => {
        if (note.hit || note.started || note.lane !== laneIndex) return;
        const diff = Math.abs(note.time - now);
        if (diff < minDiff) {
          minDiff = diff;
          closest = note;
        }
      });

      if (closest && minDiff <= HIT_TOLERANCE * 2) {
        if (closest.sLen > 0) {
          closest.started = true;
          closest.startDiff = minDiff;
          activeHoldsRef.current.set(laneIndex, closest);
          showJudgment("Hold");
        } else if (minDiff <= HIT_TOLERANCE) {
          finishNote(closest, "Perfect!", 300);
        } else {
          finishNote(closest, "Good", 100);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (gameOverRef.current) return;
      const laneIndex = KEYS.indexOf(e.key.toLowerCase());
      if (laneIndex === -1) return;

      const note = activeHoldsRef.current.get(laneIndex);
      if (!note || note.hit) return;

      e.preventDefault();
      const now = Tone.Transport.seconds;
      const endTime = note.time + note.sLen;

      if (now < endTime - HIT_TOLERANCE) {
        missNote(note);
      } else {
        completeHold(note, Math.abs(endTime - now));
      }
    };

    keyHandlerRef.current = handleKey;
    keyUpHandlerRef.current = handleKeyUp;
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKeyUp);
  };

  const showJudgment = (text) => {
    setJudgment(text);
    setTimeout(() => setJudgment(""), 500);
  };

  const endGame = async () => {
    if (gameOverRef.current) return;

    gameOverRef.current = true;
    setGameOver(true);
    removeKeyboardListener();
    Tone.Transport.stop();

    const token = localStorage.getItem("token");
    await axios.post(
      "/api/scores",
      {
        map_id: id,
        ...scoreRef.current,
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  };

  if (gameOver)
    return (
      <div className="game-page-container game-results-page">
        <div className="game-results-card">
          <span className="results-label">PARTIE TERMINÉE</span>
          <h1 className="results-title">{mapData?.title}</h1>
          
          <div className="results-score-box">
            <span className="results-score-label">SCORE FINAL</span>
            <span className="results-score-value">{scoreRef.current.score}</span>
          </div>

          <div className="results-stats-grid">
            <div className="results-stat-item perfect">
              <span className="results-stat-name">PERFECT</span>
              <span className="results-stat-count">{scoreRef.current.perfects}</span>
            </div>
            <div className="results-stat-item good">
              <span className="results-stat-name">GOOD</span>
              <span className="results-stat-count">{scoreRef.current.goods}</span>
            </div>
            <div className="results-stat-item miss">
              <span className="results-stat-name">MISS</span>
              <span className="results-stat-count">{scoreRef.current.misses}</span>
            </div>
          </div>

          <div className="results-actions">
            <button className="results-btn primary" onClick={() => window.location.reload()}>
              Rejouer
            </button>
            <button className="results-btn secondary" onClick={() => navigate("/maps")}>
              Retour aux maps
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="game-page-container">
      <div className="game-sidebar">
        <div className="game-sidebar-content">
          <button className="game-back-btn" onClick={() => navigate("/maps")}>
            ← Retour aux maps
          </button>
          
          <div className="game-meta">
            <span className="game-meta-label">MAPPING EN COURS</span>
            <h2 className="game-map-title">{mapData?.title}</h2>
            <span className="game-meta-author">BPM : {mapData?.bpm}</span>
          </div>

          <div className="game-stats-panel">
            <div className="game-stat-box">
              <span className="game-stat-label">SCORE</span>
              <span className="game-stat-value score-val">{displayScore}</span>
            </div>

            <div className="game-hit-stats">
              <div className="game-hit-row perfect">
                <span className="game-hit-label">PERFECT</span>
                <span className="game-hit-count">{stats.perfects}</span>
              </div>
              <div className="game-hit-row good">
                <span className="game-hit-label">GOOD</span>
                <span className="game-hit-count">{stats.goods}</span>
              </div>
              <div className="game-hit-row miss">
                <span className="game-hit-label">MISS</span>
                <span className="game-hit-count">{stats.misses}</span>
              </div>
            </div>
          </div>

          <div className="game-judgment-container">
            <div className={`game-judgment-display ${judgment ? judgment.toLowerCase().replace('!', '') : ''}`}>
              {judgment || "READY"}
            </div>
          </div>

          {!started && mapData && (
            <button className="game-start-btn" onClick={startGame}>
              Lancer la partie
            </button>
          )}
        </div>
      </div>

      <div className="game-viewport">
        <div ref={gameAreaRef} className="game-canvas-wrapper" />
      </div>
    </div>
  );
}

export default Game;
