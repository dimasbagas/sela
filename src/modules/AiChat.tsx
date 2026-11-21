import { useEffect, useRef, useState } from "react";
import { load, save } from "../lib/store";
import { httpReq } from "../lib/api";

interface AiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatMsg {
  role: "user" | "assistant" | "error";
  text: string;
  image?: string; // data URL (gambar yang dilampirkan)
}

const SETTINGS_KEY = "sela.ai.settings";
const CHAT_KEY = "sela.ai.chat";

export default function AiChat() {
  const [settings, setSettings] = useState<AiSettings>(() =>
    load<AiSettings>(SETTINGS_KEY, {
      baseUrl: "",
      apiKey: "",
      model: "",
    }),
  );
  const [msgs, setMsgs] = useState<ChatMsg[]>(() =>
    load<ChatMsg[]>(CHAT_KEY, []),
  );
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const configured = settings.baseUrl.trim() !== "" && settings.apiKey.trim() !== "" && settings.model.trim() !== "";

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  function saveSettings(next: AiSettings) {
    setSettings(next);
    save(SETTINGS_KEY, next);
  }

  function pushMsgs(next: ChatMsg[]) {
    setMsgs(next);
    save(CHAT_KEY, next);
  }

  async function onImageFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if ((!text && !image) || busy) return;
    if (!configured) {
      setShowSettings(true);
      return;
    }
    const userMsg: ChatMsg = { role: "user", text, image: image ?? undefined };
    const next = [...msgs, userMsg];
    pushMsgs(next);
    setDraft("");
    setImage(null);
    setBusy(true);
    try {
      const history = next
        .filter((m) => m.role !== "error")
        .slice(-20)
        .map((m) => {
          if (m.image) {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.text || "Jelaskan gambar ini." },
                { type: "image_url", image_url: { url: m.image } },
              ],
            };
          }
          return { role: m.role, content: m.text };
        });
      const base = settings.baseUrl.replace(/\/+$/, "");
      const raw = await httpReq(
        "POST",
        `${base}/chat/completions`,
        JSON.stringify({
          model: settings.model,
          messages: history,
        }),
        "application/json",
        settings.apiKey,
      );
      const j = JSON.parse(raw) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (j.error) throw new Error(j.error.message ?? "API mengembalikan error.");
      const reply = j.choices?.[0]?.message?.content?.trim() ?? "";
      pushMsgs([...next, { role: "assistant", text: reply || "(balasan kosong)" }]);
    } catch (err) {
      pushMsgs([
        ...next,
        {
          role: "error",
          text: `Gagal menghubungi AI: ${String(err)}. Periksa base URL, model, dan kunci di Pengaturan.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>AI Chat</h2>
        <button
          className="btn-ghost btn-mini"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? "Tutup pengaturan" : "Pengaturan"}
        </button>
      </div>
      <p className="sub">
        Chat dengan model AI lewat provider OpenAI-compatible — pakai kunci
        kamu sendiri.
      </p>

      {showSettings && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>
            Pengaturan provider
          </div>
          <label className="muted" style={{ fontSize: 12 }}>
            Base URL
          </label>
          <input
            type="text"
            placeholder="https://kenari.id/v1"
            value={settings.baseUrl}
            onChange={(e) => saveSettings({ ...settings, baseUrl: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label className="muted" style={{ fontSize: 12 }}>
            API key
          </label>
          <input
            type="password"
            placeholder="Kunci kamu sendiri — hanya tersimpan di perangkat ini"
            value={settings.apiKey}
            onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label className="muted" style={{ fontSize: 12 }}>
            Model
          </label>
          <input
            type="text"
            placeholder="mis. llama-3-3-70b-instruct:free"
            value={settings.model}
            onChange={(e) => saveSettings({ ...settings, model: e.target.value })}
            style={{ width: "100%" }}
          />
          <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>
            Kunci hanya tersimpan lokal di perangkat ini (localStorage) dan
            tidak pernah dikirim ke mana pun selain base URL di atas. Contoh
            endpoint gratis (teks placeholder saja, tanpa kunci):{" "}
            <span className="mono">https://kenari.id/v1</span> atau{" "}
            <span className="mono">https://api.respan.ai/api/</span>. Lampiran
            PDF belum didukung — gambar (foto) didukung untuk model vision.
          </p>
        </div>
      )}

      {!configured && !showSettings && (
        <div className="hint">
          Belum diatur. Buka <b>Pengaturan</b> dan isi base URL, API key, dan
          model — pakai kunci kamu sendiri.
        </div>
      )}

      <div className="chat-log" ref={logRef} style={{ maxHeight: 300, overflowY: "auto" }}>
        {msgs.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Belum ada percakapan. Tanya apa saja setelah pengaturan diisi.
          </p>
        ) : (
          msgs.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "chat-msg user"
                  : m.role === "assistant"
                    ? "chat-msg ai"
                    : "chat-msg err"
              }
            >
              {m.image && (
                <img
                  src={m.image}
                  alt="lampiran"
                  style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 6 }}
                />
              )}
              {m.text}
            </div>
          ))
        )}
        {busy && <div className="chat-msg ai">Mengetik…</div>}
      </div>

      <form onSubmit={send}>
        {image && (
          <div className="row" style={{ marginBottom: 8 }}>
            <img
              src={image}
              alt="lampiran"
              style={{ height: 48, borderRadius: 8 }}
            />
            <span className="grow muted" style={{ fontSize: 12 }}>
              Gambar terlampir
            </span>
            <button
              type="button"
              className="btn-ghost btn-mini"
              onClick={() => setImage(null)}
            >
              Hapus
            </button>
          </div>
        )}
        <div className="row">
          <input
            className="grow"
            type="text"
            placeholder="Tulis pesan…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <label className="btn-ghost btn-mini" style={{ cursor: "pointer" }}>
            📷
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void onImageFile(e.target.files?.[0])}
            />
          </label>
          <button className="btn" type="submit" disabled={busy}>
            Kirim
          </button>
        </div>
      </form>

      {msgs.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            className="btn-ghost btn-mini"
            onClick={() => pushMsgs([])}
          >
            Hapus percakapan
          </button>
        </div>
      )}
    </div>
  );
}
