import { useEffect, useRef, useState } from "react";
import { load, save } from "../lib/store";
import { mmss } from "../lib/format";

type Mode = "fokus" | "istirahat" | "panjang";
const DUR: Record<Mode, number> = {
  fokus: 25 * 60,
  istirahat: 5 * 60,
  panjang: 15 * 60,
};
const LABEL: Record<Mode, string> = {
  fokus: "Fokus",
  istirahat: "Istirahat",
  panjang: "Istirahat panjang",
};

export default function Pomodoro() {
  const [mode, setMode] = useState<Mode>("fokus");
  const [remaining, setRemaining] = useState(DUR.fokus);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(() => load<number>("sela.pomodoro.done", 0));
  const [note, setNote] = useState("");
  const endsAt = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const doneRef = useRef(done);
  doneRef.current = done;

  function finish() {
    if (modeRef.current === "fokus") {
      const n = doneRef.current + 1;
      setDone(n);
      save("sela.pomodoro.done", n);
      const next: Mode = n % 4 === 0 ? "panjang" : "istirahat";
      setMode(next);
      setRemaining(DUR[next]);
      setNote(
        `Sesi fokus ke-${n} selesai. Waktunya ${next === "panjang" ? "istirahat panjang" : "istirahat"}.`,
      );
    } else {
      setMode("fokus");
      setRemaining(DUR.fokus);
      setNote("Istirahat selesai — kembali fokus.");
    }
  }

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        finish();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function start() {
    endsAt.current = Date.now() + remaining * 1000;
    setRunning(true);
    setNote("");
  }

  function pause() {
    setRunning(false);
  }

  function reset() {
    setRunning(false);
    setRemaining(DUR[mode]);
    setNote("");
  }

  function switchMode(m: Mode) {
    setRunning(false);
    setMode(m);
    setRemaining(DUR[m]);
    setNote("");
  }

  const progress = Math.round(((DUR[mode] - remaining) / DUR[mode]) * 100);

  return (
    <div>
      <h2>Pomodoro</h2>
      <p className="sub">
        Fokus 25 menit, istirahat 5 menit. Setiap 4 sesi, istirahat panjang 15 menit.
      </p>

      <div className="pomo-modes">
        {(Object.keys(LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            className={mode === m ? "btn-ghost active" : "btn-ghost"}
            onClick={() => switchMode(m)}
          >
            {LABEL[m]}
          </button>
        ))}
      </div>

      <div className="pomo-time">{mmss(remaining)}</div>
      <div className="pomo-bar">
        <div className="pomo-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="row" style={{ justifyContent: "center" }}>
        {running ? (
          <button className="btn" onClick={pause}>
            Jeda
          </button>
        ) : (
          <button className="btn" onClick={start}>
            {remaining < DUR[mode] ? "Lanjutkan" : "Mulai"}
          </button>
        )}
        <button className="btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {note && (
        <p style={{ textAlign: "center", fontSize: 13, marginTop: 12 }}>{note}</p>
      )}
      <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 10 }}>
        Sesi fokus selesai: {done}
      </p>
    </div>
  );
}
