/** Parsing lirik tersinkron LRCLIB: [mm:ss.xx] teks per baris. */
export interface LyricLine {
  time: number; // detik
  text: string;
}

export function parseSynced(synced: string | null): LyricLine[] {
  if (!synced) return [];
  const lines: LyricLine[] = [];
  for (const raw of synced.split("\n")) {
    const m = raw.match(/^\[(\d+):(\d+\.\d+)\]\s*(.*)$/);
    if (!m) continue;
    const time = Number(m[1]) * 60 + Number(m[2]);
    const text = m[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Indeks baris aktif pada posisi detik tertentu. -1 bila belum mulai. */
export function activeLineIndex(lines: LyricLine[], pos: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= pos) idx = i;
    else break;
  }
  return idx;
}

/**
 * Jumlah kata yang "terisi" pada baris aktif — APROKSIMASI: durasi baris
 * dibagi rata ke kata-katanya (LRCLIB tidak memberi timestamp per kata).
 */
export function litWordCount(
  lines: LyricLine[],
  idx: number,
  pos: number,
): number {
  if (idx < 0 || idx >= lines.length) return 0;
  const line = lines[idx];
  const next = lines[idx + 1];
  const end = next ? next.time : line.time + 4;
  const dur = Math.max(0.5, end - line.time);
  const progress = Math.min(1, Math.max(0, (pos - line.time) / dur));
  const words = line.text.split(/\s+/).filter(Boolean).length;
  return Math.floor(progress * words);
}
