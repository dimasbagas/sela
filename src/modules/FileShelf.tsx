import { useState } from "react";
import { load, save } from "../lib/store";
import { openPath } from "../lib/api";

interface ShelfItem {
  id: string;
  name: string;
  path: string;
}

const KEY = "sela.fileshelf";

export default function FileShelf() {
  const [items, setItems] = useState<ShelfItem[]>(() =>
    load<ShelfItem[]>(KEY, []),
  );
  const [path, setPath] = useState("");
  const [err, setErr] = useState("");

  function update(next: ShelfItem[]) {
    setItems(next);
    save(KEY, next);
  }

  function add(e?: React.FormEvent) {
    e?.preventDefault();
    const p = path.trim();
    if (!p) return;
    const name = p.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? p;
    update([...items, { id: `${Date.now()}`, name, path: p }]);
    setPath("");
    setErr("");
  }

  async function open(item: ShelfItem) {
    try {
      await openPath(item.path);
    } catch (e) {
      setErr(`Tidak bisa membuka “${item.name}”: ${String(e)}`);
    }
  }

  return (
    <div>
      <h2>File Shelf</h2>
      <p className="sub">
        Shortcut ke file atau folder yang sering dibuka. Klik untuk membuka
        dengan aplikasi default.
      </p>

      <form className="row" onSubmit={add}>
        <input
          className="grow"
          type="text"
          placeholder="/home/irul/Dokumen atau /home/irul/foto.png"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <button className="btn" type="submit">
          Tambah
        </button>
      </form>

      {err && (
        <div className="err" style={{ marginTop: 10 }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        {items.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Belum ada shortcut. Tempel path file/folder di atas.
          </p>
        ) : (
          items.map((it) => (
            <div className="list-row" key={it.id}>
              <div className="list-main">
                <div className="list-title">{it.name}</div>
                <div className="list-sub mono">{it.path}</div>
              </div>
              <button className="btn-ghost btn-mini" onClick={() => void open(it)}>
                Buka
              </button>
              <button
                className="btn-ghost btn-mini"
                onClick={() => update(items.filter((x) => x.id !== it.id))}
                aria-label="Hapus shortcut"
              >
                Hapus
              </button>
            </div>
          ))
        )}
      </div>

      <p className="hint">
        Di Linux file dibuka lewat <span className="mono">xdg-open</span> —
        folder terbuka di file manager, gambar di penampil gambar, dan
        seterusnya.
      </p>
    </div>
  );
}
