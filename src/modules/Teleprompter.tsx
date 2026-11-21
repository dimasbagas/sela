import { useEffect, useRef, useState } from "react";
import { load, save } from "../lib/store";

const KEY = "sela.teleprompter.text";

export default function Teleprompter() {
  const [text, setText] = useState(() => load<string>(KEY, ""));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40); // px per detik
  const [fontSize, setFontSize] = useState(26);
  const [editing, setEditing] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const step = (t: number) => {
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;
      const el = boxRef.current;
      if (el) {
        el.scrollTop += speed * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          setPlaying(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed]);

  function start() {
    const el = boxRef.current;
    if (el) el.scrollTop = 0;
    setEditing(false);
    setPlaying(true);
  }

  function reset() {
    setPlaying(false);
    const el = boxRef.current;
    if (el) el.scrollTop = 0;
  }

  return (
    <div>
      <h2>Teleprompter</h2>
      <p className="sub">
        Tulis naskah, tekan Mulai — teks berjalan sendiri. Garis biru di tengah
        adalah garis baca.
      </p>

      {editing ? (
        <textarea
          rows={8}
          placeholder="Tulis atau tempel naskahmu di sini…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            save(KEY, e.target.value);
          }}
        />
      ) : (
        <div
          className="tele-view"
          ref={boxRef}
          style={{ fontSize: `${fontSize}px` }}
        >
          {text || "Belum ada naskah."}
        </div>
      )}

      <div className="row-wrap" style={{ marginTop: 12 }}>
        {playing ? (
          <button className="btn" onClick={() => setPlaying(false)}>
            Jeda
          </button>
        ) : (
          <button
            className="btn"
            onClick={start}
            disabled={!text.trim() && editing}
          >
            {editing ? "Mulai" : "Lanjutkan"}
          </button>
        )}
        <button className="btn-ghost" onClick={reset}>
          Ulang dari awal
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            setPlaying(false);
            setEditing(!editing);
          }}
        >
          {editing ? "Lihat teks berjalan" : "Edit naskah"}
        </button>
      </div>

      <div className="row-wrap" style={{ marginTop: 12 }}>
        <label className="muted" style={{ fontSize: 12, flex: "none" }}>
          Kecepatan
        </label>
        <input
          type="range"
          min={10}
          max={160}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span className="mono" style={{ fontSize: 12 }}>
          {speed} px/dtk
        </span>
      </div>
      <div className="row-wrap" style={{ marginTop: 8 }}>
        <label className="muted" style={{ fontSize: 12, flex: "none" }}>
          Ukuran huruf
        </label>
        <input
          type="range"
          min={16}
          max={48}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span className="mono" style={{ fontSize: 12 }}>
          {fontSize}px
        </span>
      </div>
    </div>
  );
}
