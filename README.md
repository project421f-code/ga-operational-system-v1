# GA Operations 🏢

**Sistem Manajemen Operasional General Affair** — Otomatisasi, Integrasi & Manajemen Operasional GA berbasis Google Workspace.

---

## 🚀 Fitur Utama

### 🔧 Maintenance & Tiket Komplain
- Pembuatan tiket komplain via **WhatsApp** (auto-create)
- Management tiket: Open → In Progress → Selesai
- Notifikasi WA ke customer & teknisi otomatis
- Rating/Survei kepuasan via balasan WA (In-Chat Survey)
- Master SLA dinamis untuk target penyelesaian

### 📊 KPI & SLA
- Perhitungan otomatis Kepatuhan SLA
- Dashboard KPI Maintenance & Security
- Rating Survey & analisis performa tim

### 🛡️ Security
- Log patroli dengan **QR Code** scanner
- Inspeksi kendaraan bulanan
- Manajemen checkpoint & jadwal patroli
- KPI Security

### 📅 Peminjaman Aset (Zero Admin Approval)
- Booking ruangan, kendaraan & peralatan
- **Validasi bentrok otomatis** — tanpa persetujuan manual
- Notifikasi WA booking & pengingat jadwal
- Halaman publik cek ketersediaan aset

### ✅ Housekeeping
- Checklist harian cleaning service
- Audit kebersihan oleh supervisor
- General Cleaning (GC) management
- KPI Housekeeping

### 🏠 Manajemen Kos
- Monitoring kamar kos
- Check-in / Check-out
- Persiapan kamar
- Tracker cleaning

### 👥 Manajemen User & RBAC
- 3 level akses: **Admin**, **Supervisor**, **Staff**
- Auto-login via Google SSO
- Login manual (email + password terenkripsi)
- Filter akses berdasarkan tim (Team-Based Access)

---

## 🛠️ Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| **Database** | Google Sheets (15+ sheets) |
| **Backend** | Google Apps Script (V8) |
| **Frontend** | HTML + CSS + Vanilla JavaScript |
| **Komunikasi** | `google.script.run` Async RPC |
| **Hosting** | Google Apps Script Web App |
| **WA Gateway** | Fonnte API |
| **QR Code** | html5-qrcode + qrcodejs |
| **Charts** | Chart.js + chartjs-plugin-datalabels |

---

## 📸 Tampilan

> *Web App responsive — support mobile & desktop*

| Mode | Tampilan |
|------|----------|
| **Desktop** | Sidebar navigasi + konten utama |
| **Mobile** | Bottom nav 5 menu + App Drawer grid |
| **Public** | Halaman cek aset tanpa login (shareable link) |

---

## 🔗 Link Penting

| Link | URL |
|------|-----|
| **Web App** | Lihat deployment terbaru |
| **Halaman Publik** | `?page=cek-aset` |
| **Survey GA** | `?page=survey` |

---

## ⚙️ Setup & Instalasi

### Prasyarat
- Google Account (untuk Apps Script)
- Spreadsheet Google sebagai database
- Akun Fonnte untuk WhatsApp Gateway (opsional)

### 1. Clone Repository
```bash
git clone https://github.com/project421f-code/ga-operational-system-v1.git
cd ga-operational-system-v1
```

### 2. Setup Google Apps Script
```bash
# Install clasp
npm install -g @google/clasp

# Login ke Google
clasp login

# Buat project baru di script.google.com
# Copy Script ID

# Setup
clasp clone <SCRIPT_ID>
clasp push
```

### 3. Konfigurasi
1. Buka Spreadsheet tujuan
2. Jalankan fungsi `initializeAllSheets()` untuk membuat semua sheet & seed data
3. Setup token WA di menu **⚙️ Pengaturan**
4. Tambah user via menu **👥 Manajemen User**

### 4. Deploy
```bash
clasp deploy -d "Deskripsi versi"
```

### Default Login
- **Email:** `admin@ga.com`
- **Password:** `ga2026`

---

## 📁 Struktur Proyek

```
ga-operational-system-v1/
├── appsscript.json           # Konfigurasi GAS project
├── .clasp.json               # Konfigurasi clasp
├── Code.gs                   # Entry point web app + routing API
├── Helpers.gs                # Config, utility, session, WA sender
├── initDatabase.gs           # Inisialisasi database (15+ sheets + seed)
├── API_Auth.gs               # Autentikasi & manajemen user
├── API_Booking.gs            # Peminjaman aset + halaman publik
├── API_Housekeeping.gs       # Housekeeping: checklist, audit, GC, KPI
├── API_Kos.gs                # Manajemen kos: kamar, transaksi, persiapan
├── API_Maintenance.gs        # Tiket komplain, SLA, KPI, rating survei
├── API_Security.gs           # Patroli, inspeksi, checkpoint, jadwal
├── API_Survey.gs             # Survey GA: konfigurasi, submit, stats
├── _setup_wa_token.gs        # Setup token WhatsApp
├── index.html                # Frontend UI (semua halaman dalam satu file)
│
├── PRD_GA_v8.0.md            # Product Requirement Document
├── ARSITEKTUR.md             # Dokumentasi arsitektur teknis
├── USER_MANUAL.md            # Panduan penggunaan modul
├── SESI_CATATAN.md           # Catatan pengembangan
└── README.md                 # File ini
```

---

## 📚 Dokumentasi

| Dokumen | Deskripsi |
|---------|-----------|
| [`PRD_GA_v8.0.md`](PRD_GA_v8.0.md) | Product Requirement Document lengkap |
| [`ARSITEKTUR.md`](ARSITEKTUR.md) | Arsitektur teknis & pola kode |
| [`USER_MANUAL.md`](USER_MANUAL.md) | Panduan penggunaan modul komplain & booking |

---

## 📐 Arsitektur

### Alur Data
```
User (Browser/WA) → doGet()/doPost() → executeAction() → API Function → Google Sheets
                          ↕                        ↕
                     index.html              Helpers.gs (session, response)
```

### Pola API
```javascript
function namaFungsi(params) {
  try {
    // Validasi session & input
    // Logika bisnis (baca/tulis sheet)
    return successResponse(data, 'Berhasil');
  } catch (e) {
    return errorResponse(e.message);
  }
}
```

### Role-Based Access
| Role | Akses |
|------|-------|
| **Admin** | Semua fitur + konfigurasi |
| **Supervisor** | Verifikasi, audit, KPI |
| **Staff** | Input data via form sesuai tim |

---

## 🧪 Testing

Fungsi backend bisa di-test langsung dari Apps Script Editor. Untuk frontend:
1. Deploy sebagai Web App
2. Buka URL deployment
3. Login dengan akun test (`admin@ga.com` / `ga2026`)

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur: `git checkout -b fitur-keren`
3. Commit perubahan: `git commit -m 'Tambah fitur keren'`
4. Push: `git push origin fitur-keren`
5. Buat Pull Request

---

## 📄 License

Hak cipta dilindungi. Dikembangkan untuk kebutuhan internal General Affair.

---

*Dibuat dengan ❤️ untuk tim General Affair*
