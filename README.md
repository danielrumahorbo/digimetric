# Digimetric — Bank Digital Intelligence

Ruang riset statis untuk 12 bank digital Indonesia, FY2021–Q2 2026. HTML, CSS dan JavaScript biasa, tanpa build step atau runtime template. Tampilan responsif untuk desktop dan ponsel.

## Menjalankan

Jalankan dari folder proyek:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Buka http://127.0.0.1:8765. Gunakan server HTTP karena aplikasi mengambil dataset melalui `fetch`.

## Fitur

- Ringkasan sektor: KPI, tren neraca, pangsa aset, ringkasan laba, tabel kompetisi dengan pencarian dan pengurutan.
- Papan peringkat: seluruh metrik; NPL/NPF, CIR dan BOPO diurutkan dari terendah.
- Perbandingan: maksimum enam bank, tren tahunan atau periode terbaru, grafik dan tabel nilai.
- Profil: riwayat, aset, rasio periode terpilih dan laporan sumber.
- Explorer: filter bank/metrik/periode, pencarian, 50 baris per halaman; ekspor mencakup seluruh hasil filter.
- Sumber: register laporan 12 bank, definisi, keterbatasan, tabel audit dan referensi desain.
- Tautan langsung melalui hash, navigasi keyboard, fokus terlihat, penanganan data kosong/error dan tampilan cetak.

## Pembaruan data, 6 Oktober 2026

Laporan Q2 2026 dari folder Drive pengguna digunakan untuk memperbarui 12 bank. Posisi neraca per 30 Juni 2026. Laba adalah kumulatif Januari–Juni, **bukan laba kuartal kedua saja**. Pertumbuhan laba dibandingkan H1 2025 dari laporan yang sama. Neraca Q2 dibandingkan Q1 2026 dari dataset awal; dataset awal belum diverifikasi ulang.

Agregat dalam Rp miliar:

| Metrik | Nilai |
|---|---:|
| Aset | 262004.137016 |
| DPK | 175213.813700 |
| Kredit/pembiayaan bruto | 154871.681427 |
| Laba bersih H1 | 1962.027126 |

Sebanyak 10 dari 12 bank melaporkan laba positif. Pangsa adalah pangsa dalam kelompok 12 bank, bukan seluruh industri perbankan.

## Pembaruan data, 8 Oktober 2026

Folder Drive berisi 12 PDF baru Q2 2025, satu laporan per bank. Ditambahkan 194 observasi Q2 2025 dan 36 angka YoY aset, kredit serta DPK Q2 2026. Dataset kini memiliki 9 periode; periode terbaru tetap Q2 2026. Filter, grafik perbandingan, profil, ekspor dan register sumber mendukung Q2 2025 dengan tautan laporan sesuai periode.

Laba H1 2025 Aladin pada publikasi asli Rp83,123 miliar berbeda dari kolom pembanding Rp80,036 miliar pada laporan Q2 2026. Kedua basis disimpan terpisah; YoY laba Q2 2026 tetap menggunakan pembanding laporan Q2 2026. Penyebab selisih belum dijelaskan dalam sumber yang ditinjau. Rasio Q2 2025 yang tidak tersedia untuk Jago dan Raya, serta LCR/NSFR seluruh bank, tetap kosong.

### Definisi dan batasan

Satuan laporan Rp juta dibagi 1000; Raya memakai Rp ribu dan dibagi 1000000. DPK = giro + tabungan + deposito nasabah. CASA dihitung dari (giro + tabungan) / DPK. Kredit Jago mencakup pembiayaan syariah; kredit Aladin mencakup piutang dan pembiayaan bagi hasil bruto. Rasio mengikuti publikasi bank dan tidak diisi dari periode lain.

Untuk Aladin, NPL dipadankan ke NPF gross, LDR ke FDR, dan NIM ke Net Imbalan (NI). Perbedaan ini tercatat di sumber. Rasio Raya yang tidak tersedia—ROA, NIM, BOPO, CIR dan LDR—tetap kosong. Laba H1 2025 Amar memakai baris laba bersih sebelum atribusi yang konsisten dengan laba sebelum pajak dikurangi pajak; terdapat ketidakkonsistenan pada baris atribusi di PDF. Riwayat korporasi dari repo awal bersifat indikatif dan belum diverifikasi ulang.

## File

- `index.html`, `styles.css`, `app.js`: aplikasi.
- `data/dashboard_data.json`: dataset, metadata, metodologi dan tautan sumber.
- `data/reviewed_q2_2026.json`: hasil transkripsi Q2 yang ditinjau, dalam Rp miliar.
- `data/q2_2026_audit.csv`: audit 237 observasi Q2 2026, termasuk 36 angka YoY neraca.
- `data/reviewed_q2_2025.json`: transkripsi 12 laporan Q2 2025 dan nomor halaman sumber.
- `data/q2_2025_audit.csv`: audit 194 observasi Q2 2025.
- `data/drive_register_20261008.json`: register 12 PDF baru dari Drive.
- `scripts/import_q2_2025.py`: impor yang mempertahankan angka historis dan memisahkan basis laba pembanding.
- `data/bank_profiles.json`: riwayat dari aplikasi sebelumnya.
- `scripts/validate_data.py`: pemeriksaan konsistensi dataset.
- `sources/laporan-bank-digital-20261006.zip`: arsip lokal 98 PDF dari Drive, diabaikan Git dan tidak termasuk paket website.
- `support.js`: file runtime lama, dipertahankan dari repo tetapi tidak dimuat aplikasi baru.

## Validasi

```sh
node --check app.js
python scripts/validate_data.py
```

Pemeriksaan browser mencakup keenam halaman, periode historis/terbaru, pengurutan, filter, pagination, ekspor dan viewport ponsel. Tabel menyediakan nilai yang sama dengan grafik; data kosong tidak disambungkan pada grafik garis.

## Hosting

Konfigurasi Vercel menggunakan website statis: framework Other, build command kosong, output directory root. Folder sumber diabaikan Git. Pembaruan branch `main` diterbitkan melalui integrasi GitHub–Vercel ke https://digimetric.vercel.app/.

## Referensi desain

Rancangan khusus berfokus pada kepadatan data dan keterlacakan. Acuan prinsip:

- [Linear — A calmer interface](https://linear.app/now/behind-the-latest-design-refresh): hierarki, navigasi dan tindakan yang konsisten.
- [Morningstar — Design Standards](https://designsystem.morningstar.com/charts/design-standards/): grafik keuangan dan sumbu yang jelas.
- [Financial Times — Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary): pilihan grafik berdasarkan tujuan analisis.

Tidak menggunakan paket template UI, menyalin aset referensi, atau memerlukan library grafik eksternal. Font DM Sans dimuat dari Google Fonts dengan fallback font sistem.


## Identitas bank
Semua 12 logo memakai aset asli situs resmi bank, disimpan lokal di `assets/banks/`. Sumber lengkap dan tanggal pengambilan ada di `assets/banks/sources.json`. Warna dan rasio logo dipertahankan dengan `object-fit: contain`.
