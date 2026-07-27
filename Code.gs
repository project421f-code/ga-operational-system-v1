/**
 * ============================================================
 * Code.gs — Entry Point & API Routing
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── HTML PARTIAL INCLUDE ───────────────────────────────────

/**
 * include() — Memuat file HTML partial untuk template
 * Dipanggil dari index.html via <?!= include('_styles.html'); ?>
 * Memecah file besar menjadi beberapa file partial agar
 * template evaluation GAS tidak timeout.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ─── WEB APP ENTRY POINT ────────────────────────────────────

/**
 * doGet() — Dipanggil saat user membuka URL Web App
 * Menampilkan halaman utama (index.html)
 */
function doGet(e) {
  // ─── WEBHOOK VALIDATION PAGE (paling awal) ──────────
  // ?webhook=1  → status webhook, token, dan aktivitas terakhir
  // Ditaruh paling awal agar tidak kena konflik routing
  if (e && e.parameter && e.parameter.webhook === '1') {
    try {
      return HtmlService
        .createHtmlOutput(generateWebhookStatusHtml())
        .setTitle('Webhook Status | ' + CONFIG.APP_NAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Webhook Status Error: ' + err.message);
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>')
        .setTitle('Error | Webhook Status');
    }
  }

  // ─── TEST ENDPOINT: Simulasi webhook survey ────────────
  // Buka URL ini di browser (login sebagai Admin) untuk test:
  // ?testSurvey=1&tiket=MNT-2026-0017&rating=5
  if (e && e.parameter && e.parameter.testSurvey) {
    var tiketId = e.parameter.tiket || '';
    var rating = parseInt(e.parameter.rating, 10);
    if (tiketId && rating >= 1 && rating <= 5) {
      var result = saveSurveyRating(tiketId, rating);
      return ContentService
        .createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Parameter tidak valid. Gunakan ?testSurvey=1&tiket=ID&rating=1-5' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── TEST ENDPOINT: Simulasi webhook Fonnte penuh ──────
  // Buka URL ini di browser (login sebagai Admin) untuk test:
  // ?testWebhook=1&sender=6282247008466&message=5
  if (e && e.parameter && e.parameter.testWebhook) {
    var testPayload = {
      sender: e.parameter.sender || '6282247008466',
      message: e.parameter.message || '5',
      name: e.parameter.name || 'Test Customer'
    };
    var result = handleIncomingWhatsApp(testPayload);
    return ContentService
      .createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ─── SITEMAP PAGE: Daftar Layanan GA — DEFAULT ────
  // Halaman ini adalah default landing page.
  // Menampilkan semua layanan GA dalam bentuk kartu.
  // ?page=home  (eksplisit)
  // Tanpa parameter → otomatis ke sitemap
  var page = e && e.parameter ? e.parameter.page || '' : '';
  var isSitemapPage = !page && !(e && e.parameter && (e.parameter.action || e.parameter.testSurvey || e.parameter.testWebhook));
  
  if (page === 'cek-aset' || isSitemapPage) {
    // Jika tanpa parameter, tampilkan sitemap dulu
    if (isSitemapPage) {
      try {
        return HtmlService
          .createHtmlOutput(generateSitemapPageHtml())
          .setTitle('GA Operations | General Affair')
          .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } catch (err) {
        Logger.log('Sitemap Page Error: ' + err.message);
        // Fallback: redirect to booking
        var scriptUrl = ScriptApp.getService().getUrl();
        return HtmlService
          .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><script>window.top.location.href="' + scriptUrl + '?page=cek-aset"</script></body></html>');
      }
    }
    
    // ─── CEK ASET PAGE ────────────────────────────────
    // ?page=cek-aset  → booking page
    var tanggal = e.parameter.date || '';
    var wa = e.parameter.wa || '';
    var bookingResult = null;
    
    try {
      if (e.parameter.book === '1') {
        var payload = {
          nama_peminjam: e.parameter.nama || '',
          divisi: e.parameter.divisi || '',
          no_wa: e.parameter.wa || '',
          nama_aset: e.parameter.aset || '',
          waktu_mulai: e.parameter.mulai || '',
          waktu_selesai: e.parameter.selesai || '',
          konsumsi: e.parameter.konsumsi || 'Tidak',
          km_awal: e.parameter.km || ''
        };
        bookingResult = publicBooking(payload);
      }
    } catch (err) {
      Logger.log('Public Booking Error: ' + err.message);
      bookingResult = { success: false, error: 'Gagal memproses booking: ' + err.message };
    }
    
    try {
      return HtmlService
        .createHtmlOutput(generatePublicPageHtml(tanggal, wa, bookingResult))
        .setTitle('Cek Ketersediaan Aset | General Affair')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Public Page Render Error: ' + err.message);
      var scriptUrl = ScriptApp.getService().getUrl();
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/"/g,'&quot;') + '</p><br><a href="' + scriptUrl + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a></body></html>')
        .setTitle('Error | Cek Ketersediaan Aset');
    }
  }

  // ─── LAPOR KERUSAKAN PAGE (Public via QR) ──────
  // ?page=report → tampilkan form lapor kerusakan (publik, tanpa login)
  // ?page=report&submit=1&nama=...&wa=...&lokasi=... → proses submit
  // URL ini bisa di-encode ke QR Code untuk ditempel di area/lokasi
  if (e && e.parameter && e.parameter.page === 'report') {
    try {
      var reportResult = null;
      if (e.parameter.submit === '1') {
        var reportPayload = {
          nama_customer: e.parameter.nama || '',
          no_wa: e.parameter.wa || '',
          lokasi: e.parameter.lokasi || '',
          kategori: e.parameter.kategori || 'Lainnya',
          urgensi: e.parameter.urgensi || 'Medium',
          deskripsi: e.parameter.deskripsi || ''
        };
        reportResult = savePublicComplaint(reportPayload);
      }
      var lokasiPrefill = e.parameter.lokasi || '';
      return HtmlService
        .createHtmlOutput(generateComplaintReportHtml(lokasiPrefill, reportResult))
        .setTitle('Lapor Kerusakan | ' + CONFIG.ORG_NAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>')
        .setTitle('Error | Lapor Kerusakan');
    }
  }

  // ─── SURVEY PAGE: Kepuasan Pelayanan GA ───────────
  // ?page=survey  → tampilkan form survey publik
  // ?page=survey&submit=1&divisi=...&...  → proses submit survey
  // Publik — bisa diakses tanpa login
  if (e && e.parameter && e.parameter.page === 'survey') {
    try {
      var surveyResult = null;
      if (e.parameter.submit === '1') {
        var surveyPayload = {
          divisi: e.parameter.divisi || '',
          feedback: e.parameter.feedback || ''
        };
        // Collect all team_criteria ratings
        ['mnt','hk','gs','aset'].forEach(function(t) {
          ['keramahan','fast_response','3s','kualitas_kerja','komunikasi'].forEach(function(c) {
            var key = t + '_' + c;
            surveyPayload[key] = e.parameter[key] || '';
          });
        });
        surveyResult = submitSurvey(surveyPayload);
      }
      return HtmlService
        .createHtmlOutput(generateSurveyPageHtml(surveyResult))
        .setTitle('Survey Kepuasan GA | ' + CONFIG.ORG_NAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>❌ Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>')
        .setTitle('Error | Survey GA');
    }
  }

  // ─── SITEMAP PAGE (eksplisit) ──────────────────
  // ?page=home  → tampilkan halaman sitemap
  if (page === 'home') {
    try {
      return HtmlService
        .createHtmlOutput(generateSitemapPageHtml())
        .setTitle('GA Operations | General Affair')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      Logger.log('Sitemap Error: ' + err.message);
      var scriptUrl = ScriptApp.getService().getUrl();
      return HtmlService
        .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>Terjadi Kesalahan</h2><p style="color:#94a3b8">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>');
    }
  }

  // ─── ADMIN APP: Login & Dashboard ────────────────
  // ?page=app  → tampilkan login screen / dashboard untuk admin
  if (e && e.parameter && e.parameter.page === 'app') {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle(CONFIG.APP_NAME + ' | ' + CONFIG.ORG_NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // ─── TEST DRIVE ENDPOINT ─────────────────────────────
  // Buka URL ini untuk menguji akses Drive & memicu authorization:
  // ?testDrive=1
  // Jika belum authorize, GAS akan minta izin. Setelah approve, buka lagi.
  if (e && e.parameter && e.parameter.testDrive) {
    try {
      var testFolderName = 'GA_Test_' + new Date().getTime();
      var testFolder = DriveApp.createFolder(testFolderName);
      var testFile = testFolder.createFile('test.txt', 'Test file - GA Operations Drive access works!');
      testFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var folderUrl = testFolder.getUrl();
      var fileUrl = testFile.getUrl();
      // Cleanup: hapus test files
      testFile.setTrashed(true);
      testFolder.setTrashed(true);
      
      var result = { success: true, message: '✅ Akses Drive berfungsi!', folderUrl: folderUrl, fileUrl: fileUrl };
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2 style="color:#34d399">✅ Drive Access OK</h2>' +
        '<p style="color:#94a3b8">Google Drive berfungsi dengan baik! File test berhasil dibuat & dihapus.</p>' +
        '<pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br>' +
        '<a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Test Drive | GA Operations');
    } catch (err) {
      var errMsg = err.message ? err.message.replace(/"/g,'&quot;') : 'Unknown error';
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2 style="color:#ef4444">❌ Drive Access Error</h2>' +
        '<p style="color:#fca5a5">Gagal mengakses Drive:</p>' +
        '<pre style="color:#fca5a5;text-align:left;max-width:600px;margin:20px auto;background:rgba(239,68,68,0.1);padding:16px;border-radius:12px">' +
        errMsg + '</pre>' +
        '<br>' +
        '<p style="color:#94a3b8">Kemungkinan: Drive App belum di-authorize. Buka GAS Editor → Run fungsi apapun yang pakai DriveApp → Approve izin → deploy ulang.</p>' +
        '<a href="https://script.google.com/home/projects/1JVL7Xa8P2Pr_QUpHsbvcS_N3tki0fuvFCJtsCx_oP3rMhOTxCjrIsNEl/edit" target="_blank" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600;margin-top:12px">🔑 Buka GAS Editor</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Test Drive | GA Operations');
    }
  }

  // ─── FIX AUDIT HEADERS ENDPOINT ──────────────────────
  // Buka URL ini di browser untuk memperbaiki misalignment kolom catatan/foto_temuan:
  // ?fixAuditHeaders=1
  // AMAN: hanya memperbaiki header dan data yang salah urutan
  if (e && e.parameter && e.parameter.fixAuditHeaders) {
    try {
      var result = fixAuditHousekeepingHeaders();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🔧 Fix Audit Headers</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Fix Audit Headers | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── CLEANUP BASE64 ENDPOINT ────────────────────────
  // Buka URL ini di browser untuk membersihkan data base64 foto lama:
  // ?cleanupBase64AuditPhotos=1
  // AMAN: hanya mengosongkan cell foto_temuan yang berisi data:image base64
  if (e && e.parameter && e.parameter.cleanupBase64AuditPhotos) {
    try {
      var result = cleanupBase64AuditPhotos();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🧹 Cleanup Base64 Foto</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Cleanup Base64 | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── SEED KOS DUMMY DATA ENDPOINT ────────────────
  // Buka URL ini di browser untuk menambah 2 data dummy:
  // ?seedKosData=1
  if (e && e.parameter && e.parameter.seedKosData) {
    try {
      var result = seedEmptyKosSheets();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>🌱 Seed Data Kos</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto;background:rgba(255,255,255,0.05);padding:16px;border-radius:12px">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1;display:inline-block;padding:12px 24px;border:1px solid #6366f1;border-radius:10px;text-decoration:none;font-weight:600">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Seed Data Kos | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── INIT DB ENDPOINT ─────────────────────────────
  // Buka URL ini di browser untuk membuat sheet yang belum ada:
  // ?initMissingSheets=1
  // AMAN: hanya membuat sheet yang belum ada, tidak menghapus data apapun
  if (e && e.parameter && e.parameter.initMissingSheets) {
    try {
      var result = initializeMissingSheetsOnly();
      var html = '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>✅ Inisialisasi Selesai</h2><pre style="color:#94a3b8;text-align:left;max-width:600px;margin:20px auto">' +
        JSON.stringify(result, null, 2) + '</pre>' +
        '<br><a href="' + ScriptApp.getService().getUrl() + '?page=home" style="color:#6366f1">🏠 Kembali ke beranda</a>' +
        '</body></html>';
      return HtmlService.createHtmlOutput(html).setTitle('Init DB | GA Operations');
    } catch (err) {
      return HtmlService.createHtmlOutput(
        '<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff">' +
        '<h2>❌ Error</h2><p style="color:#fca5a5">' + err.message.replace(/"/g,'&quot;') + '</p></body></html>'
      ).setTitle('Error | GA Operations');
    }
  }

  // ─── PUBLIC JSON API ──────────────────────────────
  // Endpoint untuk akses eksternal (via fetch() dari luar GAS)
  // ?action=getAssets&date=2026-07-20  →  JSON daftar aset
  // ?action=book&nama=...&wa=...&aset=...  →  JSON hasil booking
  if (e && e.parameter && e.parameter.action) {
    return handlePublicApi(e);
  }

  // ─── DEFAULT: Sitemap ───────────────────────────
  // Fallback safety — redirect ke sitemap
  return HtmlService
    .createHtmlOutput('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#e0e7ff"><h2>🏢 GA Operations</h2><p style="color:#94a3b8">Mengarahkan...</p><script>window.top.location.href="' + ScriptApp.getService().getUrl() + '?page=home"</script></body></html>')
    .setTitle(CONFIG.APP_NAME);
}

// ─── API ROUTING ─────────────────────────────────────────────

/**
 * executeAction() — Router utama untuk semua panggilan dari frontend
 * Semua fungsi API dipanggil melalui fungsi ini dengan validasi sesi
 *
 * @param {string} email - Email user yang sedang login
 * @param {string} sessionToken - Token sesi (dari CacheService)
 * @param {string} actionName - Nama fungsi yang akan dipanggil
 * @param {Array} args - Array argumen untuk fungsi tersebut
 * @return {Object} Response dari fungsi yang dipanggil
 */
function executeAction(email, sessionToken, actionName, args) {
  try {
    // Daftar fungsi yang boleh dipanggil tanpa autentikasi
    var publicActions = [
      'loginWithEmailAndPassword',
      'loginWithGoogleSSO',
      'checkGoogleSSO',
      'getAppInfo',
      'getPublicAssetsAvailability',
      'publicBooking',
      'savePublicComplaint'
    ];

    // Jika bukan public action, validasi token
    if (publicActions.indexOf(actionName) === -1) {
      if (!email || !sessionToken) {
        return errorResponse('Sesi tidak valid. Silakan login ulang.');
      }

      // Validasi token dari CacheService
      if (!validateSessionToken(email, sessionToken)) {
        return { success: false, error: 'Sesi telah berakhir. Silakan login ulang.', sessionExpired: true };
      }

      // Set current user email untuk digunakan di seluruh API
      CURRENT_USER_EMAIL = email;
    }

    // Cari dan panggil fungsi secara dinamis
    var fn = resolveFunction(actionName);
    if (typeof fn !== 'function') {
      return errorResponse('Fungsi "' + actionName + '" tidak ditemukan.');
    }

    // Panggil fungsi dengan argumen
    if (args && args.length > 0) {
      return fn.apply(this, args);
    } else {
      return fn();
    }

  } catch (e) {
    Logger.log('executeAction Error [' + actionName + ']: ' + e.message);
    return errorResponse(e.message);
  }
}

// ─── FUNCTION REGISTRY ───────────────────────────────────────

/**
 * Resolve fungsi dari nama secara dinamis
 * GAS V8 strict mode: this[name] TIDAK bisa akses fungsi global.
 * Harus pakai globalThis[name] yang selalu mengacu ke global scope.
 */
function resolveFunction(name) {
  // globalThis adalah standar ES2020 untuk mengakses global object
  // Di GAS V8, globalThis berisi SEMUA fungsi dari semua file .gs
  if (typeof globalThis !== 'undefined') {
    if (typeof globalThis[name] === 'function') {
      return globalThis[name];
    }
  }
  // Fallback: coba dari this (untuk non-strict mode)
  if (typeof this[name] === 'function') {
    return this[name];
  }
  return null;
}



// ─── IMPORT DATA (BACKEND) ────────────────────────────────────

var IMPORT_ALLOWED_SHEETS = [
  'Asset_List',
  'Master_SLA',
  'Master_CS_Schedule',
  'Master_Lokasi',
  'Master_Patrol_Checkpoints',
  'Master_Patrol_Schedule',
  'User_List'
];

/**
 * Preview data CSV sebelum import (tidak menyimpan)
 * Parse CSV dan return 10 baris pertama + info kecocokan header
 */
function previewImportData(sheetName, csvData) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (IMPORT_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      throw new Error('Sheet "' + sheetName + '" tidak diizinkan.');
    }
    if (!csvData || csvData.trim() === '') {
      throw new Error('Data CSV kosong.');
    }

    var lines = parseCSVToLines(csvData);
    if (lines.length < 2) {
      throw new Error('CSV harus memiliki header + minimal 1 baris data.');
    }

    var headers = parseCSVLine(lines[0]);
    var totalRows = lines.length - 1;

    // Ambil 10 baris pertama untuk preview
    var previewRows = [];
    var maxPreview = Math.min(totalRows, 10);
    for (var i = 1; i <= maxPreview; i++) {
      var rowData = {};
      var values = parseCSVLine(lines[i]);
      for (var j = 0; j < headers.length; j++) {
        rowData[headers[j].trim()] = (j < values.length) ? values[j].trim() : '';
      }
      previewRows.push(rowData);
    }

    // Cek kecocokan header dengan sheet
    var sheet = getSheet(sheetName);
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var matchedCols = 0;
    var unmatchedCols = [];
    for (var hi = 0; hi < headers.length; hi++) {
      var h = headers[hi].trim();
      if (existingHeaders.indexOf(h) >= 0) {
        matchedCols++;
      } else {
        unmatchedCols.push(h);
      }
    }

    return successResponse({
      headers: headers,
      totalRows: totalRows,
      previewRows: previewRows,
      matchedCols: matchedCols,
      unmatchedCols: unmatchedCols,
      totalCols: headers.length
    }, 'Ditemukan ' + totalRows + ' baris data. ' + matchedCols + '/' + headers.length + ' kolom cocok.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Parse CSV string ke array of lines (handle quoted fields dengan newline di dalamnya)
 */
function parseCSVToLines(csvData) {
  var lines = [];
  var currentLine = '';
  var inQuote = false;
  for (var ci = 0; ci < csvData.length; ci++) {
    var ch = csvData[ci];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === '\n' && !inQuote) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += ch;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);
  return lines;
}

/**
 * Import data CSV ke sheet master
 * @param {string} sheetName - Nama sheet tujuan
 * @param {string} csvData - Data CSV (baris pertama = header)
 */
function importMasterData(sheetName, csvData) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (IMPORT_ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      throw new Error('Sheet "' + sheetName + '" tidak diizinkan untuk import.');
    }

    if (!csvData || csvData.trim() === '') {
      throw new Error('Data CSV kosong.');
    }

    return withLock(function() {
      var sheet = getSheet(sheetName);
      
      // Parse CSV (handle quoted fields) — pakai fungsi bersama
      var lines = parseCSVToLines(csvData);
      
      if (lines.length < 2) {
        throw new Error('Data CSV harus memiliki minimal 2 baris (header + 1 data).');
      }

      // Parse header
      var headers = parseCSVLine(lines[0]);
      var headerMap = {};
      headers.forEach(function(h, idx) {
        headerMap[h.trim()] = idx;
      });

      // Get existing headers from sheet
      var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      
      // Build column mapping: import headers → sheet column index
      var colMap = {};
      for (var h in headerMap) {
        var colIdx = existingHeaders.indexOf(h);
        if (colIdx >= 0) {
          colMap[h] = colIdx;
        }
      }

      if (Object.keys(colMap).length === 0) {
        throw new Error('Tidak ada kolom yang cocok dengan header sheet. Pastikan header CSV sesuai.');
      }

      // Get last row to append after
      var lastRow = sheet.getLastRow();
      if (lastRow < 1) lastRow = 1;
      var totalCols = existingHeaders.length;
      
      var imported = 0;
      var errors = 0;

      for (var li = 1; li < lines.length; li++) {
        if (!lines[li].trim()) continue;
        
        try {
          var values = parseCSVLine(lines[li]);
          var newRow = [];
          for (var ci2 = 0; ci2 < totalCols; ci2++) {
            newRow.push('');
          }
          
          for (var h2 in colMap) {
            var srcIdx = headerMap[h2];
            if (srcIdx < values.length) {
              newRow[colMap[h2]] = values[srcIdx].trim();
            }
          }
          
          sheet.appendRow(newRow);
          imported++;
        } catch (rowErr) {
          errors++;
          Logger.log('Import row ' + (li + 1) + ' error: ' + rowErr.message);
        }
      }

      return successResponse({ imported: imported, errors: errors }, 'Import selesai: ' + imported + ' baris ditambahkan' + (errors > 0 ? ', ' + errors + ' gagal.' : '.'));
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Parse satu baris CSV (handle quoted fields)
 */
function parseCSVLine(line) {
  var result = [];
  var current = '';
  var inQuotes = false;
  // Bersihkan carriage return (Windows CRLF)
  line = line.replace(/\r/g, '');
  for (var i = 0; i < line.length; i++) {
    var chr = line[i];
    if (chr === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (chr === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += chr;
    }
  }
  result.push(current);
  return result;
}

// ─── UTILITY ENDPOINTS ──────────────────────────────────────

/**
 * Mendapatkan informasi aplikasi (publik)
 */
function getAppInfo() {
  return successResponse({
    appName: CONFIG.APP_NAME,
    orgName: CONFIG.ORG_NAME,
    version: CONFIG.VERSION
  });
}

/**
 * Cek apakah Google SSO tersedia
 * Mengembalikan email Google aktif jika ada
 */
function checkGoogleSSO() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (email) {
      return successResponse({ email: email });
    }
    return successResponse({ email: null });
  } catch (e) {
    return successResponse({ email: null });
  }
}

// ─── MASTER DATA LOADER ────────────────────────────────────

/**
 * Load SEMUA data master sekaligus dalam 1 API call
 * Digunakan oleh frontend: dipanggil sekali saat login, disimpan di APP.masterData.
 * Mengurangi N+1 API calls untuk data yang jarang berubah.
 */
function loadMasterData() {
  try {
    var user = getActiveUserSession();
    
    // Baca semua master data — gunakan getCachedSheetData untuk yang jarang berubah
    var userList = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
    var slaList = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    var csSchedule = getCachedSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE, 3600);
    var locationList = getCachedSheetData(CONFIG.SHEETS.MASTER_LOKASI, 3600);
    var patrolCheckpoints = getCachedSheetData(CONFIG.SHEETS.PATROL_CHECKPOINTS, 3600);
    var patrolSchedules = getCachedSheetData(CONFIG.SHEETS.PATROL_SCHEDULE, 3600);
    var assetList = getCachedSheetData(CONFIG.SHEETS.ASSET_LIST, 1800);
    var kosList = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    
    // Jangan kirim field password ke frontend
    var safeUserList = userList.map(function(u) {
      return {
        user_id: u.user_id,
        email: u.email,
        nama: u.nama,
        role: u.role,
        tim: u.tim,
        status: u.status,
        no_wa: u.no_wa || ''
      };
    });
    
    // Build SLA categories untuk dropdown frontend
    var slaCategories = {};
    slaList.forEach(function(d) {
      if (d.kategori && !slaCategories[d.kategori]) {
        slaCategories[d.kategori] = [];
      }
      if (d.sub_kategori && slaCategories[d.kategori] && slaCategories[d.kategori].indexOf(d.sub_kategori) === -1) {
        slaCategories[d.kategori].push(d.sub_kategori);
      }
    });
    
    return successResponse({
      userList: safeUserList,
      slaList: slaList,
      slaCategories: slaCategories,
      csSchedule: csSchedule,
      locationList: locationList,
      patrolCheckpoints: patrolCheckpoints,
      patrolSchedules: patrolSchedules,
      assetList: assetList,
      kosList: kosList
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ╔══════════════════════════════════════════════════════════╗
// ║    PUBLIC COMPLAINT PAGE (QR Code)                       ║
// ╚══════════════════════════════════════════════════════════╝

// ╔══════════════════════════════════════════════════════════╗
// ║    PUBLIC COMPLAINT PAGE (QR Code)                       ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Generate halaman publik Lapor Kerusakan — diakses via QR Code
 * ?page=report — tidak perlu login
 */
function generateComplaintReportHtml(lokasiPrefill, result) {
  var scriptUrl = ScriptApp.getService().getUrl();
  var currentYear = new Date().getFullYear();
  
  // Kategori options
  var kategoriOptions = '';
  try {
    var slaData = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    var kategoris = {};
    slaData.forEach(function(d) {
      if (d.kategori && !kategoris[d.kategori]) {
        kategoris[d.kategori] = true;
      }
    });
    var katList = Object.keys(kategoris);
    katList.forEach(function(k) {
      kategoriOptions += '<option value="' + k + '">' + k + '</option>';
    });
  } catch(e) {
    kategoriOptions = '<option>Lainnya</option>';
  }
  if (kategoriOptions.indexOf('Lainnya') < 0) {
    kategoriOptions += '<option>Lainnya</option>';
  }
  
  // Lokasi options
  var lokasiOptions = '<option value="">Pilih Lokasi</option>';
  try {
    var csData = getCachedSheetData(CONFIG.SHEETS.MASTER_CS_SCHEDULE, 3600);
    var seenLokasi = {};
    csData.forEach(function(d) {
      if (d.lokasi_area && !seenLokasi[d.lokasi_area]) {
        seenLokasi[d.lokasi_area] = true;
        var sel = (lokasiPrefill === d.lokasi_area) ? ' selected' : '';
        lokasiOptions += '<option value="' + escapeHtml(d.lokasi_area) + '"' + sel + '>' + escapeHtml(d.lokasi_area) + '</option>';
      }
    });
  } catch(e) {}
  
  // Success/Error message
  var msgHtml = '';
  if (result) {
    if (result.success || result.status === true) {
      msgHtml = '<div class="msg success">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">✅</div>' +
        '<h2 style="color:#34d399;margin-bottom:8px">Laporan Terkirim!</h2>' +
        '<p style="color:#e0e7ff">' + escapeHtml(result.message || 'Tiket berhasil dibuat. Tim kami akan segera menindaklanjuti.') + '</p>' +
        (result.data && result.data.tiket_id ? '<p style="color:#94a3b8;margin-top:8px;font-size:0.82rem">ID Tiket: <strong>' + escapeHtml(result.data.tiket_id) + '</strong></p>' : '') +
        '<a href="' + scriptUrl + '?page=report" class="btn btn-primary" style="margin-top:16px">📝 Laporkan Lagi</a>' +
        '</div>';
    } else {
      msgHtml = '<div class="msg error">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">❌</div>' +
        '<h2 style="color:#fca5a5;margin-bottom:8px">Gagal Mengirim</h2>' +
        '<p style="color:#e0e7ff">' + escapeHtml(result.error || 'Terjadi kesalahan. Silakan coba lagi.') + '</p>' +
        '</div>';
    }
  }
  
  var formDisplay = result ? 'style="display:none"' : '';
  
  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Lapor Kerusakan | ' + CONFIG.ORG_NAME + '</title>\n<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;min-height:100vh;padding:24px 16px}' +
    '.wrap{max-width:520px;margin:0 auto}' +
    '.logo{width:56px;height:56px;margin:0 auto 16px;background:linear-gradient(135deg,#ef4444,#f87171);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 0 30px rgba(239,68,68,.3)}' +
    'h1{font-size:1.3rem;font-weight:800;text-align:center;margin-bottom:4px}' +
    'h1 span{font-size:1.1rem}' +
    '.sub{color:#64748b;font-size:.82rem;text-align:center;margin-bottom:24px}' +
    '.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}' +
    '.form-group{margin-bottom:14px}' +
    'label{display:block;font-size:.78rem;font-weight:600;color:#94a3b8;margin-bottom:6px}' +
    'input,select,textarea{width:100%;padding:10px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e0e7ff;font-family:inherit;font-size:.85rem;outline:none;transition:all .2s}' +
    'input:focus,select:focus,textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}' +
    'select option{background:#1e293b;color:#e0e7ff}' +
    'textarea{resize:vertical;min-height:80px}' +
    '.btn{display:inline-flex;align-items:center;gap:6px;padding:12px 24px;border:none;border-radius:10px;font-family:inherit;font-size:.9rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s}' +
    '.btn-primary{background:linear-gradient(135deg,#ef4444,#f87171);color:#fff;width:100%;justify-content:center}' +
    '.btn-primary:hover{box-shadow:0 4px 15px rgba(239,68,68,.4);transform:translateY(-1px)}' +
    '.btn-secondary{background:rgba(255,255,255,.08);color:#e0e7ff;border:1px solid rgba(255,255,255,.12);width:100%;justify-content:center}' +
    '.msg{text-align:center;padding:32px 20px}' +
    '.ftr{text-align:center;padding:16px;color:#475569;font-size:.75rem}' +
    '.ftr a{color:#6366f1;text-decoration:none}' +
    '.urg{display:flex;gap:6px}' +
    '.urg-btn{flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#94a3b8;font-size:.75rem;font-weight:600;cursor:pointer;text-align:center;transition:all .2s;font-family:inherit}' +
    '.urg-btn:hover{border-color:#6366f1;color:#e0e7ff}' +
    '.urg-btn.active{background:rgba(239,68,68,.2);border-color:#ef4444;color:#fca5a5}' +
    '</style>' +
    '</head><body>' +
    '<div class="wrap">' +
    '<div class="logo">🔧</div>' +
    '<h1><span>🔧</span> Lapor Kerusakan</h1>' +
    '<p class="sub">Laporkan kerusakan fasilitas — tim kami akan segera merespon</p>' +
    msgHtml +
    '<form method="GET" action="' + scriptUrl + '" class="card" ' + formDisplay + '>' +
    '<input type="hidden" name="page" value="report">' +
    '<input type="hidden" name="submit" value="1">' +
    '<input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">' +
    '<div class="form-group"><label>Nama Pelapor *</label><input type="text" name="nama" required placeholder="Nama Anda"></div>' +
    '<div class="form-group"><label>No. WhatsApp</label><input type="tel" name="wa" placeholder="628xxx (opsional, untuk notifikasi)"></div>' +
    '<div class="form-group"><label>Lokasi *</label><select name="lokasi" required>' + lokasiOptions + '</select></div>' +
    '<div class="form-group"><label>Kategori</label><select name="kategori">' + kategoriOptions + '</select></div>' +
    '<div class="form-group"><label>Urgensi</label><div class="urg" id="urg-group">' +
    '<span class="urg-btn" data-val="Low" onclick="selectUrg(this)">🟢 Rendah</span>' +
    '<span class="urg-btn active" data-val="Medium" onclick="selectUrg(this)">🟡 Sedang</span>' +
    '<span class="urg-btn" data-val="High" onclick="selectUrg(this)">🔴 Tinggi</span>' +
    '</div><input type="hidden" name="urgensi" id="f-urgensi" value="Medium"></div>' +
    '<div class="form-group"><label>Deskripsi Kerusakan *</label><textarea name="deskripsi" required placeholder="Jelaskan detail kerusakan..."></textarea></div>' +
    '<button type="submit" class="btn btn-primary">📨 Kirim Laporan</button>' +
    '</form>' +
    '<div style="text-align:center;margin-top:12px"><a href="' + scriptUrl + '?page=home" style="color:#64748b;font-size:.78rem">🏠 Kembali ke beranda</a></div>' +
    '<div class="ftr">' + currentYear + ' &bull; ' + CONFIG.ORG_NAME + '</div>' +
    '</div>' +
    '<script>' +
    'function selectUrg(el){' +
    'document.querySelectorAll(".urg-btn").forEach(function(b){b.classList.remove("active")});' +
    'el.classList.add("active");' +
    'document.getElementById("f-urgensi").value=el.getAttribute("data-val")}' +
    '</script>' +
    '</body></html>';
}

// ╔══════════════════════════════════════════════════════════╗
// ║    SITEMAP PAGE                                          ║
// ╚══════════════════════════════════════════════════════════╝

/**
 * Generate halaman sitemap/index — daftar semua layanan GA
 * Halaman ini adalah default landing page (tanpa parameter)
 */
function generateSitemapPageHtml() {
  var scriptUrl = ScriptApp.getService().getUrl();
  var currentYear = new Date().getFullYear();

  var services = [
    {
      icon: '📅',
      title: 'Cek Ketersediaan Aset',
      desc: 'Booking ruangan meeting, kendaraan dinas & peralatan kantor',
      link: '?page=cek-aset',
      color: '#6366f1'
    },
    {
      icon: '📋',
      title: 'Survey Kepuasan GA',
      desc: 'Beri penilaian untuk tim Maintenance, Housekeeping, General Services & Asset Inventory',
      link: '?page=survey',
      color: '#10b981'
    },
    {
      icon: '🔧',
      title: 'Lapor Kerusakan',
      desc: 'Laporkan kerusakan fasilitas — scan QR Code atau buka link ini',
      link: '?page=report',
      color: '#ef4444'
    },
    {
      icon: '🔐',
      title: 'Admin Login',
      desc: 'Dashboard manajemen operasional untuk Admin & Supervisor GA',
      link: '?page=app',
      color: '#8b5cf6'
    }
  ];

  var cardsHtml = '';
  services.forEach(function(s) {
    // Inline hex-to-rgb untuk rgba()
    var r = parseInt(s.color.slice(1,3), 16);
    var g = parseInt(s.color.slice(3,5), 16);
    var b = parseInt(s.color.slice(5,7), 16);
    cardsHtml += '<a href="' + scriptUrl + s.link + '" class="scard" style="border-color:' + s.color + '">';
    cardsHtml += '<div class="scard-icon" style="background:rgba(' + r + ',' + g + ',' + b + ',0.15);color:' + s.color + '">' + s.icon + '</div>';
    cardsHtml += '<div class="scard-title">' + s.title + '</div>';
    cardsHtml += '<div class="scard-desc">' + s.desc + '</div>';
    cardsHtml += '<div class="scard-link">Buka &#8594;</div>';
    cardsHtml += '</a>';
  });

  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>GA Operations | General Affair</title>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\nbody{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936,#0d1229);color:#e0e7ff;min-height:100vh;display:flex;flex-direction:column}\n.hdr{text-align:center;padding:48px 20px 32px;position:relative}\n.hdr-logo{width:72px;height:72px;margin:0 auto 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 0 40px rgba(99,102,241,.35);animation:float 3s ease-in-out infinite}\n@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}\n.hdr h1{font-size:1.6rem;font-weight:800;background:linear-gradient(135deg,#e0e7ff,#a5b4fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}\n.hdr p{color:#94a3b8;font-size:.85rem;margin-top:6px}\n.body{flex:1;max-width:680px;margin:0 auto;padding:0 20px 40px;width:100%}\n.section-label{font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:16px;padding-left:4px}\n.grid{display:grid;grid-template-columns:1fr;gap:16px}\n.scard{display:block;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:24px;text-decoration:none;color:inherit;transition:all .3s ease;position:relative;overflow:hidden}\n.scard:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,.3);border-color:inherit}\n.scard::after{content:\'\';position:absolute;inset:0;background:linear-gradient(135deg,transparent 60%,rgba(255,255,255,.04));pointer-events:none}\n.scard-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:14px}\n.scard-title{font-size:1.05rem;font-weight:700;margin-bottom:6px;position:relative;z-index:1}\n.scard-desc{font-size:.82rem;color:#94a3b8;line-height:1.5;position:relative;z-index:1}\n.scard-link{font-size:.78rem;font-weight:600;margin-top:12px;position:relative;z-index:1}\n.ftr{text-align:center;padding:24px;color:#475569;font-size:.75rem;border-top:1px solid rgba(255,255,255,.06)}\n.ftr a{color:#6366f1;text-decoration:none}\n@media(min-width:600px){.grid{grid-template-columns:1fr 1fr}.hdr{padding:56px 20px 40px}.scard{padding:28px}}\n@media(min-width:900px){.grid{grid-template-columns:1fr 1fr 1fr}}\n</style>\n</head>\n<body>\n<div class="hdr">\n<div class="hdr-logo">🏢</div>\n<h1>GA Operations</h1>\n<p>Sistem Informasi & Manajemen Operasional General Affair</p>\n</div>\n<div class="body">\n<div class="section-label">&#9654; Layanan Publik</div>\n<div class="grid">' + cardsHtml + '</div>\n</div>\n<div class="ftr">' + currentYear + ' &bull; GA Operations &bull; <a href="' + scriptUrl + '?page=app">Login Admin</a></div>\n</body>\n</html>';
}

// ─── WEBHOOK VALIDATION PAGE ──────────────────────────────

/**
 * Generate halaman status webhook untuk debugging
 * Diakses via ?webhook=1
 */
function generateWebhookStatusHtml() {
  var status = getWebhookStatus();
  var scriptUrl = ScriptApp.getService().getUrl();
  var err = status.error;

  // Status token
  var tokenStatus = err ? 'unknown' : (status.wa_token_configured ? 'ok' : 'missing');
  var tokenIcon = { 'ok': '✅', 'missing': '❌', 'unknown': '❓' }[tokenStatus];
  var tokenText = { 'ok': 'Token WhatsApp <b>terkonfigurasi</b>',
                    'missing': 'Token WhatsApp <b>BELUM dikonfigurasi</b>',
                    'unknown': 'Gagal membaca status token' }[tokenStatus];
  var tokenHint = status.wa_token_configured
    ? 'Preview: ' + status.wa_token_preview
    : 'Jalankan fungsi <code>setupWAToken()</code> di GAS Editor, lalu <b>Deploy ulang</b> Web App.';

  // Status webhook terakhir
  var wh = status.last_webhook;
  var webhookHtml = wh ? '' +
    '<div class="field"><span class="label">Waktu</span><span class="val">' + escapeHtml(wh.time) + '</span></div>' +
    '<div class="field"><span class="label">Pengirim</span><span class="val">' + escapeHtml(wh.sender) + '</span></div>' +
    '<div class="field"><span class="label">Nama</span><span class="val">' + escapeHtml(wh.name) + '</span></div>' +
    '<div class="field"><span class="label">Pesan</span><span class="val mono">' + escapeHtml(wh.message_preview) + '</span></div>' +
    '<div class="field"><span class="label">Aksi</span><span class="val">' + escapeHtml(wh.action) + '</span></div>' +
    '<div class="field"><span class="label">Hasil</span><span class="val">' + escapeHtml(wh.result) + '</span></div>'
    : '<div style="color:#64748b;padding:12px 0">Belum ada webhook yang diterima. Kirim pesan ke nomor WA atau klik tombol test di bawah.</div>';

  return '<!DOCTYPE html>\n<html lang="id">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">\n<title>Webhook Status | ' + CONFIG.APP_NAME + '</title>\n<style>' +
    '*{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#0a0f1e,#111936);color:#e0e7ff;min-height:100vh;padding:32px 16px}' +
    '.wrap{max-width:640px;margin:0 auto}' +
    'h1{font-size:1.3rem;font-weight:800;margin-bottom:4px}' +
    'h1 span{font-size:1.1rem}' +
    '.sub{color:#64748b;font-size:.82rem;margin-bottom:24px}' +
    '.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}' +
    '.card-title{font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:14px}' +
    '.field{display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:12px}' +
    '.field:last-child{border:none}' +
    '.label{color:#94a3b8;font-size:.82rem;min-width:100px;flex-shrink:0}' +
    '.val{font-size:.85rem;text-align:right;word-break:break-all}' +
    '.mono{font-family:monospace;font-size:.78rem;color:#a5b4fc;max-width:300px;overflow:hidden;text-overflow:ellipsis}' +
    '.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700}' +
    '.badge-ok{background:rgba(52,211,153,.15);color:#34d399}' +
    '.badge-missing{background:rgba(239,68,68,.15);color:#fca5a5}' +
    '.badge-unknown{background:rgba(148,163,184,.15);color:#94a3b8}' +
    '.hint{font-size:.78rem;color:#64748b;margin-top:8px;padding:10px 14px;background:rgba(99,102,241,.1);border-radius:10px;line-height:1.5}' +
    '.hint code{background:rgba(0,0,0,.3);padding:2px 6px;border-radius:4px;font-size:.75rem}' +
    '.btn-group{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}' +
    '.btn{display:inline-block;padding:10px 18px;border-radius:10px;text-decoration:none;font-size:.82rem;font-weight:600;text-align:center;transition:all .2s}' +
    '.btn-primary{background:#6366f1;color:#fff}' +
    '.btn-primary:hover{background:#4f46e5}' +
    '.btn-outline{border:1px solid rgba(255,255,255,.15);color:#c7d2fe}' +
    '.btn-outline:hover{background:rgba(255,255,255,.05)}' +
    '.btn-success{background:#10b981;color:#fff}' +
    '.btn-success:hover{background:#059669}' +
    '.empty{text-align:center;padding:20px 0}' +
    '.url-box{background:rgba(0,0,0,.2);border-radius:10px;padding:12px 14px;font-family:monospace;font-size:.78rem;color:#a5b4fc;word-break:break-all;margin:8px 0}' +
    '</style>\n</head>\n<body>\n<div class="wrap">' +
    '<h1><span>📡</span> Webhook Status</h1>' +
    '<p class="sub">' + CONFIG.APP_NAME + ' — Validasi koneksi WhatsApp &amp; webhook Fonnte</p>' +
    '<!-- KARTU 1: STATUS TOKEN -->' +
    '<div class="card">' +
    '<div class="card-title">🔑 WhatsApp API Token</div>' +
    '<div style="margin-bottom:10px"><span class="badge badge-' + tokenStatus + '">' + tokenIcon + ' ' + { 'ok': 'Terkonfigurasi', 'missing': 'Belum Diset', 'unknown': 'Error' }[tokenStatus] + '</span></div>' +
    '<div class="hint">' + tokenText + '<br>' + tokenHint + '</div>' +
    '</div>' +
    '<!-- KARTU 2: WEBHOOK URL -->' +
    '<div class="card">' +
    '<div class="card-title">🌐 Webhook URL (Fonnte)</div>' +
    '<div class="url-box">' + escapeHtml(scriptUrl) + '</div>' +
    '<div class="hint">' +
    '1. Buka <a href="https://panel.fonnte.com" target="_blank" style="color:#6366f1">panel.fonnte.com</a> → Device → Edit<br>' +
    '2. Paste URL di atas ke kolom <b>Webhook URL</b><br>' +
    '3. Nyalakan <b>Auto Read</b> (WAJIB ON)<br>' +
    '4. Klik Save &nbsp; <span style="color:#f59e0b">⚡</span>' +
    '</div>' +
    '</div>' +
    '<!-- KARTU 3: WEBHOOK TERAKHIR -->' +
    '<div class="card">' +
    '<div class="card-title">📩 Webhook Terakhir Diterima</div>' +
    webhookHtml +
    '<div class="btn-group">' +
    '<a href="' + scriptUrl + '?testWebhook=1&sender=628xxx&message=Nama:Test%0ALokasi:Kamar%0ADeskripsi:Test%20webhook" class="btn btn-primary">🧪 Test Tiket</a>' +
    '<a href="' + scriptUrl + '?testWebhook=1&sender=628xxx&message=5" class="btn btn-success">⭐ Test Survey</a>' +
    '<a href="' + scriptUrl + '" class="btn btn-outline">🏠 Beranda</a>' +
    '</div>' +
    '<div class="hint" style="margin-top:12px">' +
    'Klik tombol test di atas setelah deploy untuk simulasi webhook.<br>' +
    'Ganti <code>628xxx</code> dengan nomor WA tujuan (format 628xx tanpa +).' +
    '</div>' +
    '</div>' +
    '<!-- KARTU 4: INFORMASI -->' +
    '<div class="card">' +
    '<div class="card-title">ℹ️ Informasi Sistem</div>' +
    '<div class="field"><span class="label">Spreadsheet</span><span class="val mono" style="font-size:.7rem">' + escapeHtml(status.spreadsheet_id || '-') + '</span></div>' +
    '<div class="field"><span class="label">Timezone</span><span class="val">' + escapeHtml(status.timezone || '-') + '</span></div>' +
    '</div>' +
    '</div>\n</body>\n</html>';
}

// ─── WEBHOOK ENDPOINT ────────────────────────────────────────

/**
 * doPost() — Menerima webhook dari Fonnte (WhatsApp incoming)
 * 
 * ⚠️ GAS Web App sering redirect POST ke script.googleusercontent.com
 * dan data POST bisa hilang. Oleh karena itu fungsi ini:
 * 1. Coba parse dari e.postData.contents (JSON / form-urlencoded)
 * 2. Coba dari e.parameter (GAS kadang isi otomatis)
 * 3. Log detail utk debugging
 */
function doPost(e) {
  try {
    // ── LOG RAW EVENT ────────────────────────────────────
    Logger.log('=== doPost RECEIVED ===');
    Logger.log('e exists: ' + !!e);
    Logger.log('e.postData exists: ' + !!(e && e.postData));
    Logger.log('e.postData.type: ' + (e && e.postData && e.postData.type));
    Logger.log('e.postData.length: ' + (e && e.postData && e.postData.length));
    Logger.log('e.postData.contents: "' + ((e && e.postData && e.postData.contents) || '').substring(0, 500) + '"');
    Logger.log('e.parameter keys: ' + (e && e.parameter ? Object.keys(e.parameter).join(', ') : 'none'));

    var payload = {};

    // ── PRIORITAS 1: Parse dari e.postData.contents ─────
    if (e && e.postData && e.postData.contents) {
      var raw = e.postData.contents.trim();
      
      // Coba JSON dulu (selalu coba, biar try/catch yg handle error)
      try {
        payload = JSON.parse(raw);
        Logger.log('doPost: Parsed from JSON, keys: ' + Object.keys(payload).join(', '));
      } catch (jsonErr) {
        Logger.log('doPost: JSON parse failed: ' + jsonErr.message);
      }
      
      // Jika belum ada data, coba form-urlencoded
      if (Object.keys(payload).length === 0 && raw.indexOf('=') > 0) {
        raw.split('&').forEach(function(pair) {
          var eqIdx = pair.indexOf('=');
          if (eqIdx > 0) {
            var key = decodeURIComponent(pair.substring(0, eqIdx).replace(/\+/g, ' '));
            var val = decodeURIComponent(pair.substring(eqIdx + 1).replace(/\+/g, ' '));
            if (key && val) {
              payload[key] = val;
            }
          }
        });
        Logger.log('doPost: Parsed from form-urlencoded, keys: ' + Object.keys(payload).join(', '));
      }
    }

    // ── PRIORITAS 2: e.parameter (GAS otomatis parse utk form-urlencoded POST) ──
    // GAS kadang isi e.parameter dengan data POST meskipun e.postData kosong
    if (e && e.parameter) {
      for (var key in e.parameter) {
        if (e.parameter.hasOwnProperty(key) && !payload.hasOwnProperty(key)) {
          var val = e.parameter[key];
          // Skip parameter GAS internal (v = version, jangan skip yg lain)
          if (key !== 'v') {
            payload[key] = val;
          }
        }
      }
      Logger.log('doPost: After e.parameter merge, keys: ' + Object.keys(payload).join(', '));
    }

    Logger.log('Incoming Webhook: ' + JSON.stringify(payload));

    if (Object.keys(payload).length === 0) {
      Logger.log('doPost Warning: Empty payload received');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Empty payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var result = handleIncomingWhatsApp(payload);
    Logger.log('doPost: Result: ' + JSON.stringify(result).substring(0, 300));
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost Error: ' + err.message);
    Logger.log('doPost Stack: ' + err.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
