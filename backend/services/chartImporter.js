class ChartImportError extends Error {
  constructor(message) {
    super(message);
    this.name = "ChartImportError";
    this.status = 400;
  }
}

const MAX_AUDIO_SRC_LENGTH = 35 * 1024 * 1024;
const DEFAULT_AUDIO_SRC = "/song.mp3";
const DEFAULT_BPM = 120;

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return number;
}

function toSeconds(milliseconds) {
  return Math.round((milliseconds / 1000) * 1000000) / 1000000;
}

function normalizeTitle(title) {
  const normalized = typeof title === "string" ? title.trim() : "";
  if (!normalized) throw new ChartImportError("Titre requis");
  return normalized.slice(0, 120);
}

function normalizeAudioSrc(audioSrc) {
  const normalized = typeof audioSrc === "string" ? audioSrc.trim() : "";
  if (!normalized) return DEFAULT_AUDIO_SRC;

  const allowed =
    normalized.startsWith("/") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:audio/");

  if (!allowed) {
    throw new ChartImportError(
      "La musique doit etre un chemin public, une URL http(s), ou un fichier audio",
    );
  }

  if (normalized.length > MAX_AUDIO_SRC_LENGTH) {
    throw new ChartImportError("Le fichier audio est trop lourd");
  }

  return normalized;
}

function findPlayableStrumLine(chart) {
  if (!chart || typeof chart !== "object" || Array.isArray(chart)) {
    throw new ChartImportError("JSON de map invalide");
  }

  const strumLines = Array.isArray(chart.strumLines) ? chart.strumLines : [];
  const visibleLine = strumLines.find((line) => line?.visible === true);

  if (!visibleLine) {
    throw new ChartImportError("Aucune ligne visible trouvee dans la map");
  }

  if (visibleLine.keyCount !== 4) {
    throw new ChartImportError("La map doit etre en 4 touches");
  }

  if (!Array.isArray(visibleLine.notes)) {
    throw new ChartImportError("Aucune note lisible dans la ligne visible");
  }

  return visibleLine;
}

function normalizeNote(note, index) {
  if (!note || typeof note !== "object" || Array.isArray(note)) {
    throw new ChartImportError(`Note invalide a l'index ${index}`);
  }

  const lane = Number(note.id);
  const timeMs = Number(note.time);
  const holdMs = Number(note.sLen ?? note.slen ?? 0);

  if (!Number.isInteger(lane) || lane < 0 || lane > 3) {
    throw new ChartImportError(`Colonne invalide a l'index ${index}`);
  }

  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new ChartImportError(`Temps invalide a l'index ${index}`);
  }

  if (!Number.isFinite(holdMs) || holdMs < 0) {
    throw new ChartImportError(`Longueur de note invalide a l'index ${index}`);
  }

  return {
    id: lane + 1,
    lane,
    time: toSeconds(timeMs),
    sLen: toSeconds(holdMs),
  };
}

function normalizeChart(chart) {
  const strumLine = findPlayableStrumLine(chart);
  const notes = strumLine.notes
    .map(normalizeNote)
    .sort((a, b) => a.time - b.time || a.lane - b.lane);

  if (notes.length === 0) {
    throw new ChartImportError("La map ne contient aucune note");
  }

  return {
    keyCount: 4,
    notes,
    noteCount: notes.length,
  };
}

function normalizeMapImport(payload) {
  const chart = normalizeChart(payload?.chart);

  return {
    title: normalizeTitle(payload?.title),
    bpm: toPositiveInteger(payload?.bpm, DEFAULT_BPM),
    audioSrc: normalizeAudioSrc(payload?.audioSrc),
    keyCount: chart.keyCount,
    noteCount: chart.noteCount,
    notes: chart.notes,
  };
}

module.exports = {
  ChartImportError,
  normalizeChart,
  normalizeMapImport,
};
