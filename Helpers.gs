/**
 * ============================================================
 * Helpers.gs — Konfigurasi & Utility Functions
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── GLOBAL CONFIG ───────────────────────────────────────────
var CONFIG = {
  SPREADSHEET_ID: '1u9WedU9CqC1nED_w6TLpXlpGEPZbP-vYrv0-7NF3qvQ',
  APP_NAME: 'GA Operations',
  ORG_NAME: 'General Affair',
  VERSION: '1.0.0',
  TIMEZONE: 'Asia/Jakarta',
  SESSION_TTL: 7200, // 2 jam dalam detik

  // WhatsApp API (Fonnte)
  WA_API_URL: 'https://api.fonnte.com/send',
  WA_API_TOKEN: '__USE_PROPERTIES__', // Token disimpan di PropertiesService, bukan di kode

  SHEETS: {
    MAIN_DATA:          'Main_Data',
    MASTER_SLA:         'Master_SLA',
    DASHBOARD_KPI_MNT:  'Dashboard_KPI_Mnt',
    PATROL_LOG:         'Patrol_Log',
    ASSET_INSPECTION:   'Asset_Inspection',
    KPI_SECURITY:       'KPI_Security',
    ASSET_BOOKING:      'Asset_Booking',
    ASSET_LIST:         'Asset_List',
    AUDIT_HOUSEKEEPING: 'Audit_Housekeeping',
    CS_DAILY_CHECKLIST: 'CS_Daily_Checklist',
    MASTER_CS_SCHEDULE: 'Master_CS_Schedule',
    GC_EXECUTION:       'GC_Execution',
    USER_LIST:          'User_List',
    PATROL_CHECKPOINTS: 'Master_Patrol_Checkpoints',
    PATROL_SCHEDULE:    'Master_Patrol_Schedule',
    SURVEY_GA:          'Survey_GA',
    MASTER_LOKASI:      'Master_Lokasi',
    MASTER_KOS:         'Master_Kos',
    MASTER_KAMAR:       'Master_Kamar',
    TRANSAKSI_KOS:      'Transaksi_Kos',
    PERSIAPAN_KAMAR:    'Persiapan_Kamar'
  },

  ROLES: {
    ADMIN:      'Admin',
    SUPERVISOR: 'Supervisor',
    STAFF:      'Staff'
  },

  STATUS: {
    OPEN:        'Open',
    IN_PROGRESS: 'In Progress',
    SELESAI:     'Selesai',
    ACHIEVED:    'Achieved',
    BREACHED:    'Breached'
  }
};

// ─── CURRENT USER (set per-request) ─────────────────────────
var CURRENT_USER_EMAIL = '';

// ─── CACHED SPREADSHEET OBJECT ────────────────────────────
// Cache spreadsheet instance untuk menghindari multiple openById()
// dalam satu eksekusi. GAS menjalankan script dari awal setiap request,
// jadi variabel global ini hanya bertahan dalam 1 request.
var _cachedSpreadsheet = null;

// ─── SPREADSHEET ACCESS ─────────────────────────────────────

/**
 * Mendapatkan instance Spreadsheet (cached dalam 1 eksekusi)
 * openById() adalah operasi mahal — dengan cache ini, fungsi yang
 * baca banyak sheet cukup panggil openById() SEKALI saja.
 */
function getSpreadsheet() {
  if (!_cachedSpreadsheet) {
    _cachedSpreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return _cachedSpreadsheet;
}

/**
 * Mendapatkan Sheet by name
 */
function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Jalankan initializeAllSheets() terlebih dahulu.');
  return sheet;
}

/**
 * Baca semua data dari sheet → array of objects
 * Baris pertama = header, baris selanjutnya = data
 */
function getSheetData(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row._rowIndex = i + 1; // 1-based row number in sheet
    result.push(row);
  }
  return result;
}

/**
 * Baca data sheet dengan CacheService (TTL otomatis)
 * Untuk data master yang jarang berubah — mengurangi API calls ke Google Sheets.
 * 
 * @param {string} sheetName - Nama sheet
 * @param {number} ttlSeconds - Time-to-live dalam detik (default: 300 = 5 menit)
 * @return {Array} Array of objects (sama seperti getSheetData)
 */
function getCachedSheetData(sheetName, ttlSeconds) {
  var cache = CacheService.getScriptCache();
  var key = 'csd_' + sheetName.replace(/[^a-zA-Z0-9]/g, '_');
  var cached = cache.get(key);
  
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('Cache parse error for ' + sheetName + ': ' + e.message + ' — membaca ulang.');
    }
  }
  
  // Cache miss — baca dari sheet
  var data = getSheetData(sheetName);
  
  // Cache the result (max 21600 detik = 6 jam, atau gunakan ttl yang diberikan)
  var maxTtl = Math.min(ttlSeconds || 300, 21600);
  if (data.length > 0) {
    cache.put(key, JSON.stringify(data), maxTtl);
    Logger.log('CACHED: ' + sheetName + ' (' + data.length + ' rows, TTL=' + maxTtl + 's)');
  }
  
  return data;
}

/**
 * Cari satu baris berdasarkan key column dan value
 * @return {Object|null} { rowIndex, data } atau null
 */
function findRow(sheetName, keyColumn, keyValue) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  var headers = data[0];
  var colIndex = headers.indexOf(keyColumn);
  if (colIndex === -1) throw new Error('Kolom "' + keyColumn + '" tidak ditemukan di sheet "' + sheetName + '".');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]).trim() === String(keyValue).trim()) {
      var rowData = {};
      for (var j = 0; j < headers.length; j++) {
        rowData[headers[j]] = data[i][j];
      }
      return { rowIndex: i + 1, data: rowData };
    }
  }
  return null;
}

/**
 * Update satu sel dalam sheet
 */
function updateCell(sheetName, rowIndex, colName, value) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIndex = headers.indexOf(colName);
  if (colIndex === -1) throw new Error('Kolom "' + colName + '" tidak ditemukan.');
  sheet.getRange(rowIndex, colIndex + 1).setValue(value);
}

/**
 * Update multiple sel dalam satu baris
 * @param {Object} updates - { colName: value, ... }
 */
function updateRowCells(sheetName, rowIndex, updates) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  for (var colName in updates) {
    var colIndex = headers.indexOf(colName);
    if (colIndex !== -1) {
      sheet.getRange(rowIndex, colIndex + 1).setValue(updates[colName]);
    }
  }
}

// ─── ID GENERATOR ───────────────────────────────────────────

/**
 * Generate ID unik: PREFIX-YYYYMMDD-XXXX
 */
function generateId(prefix) {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd');
  var rand = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  return prefix + '-' + dateStr + '-' + rand;
}

/**
 * Generate sequential ID: PREFIX-YYYY-NNNN
 * Dioptimasi dengan PropertiesService — tidak perlu baca seluruh sheet.
 * Counter disimpan per prefix+tahun, di-update otomatis setiap ID baru.
 * Fallback: jika counter tidak ditemukan, baca sheet untuk inisialisasi.
 */
function generateSequentialId(prefix, sheetName, idColumn) {
  var year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy');
  var pattern = prefix + '-' + year + '-';
  var propsKey = 'seqid_' + prefix + '_' + year;
  
  var props = PropertiesService.getScriptProperties();
  var lastNum = parseInt(props.getProperty(propsKey) || '0', 10);
  
  if (lastNum === 0) {
    // First time this year — baca sheet untuk init counter
    var data = getSheetData(sheetName);
    data.forEach(function(row) {
      var id = String(row[idColumn] || '');
      if (id.indexOf(pattern) === 0) {
        var num = parseInt(id.replace(pattern, ''), 10);
        if (num > lastNum) lastNum = num;
      }
    });
    Logger.log('SEQID INIT: ' + propsKey + ' = ' + lastNum + ' (from ' + sheetName + ')');
  }
  
  var nextNum = lastNum + 1;
  props.setProperty(propsKey, String(nextNum));
  
  var numStr = String(nextNum);
  while (numStr.length < 4) numStr = '0' + numStr;
  return pattern + numStr;
}

