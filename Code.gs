/**
 * ============================================================
 * Code.gs — Entry Point & API Routing
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── WEB APP ENTRY POINT ────────────────────────────────────

/**
 * doGet() — Dipanggil saat user membuka URL Web App
 * Menampilkan halaman utama (index.html)
 */
function doGet(e) {
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
      'publicBooking'
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
      
      // Parse CSV (handle quoted fields)
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

// ─── WEBHOOK ENDPOINT ────────────────────────────────────────

/**
 * doPost() — Menerima webhook dari Fonnte (WhatsApp incoming)
 * Untuk menerima balasan survei dari customer
 * 
 * Handle dua format webhook:
 * 1. JSON: Content-Type application/json → e.postData.contents
 * 2. Form-data: Content-Type application/x-www-form-urlencoded → e.parameter
 */
function doPost(e) {
  try {
    var payload = {};

    if (e && e.postData && e.postData.contents) {
      // Coba parse sebagai JSON dulu
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // Bukan JSON — mungkin form-urlencoded
        // Coba parse manual dari string
        var raw = e.postData.contents;
        if (raw && typeof raw === 'string') {
          raw.split('&').forEach(function(pair) {
            var parts = pair.split('=');
            if (parts.length === 2) {
              var key = decodeURIComponent(parts[0].replace(/\+/g, ' '));
              var val = decodeURIComponent(parts[1].replace(/\+/g, ' '));
              payload[key] = val;
            }
          });
        }
      }
    }

    // Fallback: jika masih kosong dan ada parameter, pakai e.parameter
    if (Object.keys(payload).length === 0 && e && e.parameter) {
      for (var key in e.parameter) {
        if (e.parameter.hasOwnProperty(key)) {
          payload[key] = e.parameter[key];
        }
      }
    }

    Logger.log('Incoming Webhook: ' + JSON.stringify(payload));

    if (Object.keys(payload).length === 0) {
      Logger.log('doPost Warning: Empty payload received');
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Empty payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var result = handleIncomingWhatsApp(payload);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost Error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
