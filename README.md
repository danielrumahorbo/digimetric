# Digimetric — Monitor Sektor Bank Digital Indonesia

Dashboard statis (HTML + JS, tanpa build step) untuk memantau 12 bank digital Indonesia
periode FY2021 – Q1 2026: aset, DPK, kredit, laba bersih, ROA, NIM, BOPO/CIR, NPL, CAR, LDR,
pangsa pasar, papan peringkat, perbandingan antar bank, profil institusi, dan data explorer.

## Isi
- `index.html` — seluruh aplikasi (template + logika)
- `support.js` — runtime pendukung
- `data/dashboard_data.json` — basis data metrik
- `vercel.json` — konfigurasi hosting

## Deploy ke Vercel
1. Buat repo baru di GitHub, unggah seluruh isi folder ini ke root repo.
2. Di Vercel: **Add New → Project → Import** repo tersebut.
3. Framework Preset: **Other**. Build Command: kosongkan. Output Directory: kosongkan (root).
4. Deploy. Situs langsung tayang.

## Menjalankan lokal
Perlu HTTP server (karena data dimuat via fetch):
```bash
npx serve .        # atau: python3 -m http.server 8000
```

## Catatan data
Sumber angka: laporan keuangan publikasi (Database Monitoring v2), dinormalkan ke Rp miliar.
Riwayat korporasi tiap bank dirangkum dari sumber publik dan bersifat indikatif.
