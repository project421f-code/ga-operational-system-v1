# 📘 USER MANUAL — GA Operations
## Modul Komplain & Booking + Notifikasi WhatsApp

---

# 🔧 A. ALUR TIKET KOMPLAIN (Customer Complaint)

## 1️⃣ Customer Membuat Tiket Baru

**Langkah:**
1. Login ke aplikasi GA Operations
2. Klik menu **🔧 Tiket Komplain** di sidebar kiri
3. Klik tombol **+ Tiket Baru**
4. Isi form:
   - **Nama Customer** * — nama pelapor
   - **No. WhatsApp** — nomor WA customer (format: `628xxx`)
   - **Lokasi** * — lokasi kerusakan
   - **Kategori** * — Plumbing / Electrical / AC/HVAC / Furniture / IT/Network / Lainnya
   - **Sub-Kategori** — (opsional, terisi otomatis dari Master SLA)
   - **Deskripsi** * — jelaskan detail kerusakan/keluhan
   - **Urgensi** * — Low / Medium / High
   - **Foto Kerusakan** — (opsional) link Google Drive
5. Klik **💾 Simpan**

**Hasil:**
- ✅ Tiket terbuat dengan ID: `MNT-2026-XXXX`
- 📱 **WhatsApp ke Customer:**

```
📋 LAPORAN TIKET BARU
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Tiket laporan Anda telah tercatat di sistem kami.
Berikut detailnya:

🆔 ID Tiket: MNT-2026-0001
📂 Kategori: Plumbing
🔴 Prioritas: Tinggi (Urgent)
📍 Lokasi: Lantai 2 Toilet
📝 Deskripsi: Wastafel bocor

⏱️ Tim teknis kami akan segera menindaklanjuti.

Simpan ID tiket untuk referensi.
Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

---

## 2️⃣ Admin/Staff Assign Teknisi (In Progress)

**Langkah:**
1. Di tabel Tiket Komplain, klik tombol **✏️ Update Status** pada tiket
2. Pilih status: **In Progress**
3. Isi **Teknisi** — nama teknisi yang ditugaskan
4. Klik **💾 Update**

**Hasil:**
- ✅ Status tiket berubah ke **In Progress**
- 📱 **WhatsApp ke Customer:**

```
🔧 TIKET SEDANG DIKERJAKAN
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Kami ingin menginformasikan bahwa tiket Anda saat ini *sedang ditangani*.

🆔 ID Tiket: MNT-2026-0001
👨‍🔧 Teknisi: Budi
📌 Status: Dalam Pengerjaan

Kami akan memberi tahu begitu pekerjaan selesai.

Terima kasih atas kesabarannya! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

- 📱 **WhatsApp ke Teknisi** (jika punya no_wa terdaftar):

```
🔧 PENUGASAN TIKET BARU
━━━━━━━━━━━━━━━━━━━━

Halo *Budi*,

Anda ditugaskan untuk menangani tiket berikut:

🆔 ID Tiket: MNT-2026-0001
👤 Pelapor: [Customer]
📍 Lokasi: Lantai 2 Toilet
📝 Deskripsi: Wastafel bocor
🔴 Prioritas: High

⚡ Segera tindak lanjuti dan update status pengerjaan.
Terima kasih! 💪
━━━━━━━━━━━━━━━━━━━━
General Affair
```

---

## 3️⃣ Admin/Staff Selesaikan Tiket (Selesai)

**Langkah:**
1. Klik tombol **✏️ Update Status** pada tiket yang In Progress
2. Pilih status: **Selesai**
3. Isi **Catatan** — hasil perbaikan
4. Upload **Foto Perbaikan** (URL)
5. Klik **💾 Update**

**Hasil:**
- ✅ Tiket selesai, SLA otomatis dihitung (Achieved/Breached)
- 📱 **WhatsApp ke Customer:**

