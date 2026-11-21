import { useEffect, useState } from "react";
import { wifiList, whichTool, type WifiNet } from "../lib/api";

export default function Wifi() {
  const [nmcli, setNmcli] = useState<boolean | null>(null);
  const [nets, setNets] = useState<WifiNet[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const list = await wifiList();
      setNets(list);
      if (list.length === 0) setErr("Tidak ada jaringan Wi-Fi yang terlihat.");
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void whichTool("nmcli").then((ok) => {
      setNmcli(ok);
      if (ok) void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bars(signal: number): string {
    if (signal >= 75) return "▂▄▆█";
    if (signal >= 50) return "▂▄▆";
    if (signal >= 25) return "▂▄";
    return "▂";
  }

  return (
    <div>
      <h2>Wi-Fi</h2>
      <p className="sub">
        Jaringan Wi-Fi di sekitarmu (baca saja — Sela tidak menghubungkan
        otomatis).
      </p>

      {nmcli === false && (
        <div className="err">
          <span className="mono">nmcli</span> tidak ditemukan di PC ini
          (NetworkManager belum terpasang). Di Ubuntu:{" "}
          <span className="mono">sudo apt install network-manager</span>
        </div>
      )}

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => void refresh()} disabled={loading || !nmcli}>
          {loading ? "Memindai…" : "Pindai ulang"}
        </button>
      </div>

      {err && <div className="err">{err}</div>}

      {nets.map((n) => (
        <div className="list-row" key={n.ssid}>
          <span className="mono" style={{ fontSize: 13, color: "var(--green)" }}>
            {bars(n.signal)}
          </span>
          <div className="list-main">
            <div className="list-title">{n.ssid}</div>
            <div className="list-sub">
              {n.security && n.security !== "--" ? n.security : "Terbuka"}
            </div>
          </div>
          <span className="muted mono" style={{ fontSize: 12 }}>
            {n.signal}%
          </span>
        </div>
      ))}
    </div>
  );
}
