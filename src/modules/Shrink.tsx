import { useEffect, useState } from "react";
import { shrinkVideo, whichTool } from "../lib/api";

interface ImgResult {
  name: string;
  url: string;
  sizeKb: number;
  width: number;
  height: number;
}

export default function Shrink() {
  const [ffmpeg, setFfmpeg] = useState<boolean | null>(null);
  const [imgResult, setImgResult] = useState<ImgResult | null>(null);
  const [imgInfo, setImgInfo] = useState("");
  const [vidPath, setVidPath] = useState("");
  const [vidWidth, setVidWidth] = useState(720);
  const [vidOut, setVidOut] = useState("");
  const [vidBusy, setVidBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void whichTool("ffmpeg").then(setFfmpeg);
  }, []);

  async function onImageFile(file: File | undefined) {
    if (!file) return;
    setErr("");
    setImgResult(null);
    try {
      const bmp = await createImageBitmap(file);
      const maxW = 1280;
      const scale = Math.min(1, maxW / bmp.width);
      const w = Math.round(bmp.width * scale);
      const h = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas tidak tersedia");
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.82),
      );
      if (!blob) throw new Error("gagal mengompres gambar");
      const url = URL.createObjectURL(blob);
      const base = file.name.replace(/\.[^.]+$/, "");
      setImgResult({
        name: `${base}-kecil.jpg`,
        url,
        sizeKb: Math.round(blob.size / 1024),
        width: w,
        height: h,
      });
      setImgInfo(
        `${bmp.width}×${bmp.height} (${Math.round(file.size / 1024)} KB) → ` +
          `${w}×${h} (${Math.round(blob.size / 1024)} KB)`,
      );
    } catch (e) {
      setErr(`Tidak bisa memproses gambar: ${String(e)}`);
    }
  }

  async function shrinkVid(e?: React.FormEvent) {
    e?.preventDefault();
    const input = vidPath.trim();
    if (!input) return;
    setVidBusy(true);
    setErr("");
    setVidOut("");
    try {
      const out = input.replace(/(\.[^.]+)?$/, "-kecil$1");
      const res = await shrinkVideo(input, vidWidth, out);
      setVidOut(res);
    } catch (e2) {
      setErr(String(e2));
    } finally {
      setVidBusy(false);
    }
  }

  return (
    <div>
      <h2>Perkecil Gambar / Video</h2>
      <p className="sub">
        Gambar diperkecil di aplikasi (maks. lebar 1280px, JPEG 82%), lalu
        diunduh. Video memakai ffmpeg.
      </p>

      <div className="card-title" style={{ marginBottom: 6 }}>
        Gambar
      </div>
      <label className="btn-ghost" style={{ cursor: "pointer" }}>
        Pilih gambar…
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void onImageFile(e.target.files?.[0])}
        />
      </label>
      {imgInfo && (
        <p className="muted" style={{ fontSize: 13, margin: "8px 0" }}>
          {imgInfo}
        </p>
      )}
      {imgResult && (
        <div className="row" style={{ marginTop: 6 }}>
          <span className="grow" style={{ fontSize: 13 }}>
            Hasil: {imgResult.name} · {imgResult.width}×{imgResult.height} ·{" "}
            {imgResult.sizeKb} KB
          </span>
          <a className="btn" href={imgResult.url} download={imgResult.name}>
            Unduh
          </a>
        </div>
      )}

      <div className="divider" />
      <div className="card-title" style={{ marginBottom: 6 }}>
        Video
      </div>
      {ffmpeg === false && (
        <div className="err">
          ffmpeg belum terpasang di PC ini. Pasang dulu:{" "}
          <span className="mono">sudo apt install ffmpeg</span> (Linux) atau
          unduh dari ffmpeg.org (Windows), lalu buka lagi tab ini.
        </div>
      )}
      <form onSubmit={shrinkVid}>
        <input
          className="grow"
          type="text"
          placeholder="/home/irul/video.mp4"
          value={vidPath}
          onChange={(e) => setVidPath(e.target.value)}
          style={{ width: "100%", marginBottom: 8 }}
        />
        <div className="row">
          <label className="muted" style={{ fontSize: 12 }}>
            Lebar
          </label>
          <select
            value={vidWidth}
            onChange={(e) => setVidWidth(Number(e.target.value))}
          >
            <option value={480}>480p</option>
            <option value={720}>720p</option>
            <option value={1080}>1080p</option>
          </select>
          <button className="btn" type="submit" disabled={vidBusy || !ffmpeg}>
            {vidBusy ? "Memproses…" : "Perkecil video"}
          </button>
        </div>
      </form>
      {vidOut && (
        <div className="ok-note" style={{ marginTop: 10 }}>
          Selesai — hasil disimpan di: <span className="mono">{vidOut}</span>
        </div>
      )}
      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}
    </div>
  );
}
