import { useEffect, useRef, useState } from "react";
import { nightLight, powerAction, whichTool } from "../lib/api";
import { mmss } from "../lib/format";

export default function Daya() {
  const [redshift, setRedshift] = useState<boolean | null>(null);
  const [nlOn, setNlOn] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [idleMin, setIdleMin] = useState(30);
  const [idleLeft, setIdleLeft] = useState<number | null>(null);
  const idleEnd = useRef(0);

  useEffect(() => {
    void whichTool("redshift").then(setRedshift);
  }, []);

  useEffect(() => {
    if (idleLeft === null) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((idleEnd.current - Date.now()) / 1000));
      setIdleLeft(left);
      if (left <= 0) {
        clearInterval(t);
        setIdleLeft(null);
        if (
          window.confirm(
            "Waktu idle habis. Tidurkan PC sekarang?",
          )
        ) {
          void doPower("suspend");
        }
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleLeft !== null]);

  async function doPower(action: "hibernate" | "suspend") {
    const label = action === "hibernate" ? "hibernate" : "tidur (suspend)";
    if (!window.confirm(`Yakin mau ${label} sekarang? Semua aplikasi akan dijeda.`)) {
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await powerAction(action);
      setMsg(`Perintah ${label} dikirim.`);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleNightLight() {
    setErr("");
    setMsg("");
    try {
      await nightLight(!nlOn);
      setNlOn(!nlOn);
      setMsg(nlOn ? "Night light dimatikan." : "Night light aktif (3500K).");
    } catch (e) {
      setErr(String(e));
    }
  }

  function startIdle() {
    idleEnd.current = Date.now() + idleMin * 60 * 1000;
    setIdleLeft(idleMin * 60);
    setMsg(`Timer idle jalan — PC akan ditawarkan tidur dalam ${idleMin} menit.`);
  }

  return (
    <div>
      <h2>Daya</h2>
      <p className="sub">
        Night light, hibernate, tidur, dan tidur otomatis saat idle. Semua aksi
        daya meminta konfirmasi dulu.
      </p>

      {msg && <div className="ok-note">{msg}</div>}
      {err && <div className="err">{err}</div>}

      <div className="card">
        <div className="row">
          <div className="grow">
            <div className="card-title">Night light</div>
            <div className="list-sub">
              Layar lebih hangat (3500K) — nyaman di mata malam hari.
            </div>
          </div>
          <button
            className={nlOn ? "btn-ghost active" : "btn-ghost"}
            onClick={() => void toggleNightLight()}
            disabled={redshift === false}
          >
            {nlOn ? "Aktif" : "Mati"}
          </button>
        </div>
        {redshift === false && (
          <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
            redshift belum terpasang. Pasang:{" "}
            <span className="mono">sudo apt install redshift</span>
          </p>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>
          Hibernate / Tidur
        </div>
        <div className="row">
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => void doPower("hibernate")}
          >
            Hibernate
          </button>
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => void doPower("suspend")}
          >
            Tidur (suspend)
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          Hibernate menyimpan sesi ke disk lalu mematikan PC; suspend tidur
          dengan RAM tetap menyala.
        </p>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>
          Tidur otomatis saat idle
        </div>
        {idleLeft === null ? (
          <div className="row">
            <label className="muted" style={{ fontSize: 12 }}>
              Tidurkan PC dalam
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={idleMin}
              style={{ width: 70 }}
              onChange={(e) => setIdleMin(Number(e.target.value) || 30)}
            />
            <span className="muted" style={{ fontSize: 12 }}>
              menit
            </span>
            <button className="btn" onClick={startIdle}>
              Mulai timer
            </button>
          </div>
        ) : (
          <div className="row">
            <div className="grow">
              <span className="mono" style={{ fontSize: 18 }}>
                {mmss(idleLeft)}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {" "}
                lagi — konfirmasi muncul sebelum PC tidur.
              </span>
            </div>
            <button className="btn-ghost" onClick={() => setIdleLeft(null)}>
              Batalkan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
