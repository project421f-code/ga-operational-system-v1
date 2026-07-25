# 📘 USER MANUAL — GA Operations v1.0

**Sistem Manajemen Operasional General Affair**
*Otomatisasi, Integrasi & Digitalisasi Operasional GA*

---

## 📋 DAFTAR ISI

1. [Pendahuluan & Akses](#1-pendahuluan--akses)
2. [Navigasi Aplikasi](#2-navigasi-aplikasi)
3. [Dashboard](#3-dashboard)
4. [Modul Maintenance & Tiket Komplain](#4-modul-maintenance--tiket-komplain)
5. [Modul SLA & KPI Maintenance](#5-modul-sla--kpi-maintenance)
6. [Modul Security & Patroli](#6-modul-security--patroli)
7. [Modul Booking Aset](#7-modul-booking-aset)
8. [Modul Housekeeping](#8-modul-housekeeping)
9. [Modul Manajemen Kos](#9-modul-manajemen-kos)
10. [Modul Survey](#10-modul-survey)
11. [Master Data](#11-master-data)
12. [Import Data](#12-import-data)
13. [Manajemen User & Pengaturan](#13-manajemen-user--pengaturan)
14. [Integrasi WhatsApp](#14-integrasi-whatsapp)
15. [PWA — Install di HP](#15-pwa--install-di-hp)
16. [FAQ & Troubleshooting](#16-faq--troubleshooting)

---

## 1. PENDAHULUAN & AKSES

### 1.1 Apa itu GA Operations?

GA Operations adalah sistem manajemen operasional terpadu untuk departemen **General Affair** yang mencakup:

| Modul | Fungsi |
|-------|--------|
| 🔧 **Maintenance** | Tiket komplain, SLA, KPI teknisi |
| 🛡️ **Security** | Patroli QR, inspeksi kendaraan, KPI |
| 📅 **Booking** | Peminjaman aset (zero approval) |
| ✅ **Housekeeping** | Checklist, audit, general cleaning |
| 🏠 **Manajemen Kos** | Kamar, transaksi, persiapan, tracker |
| 📋 **Survey** | Rating kepuasan, survey GA |

### 1.2 Cara Mengakses

**Via Web App:**
```
https://script.google.com/macros/s/.../exec?page=app
```

**Via Halaman Publik (Cek Aset — tanpa login):**
```
https://script.google.com/macros/s/.../exec?page=cek-aset
```

### 1.3 Login

**Mode 1: Google SSO (Otomatis)**
- Klik **🔑 Google SSO**
- Sistem otomatis mendeteksi email Google aktif Anda
- Jika email terdaftar di sistem, Anda langsung masuk

**Mode 2: Manual (Email + Password)**
- Klik **📧 Manual Login**
- Masukkan email & password
- Klik **🔐 Login**

**Default Admin:**
- Email: `admin@ga.com`
- Password: `ga2026`

### 1.4 Role & Hak Akses

| Role | Akses |
|------|-------|
| **Admin** | Semua fitur + konfigurasi + manajemen user |
| **Supervisor** | Verifikasi, audit, dashboard KPI |
| **Staff** | Input data via form (dibatasi sesuai tim) |

**Filter Tim (untuk Staff):**
- **Maintenance** → Tiket Komplain, KPI Maintenance, Rating Survey
- **Security** → Log Patroli, Inspeksi, KPI Security, Checkpoint, Jadwal
- **Housekeeping** → Checklist, Audit, GC, KPI Housekeeping, Master Lokasi
- **General Services** → Checklist, Audit, GC, KPI
- **Asset Inventory** → Booking, Master Aset

---

## 2. NAVIGASI APLIKASI

### 2.1 Desktop (Sidebar)

Di desktop, navigasi menggunakan **sidebar kiri** dengan menu berkelompok:

```
┌──────────────────────┐
│ 🏢 GA Operations     │
│                      │
│ 📊 Dashboard         │
│                      │
│ 🔧 Tiket Komplain    │ ← Maintenance
│ ⚙️ Master SLA        │
│ 📈 KPI Maintenance   │
│ 📋 Rating Survei     │
│ 📝 Survey GA         │
│                      │
│ 🛡️ Log Patroli       │ ← Security
│ 🚗 Inspeksi Kendaraan│
│ 📈 KPI Security      │
│ 📍 Master Checkpoint │
│ 📋 Master Jadwal     │
│                      │
│ 📅 Peminjaman Aset   │ ← Aset
│ 🏷️ Master Aset       │
│                      │
│ ✅ Checklist Harian  │ ← Housekeeping
│ 🔍 Audit Kebersihan  │
│ 🧹 General Cleaning  │
│ 📈 KPI Housekeeping  │
│ 📍 Master Lokasi     │
│                      │
│ 🏠 Monitoring Kos    │ ← Kos
│ 🚪 Master Kamar      │
│ 📋 Check-in/out      │
│ 🧹 Persiapan Kamar   │
│ 📊 Tracker Cleaning  │
│                      │
│ 👥 Manajemen User    │ ← Admin
│ 📋 Konfigurasi Survey│
│ ⚙️ Pengaturan        │
│ 📥 Import Data       │
└──────────────────────┘
```

### 2.2 Mobile (Bottom Nav + App Drawer)

Di HP, navigasi menggunakan **bottom navigation bar** dengan 5 menu utama:

```
┌──────────────────────────┐
│                          │
│       KONTEN UTAMA       │
│                          │
├──────────────────────────┤
│ 📊  🔧  🛡️  📅  ☰     │
│ Dash Komp Patro Book Menu│
└──────────────────────────┘
```

**Menu Bottom Nav:**
| Icon | Menu | Fungsi |
|------|------|--------|
| 📊 | Dashboard | Overview sistem |
| 🔧 | Komplain | Tiket komplain + badge jumlah open |
| 🛡️ | Patroli | Log patroli security |
| 📅 | Booking | Peminjaman aset |
| ☰ | Menu | Buka app drawer (semua menu) |

**App Drawer (☰ Menu):**
Klik ☰ untuk membuka drawer dari bawah berisi **semua menu** dalam grid icon:

```
┌──────────────────────────┐
│ ═══════════════════════  │
│   🔧  ⚙️  📈  📋  📝  │
│  Komp SLA  KPI  Rate Srv │
│   🛡️  🚗  📈  📍  📋  │
│  Pat  Insp KPI  Chk  Jdw │
│   📅  🏷️               │
│  Book Aset              │
│   ✅  🔍  🧹  📈  📍  │
│  Chk  Aud  GC   KPI  Lks │
│   🏠  🚪  📋  🧹  📊  │
│  Mon  Kamr In/Out Prp Trk│
│          ✕ Tutup        │
└──────────────────────────┘
```

**Scroll** untuk melihat semua menu. Klik salah satu untuk langsung navigasi.

### 2.3 Dark Mode

Klik tombol **🌙 / ☀️** di sidebar (desktop) untuk toggle dark/light mode. Mode tersimpan otomatis.

---

## 3. DASHBOARD

Halaman utama setelah login menampilkan ringkasan operasional:

### 3.1 Stat Cards
| Card | Warna | Menampilkan |
|------|-------|-------------|
| Tiket Open | 🔴 | Jumlah tiket komplain yang masih open |
| Tiket Bulan Ini | 🔵 | Total tiket bulan berjalan |
| Booking Aktif | 🟢 | Booking aset yang sedang berlangsung |
| Rata-rata Rating | 🟡 | Skor kepuasan rata-rata |
| KPI Maintenance | 🟣 | Rata-rata SLA kepatuhan |
| KPI Security | 🟢 | Skor performa security |
| Patroli Bulan Ini | 🔵 | Jumlah log patroli |
| Inspeksi Bulan Ini | 🟡 | Jumlah inspeksi kendaraan |

### 3.2 Grafik
- **Kategori Komplain** — donut chart breakdown per kategori
- **Status Tiket** — donut chart Open / In Progress / Selesai
- **Rating Survei** — bar chart distribusi rating 1-5
- **Trend Rating** — line chart tren rating per bulan

---

## 4. MODUL MAINTENANCE & TIKET KOMPLAIN

### 4.1 Overview

Modul ini menangani seluruh alur **laporan kerusakan** — dari pembuatan tiket hingga close + survey kepuasan.

### 4.2 Membuat Tiket Baru

1. Klik menu **🔧 Tiket Komplain**
2. Klik tombol **+ Tiket Baru**
3. Isi form:
   - **Nama Customer** * — nama pelapor
   - **No. WhatsApp** — nomor WA (format `628xxx`)
   - **Lokasi** * — lokasi kerusakan
   - **Kategori** * — Electrical / Plumbing / AC & HVAC / Furniture / IT & Network / Lainnya
   - **Sub-Kategori** — (opsional, dari Master SLA)
   - **Deskripsi** * — detail kerusakan
   - **Urgensi** * — Low / Medium / High
   - **Foto Kerusakan** — URL foto (opsional)
4. Klik **💾 Simpan**

### 4.3 Alur Status Tiket

```
Open ──► In Progress ──► Selesai
  │          │
  └── (Assign Teknisi + WA notif)
             │
             └── (Selesai + Survey WA)
                        │
                        └── (Customer balas rating 1-5)
```

### 4.4 Assign Teknisi (Open → In Progress)

1. Cari tiket dengan status **Open**
2. Klik tombol **✏️ Update Status**
3. Pilih status: **In Progress**
4. Isi **Teknisi** — nama petugas
5. Klik **💾 Update**

**Notifikasi WA Otomatis:**
- ✅ Customer → "Tiket sedang dikerjakan"
- ✅ Teknisi → "Anda ditugaskan menangani tiket..."

### 4.5 Selesaikan Tiket (In Progress → Selesai)

1. Cari tiket dengan status **In Progress**
2. Klik **✏️ Update Status**
3. Pilih status: **Selesai**
4. Isi **Catatan** — hasil perbaikan
5. Upload **Foto Perbaikan** (URL)
6. Klik **💾 Update**

**Notifikasi WA Otomatis:**
- ✅ Customer → "Tiket selesai" + Survey rating 1-5
- ⏱️ SLA otomatis dihitung (Achieved / Breached)

### 4.6 Rating Survei (via WhatsApp)

Customer cukup **balas WA** dengan angka **1-5**:
```
1️⃣ Sangat Buruk
2️⃣ Buruk
3️⃣ Cukup
4️⃣ Baik
5️⃣ Sangat Baik
```

### 4.7 Auto-Create Tiket dari WhatsApp

Customer bisa buat tiket langsung dari WhatsApp:

**Format WA:**
```
Nama: Budi
Lokasi: LC camp lantai 2 no 201
Kategori: Electrical
Prioritas: High
Deskripsi: Lampu mati
```

**Ketentuan:**
- Minimal: Nama, Lokasi, Deskripsi
- Kategori: Electrical/Plumbing/AC & HVAC/Furniture/IT & Network/Lainnya
- Prioritas: Low/Medium/High
- Emoji tidak wajib
- Foto bisa dikirim sebagai attachment

### 4.8 Filter & Cari Tiket

Klik tombol filter di atas tabel untuk menyaring:
- **Semua** — semua status
- **Open** — tiket baru belum ditangani
- **In Progress** — sedang dikerjakan
- **Selesai** — sudah selesai

### 4.9 Detail Tiket

Klik tombol **👁️ Detail** untuk melihat informasi lengkap tiket, termasuk:
- Timeline perubahan status
- Riwayat notifikasi WA
- Foto kerusakan & perbaikan
- Rating survey

---

## 5. MODUL SLA & KPI MAINTENANCE

### 5.1 Master SLA

Atur target waktu penyelesaian per kategori:

1. Klik menu **⚙️ Master SLA**
2. Klik **+ Tambah SLA**
3. Isi: Kategori, Sub-Kategori, Urgensi, Target (jam)
4. Klik **💾 Simpan**

SLA otomatis terhitung saat tiket selesai:
- **Achieved** → durasi ≤ target
- **Breached** → durasi > target

### 5.2 KPI Maintenance

1. Klik menu **📈 KPI Maintenance**
2. Lihat dashboard performa teknisi:
   - Total tiket ditugaskan
   - Tiket selesai
   - % Kepatuhan SLA
   - Rata-rata rating
   - Skor performa

3. Klik **🔄 Hitung Ulang KPI** untuk refresh data

### 5.3 Rating Survey

1. Klik menu **📋 Rating Survei**
2. Lihat dashboard rating:
   - Distribusi rating per kategori
   - Rating per teknisi
   - Trend rating bulanan
   - Detail rating terbaru

---

## 6. MODUL SECURITY & PATROLI

### 6.1 Log Patroli

Catat patroli security dengan QR Code:

1. Klik menu **🛡️ Log Patroli**
2. Klik **+ Patroli Baru**
3. Pilih metode input:
   - **📸 Scan QR** — scan QR Code di checkpoint
   - **📋 Pilih Manual** — pilih checkpoint dari dropdown
4. Isi: Personel, Shift, Kondisi Area, Catatan
5. Klik **💾 Simpan**

### 6.2 Generate QR Code Checkpoint

1. Klik menu **📍 Master Checkpoint**
2. Klik **📱 Generate QR**
3. Pilih checkpoint yang ingin dibuat QR
4. Print atau download QR Code
5. Tempel di lokasi checkpoint

### 6.3 Inspeksi Kendaraan

1. Klik menu **🚗 Inspeksi Kendaraan**
2. Klik **+ Inspeksi Baru**
3. Isi: No. Polisi, Bulan/Tahun, Jadwal Cek Fisik, Status, Petugas
4. Klik **💾 Simpan**

### 6.4 Master Checkpoint

1. Klik menu **📍 Master Checkpoint**
2. **+ Tambah Checkpoint** — buat pos baru
3. Klik **✏️ Edit** — ubah nama/area/status
4. Klik **🗑️ Hapus** — hapus checkpoint

### 6.5 Master Jadwal Patroli

1. Klik menu **📋 Master Jadwal**
2. **+ Tambah Jadwal** — buat jadwal shift
3. Isi: Hari, Shift, Personel, Jam Mulai, Jam Selesai
4. Klik **💾 Simpan**

### 6.6 KPI Security

1. Klik menu **📈 KPI Security**
2. Lihat performa anggota security:
   - % Kepatuhan patroli
   - Inspeksi kendaraan selesai
   - Insiden keamanan
   - Skor performa

---

## 7. MODUL BOOKING ASET

### 7.1 Prasyarat

Pastikan **Master Aset** sudah terisi:
1. Klik menu **🏷️ Master Aset**
2. **+ Tambah Aset**
3. Isi: Kategori, Nama Aset, Detail, Kapasitas
4. Status Operasional = ✅ **Tersedia**

### 7.2 Booking Baru

1. Klik menu **📅 Peminjaman Aset**
2. Klik **+ Booking Baru**
3. Isi form:
   - **Nama Peminjam** * — otomatis dari user login
   - **No. WhatsApp** — nomor WA (format `628xxx`)
   - **Aset** * — pilih dari dropdown
   - **Waktu Mulai** * — tanggal & jam
   - **Waktu Selesai** * — tanggal & jam
   - **KM Awal** — (khusus kendaraan, opsional)
4. Klik **📅 Booking**

**Sistem auto-cek bentrok jadwal:**
- ✅ **Approved** — tidak ada bentrok
- ❌ **Rejected** — bentrok dengan booking lain

### 7.3 Selesaikan Booking

1. Cari booking dengan status **Approved (Auto)**
2. Klik tombol **✅ Selesai**
3. Masukkan **KM Akhir** (khusus kendaraan)
4. Klik **✅ Konfirmasi**

### 7.4 Halaman Publik Cek Aset

Bagikan link ini ke siapa saja untuk cek ketersediaan aset **tanpa login**:

```
https://script.google.com/.../exec?page=cek-aset
```

Fitur:
- Filter tanggal
- Lihat status: ✅ Tersedia / ❌ Dibooking
- Booking langsung dari halaman publik
- **📤 Bagikan** — share link via WA

---

## 8. MODUL HOUSEKEEPING

### 8.1 Checklist Harian CS

1. Klik menu **✅ Checklist Harian**
2. Klik **+ Checklist Baru**
3. Isi: Tim (Housekeeping/General Services), Lokasi, Status, Checklist
4. Klik **💾 Simpan**

### 8.2 Audit Kebersihan (Supervisor)

1. Klik menu **🔍 Audit Kebersihan**
2. Klik **+ Audit Baru**
3. Isi: Lokasi, Tim, Staf, Skor 1-5, Status Kelayakan
4. Upload foto (opsional)
5. Klik **💾 Simpan**

### 8.3 General Cleaning

1. Klik menu **🧹 General Cleaning**
2. Lihat jadwal GC yang perlu dieksekusi
3. Update status eksekusi

### 8.4 KPI Housekeeping

1. Klik menu **📈 KPI Housekeeping**
2. Lihat performa tim housekeeping & GS

### 8.5 Master Lokasi

1. Klik menu **📍 Master Lokasi**
2. **+ Tambah Lokasi** — buat area/lokasi baru
3. Kelola daftar lokasi untuk dropdown di form

---

## 9. MODUL MANAJEMEN KOS

### 9.1 Monitoring Kos

1. Klik menu **🏠 Monitoring Kos**
2. Lihat semua properti kos:
   - Status kamar (Tersedia / Persiapan / Terisi / Maintenance)
   - Ringkasan okupansi
   - Pendapatan bulan ini

### 9.2 Master Kamar

1. Klik menu **🚪 Master Kamar**
2. **+ Tambah Kamar**
3. Isi: Nomor Kamar, Tipe, Harga, Status
4. Klik **💾 Simpan**

### 9.3 Check-in / Check-out

1. Klik menu **📋 Check-in / Check-out**
2. **Check-in:** Pilih kamar, isi data tamu, durasi
3. **Check-out:** Pilih transaksi aktif, selesaikan

### 9.4 Persiapan Kamar

1. Klik menu **🧹 Persiapan Kamar**
2. Lihat kamar yang perlu persiapan (check-out hari ini)
3. Update status persiapan

### 9.5 Tracker Cleaning

1. Klik menu **📊 Tracker Cleaning**
2. Monitoring jadwal pembersihan kamar per bulan

---

## 10. MODUL SURVEY

### 10.1 Rating Survei Maintenance

Lihat rating kepuasan dari customer:
1. Klik menu **📋 Rating Survei**
2. Dashboard rating per kategori, teknisi, dan tren

### 10.2 Survey GA

Survey kepuasan layanan GA:
1. Klik menu **📝 Survey GA**
2. Isi survey untuk tim GA
3. Admin bisa lihat hasil di dashboard

### 10.3 Konfigurasi Survey (Admin)

1. Klik menu **📋 Konfigurasi Survey**
2. Atur tim GA yang dinilai
3. Atur kriteria penilaian

---

## 11. MASTER DATA

### 11.1 Master SLA
Atur target SLA per kategori/urgensi. Lihat [Bagian 5.1](#51-master-sla).

### 11.2 Master Aset
1. Klik menu **🏷️ Master Aset**
2. **+ Tambah Aset** — daftarkan aset baru (ruangan, kendaraan, alat)
3. **Edit/Hapus** — kelola data aset

### 11.3 Master Checkpoint
Lihat [Bagian 6.4](#64-master-checkpoint).

### 11.4 Master Jadwal Patroli
Lihat [Bagian 6.5](#65-master-jadwal-patroli).

### 11.5 Master Lokasi
Lihat [Bagian 8.5](#85-master-lokasi).

### 11.6 Master Kamar
Lihat [Bagian 9.2](#92-master-kamar).

---

## 12. IMPORT DATA

Fitur import untuk mengisi data master secara massal.

### 12.1 Cara Import

1. Klik menu **📥 Import Data** (Admin only)
2. Pilih **Tipe Data** yang akan diimport:
   - Master Aset
   - Master SLA
   - Master Checkpoint
   - Master Jadwal
   - Master Lokasi
3. Download **Template CSV** — berisi format kolom yang benar
4. Isi template dengan data Anda
5. Upload file CSV
6. Klik **📥 Import**

### 12.2 Format Template

Setiap template memiliki kolom yang sesuai dengan tipe data. Download template untuk melihat format yang tepat.

---

## 13. MANAJEMEN USER & PENGATURAN

### 13.1 Manajemen User (Admin Only)

1. Klik menu **👥 Manajemen User**
2. **+ Tambah User:**
   - Nama Lengkap
   - Email
   - Password
   - Role (Admin / Supervisor / Staff)
   - Tim (Maintenance / Security / Housekeeping / dll)
   - No. WhatsApp (untuk notifikasi)
3. **Edit User** — ubah data, role, atau status
4. **Toggle Status** — aktif/nonaktifkan akun

### 13.2 Pengaturan (Admin Only)

1. Klik menu **⚙️ Pengaturan**
2. **Token WhatsApp API (Fonnte):**
   - Masukkan token dari dashboard Fonnte
   - Klik **📤 Kirim Test** untuk verifikasi
3. **Pengaturan Lainnya:**
   - Nama organisasi
   - Jam operasional
   - Konfigurasi notifikasi

---

## 14. INTEGRASI WHATSAPP

### 14.1 Setup Token

1. Daftar di [Fonnte](https://fonnte.com)
2. Dapatkan API token
3. Masukkan di menu **⚙️ Pengaturan** → **Token WA**
4. Klik **💾 Simpan**
5. Klik **📤 Kirim Test** untuk verifikasi

### 14.2 Notifikasi Otomatis

Sistem mengirim notifikasi WA otomatis untuk:

| Event | Penerima |
|-------|----------|
| Tiket baru dibuat | Customer |
| Tiket di-assign | Customer + Teknisi |
| Tiket selesai | Customer ( + Survey) |
| Booking disetujui | Peminjam |
| Booking ditolak | Peminjam |
| Pengingat booking (H-1) | Peminjam |
| Booking selesai | Peminjam |
| Auto-create dari WA | Admin & Supervisor |

### 14.3 Format WA Tiket Komplain (Customer)

Customer kirim format berikut ke nomor WA GA:

```
Nama: [nama Anda]
Lokasi: [lokasi kerusakan]
Kategori: [Electrical/Plumbing/AC & HVAC/Furniture/IT & Network/Lainnya]
Prioritas: [Low/Medium/High]
Deskripsi: [jelaskan kerusakan]
Foto: (kirim foto jika ada)
```

### 14.4 Format Nomor WA

Semua nomor WA harus format internasional tanpa `+`:
- ✅ `628123456789` (benar)
- ❌ `08123456789` (salah)
- ❌ `+628123456789` (salah)

---

## 15. PWA — INSTALL DI HP

GA Operations mendukung **Progressive Web App (PWA)** — bisa diinstall seperti aplikasi native di HP!

### 15.1 Cara Install

**Android (Chrome):**
1. Buka URL Web App di Chrome
2. Akan muncul banner **"Install GA Operations"**
3. Atau: ⋮ menu → **Install app** → **Install**

**iPhone (Safari):**
1. Buka URL Web App di Safari
2. Tap **Share** (📤) → **Add to Home Screen**
3. Tap **Add** (kanan atas)

### 15.2 Keuntungan Install
- ✅ Buka tanpa address bar (seperti app native)
- ✅ Icon di homescreen
- ✅ Loading lebih cepat
- ✅ Notifikasi (jika didukung browser)

### 15.3 Mode Mobile

Setelah install, app otomatis mendeteksi layar HP:
- **Bottom Nav** — 5 menu utama di bawah
- **App Drawer** — semua menu dalam grid icon
- **Responsive** — tampilan optimal di layar kecil

---

## 16. FAQ & TROUBLESHOOTING

### 16.1 Login & Akun

| Masalah | Solusi |
|---------|--------|
| Tidak bisa login Google SSO | Pastikan email terdaftar di sistem. Hubungi Admin. |
| Lupa password | Hubungi Admin untuk reset password. |
| Akun terkunci | Admin bisa aktifkan kembali di Manajemen User. |
| Error "Session expired" | Login ulang. Sesi berlaku 2 jam. |

### 16.2 WhatsApp

| Masalah | Solusi |
|---------|--------|
| WA tidak terkirim | Cek token Fonnte di **⚙️ Pengaturan** → **Test Connection** |
| Error "Token tidak dikonfigurasi" | Admin harus isi token WA di menu Pengaturan |
| Customer tidak terima WA | Pastikan nomor WA diawali `628` bukan `08` |
| Teknisi tidak terima WA | Edit user di 👥 **Manajemen User**, isi No. WA |
| Tiket auto-WA gagal | Cek format pesan WA customer |

### 16.3 Tiket & Maintenance

| Masalah | Solusi |
|---------|--------|
| Tiket tidak bisa dibuat | Pastikan **Master SLA** sudah diisi untuk kategori & urgensi |
| SLA tidak terhitung | Pastikan tiket punya waktu selesai |
| Foto tidak muncul | Pastikan URL foto valid (Google Drive share link) |
| Filter tidak berfungsi | Refresh halaman |

### 16.4 Booking

| Masalah | Solusi |
|---------|--------|
| Aset tidak muncul di dropdown | Cek **Master Aset** → Status = **Tersedia** |
| Booking selalu ditolak | Pilih jam yang berbeda atau aset lain |
| Tidak bisa booking | Cek tanggal booking (tidak boleh mundur) |

### 16.5 Mobile & Tampilan

| Masalah | Solusi |
|---------|--------|
| Tampilan tidak responsive | Refresh halaman. Pastikan tidak zoom. |
| Bottom nav tidak muncul | Buka di HP atau resize browser < 768px |
| App drawer tidak muncul | Klik ☰ di bottom nav |
| Dark mode tidak berfungsi | Klik 🌙/☀️ di sidebar |

### 16.6 Lainnya

| Masalah | Solusi |
|---------|--------|
| Data tidak muncul setelah input | Klik **🔄 Refresh** di tabel |
| Halaman lambat | Koneksi internet atau sheet terlalu besar |
| Error "Tidak ada respon dari server" | Cek koneksi, refresh, coba incognito |
| Import gagal | Cek format CSV sesuai template |

---

*Dokumen ini diperbarui secara berkala.*
*GA Operations v1.0 — General Affair*
