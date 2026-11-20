# Ikon aplikasi Sela

Ikon di direktori ini adalah set ikon bawaan scaffold Tauri (placeholder — Sela
belum punya logo sendiri) dan wajib ada supaya `npm run tauri build` bisa
membuat installer.

Untuk mengganti dengan logo Sela sendiri, buat satu PNG 1024x1024 lalu jalankan:

```sh
npx @tauri-apps/cli icon logo.png
```

Perintah itu akan me-regenerasi seluruh isi direktori ini.