// ─── AUTHENTICATION & SESSION ───────────────────────────────

/**
 * Hash password menggunakan SHA-256
 */
function hashPassword(password) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return raw.map(function(b) {
    var hex = (b < 0 ? b + 256 : b).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Generate UUID untuk session token
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Simpan session token ke CacheService
 */
function setSessionToken(email, token) {
  var cache = CacheService.getScriptCache();
  cache.put('session_' + email, token, CONFIG.SESSION_TTL);
}

/**
 * Validasi session token
 */
function validateSessionToken(email, token) {
  var cache = CacheService.getScriptCache();
  var storedToken = cache.get('session_' + email);
  return storedToken === token;
}

/**
 * Hapus session token
 */
function removeSessionToken(email) {
  var cache = CacheService.getScriptCache();
  cache.remove('session_' + email);
}

/**
 * Get active user session data dari User_List
 * @return {Object} { email, nama, role, tim, userId, status }
 */
function getActiveUserSession(email) {
  var userEmail = email || CURRENT_USER_EMAIL;
  if (!userEmail) throw new Error('Sesi tidak valid. Silakan login ulang.');

  var found = findRow(CONFIG.SHEETS.USER_LIST, 'email', userEmail);
  if (!found) throw new Error('User tidak terdaftar dalam sistem.');
  if (found.data.status !== 'Aktif') throw new Error('Akun Anda dinonaktifkan. Hubungi Admin.');

  return {
    userId: found.data.user_id,
    email: found.data.email,
    nama: found.data.nama,
    role: found.data.role,
    tim: found.data.tim,
    status: found.data.status,
    no_wa: found.data.no_wa || ''
  };
}

/**
 * Validasi akses berdasarkan role
 */
function requireRole(userRole, allowedRoles) {
  if (allowedRoles.indexOf(userRole) === -1) {
    throw new Error('Akses ditolak. Role "' + userRole + '" tidak memiliki izin untuk fitur ini.');
  }
}

// ─── RESPONSE HELPERS ───────────────────────────────────────

function successResponse(data, message) {
  return {
    success: true,
    data: data,
    message: message || 'Berhasil.'
  };
}

function errorResponse(message) {
  return {
    success: false,
    error: message || 'Terjadi kesalahan.'
  };
}

// ─── LOCK SERVICE (Race Condition Protection) ───────────────

/**
 * Jalankan fungsi dalam Lock untuk mencegah race condition
 */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Tunggu max 15 detik
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// ─── UTILITY FUNCTIONS ──────────────────────────────────────

/**
 * Normalisasi nomor telepon: handle scientific notation & format konsisten
 * Google Sheets menyimpan angka panjang sebagai number → saat dibaca ulang
 * bisa dalam format scientific notation (6.28E12) yang ditolak Fonnte.
 */
function normalizePhone(phone) {
  if (!phone && phone !== 0) return '';
  // Force to string
  var str = String(phone);
  // Handle scientific notation: 6.282247008466E12 → 6282247008466
  if (/[eE]/.test(str)) {
    var num = parseFloat(str);
    if (!isNaN(num) && isFinite(num)) {
      str = num.toFixed(0);
    }
  }
  // Strip all non-numeric characters
  return str.replace(/[^0-9]/g, '');
}

/**
 * Escape HTML untuk mencegah XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format angka ke Rupiah
 */
function formatRupiah(num) {
  if (!num && num !== 0) return 'Rp 0';
  return 'Rp ' + Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format tanggal ke string Indonesia
 */
function formatDateId(date) {
  if (!date) return '-';
  return Utilities.formatDate(new Date(date), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm');
}

/**
 * Format tanggal hanya tanggal
 */
function formatDateOnly(date) {
  if (!date) return '-';
  return Utilities.formatDate(new Date(date), CONFIG.TIMEZONE, 'dd/MM/yyyy');
}

/**
 * Hitung selisih jam antara dua tanggal
 */
function diffInHours(startDate, endDate) {
  var diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

// ─── PAGINATION HELPER ──────────────────────────────────────

/**
 * Terapkan pagination ke array data
 * Digunakan oleh fungsi getAll* untuk membatasi jumlah data yang dikirim
 * 
 * @param {Array} data - Array data yang sudah difilter dan di-sort
 * @param {number} limit - Maksimal jumlah baris (0 atau undefined = semua)
 * @param {number} offset - Jumlah baris yang dilewati (default: 0)
 * @return {Object} { paginatedData, total, hasMore }
 */
function applyPagination(data, limit, offset) {
  var total = data.length;
  var lim = limit && !isNaN(limit) ? Math.min(Math.max(parseInt(limit), 1), 500) : 0;
  var off = offset && !isNaN(offset) ? Math.max(parseInt(offset), 0) : 0;
  
  var hasMore = false;
  var paginatedData = data;
  
  if (lim > 0) {
    var endIndex = off + lim;
    hasMore = endIndex < total;
    paginatedData = data.slice(off, endIndex);
  }
  
  return {
    paginatedData: paginatedData,
    total: total,
    limit: lim || total,
    offset: off,
    hasMore: hasMore
  };
}

/**
 * Get current timestamp
 */
function now() {
  return new Date();
}

/**
 * Get formatted current timestamp
 */
function nowFormatted() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

// ─── WHATSAPP INTEGRATION (Fonnte) ──────────────────────────

/**
 * Kirim pesan WhatsApp via Fonnte API
 * @param {string} phone - Nomor WA tujuan (format: 628xxx)
 * @param {string} message - Isi pesan
 * @return {Object} Response dari API
 */
function sendWhatsApp(phone, message) {
  var token = getSetting('WA_API_TOKEN');
  if (!token) {
    Logger.log('WA_API_TOKEN belum dikonfigurasi. Pesan tidak terkirim.');
    return { success: false, error: 'Token WhatsApp belum dikonfigurasi. Silakan isi di menu Pengaturan.' };
  }

  // Pastikan nomor HP berupa string angka bersih (fix: scientific notation dari Google Sheets)
  phone = normalizePhone(phone);
  Logger.log('WA: normalized phone="' + phone + '"');
  if (!phone) {
    Logger.log('WA: Nomor HP tidak valid setelah konversi.');
    return { success: false, error: 'Nomor HP tidak valid.' };
  }

  try {
    var options = {
      method: 'post',
      headers: {
        'Authorization': token
      },
      payload: {
        'target': phone,
        'message': message,
        'countryCode': '62'
      },
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(CONFIG.WA_API_URL, options);
    var result = JSON.parse(response.getContentText());
    Logger.log('WA Send Result: ' + JSON.stringify(result));
    return result;
  } catch (e) {
    Logger.log('WA Send Error: ' + e.message);
    return { success: false, error: e.message };
  }
}

// ─── WEBHOOK CACHE (untuk debugging & validasi) ────────────

/**
 * Cache payload webhook terakhir ke CacheService
 * Biar bisa dicek dari endpoint ?webhook=1 tanpa perlu buka Logs
 */
function cacheWebhookPayload(payload, action, result) {
  try {
    var cache = CacheService.getScriptCache();
    var summary = {
      time: nowFormatted(),
      sender: payload.sender || '(unknown)',
      name: payload.name || '(unknown)',
      message_preview: (payload.message || '').substring(0, 150),
      action: action || 'received',
      result: result || 'ok'
    };
    // Hanya cache info penting, bukan payload mentah yang besar
    cache.put('webhook_last_summary', JSON.stringify(summary), 600); // 10 menit
    cache.put('webhook_last_time', String(new Date().getTime()), 600);
    Logger.log('Webhook cached: ' + JSON.stringify(summary));
  } catch (cacheErr) {
    Logger.log('Cache webhook error: ' + cacheErr.message);
  }
}

/**
 * Mendapatkan status webhook untuk halaman validasi
 * @return {Object} Status object
 */
function getWebhookStatus() {
  try {
    var cache = CacheService.getScriptCache();
    var token = getSetting('WA_API_TOKEN');
    var scriptUrl = ScriptApp.getService().getUrl();
    var lastSummary = cache.get('webhook_last_summary');
    var lastTime = cache.get('webhook_last_time');

    return {
      wa_token_configured: !!token,
      wa_token_preview: token ? token.substring(0, 6) + '...' + token.slice(-4) : null,
      web_app_url: scriptUrl,
      webhook_url: scriptUrl, // URL yang sama untuk doPost()
      last_webhook: lastSummary ? JSON.parse(lastSummary) : null,
      last_webhook_time: lastTime ? new Date(parseInt(lastTime, 10)).toLocaleString('id-ID') : null,
      spreadsheet_id: CONFIG.SPREADSHEET_ID,
      timezone: CONFIG.TIMEZONE
    };
  } catch (e) {
    Logger.log('getWebhookStatus Error: ' + e.message);
    return { error: e.message };
  }
}

// ─── SETTINGS (PropertiesService) ──────────────────────────

/**
 * Mendapatkan nilai setting dari PropertiesService
 * @param {string} key - Nama setting
 * @return {string|null} Nilai setting atau null jika tidak ada
 */
function getSetting(key) {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty(key);
}

/**
 * Mendapatkan semua settings untuk frontend
 * Hanya Admin yang bisa mengakses
 */
function getSettings() {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();

    // Hanya kirim setting yang diizinkan ke frontend
    return successResponse({
      WA_API_TOKEN: all.WA_API_TOKEN || '',
      WA_API_URL: CONFIG.WA_API_URL
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Menyimpan settings ke PropertiesService
 * Hanya Admin yang bisa mengakses
 * @param {Object} settings - Object berisi key-value pairs
 */
function saveSettings(settings) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (!settings || typeof settings !== 'object') {
      throw new Error('Data settings tidak valid.');
    }

    var props = PropertiesService.getScriptProperties();

    // Simpan setiap setting yang diizinkan
    if (settings.WA_API_TOKEN !== undefined) {
      if (settings.WA_API_TOKEN && settings.WA_API_TOKEN.trim() !== '') {
        props.setProperty('WA_API_TOKEN', settings.WA_API_TOKEN.trim());
      } else {
        props.deleteProperty('WA_API_TOKEN');
      }
    }

    Logger.log('Settings berhasil disimpan: ' + JSON.stringify(Object.keys(settings)));
    return successResponse(null, 'Pengaturan berhasil disimpan. ✅');
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    TEMPLATE PESAN WHATSAPP — CUSTOMER COMPLAINT           ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * [TEMPLATE] Konfirmasi cepat tiket berhasil dibuat — WAJIB dikirim ke customer
 * via nomor Fonnte sender (bukan nomor dari form, supaya pasti sampai)
 */
function sendTicketConfirmation(phone, customerName, ticketId, kategori) {
  var message = '✅ *Laporan Diterima*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + (customerName || 'Customer') + '*,\n\n' +
    'Laporan Anda telah tercatat di sistem kami.\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    '📂 *Kategori:* ' + (kategori || 'Lainnya') + '\n\n' +
    '⏱️ Tim teknis kami akan segera menindaklanjuti laporan Anda.\n' +
    'Simpan ID tiket untuk referensi.\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi tiket komplain baru — dikirim ke customer
 */
function sendNewTicketNotification(phone, ticketId, customerName, kategori, urgensi, lokasi, deskripsi) {
  var urgensiEmoji = { 'Low': '🟢', 'Medium': '🟡', 'High': '🔴' };
  var emoji = urgensiEmoji[urgensi] || '⚪';
  var urgensiLabel = { 'Low': 'Rendah', 'Medium': 'Sedang', 'High': 'Tinggi (Urgent)' };
  var label = urgensiLabel[urgensi] || urgensi;

  var message = '📋 *LAPORAN TIKET BARU*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + customerName + '*,\n\n' +
    'Tiket laporan Anda telah tercatat di sistem kami.\nBerikut detailnya:\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    '📂 *Kategori:* ' + kategori + '\n' +
    emoji + ' *Prioritas:* ' + label + '\n' +
    (lokasi ? '📍 *Lokasi:* ' + lokasi + '\n' : '') +
    (deskripsi ? '📝 *Deskripsi:* ' + deskripsi + '\n' : '') +
    '\n⏱️ Tim teknis kami akan segera menindaklanjuti.\n\n' +
    'Simpan ID tiket untuk referensi.\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi tiket sedang dikerjakan — dikirim ke customer
 */
function sendTicketInProgressNotification(phone, customerName, ticketId, teknisiNama) {
  var message = '🔧 *TIKET SEDANG DIKERJAKAN*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + customerName + '*,\n\n' +
    'Kami ingin menginformasikan bahwa tiket Anda saat ini *sedang ditangani*.\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    '👨‍🔧 *Teknisi:* ' + (teknisiNama || 'Tim teknis') + '\n' +
    '📌 *Status:* Dalam Pengerjaan\n\n' +
    'Kami akan memberi tahu begitu pekerjaan selesai.\n' +
    'Terima kasih atas kesabarannya! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi update umum tiket komplain — dikirim ke customer
 */
function sendComplaintUpdateNotification(phone, customerName, ticketId, status, pesanTambahan) {
  var statusEmoji = { 'Open': '🟡', 'In Progress': '🔵', 'Selesai': '🟢', 'Closed': '⚪' };
  var emoji = statusEmoji[status] || '📌';

  var message = '📌 *UPDATE TIKET*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + customerName + '*,\n\n' +
    'Berikut adalah update terbaru untuk tiket Anda:\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    emoji + ' *Status:* ' + status + '\n' +
    (pesanTambahan ? '\n💬 *Pesan:* ' + pesanTambahan + '\n' : '') +
    '\nJika ada pertanyaan, silakan hubungi kami.\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi tiket selesai — dikirim ke customer
 */
function sendTicketCompletedNotification(phone, pelaporNama, ticketId, catatan, kategori) {
  var message = '✅ *TIKET SELESAI*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + pelaporNama + '*,\n\n' +
    'Kami dengan senang hati menginformasikan bahwa tiket Anda telah *selesai ditangani*.\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    (kategori ? '📂 *Kategori:* ' + kategori + '\n' : '') +
    (catatan ? '📝 *Catatan:* ' + catatan + '\n' : '') +
    '\n' +
    'Mohon berikan penilaian Anda dengan membalas pesan ini (untuk survey silahkan ketik angka sesuai rating):\n' +
    '1️⃣ 😡 Sangat Buruk\n' +
    '2️⃣ 😞 Buruk\n' +
    '3️⃣ 😐 Cukup\n' +
    '4️⃣ 😊 Baik\n' +
    '5️⃣ 🤩 Sangat Baik\n\n' +
    'Terima kasih telah menggunakan layanan kami! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi ke teknisi saat ditugaskan menangani tiket
 */
function sendTicketAssignedNotification(phone, teknisiNama, ticketId, customerName, lokasi, deskripsi, urgensi) {
  var urgensiEmoji = { 'Low': '🟢', 'Medium': '🟡', 'High': '🔴' };
  var emoji = urgensiEmoji[urgensi] || '⚪';

  var message = '🔧 *PENUGASAN TIKET BARU*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + teknisiNama + '*,\n\n' +
    'Anda ditugaskan untuk menangani tiket berikut:\n\n' +
    '🆔 *ID Tiket:* ' + ticketId + '\n' +
    '👤 *Pelapor:* ' + customerName + '\n' +
    '📍 *Lokasi:* ' + lokasi + '\n' +
    '📝 *Deskripsi:* ' + deskripsi + '\n' +
    (urgensi ? emoji + ' *Prioritas:* ' + urgensi + '\n' : '') +
    '\n⚡ Segera tindak lanjuti dan update status pengerjaan.\n' +
    'Terima kasih! 💪\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}


// ╔══════════════════════════════════════════════════════════╗
// ║    TEMPLATE PESAN WHATSAPP — BOOKING ASET                ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * [TEMPLATE] Notifikasi booking aset — dikirim ke peminjam
 */
function sendBookingNotification(phone, peminjamNama, divisi, bookingId, namaAset, waktuMulai, waktuSelesai, status, alasan) {
  var message;

  if (status === 'Approved (Auto)') {
    message = '✅ *BOOKING DISETUJUI*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Halo *' + peminjamNama + '*,\n\n' +
      'Booking aset Anda telah *DISETUJUI* secara otomatis.\n\n' +
      '🆔 *ID Booking:* ' + bookingId + '\n' +
      '🏢 *Divisi:* ' + (divisi || '-') + '\n' +
      '🏷️ *Aset:* ' + namaAset + '\n' +
      '🕐 *Mulai:* ' + waktuMulai + '\n' +
      '🕐 *Selesai:* ' + waktuSelesai + '\n' +
      '📌 *Status:* ✅ Disetujui\n\n' +
      'Silakan gunakan aset sesuai jadwal yang telah ditentukan.\n' +
      'Pastikan untuk mengembalikan tepat waktu.\n\n' +
      'Terima kasih! 🙏\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      CONFIG.ORG_NAME;
  } else {
    message = '❌ *BOOKING DITOLAK*\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Halo *' + peminjamNama + '*,\n\n' +
      'Mohon maaf, booking aset Anda *TIDAK DAPAT DISETUJUI*.\n\n' +
      '🆔 *ID Booking:* ' + bookingId + '\n' +
      '🏢 *Divisi:* ' + (divisi || '-') + '\n' +
      '🏷️ *Aset:* ' + namaAset + '\n' +
      '🕐 *Mulai:* ' + waktuMulai + '\n' +
      '🕐 *Selesai:* ' + waktuSelesai + '\n' +
      '📌 *Alasan:* ' + (alasan || 'Jadwal bentrok dengan booking lain') + '\n\n' +
      'Silakan pilih jadwal atau aset alternatif.\n' +
      'Hubungi kami jika perlu bantuan.\n\n' +
      'Terima kasih! 🙏\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      CONFIG.ORG_NAME;
  }

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Pengingat booking aset — H-1 sebelum peminjaman
 */
function sendBookingReminderNotification(phone, peminjamNama, divisi, bookingId, namaAset, waktuMulai, waktuSelesai) {
  var message = '⏰ *PENGINGAT BOOKING*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + peminjamNama + '*,\n\n' +
    'Ini adalah pengingat untuk peminjaman aset Anda *besok*.\n\n' +
    '🆔 *ID Booking:* ' + bookingId + '\n' +
    '🏢 *Divisi:* ' + (divisi || '-') + '\n' +
    '🏷️ *Aset:* ' + namaAset + '\n' +
    '🕐 *Mulai:* ' + waktuMulai + '\n' +
    '🕐 *Selesai:* ' + waktuSelesai + '\n\n' +
    'Pastikan Anda hadir tepat waktu.\n' +
    'Jika kendaraan, periksa kondisi fisik sebelum digunakan.\n\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi booking selesai — konfirmasi pengembalian aset
 */
function sendBookingCompletedNotification(phone, peminjamNama, bookingId, namaAset) {
  var message = '📦 *PENGEMBALIAN ASET*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + peminjamNama + '*,\n\n' +
    'Terima kasih telah mengembalikan aset.\n\n' +
    '🆔 *ID Booking:* ' + bookingId + '\n' +
    '🏷️ *Aset:* ' + namaAset + '\n' +
    '📌 *Status:* ✅ Dikembalikan\n\n' +
    'Jangan lupa untuk melaporkan jika ada kendala selama pemakaian.\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}


// ╔══════════════════════════════════════════════════════════╗
// ║    TEMPLATE PESAN WHATSAPP — INTERNAL STAFF              ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * [TEMPLATE] Pengingat patroli — dikirim ke personel security
 */
function sendPatrolReminder(phone, personelNama, shift) {
  var message = '🛡️ *PENGINGAT PATROLI*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + personelNama + '*,\n\n' +
    'Waktunya melaksanakan patroli *' + shift + '*!\n\n' +
    '📌 Jangan lupa:\n' +
    '  • Scan QR Code di setiap checkpoint\n' +
    '  • Catat kondisi area\n' +
    '  • Laporkan temuan mencurigakan\n\n' +
    'Tetap waspada dan jaga keamanan! 🚨\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Kerusakan terdeteksi dari checklist CS — dikirim ke supervisor/admin
 */
function sendDamageDetectedNotification(phone, penerimaNama, lokasi, detailKerusakan, tiketId) {
  var message = '⚠️ *KERUSAKAN TERDETEKSI*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + penerimaNama + '*,\n\n' +
    'Dari checklist harian CS, ditemukan kerusakan yang memerlukan tindakan:\n\n' +
    '📍 *Lokasi:* ' + lokasi + '\n' +
    '📝 *Detail:* ' + detailKerusakan + '\n' +
    '🆔 *Tiket Otomatis:* ' + tiketId + '\n\n' +
    '⚡ Segera ditindaklanjuti.\n' +
    'Terima kasih!\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi tiket auto-created dari WA — dikirim ke Admin/Supervisor
 */
function sendAutoTicketAdminNotification(phone, adminNama, customerNama, tiketId, kategori, lokasi, deskripsi, fotoUrl) {
  var message = '🆕 *TIKET BARU DARI WHATSAPP*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + adminNama + '*,\n\n' +
    'Ada tiket baru yang *otomatis terbuat* dari laporan WhatsApp customer.\n\n' +
    '🆔 *ID Tiket:* ' + tiketId + '\n' +
    '👤 *Pelapor:* ' + customerNama + '\n' +
    '📂 *Kategori:* ' + kategori + '\n' +
    '📍 *Lokasi:* ' + lokasi + '\n' +
    '📝 *Deskripsi:* ' + deskripsi + '\n' +
    (fotoUrl ? '🖼️ *Foto:* ' + fotoUrl + '\n' : '') +
    '\n⚡ Segera *assign teknisi* untuk menindaklanjuti tiket ini.\n\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * [TEMPLATE] Notifikasi pembersihan kamar — dikirim ke staff housekeeping
 */
function sendRoomCleaningNotification(phone, staffNama, nomorKamar, namaKos, tamuNama, catatan) {
  var message = '🧹 *TUGAS PEMBERSIHAN KAMAR*\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo *' + staffNama + '*,\n\n' +
    'Ada tugas pembersihan kamar setelah check-out tamu.\n\n' +
    '🚪 *Kamar:* ' + nomorKamar + '\n' +
    '🏠 *Kos:* ' + namaKos + '\n' +
    '👤 *Tamu Sebelumnya:* ' + tamuNama + '\n' +
    (catatan ? '📝 *Catatan:* ' + catatan + '\n' : '') +
    '\n⚡ Segera lakukan pembersihan agar kamar siap untuk tamu berikutnya.\n' +
    'Terima kasih! 💪\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;

  return sendWhatsApp(phone, message);
}

/**
 * Kirim laporan ringkasan harian ke Supervisor/Admin
 */
function sendDailySummaryReport(phone, namaPenerima, summaryData) {
  var message = '📊 *Laporan Ringkasan Harian - ' + CONFIG.APP_NAME + '*\n\n' +
    'Halo *' + namaPenerima + '*,\n\n' +
    'Berikut ringkasan operasional hari ini:\n\n' +
    '🔧 *Maintenance:*\n' +
    '  • Tiket Open: ' + summaryData.openTickets + '\n' +
    '  • Tiket Selesai: ' + summaryData.completedTickets + '\n' +
    '  • SLA Achieved: ' + summaryData.slaAchieved + '%\n\n' +
    '📅 *Peminjaman Aset:*\n' +
    '  • Booking Aktif: ' + summaryData.activeBookings + '\n\n' +
    '🛡️ *Security:*\n' +
    '  • Total Patroli: ' + summaryData.totalPatrols + '\n\n' +
    '✅ *Housekeeping:*\n' +
    '  • Checklist: ' + summaryData.totalChecklists + '\n' +
    '  • Compliance: ' + summaryData.complianceRate + '%\n\n' +
    'Terima kasih! 🙏';

  return sendWhatsApp(phone, message);
}

// ─── TIME-DRIVEN TRIGGER ───────────────────────────────────

/**
 * Cek booking yang mulai besok dan kirim pengingat
 * Fungsi ini dipanggil otomatis oleh time-driven trigger setiap hari jam 06:00
 */
function checkAndSendBookingReminders() {
  try {
    Logger.log('⏰ Running checkAndSendBookingReminders...');
    
    var bookings = getSheetData(CONFIG.SHEETS.ASSET_BOOKING);
    if (!bookings || bookings.length === 0) {
      Logger.log('⏰ No bookings found.');
      return;
    }
    
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowStr = Utilities.formatDate(tomorrow, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    
    var sent = 0;
    var errors = 0;
    
    bookings.forEach(function(b) {
      // Hanya booking yang Approved (Auto)
      if (b.status_booking !== 'Approved (Auto)') return;
      if (!b.waktu_mulai) return;
      
      var bookDate = Utilities.formatDate(new Date(b.waktu_mulai), CONFIG.TIMEZONE, 'yyyy-MM-dd');
      
      // Cocokkan tanggal mulai dengan besok
      if (bookDate === tomorrowStr) {
        var phone = normalizePhone(b.no_wa);
        if (!phone) {
          Logger.log('⏰ SKIP: No WA for booking ' + b.id_booking);
          return;
        }
        
        try {
          sendBookingReminderNotification(
            phone,
            b.nama_peminjam || '-',
            b.divisi || '',
            b.id_booking,
            b.nama_aset || '-',
            formatDateId(b.waktu_mulai),
            formatDateId(b.waktu_selesai)
          );
          Logger.log('⏰ Reminder sent: ' + b.id_booking + ' to ' + phone);
          sent++;
        } catch (waErr) {
          Logger.log('⏰ Failed to send reminder for ' + b.id_booking + ': ' + waErr.message);
          errors++;
        }
      }
    });
    
    Logger.log('⏰ checkAndSendBookingReminders complete: ' + sent + ' sent, ' + errors + ' errors');
  } catch (e) {
    Logger.log('⏰ checkAndSendBookingReminders Error: ' + e.message);
  }
}

/**
 * Setup time-driven trigger untuk booking reminder
 * Jalankan fungsi ini SEKALI dari GAS Editor untuk mengaktifkan reminder otomatis
 */
function setupBookingReminderTrigger() {
  try {
    // Hapus trigger lama jika ada
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(t) {
      if (t.getHandlerFunction() === 'checkAndSendBookingReminders') {
        ScriptApp.deleteTrigger(t);
      }
    });
    
    // Buat trigger baru setiap hari jam 06:00 - 07:00
    ScriptApp.newTrigger('checkAndSendBookingReminders')
      .timeBased()
      .everyDays(1)
      .atHour(6)
      .create();
    
    Logger.log('✅ Time-driven trigger berhasil dibuat!');
    Logger.log('📅 checkAndSendBookingReminders akan jalan setiap hari jam 06:00-07:00');
    
    return successResponse(null, '✅ Trigger berhasil dibuat! Pengingat booking akan dikirim otomatis setiap jam 06:00.');
  } catch (e) {
    Logger.log('❌ Gagal setup trigger: ' + e.message);
    return errorResponse('Gagal setup trigger: ' + e.message);
  }
}


// ─── DETEKSI KATEGORI KOMPLAIN ───────────────────────────

/**
 * Deteksi kategori komplain dari teks deskripsi kerusakan
 * Mapping kata kunci umum ke kategori resmi untuk SLA lookup
 * 
 * @param {string} text - Teks deskripsi kerusakan
 * @return {string} Kategori yang terdeteksi, atau 'Lainnya' jika tidak cocok
 */
function detectComplaintCategory(text) {
  if (!text) return 'Lainnya';
  
  var t = text.toLowerCase().trim();
  
  // Mapping keyword → kategori (prioritas: pertama cocok = digunakan)
  var keywords = [
    // Electrical
    { words: ['listrik', 'lampu', 'stopkontak', 'saklar', 'kabel', 'colokan', 'mati lampu', 'led', 'flicker', 'korsleting', 'korslet', 'setrum', 'strum'], cat: 'Electrical' },
    // Plumbing
    { words: ['pipa', 'kran', 'air', 'bocor', 'wc', 'toilet', 'saluran', 'mampet', 'tiris', 'bak', 'wastafel', 'shower', 'septik', 'rembes'], cat: 'Plumbing' },
    // AC/HVAC
    { words: ['ac', 'hvac', 'pendingin', 'panas', 'suhu', 'ac/hvac', 'freon', 'kompresor', 'blower', 'fan', 'kipas', 'thermostat', 'cooling'], cat: 'AC/HVAC' },
    // Furniture
    { words: ['meja', 'kursi', 'lemari', 'furniture', 'sofa', 'kamar', 'pintu', 'jendela', 'ranjang', 'bed', 'laci', 'rak', 'gorden', 'tirai'], cat: 'Furniture' },
    // IT/Network
    { words: ['it', 'network', 'jaringan', 'wifi', 'komputer', 'laptop', 'printer', 'internet', 'lan', 'kabel data', 'cctv', 'mouse', 'keyboard', 'monitor'], cat: 'IT/Network' },
    // General Building
    { words: ['dinding', 'lantai', 'plafon', 'genteng', 'atap', 'gedung', 'bangunan', 'pagar', 'cat', 'tembok', 'ubin', 'keramik', 'gagang', 'kunci'], cat: 'Lainnya' }
  ];
  
  for (var i = 0; i < keywords.length; i++) {
    var group = keywords[i];
    for (var j = 0; j < group.words.length; j++) {
      if (t.indexOf(group.words[j]) >= 0) {
        Logger.log('detectComplaintCategory: text="' + text.substring(0, 50) + '" → ' + group.cat + ' (matched: "' + group.words[j] + '")');
        return group.cat;
      }
    }
  }
  
  return 'Lainnya';
}

// ─── FORMAT PENGIRIMAN KOMPLAIN VIA WA ─────────────────────

/**
 * [PARSER] Ekstrak data komplain dari pesan WA customer
 * Format yang didukung:
 *   Nama: Bambang
 *   Lokasi: Lantai 2
 *   Kategori: Electrical
 *   Deskripsi: Lampu mati
 *   Foto: (optional) link atau attachment
 * 
 * V2 — Improved:
 * - Pakai regex untuk fleksibilitas lebih tinggi
 * - Skip placeholder template (seperti "[nama Anda]")
 * - Hapus quoted reply text (diawali >)
 * - Logging detail untuk debugging
 * 
 * @param {string} message - Pesan teks dari customer
 * @return {Object|null} { nama_customer, lokasi, kategori, deskripsi, foto_kerusakan } atau null jika tidak valid
 */
function parseComplaintFromMessage(message) {
  if (!message) return null;
  
  // ── PREPROCESSING ──────────────────────────────────────
  var originalMessage = message;
  
  // Hapus carriage return
  message = message.replace(/\r/g, '');
  
  // Hapus baris quoted reply (diawali dengan >) — WhatsApp quoted message
  message = message.replace(/^>.*$/gm, '');
  
  // Hapus baris yang hanya berisi karakter separator/garis
  // (━━━, ⎯⎯⎯, ____, ===, dsb)
  message = message.replace(/^[━⎯─=_\-\s]+$/gm, '');
  
  // Hapus baris header/footer template (hanya separator dan judul template)
  // NOTE: jangan hapus baris dengan "Terima kasih" atau "Tim teknis" karena
  // bisa jadi itu bagian dari deskripsi komplain customer
  message = message.replace(/^.*(General Affair|Laporan Kerusakan|━━━━|⎯⎯⎯).*$/gim, '');
  
  // Trim dan split
  var lines = message.split('\n');
  var result = {};
  
  Logger.log('PARSE: Processing ' + lines.length + ' lines (preprocessed) from message length ' + originalMessage.length);
  
  // ── EKSTRAK FIELD DENGAN REGEX ─────────────────────────
  // Regex lebih fleksibel: handle bold marker (*Nama:*), emoji prefix, spasi tidak rapi
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    
    var lower = trimmed.toLowerCase();
    
    // ── Nama: ... ──
    if (/nama\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        // Skip placeholder "[nama Anda]" atau variasi lainnya
        if (val && !/^\[.*\]$/.test(val) && val !== '[nama Anda]' && val !== '(nama Anda)') {
          result.nama_customer = val;
          Logger.log('PARSE: Found nama_customer="' + val + '"');
        }
      }
    }
    // ── Lokasi: ... ──
    else if (/lokasi\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        if (val && !/^\[.*\]$/.test(val) && val !== '[lokasi kerusakan]' && val !== '(lokasi kerusakan)') {
          result.lokasi = val;
          Logger.log('PARSE: Found lokasi="' + val + '"');
        }
      }
    }
    // ── Kategori: ... ──
    else if (/kategori\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        if (val && !/^\[.*\]$/.test(val) && val.indexOf('Electrical/Plumbing') === -1 && val.indexOf('[') === -1) {
          result.kategori = val;
          Logger.log('PARSE: Found kategori="' + val + '"');
        }
      }
    }
    // ── Prioritas: ... (opsional, untuk urgensi) ──
    else if (/prioritas\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        if (val && !/^\[.*\]$/.test(val)) {
          result.urgensi = val;
          Logger.log('PARSE: Found urgensi="' + val + '"');
        }
      }
    }
    // ── Deskripsi: ... atau Desc: ... ──
    else if (/deskripsi\s*:/.test(lower) || /desc\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        if (val && !/^\[.*\]$/.test(val) && val !== '[jelaskan kerusakan]' && val !== '(jelaskan kerusakan)') {
          result.deskripsi = val;
          Logger.log('PARSE: Found deskripsi="' + val + '"');
        }
      }
    }
    // ── Foto: ... ──
    else if (/foto\s*:/.test(lower)) {
      var idx = trimmed.indexOf(':');
      if (idx >= 0) {
        var val = trimmed.substring(idx + 1).trim();
        // Skip placeholder "(kirim foto jika ada)"
        if (val && !/^\[.*\]$/.test(val) && !/^\(.*\)$/.test(val) && val !== '(kirim foto jika ada)') {
          result.foto_kerusakan = val;
          Logger.log('PARSE: Found foto_kerusakan="' + val + '"');
        }
      }
    }
  });
  
  // ── VALIDASI ───────────────────────────────────────────
  if (!result.nama_customer || !result.lokasi || !result.deskripsi) {
    Logger.log('PARSE FAILED ⛔: nama_customer="' + (result.nama_customer || '') + 
               '", lokasi="' + (result.lokasi || '') + 
               '", deskripsi="' + (result.deskripsi || '') + '"');
    Logger.log('PARSE FAILED: Full preprocessed message: ' + message.substring(0, 500));
    return null;
  }
  
  Logger.log('PARSE SUCCESS ✅: nama_customer="' + result.nama_customer + 
             '", lokasi="' + result.lokasi + 
             '", kategori="' + (result.kategori || '') + 
             '", deskripsi="' + result.deskripsi.substring(0, 100) + '"');
  
  // ── MAP KATEGORI ───────────────────────────────────────
  if (result.kategori) {
    var categoryMap = {
      'electrical': 'Electrical',
      'listrik': 'Electrical',
      'lampu': 'Electrical',
      'plumbing': 'Plumbing',
      'pipa': 'Plumbing',
      'kran': 'Plumbing',
      'air': 'Plumbing',
      'ac': 'AC/HVAC',
      'hvac': 'AC/HVAC',
      'ac/hvac': 'AC/HVAC',
      'ac & hvac': 'AC/HVAC',
      'pendingin': 'AC/HVAC',
      'furniture': 'Furniture',
      'meja': 'Furniture',
      'kursi': 'Furniture',
      'it': 'IT/Network',
      'network': 'IT/Network',
      'it/network': 'IT/Network',
      'it & network': 'IT/Network',
      'jaringan': 'IT/Network',
      'wifi': 'IT/Network',
      'komputer': 'IT/Network'
    };
    var catLower = result.kategori.toLowerCase().trim();
    result.kategori = categoryMap[catLower] || result.kategori;
  } else {
    result.kategori = 'Lainnya';
  }
  
  // ── MAP URGENSI ────────────────────────────────────────
  if (result.urgensi) {
    var urgensiMap = {
      'tinggi': 'High',
      'urgent': 'High',
      'high': 'High',
      'tinggi (urgent)': 'High',
      'sedang': 'Medium',
      'medium': 'Medium',
      'rendah': 'Low',
      'low': 'Low'
    };
    var urgLower = result.urgensi.toLowerCase().trim();
    result.urgensi = urgensiMap[urgLower] || 'Medium';
  } else {
    result.urgensi = 'Medium';
  }
  result.sub_kategori = '';
  
  return result;
}

/**
 * [FORMAT] Panduan format pengiriman komplain kerusakan via WA
 * Dikirim otomatis saat customer mengirim pesan non-rating ke nomor GA
 * 
 * V2 — Improved:
 * - Checkbox (☑/☐) untuk field wajib vs opsional
 * - Instruksi lebih jelas: "Balas pesan ini, isi, kirim"
 * - Contoh langsung di dalam placeholder [cth: ...]
 * - Tidak ada contoh terpisah agar parser tidak bingung
 */
function getComplaintFormatGuide() {
  // NOTE: PENTING! Jangan tambah baris format di luar blok ⎯⎯
  // karena parser membaca baris "Nama:", "Lokasi:", dll.
  // Hanya baris di DALAM blok ⎯⎯ yang boleh punya format.
  return '🏢 GA Operations — Laporan Kerusakan\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    'Halo! Ingin lapor kerusakan? 👋\n\n' +
    'Cara mudah: **balas pesan ini**, isi format di bawah, lalu kirim.\n\n' +
    '⎯⎯⎯⎯ ISI FORMAT ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n' +
    '☑ Nama: [cth: Bambang]\n' +
    '☑ Lokasi: [cth: Lantai 2, Kamar 205]\n' +
    '☑ Kategori: [Electrical/Plumbing/AC & HVAC/Furniture/IT \u0026 Network/Lainnya]\n' +
    '☑ Deskripsi: [cth: Lampu kamar mati sejak pagi]\n' +
    '☐ Foto: (opsional)\n' +
    '⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n\n' +
    '⏱️ Tim teknis akan segera menindaklanjuti.\n' +
    'Terima kasih! 🙏\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    CONFIG.ORG_NAME;
}

// ─── DEDUPLIKASI FORMAT GUIDE ────────────────────────────

/**
 * Kirim format guide WA hanya sekali per sender dalam periode 2 jam
 * Mencegah notif template muncul berkali-kali ke customer yang sama
 * @param {string} sender - Nomor WA sender
 * @return {boolean} true jika guide berhasil dikirim, false jika sudah dikirim sebelumnya (skip)
 */
function sendFormatGuideOnce(sender) {
  // Normalisasi nomor
  var phone = normalizePhone(sender);
  if (!phone) {
    Logger.log('GUIDE-DEDUP: sender kosong, skip');
    return false;
  }

  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'guide_sent_' + phone;
    var alreadySent = cache.get(cacheKey);

    if (alreadySent === '1') {
      Logger.log('GUIDE-DEDUP: Guide already sent to ' + phone + ' in last 2 hours. Skipping.');
      return false;
    }

    // Kirim panduan
    sendWhatsApp(phone, getComplaintFormatGuide());
    
    // Simpan ke cache (berlaku 2 jam)
    cache.put(cacheKey, '1', 7200); // 7200 detik = 2 jam
    
    Logger.log('GUIDE-DEDUP: Guide sent to ' + phone + ', cached for 2 hours.');
    return true;
  } catch (e) {
    // Jika cache error, tetap kirim guide (fail-safe)
    Logger.log('GUIDE-DEDUP: Cache error for ' + phone + ': ' + e.message);
    sendWhatsApp(phone, getComplaintFormatGuide());
    return true;
  }
}


// ─── UPLOAD FOTO KE GOOGLE DRIVE ────────────────────────────

/**
 * Upload foto (base64) ke Google Drive, return URL publik
 * Foto disimpan di folder "GA_Operations_Photos"
 * 
 * @param {string} base64Data - Data gambar dalam format base64 (dengan atau tanpa prefix data:image)
 * @param {string} fileName - Nama file (optional, auto-generate jika kosong)
 * @return {Object} { url, fileId, fileName } atau error
 */
function uploadPhotoToDrive(base64Data, fileName) {
  try {
    if (!base64Data) throw new Error('Data foto kosong.');

    // Ekstrak data base64 (handle prefix data:image/...;base64,)
    var rawData = base64Data;
    var mimeType = 'image/png'; // default
    
    if (base64Data.indexOf('base64,') >= 0) {
      // Format: data:image/jpeg;base64,/9j/4AAQ...
      var matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        rawData = matches[2];
      } else {
        // Fallback: split manual
        var parts = base64Data.split('base64,');
        rawData = parts[parts.length - 1];
        var mimeMatch = base64Data.match(/^data:([^;]+);/);
        if (mimeMatch) mimeType = mimeMatch[1];
      }
    }

    // Generate nama file jika kosong
    if (!fileName || fileName.trim() === '') {
      var ext = mimeType === 'image/jpeg' || mimeType === 'image/jpg' ? 'jpg' : 
                mimeType === 'image/png' ? 'png' :
                mimeType === 'image/gif' ? 'gif' :
                mimeType === 'image/webp' ? 'webp' : 'png';
      fileName = 'foto_perbaikan_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss') + '.' + ext;
    }

    // Decode base64 ke blob
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // Cari folder "GA_Operations_Photos", buat jika belum ada
    var folderName = 'GA_Operations_Photos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      Logger.log('Created folder: ' + folderName);
    }

    // Buat file di folder
    var file = folder.createFile(blob);
    
    // Set permission: Anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl = file.getUrl();
    
    Logger.log('Photo uploaded: ' + fileName + ' → ' + fileUrl);

    return successResponse({
      url: fileUrl,
      fileId: file.getId(),
      fileName: fileName
    }, 'Foto berhasil diupload.');

  } catch (e) {
    Logger.log('uploadPhotoToDrive Error: ' + e.message);
    return errorResponse('Gagal upload foto: ' + e.message);
  }
}

// ─── WHATSAPP TEST & WEBHOOK ────────────────────────────────

/**
 * Test koneksi WhatsApp API
 * Mengirim pesan test ke nomor admin
 */
function testWhatsAppConnection(testPhone) {
  try {
    var token = getSetting('WA_API_TOKEN');
    if (!token) {
      return errorResponse('Token WhatsApp belum dikonfigurasi.');
    }

    if (!testPhone) {
      // Jika tidak ada nomor, coba dengan nomor admin (ambil dari user yang login)
      var user = getActiveUserSession();
      return successResponse({ status: 'token_ada', message: 'Token terkonfigurasi. Silakan masukkan nomor tujuan test.' });
    }

    var message = '🔔 *Test Notifikasi - ' + CONFIG.APP_NAME + '*\n\n' +
      'Halo! Ini adalah pesan test dari sistem GA Operations.\n\n' +
      '✅ Koneksi WhatsApp berhasil!\n' +
      '🕐 ' + nowFormatted();

    var result = sendWhatsApp(testPhone, message);

    if (result && result.status === true) {
      return successResponse({ status: 'terkirim', response: result }, '✅ Pesan test berhasil dikirim ke ' + testPhone);
    } else if (result && result.status === false) {
      return errorResponse('❌ Gagal: ' + (result.reason || 'Unknown error'));
    } else {
      return successResponse({ status: 'terkirim', response: result }, '✅ Pesan test terkirim. Cek WhatsApp Anda.');
    }
  } catch (e) {
    return errorResponse('Gagal test koneksi: ' + e.message);
  }
}

/**
 * Handler untuk webhook incoming WhatsApp (Fonnte callback)
 * Panggil fungsi ini dari doPost() untuk menerima balasan dari customer
 * 
 * Format webhook Fonnte (FLAT object, bukan array!):
 * { "sender": "628xxx", "message": "5", "name": "...", "inboxid": "...", "timestamp": "..." }
 * 
 * V2 — Improved:
 * - Logging detail di setiap langkah
 * - Fallback: coba field `pesan` jika `message` kosong/tidak ter-parse
 * - Fallback: coba field `text` jika semua gagal
 * - Handle quoted reply dari template dengan preprocessing
 */
function handleIncomingWhatsApp(payload) {
  try {
    Logger.log('=== WA WEBHOOK INCOMING ===');
    Logger.log('RAW payload keys: ' + Object.keys(payload || {}).join(', '));
    Logger.log('RAW payload sender=' + (payload.sender || '') + ', name=' + (payload.name || ''));
    Logger.log('RAW message preview="' + ((payload.message || '').substring(0, 200)) + '"');

    if (!payload) {
      return errorResponse('No payload received.');
    }

    // ─── PARSE FONNTE WEBHOOK ──────────────────────────────
    // Fonnte mengirim flat object, bukan { data: [...] }
    // Format: { sender, message, name, inboxid, timestamp, ... }
    var messages = [];
    
    if (payload.data && Array.isArray(payload.data)) {
      messages = payload.data;
      Logger.log('FMT: array format (payload.data)');
    } else if (payload.sender) {
      messages = [payload];
      Logger.log('FMT: flat object format (payload.sender)');
    } else {
      Logger.log('FMT: unknown format, trying best effort');
      for (var key in payload) {
        if (Array.isArray(payload[key])) {
          messages = payload[key];
          Logger.log('FMT: found array at payload.' + key);
          break;
        }
      }
    }

    if (messages.length === 0) {
      Logger.log('WA Webhook: No messages extracted from payload');
      return successResponse([], 'No messages found.');
    }

    Logger.log('WA Webhook: Processing ' + messages.length + ' message(s)');
    var results = [];

    messages.forEach(function(msg) {
      // ─── EKSTRAK SENDER ────────────────────────────────
      // Coba berbagai field yang mungkin berisi nomor pengirim
      var sender = normalizePhone(msg.sender || msg.pengirim || msg.from || '');
      
      // ─── EKSTRAK PESAN ────────────────────────────────
      // Prioritas: message > pesan > text
      var message = '';
      
      if (typeof msg.message === 'string' && msg.message.trim()) {
        message = msg.message.trim();
        Logger.log('MSG: using msg.message (length=' + message.length + ')');
      } else if (typeof msg.pesan === 'string' && msg.pesan.trim()) {
        message = msg.pesan.trim();
        Logger.log('MSG: using msg.pesan (length=' + message.length + ')');
      } else if (typeof msg.text === 'string' && msg.text.trim()) {
        message = msg.text.trim();
        Logger.log('MSG: using msg.text (length=' + message.length + ')');
      } else if (msg.message && typeof msg.message.text === 'string') {
        message = msg.message.text.trim();
        Logger.log('MSG: using msg.message.text (length=' + message.length + ')');
      }

      Logger.log('WA Webhook: sender="' + sender + '", message_preview="' + message.substring(0, 150) + '"');

      if (!sender) {
        Logger.log('WA Webhook: SKIP - no sender found');
        return;
      }
      if (!message) {
        Logger.log('WA Webhook: SKIP - empty message for sender ' + sender);
        return;
      }
      
      // ─── SKIP PESAN DARI SISTEM SENDIRI ────────────────
      // Fonnte kadang kirim webhook dari pesan yg dikirim oleh device sendiri
      // (misalnya delivery receipt atau pesan otomatis yg dikirim sistem)
      // Cek: sender == device number (GA punya nomor sendiri)
      var ownNumber = normalizePhone(payload.device || payload.username || '');
      if (ownNumber && sender === ownNumber) {
        Logger.log('WA Webhook: SKIP - self-message (own device), sender=' + sender + ', device=' + ownNumber);
        return;
      }

      // ─── CEK RATING SURVEI ─────────────────────────────
      // Coba parse angka dari awal pesan (trim dulu, handle spasi/enter di depan)
      var messageClean = message.replace(/^[\s\n\r]+/, '').trim();
      var rating = parseInt(messageClean, 10);
      
      if (rating >= 1 && rating <= 5) {
        Logger.log('SURVEY: Detected rating=' + rating + ' from sender=' + sender);
        
        var mainData = getSheetData(CONFIG.SHEETS.MAIN_DATA);
        var foundTicket = null;

        for (var i = 0; i < mainData.length; i++) {
          var rowPhone = normalizePhone(mainData[i].no_wa);
          
          if (rowPhone === sender && mainData[i].status_sla !== '' && !mainData[i].rating_survei) {
            if (!foundTicket || new Date(mainData[i].timestamp) > new Date(foundTicket.timestamp)) {
              foundTicket = mainData[i];
            }
          }
        }

        if (foundTicket) {
          updateCell(CONFIG.SHEETS.MAIN_DATA, foundTicket._rowIndex, 'rating_survei', rating);
          Logger.log('SURVEY: Rating ' + rating + ' saved for ticket ' + foundTicket.tiket_id);

          var confirmEmoji = ['', '😡', '😞', '😐', '😊', '🤩'];
          var confirmMsg = '✅ *Terima kasih!*\n\n' +
            'Penilaian Anda: ' + rating + ' ' + (confirmEmoji[rating] || '') + '\n' +
            'Tiket: ' + foundTicket.tiket_id + '\n\n' +
            'Terima kasih atas partisipasinya! 🙏';
          sendWhatsApp(sender, confirmMsg);

          results.push({
            sender: sender,
            action: 'survey_rating',
            tiket_id: foundTicket.tiket_id,
            rating: rating
          });
          return; // ← penting: sudah diproses
        } else {
          Logger.log('SURVEY: No pending survey ticket found for ' + sender + ', fallthrough to complaint parsing');
          // Jangan return — fallthrough ke complaint parsing
          // Mungkin angka 1-5 adalah bagian dari format komplain
        }
      }

      // ─── PARSE KOMPLAIN ─────────────────────────────────
      Logger.log('COMPLAINT: Attempting to parse message from sender=' + sender);
      var complaintData = parseComplaintFromMessage(message);
      
      // Jika gagal parse, coba pakai msg.pesan sebagai fallback
      if (!complaintData && msg.pesan && msg.pesan !== msg.message) {
        Logger.log('COMPLAINT: Retry with msg.pesan field');
        complaintData = parseComplaintFromMessage(msg.pesan);
      }
      
      // Jika attachment foto dari Fonnte (msg.url), inject
      if (complaintData) {
        // Cek apakah foto dari attachment
        if (msg.url && !complaintData.foto_kerusakan) {
          complaintData.foto_kerusakan = msg.url;
          Logger.log('COMPLAINT: Added photo url=' + msg.url);
        }
        
        // Data komplain ditemukan - buat tiket otomatis
        complaintData.no_wa = sender;
        Logger.log('COMPLAINT: Parsed successfully: ' + JSON.stringify(complaintData));
        
        try {
          var ticketResult = createComplaintFromWhatsApp(complaintData);            if (ticketResult && ticketResult.success) {
            var tiketId = ticketResult.data.tiket_id;
            var waSent = ticketResult.data.wa_notification_sent;
            Logger.log('COMPLAINT: Ticket created: ' + tiketId + ', WA sent: ' + waSent);
            
            // ── KIRIM KONFIRMASI JIKA NOTIFIKASI GAGAL ────
            // createComplaintFromWhatsApp sudah kirim notifikasi detail
            // via sendNewTicketNotification ke cleanPhone (= sender).
            // Jika gagal, kirim fallback konfirmasi via nomor Fonnte sender
            // supaya customer tetap dapat balasan.
            if (!waSent) {
              sendTicketConfirmation(
                sender,
                complaintData.nama_customer || 'Customer',
                tiketId,
                complaintData.kategori || 'Lainnya'
              );
              Logger.log('COMPLAINT: Fallback confirmation sent to ' + sender + ' for ticket ' + tiketId);
            }
            
            results.push({
              sender: sender,
              action: 'auto_ticket_created',
              tiket_id: tiketId,
              wa_sent: waSent
            });
          } else {
            var errMsg = ticketResult ? ticketResult.error : 'Unknown error';
            Logger.log('COMPLAINT: Failed to create ticket: ' + errMsg);
            if (sendFormatGuideOnce(sender)) {
              results.push({ sender: sender, action: 'auto_reply_sent' });
            } else {
              results.push({ sender: sender, action: 'auto_reply_skipped_duplicate' });
            }
          }
        } catch (ticketErr) {
          Logger.log('COMPLAINT: Ticket creation error: ' + ticketErr.message);
          if (sendFormatGuideOnce(sender)) {
            results.push({ sender: sender, action: 'auto_reply_sent' });
          } else {
            results.push({ sender: sender, action: 'auto_reply_skipped_duplicate' });
          }
        }
      } else {
        // Bukan format komplain - kirim panduan (dengan deduplikasi)
        Logger.log('COMPLAINT: Not a complaint format for ' + sender);
        if (sendFormatGuideOnce(sender)) {
          results.push({ sender: sender, action: 'auto_reply_sent' });
        } else {
          Logger.log('COMPLAINT: SKIP guide for ' + sender + ' (already sent recently)');
          results.push({ sender: sender, action: 'auto_reply_skipped_duplicate' });
        }
      }
    });
    
    // Cache info webhook untuk debugging via ?webhook=1
    cacheWebhookPayload(payload, 'processed', 'ok');

    Logger.log('=== WA WEBHOOK DONE: ' + results.length + ' result(s) ===');
    return successResponse(results, 'Incoming messages processed.');
  } catch (e) {
    Logger.log('=== WA WEBHOOK ERROR ===');
    Logger.log('Error: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    cacheWebhookPayload(payload || {}, 'error', e.message);
    return errorResponse('Webhook error: ' + e.message);
  }
}