```
✅ TIKET SELESAI
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Kami dengan senang hati menginformasikan bahwa tiket Anda telah *selesai ditangani*.

🆔 ID Tiket: MNT-2026-0001
📂 Kategori: Plumbing
📝 Catatan: Wastafel sudah diperbaiki, ganti kran baru.

Mohon berikan penilaian Anda dengan membalas pesan ini (untuk survey silahkan ketik angka sesuai rating):
1️⃣ 😡 Sangat Buruk
2️⃣ 😞 Buruk
3️⃣ 😐 Cukup
4️⃣ 😊 Baik
5️⃣ 🤩 Sangat Baik

Terima kasih telah menggunakan layanan kami! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

  
---

## 4️⃣ Customer Memberi Rating (via Balasan WA)

**Cara:**
- Customer cukup **balas pesan WA** dengan angka **1** sampai **5**
- Sistem otomatis membaca balasan via **Fonnte Webhook**

**Hasil:**
- ✅ Rating tersimpan di spreadsheet
- ✅ KPI Maintenance teknisi terupdate
- 📱 **Balasan Konfirmasi ke Customer:**

```
✅ Terima kasih!

Penilaian Anda: 4 😊
Tiket: MNT-2026-0001

Terima kasih atas partisipasinya! 🙏
```

---

## 5️⃣ Kirim Update Manual (Opsional)

Admin/Supervisor bisa kirim update kapan saja via fungsi `sendComplaintUpdate`:
- Bisa dikirim untuk memberi info tambahan ke customer
- Template: **📌 UPDATE TIKET** dengan status terkini

---

# 📅 B. ALUR BOOKING ASET (Asset Booking — Zero Admin Approval)

## 1️⃣ Prasyarat

Pastikan **Master Aset** sudah diisi:
1. Klik menu **🏷️ Master Aset**
2. Klik **+ Tambah Aset**
3. Isi: Kategori, Nama Aset, Detail/Kapasitas, Status Operasional = **Tersedia**

---

## 2️⃣ Booking Baru

**Langkah:**
1. Klik menu **📅 Peminjaman Aset**
2. Klik tombol **+ Booking Baru**
3. Isi form:
   - **Nama Peminjam** * — otomatis terisi nama user yang login
   - **No. WhatsApp** — nomor WA peminjam (format: `628xxx`)
   - **Aset yang Dipinjam** * — pilih dari dropdown
   - **Waktu Mulai** * — tanggal & jam mulai
   - **Waktu Selesai** * — tanggal & jam selesai
   - **KM Awal** — (khusus kendaraan, opsional)
4. Klik **📅 Booking**

**Hasil:**
- ✅ Sistem auto-cek jadwal (tidak ada bentrok)
- Booking ID: `BKG-2026-XXXX`

### ✅ Jika Tersedia (Approved Otomatis):
- 📱 **WhatsApp ke Customer:**

```
✅ BOOKING DISETUJUI
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Booking aset Anda telah *DISETUJUI* secara otomatis.

🆔 ID Booking: BKG-2026-0001
🏷️ Aset: Toyota Innova
🕐 Mulai: 20/07/2026 08:00
🕐 Selesai: 20/07/2026 17:00
📌 Status: ✅ Disetujui

Silakan gunakan aset sesuai jadwal yang telah ditentukan.
Pastikan untuk mengembalikan tepat waktu.

Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

- 📱 **WhatsApp Pengingat Jadwal:**

```
⏰ PENGINGAT BOOKING
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Ini adalah pengingat untuk peminjaman aset Anda *besok*.

🆔 ID Booking: BKG-2026-0001
🏷️ Aset: Toyota Innova
🕐 Mulai: 20/07/2026 08:00
🕐 Selesai: 20/07/2026 17:00

Pastikan Anda hadir tepat waktu.
Jika kendaraan, periksa kondisi fisik sebelum digunakan.

Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

### ❌ Jika Bentrok (Ditolak Otomatis):
- 📱 **WhatsApp ke Customer:**

```
❌ BOOKING DITOLAK
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Mohon maaf, booking aset Anda *TIDAK DAPAT DISETUJUI*.

🆔 ID Booking: BKG-2026-0001
🏷️ Aset: Toyota Innova
🕐 Mulai: 20/07/2026 08:00
🕐 Selesai: 20/07/2026 17:00
📌 Alasan: Jadwal bentrok dengan booking lain

