# Termux + Netlify Setup

Project ini sudah disiapkan agar bisa langsung dipakai dari Termux dan dideploy ke Netlify.

## 1. Masuk folder

```bash
cd ~/web-source
```

## 2. Install dependency

```bash
npm install
```

Tidak perlu membuat file source satu per satu.

## 3. Jalankan lokal

```bash
npm run dev
```

Vite akan listen di `0.0.0.0`. Dari HP sendiri buka:

```text
http://127.0.0.1:3000
```

## 4. Build production

```bash
npm run build
```

## 5. Deploy Netlify

Cara paling mudah:

```bash
npx netlify-cli@latest login
npx netlify-cli@latest deploy
```

Untuk production:

```bash
npx netlify-cli@latest deploy --prod
```

Atau hubungkan repository ini ke Netlify. `netlify.toml` sudah menyediakan build command dan publish directory.

## Environment variables

Jangan commit secret API ke source code. Untuk production, masukkan secret melalui Netlify Environment Variables, terutama:

- `RAMASHOP_API_KEY`
- `NOKOS_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`
- `VITE_ADMIN_WHATSAPP`

Versi source, route, dan UI existing dipertahankan. Perubahan utama hanya konfigurasi runtime/deployment agar lebih mudah digunakan dari Termux dan Netlify.