Silakan pilih jadwal atau aset alternatif.
Hubungi kami jika perlu bantuan.

Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

---

## 3️⃣ Selesaikan Booking (Pengembalian Aset)

**Langkah:**
1. Di tabel Peminjaman Aset, cari booking dengan status ✅ **Approved (Auto)**
2. Klik tombol **✅ Selesai** (ikon centang hijau)
3. Masukkan **KM Akhir** (khusus kendaraan)

**Hasil:**
- ✅ Status berubah ke **Completed**
- 📱 **WhatsApp ke Customer:**

```
📦 PENGEMBALIAN ASET
━━━━━━━━━━━━━━━━━━━━

Halo *[Nama]*,

Terima kasih telah mengembalikan aset.

🆔 ID Booking: BKG-2026-0001
🏷️ Aset: Toyota Innova
📌 Status: ✅ Dikembalikan

Jangan lupa untuk melaporkan jika ada kendala selama pemakaian.

Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

---

# ⚙️ C. PERSIAPAN AWAL (WAJIB)

## Setup Token WhatsApp (Fonnte)

Agar notifikasi WA berfungsi, Admin harus setup token:

1. Klik menu **⚙️ Pengaturan**
2. Di bagian **🔑 Token API WhatsApp (Fonnte)**, masukkan token dari dashboard Fonnte
3. Klik **💾 Simpan Pengaturan**
4. Klik **📤 Kirim Test** untuk verifikasi

## Setup Nomor WA User

1. Klik menu **👥 Manajemen User**
2. Edit user teknisi → isi **No. WhatsApp** (format: `628xxx`)
3. Edit user supervisor → isi juga No. WhatsApp

## Format Nomor WA

Semua nomor harus format **internasional** tanpa `+`:
- ✅ `628123456789` (benar)
- ❌ `08123456789` (salah)
- ❌ `+628123456789` (salah)

---

# 📊 D. DIAGRAM ALUR LENGKAP

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALUR KOMPLAIN                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Customer]          [Sistem]             [Teknisi]             │
│     │                   │                    │                  │
│     ├── Kirim WA ──────►│                    │                  │
│     │  format komplain  │                    │                  │
│     │                   ├── Parse data WA    │                  │
│     │                   ├── Auto-create tiket│                  │
│     │◄── WA: Tiket Baru ┤                    │                  │
│     │                   │                    │                  │
│     │                   │                    │                  │
│     │  (Atau Admin buat via Web App)         │                  │
│     │                   │                    │                  │
│     │          [Admin Assign Teknisi]        │                  │
│     │                   ├── WA: Dikerjakan   │                  │
│     │◄──────────────────┤                    │                  │
│     │                   ├── WA: Penugasan ───►│                  │
│     │                   │                    │                  │
│     │          [Admin Selesaikan Tiket]      │                  │
│     │                   ├── WA: Selesai+Survei│                  │
│     │◄──────────────────┤                    │                  │
│     ├── Balas Rating ──►│                    │                  │
│     │                   ├── Simpan Rating    │                  │
│     │◄── Konfirmasi ────┤                    │                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    ALUR BOOKING                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Peminjam]          [Sistem]             [Admin]               │
│     │                   │                    │                  │
│     ├── Booking Baru ──►│                    │                  │
│     │                   ├── Cek Jadwal       │                  │
│     │                   │                    │                  │
│     │       ┌───────────┴──────────┐        │                  │
│     │       │ Tersedia?            │        │                  │
│     │       ├───────┬──────┐       │        │                  │
│     │       │  Ya   │ Tidak│       │        │                  │
│     │       ├───────┴──────┤       │        │                  │
│     │       │ Approved     │ Rejected      │                  │
│     │◄──────┤ WA: Disetujui│ WA: Ditolak   │                  │
│     │◄──────┤ WA: Reminder │               │                  │
│     │       │              │               │                  │
│     │          ...waktu berlalu...          │                  │
│     │       │              │               │                  │
│     │          [Admin Selesaikan Booking]   │                  │
│     │◄──────┤ WA: Dikembalikan              │                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

---

# 📱 F. FORMAT PENGIRIMAN KOMPLAIN VIA WA (Auto-Create Tiket)

Saat customer mengirim pesan ke nomor WhatsApp GA, sistem otomatis membalas dengan panduan format berikut:

```
🏢 TIKET KOMPLAIN
━━━━━━━━━━━━━━━━━━━━

Dear Customer,

Silahkan diisi tiket keluhan sesuai format dibawah.
Contoh:

🟡 Nama: Budi
📍 Lokasi: LC camp lantai 2 no 201
📂 Kategori: Electrical
🔴 Prioritas: High
📝 Deskripsi: Lampu mati

Silahkan diisi seperti contoh diatas:

🟡 Nama: 
📍 Lokasi: 
📂 Kategori: 
🔴 Prioritas: 
📝 Deskripsi: 

⏱️ Tim teknis kami akan segera menindaklanjuti.
━━━━━━━━━━━━━━━━━━━━
General Affair
```

### 🎯 Auto-Create Tiket dari WhatsApp

Customer bisa membuat tiket komplain **langsung dari WhatsApp**! 🎉

**Cara:**
1. Customer kirim pesan WA ke nomor GA mengikuti format di atas:
   ```
   🟡 Nama: Budi
   📍 Lokasi: LC camp lantai 2 no 201
   📂 Kategori: Electrical
   🔴 Prioritas: High
   📝 Deskripsi: Lampu mati
   ```
2. Sistem otomatis **mendeteksi format** dan **membuat tiket baru**
3. Customer menerima notifikasi **📋 LAPORAN TIKET BARU** berisi ID tiket
4. **Admin & Supervisor** juga menerima notifikasi **🆕 TIKET BARU DARI WHATSAPP**

**Catatan Penting:**
- Minimal harus ada **Nama**, **Lokasi**, dan **Deskripsi**
- **Kategori** opsional (default: Lainnya). Didukung: Electrical, Plumbing, AC/HVAC, Furniture, IT/Network
- **Prioritas** opsional (default: Medium). Didukung: Low (Rendah), Medium (Sedang), High (Tinggi/Urgent)
- Emoji prefix (`🟡`, `📍`, dll) **tidak wajib** — format tanpa emoji juga didukung
- **Foto** bisa dikirim sebagai attachment — URL foto otomatis tersimpan
- Jika format salah/tidak lengkap, sistem akan membalas dengan **panduan format**

### 🔔 Notifikasi ke Admin/Supervisor

Saat tiket auto-created dari WhatsApp, sistem otomatis mengirim notifikasi ke semua user dengan role **Admin** dan **Supervisor** yang:
- Status akun **Aktif**
- Memiliki **No. WhatsApp** terisi di User_List

Template notifikasi:
```
🆕 TIKET BARU DARI WHATSAPP
━━━━━━━━━━━━━━━━━━━━

Halo *[Admin]*,

Ada tiket baru yang *otomatis terbuat* dari laporan WhatsApp customer.

🆔 ID Tiket: MNT-2026-XXXX
👤 Pelapor: Budi
📂 Kategori: Electrical
📍 Lokasi: LC camp lantai 2
📝 Deskripsi: Lampu mati

⚡ Segera *assign teknisi* untuk menindaklanjuti tiket ini.

Terima kasih! 🙏
━━━━━━━━━━━━━━━━━━━━
General Affair
```

**Prasyarat:**
1. Admin & Supervisor harus punya **No. WhatsApp** terisi di sheet **User_List** (kolom `no_wa`)
2. **Token WA** harus sudah dikonfigurasi di menu **⚙️ Pengaturan**

---

# ❓ E. TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| WA tidak terkirim | Cek token Fonnte di **⚙️ Pengaturan** → **Test Connection** |
| Error "Token tidak dikonfigurasi" | Admin harus isi token WA di menu Pengaturan |
| Customer tidak terima WA | Pastikan nomor WA diawali `628` bukan `08` |
| Teknisi tidak terima WA | Edit user teknisi di 👥 Manajemen User, isi No. WA |
| Tiket tidak bisa dibuat | Pastikan **Master SLA** sudah diisi untuk kategori & urgensi tersebut |
