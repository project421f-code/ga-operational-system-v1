/**
 * ============================================================
 * API_Maintenance.gs — Modul Maintenance & Komplain + KPI
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── COMPLAINT MANAGEMENT ───────────────────────────────────

/**
 * Mendapatkan semua tiket komplain
 */
function getAllComplaints(filters) {
  try {
    var user = getActiveUserSession();
    // Cache 60 detik agar navigasi antar halaman tidak baca ulang sheet
    var data = getCachedSheetData(CONFIG.SHEETS.MAIN_DATA, 15); // Cache 15 detik

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'Semua') {
        data = data.filter(function(d) { return d.status === filters.status; });
      }
      if (filters.kategori && filters.kategori !== 'Semua') {
        data = data.filter(function(d) { return d.kategori === filters.kategori; });
      }
      if (filters.urgensi && filters.urgensi !== 'Semua') {
        data = data.filter(function(d) { return d.urgensi === filters.urgensi; });
      }
      if (filters.teknisi) {
        data = data.filter(function(d) { return d.teknisi === filters.teknisi; });
      }
      // ─── FITUR #2: Filter tanggal ────────────────────────
      if (filters.tgl_mulai) {
        var tglMulai = new Date(filters.tgl_mulai);
        data = data.filter(function(d) { return d.timestamp && new Date(d.timestamp) >= tglMulai; });
      }
      if (filters.tgl_selesai) {
        var tglSelesai = new Date(filters.tgl_selesai);
        tglSelesai.setDate(tglSelesai.getDate() + 1); // include end date
        data = data.filter(function(d) { return d.timestamp && new Date(d.timestamp) <= tglSelesai; });
      }
    }

    // Sort by timestamp descending (terbaru dulu)
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Format dates untuk display
    data = data.map(function(d) {
      return {
        tiket_id: d.tiket_id,
        timestamp: formatDateId(d.timestamp),
        no_wa: d.no_wa,
        nama_customer: d.nama_customer,
        lokasi: d.lokasi,
        deskripsi: d.deskripsi,
        foto_kerusakan: d.foto_kerusakan,
        kategori: d.kategori,
        sub_kategori: d.sub_kategori,
        urgensi: d.urgensi,
        target_sla_jam: d.target_sla_jam,
        status: d.status,
        teknisi: d.teknisi,
        foto_perbaikan: d.foto_perbaikan,
        catatan: d.catatan,
        waktu_selesai: d.waktu_selesai ? formatDateId(d.waktu_selesai) : '-',
        durasi_jam: d.durasi_jam || '-',
        status_sla: d.status_sla || '-',
        rating_survei: d.rating_survei || '-'
      };
    });

    // ─── PAGINATION ────────────────────────────────────────
    // Default limit 50 jika frontend tidak mengirim parameter pagination
    var reqLimit = filters && filters.limit ? filters.limit : 50;
    var reqOffset = filters && filters.offset ? filters.offset : 0;
    var pagination = applyPagination(data, reqLimit, reqOffset);
    
    return successResponse({
      data: pagination.paginatedData,
      total: pagination.total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan detail satu tiket komplain berdasarkan ID
 * Menggunakan findRow() untuk lookup langsung tanpa load semua data
 */
function getComplaintById(tiketId) {
  try {
    var user = getActiveUserSession();
    if (!tiketId) throw new Error('ID tiket wajib diisi.');

    var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
    if (!found) throw new Error('Tiket tidak ditemukan.');

    var d = found.data;
    return successResponse({
      tiket_id: d.tiket_id,
      timestamp: formatDateId(d.timestamp),
      no_wa: d.no_wa,
      nama_customer: d.nama_customer,
      lokasi: d.lokasi,
      deskripsi: d.deskripsi,
      foto_kerusakan: d.foto_kerusakan || '',
      kategori: d.kategori,
      sub_kategori: d.sub_kategori || '',
      urgensi: d.urgensi,
      target_sla_jam: d.target_sla_jam,
      status: d.status,
      teknisi: d.teknisi,
      foto_perbaikan: d.foto_perbaikan,
      catatan: d.catatan,
      waktu_selesai: d.waktu_selesai ? formatDateId(d.waktu_selesai) : '-',
      durasi_jam: d.durasi_jam || '-',
      status_sla: d.status_sla || '-',
      rating_survei: d.rating_survei || '-'
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan tiket komplain baru atau update yang ada
 */
function saveComplaint(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.nama_customer || !payload.lokasi || !payload.deskripsi || !payload.kategori || !payload.urgensi) {
      throw new Error('Nama, lokasi, deskripsi, kategori, dan urgensi wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);

      // Ambil target SLA dari Master_SLA
      var targetSLA = lookupSLA(payload.kategori, payload.sub_kategori || '', payload.urgensi);

      if (payload.tiket_id) {
        // UPDATE
        var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', payload.tiket_id);
        if (!found) throw new Error('Tiket tidak ditemukan.');

        var updates = {
          nama_customer: payload.nama_customer,
          no_wa: normalizePhone(payload.no_wa),
          lokasi: payload.lokasi,
          deskripsi: payload.deskripsi,
          foto_kerusakan: payload.foto_kerusakan || '',
          kategori: payload.kategori,
          sub_kategori: payload.sub_kategori || '',
          urgensi: payload.urgensi,
          target_sla_jam: targetSLA
        };

        updateRowCells(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, updates);
        // Hapus cache agar data langsung ter-refresh
        try { CacheService.getScriptCache().remove('csd_Main_Data'); } catch(e) {}
        return successResponse({ tiket_id: payload.tiket_id }, 'Tiket berhasil diperbarui.');

      } else {
        // CREATE
        var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');

        // Normalisasi nomor WA sebelum disimpan (force string, hindari scientific notation)
        var cleanPhone = normalizePhone(payload.no_wa);

        sheet.appendRow([
          now(),                         // timestamp
          tiketId,                       // tiket_id
          cleanPhone,                    // no_wa (sudah string bersih)
          payload.nama_customer,         // nama_customer
          payload.lokasi,                // lokasi
          payload.deskripsi,             // deskripsi
          payload.foto_kerusakan || '',  // foto_kerusakan
          payload.kategori,              // kategori
          payload.sub_kategori || '',    // sub_kategori
          payload.urgensi,               // urgensi
          targetSLA,                     // target_sla_jam
          CONFIG.STATUS.OPEN,            // status
          '',                            // teknisi
          '',                            // foto_perbaikan
          '',                            // catatan
          '',                            // waktu_selesai
          '',                            // durasi_jam
          '',                            // status_sla
          ''                             // rating_survei
        ]);

        // Force format kolom no_wa sebagai teks agar Google Sheets tidak mengkonversi ke number
        try {
          var noWaColIndex = 3; // Kolom C = no_wa
          sheet.getRange(sheet.getLastRow(), noWaColIndex).setNumberFormat('@');
        } catch (fmtErr) {
          Logger.log('Format kolom no_wa error: ' + fmtErr.message);
        }

        // ─── WA NOTIFICATION ────────────────────────────
        // Kirim notifikasi ke customer jika ada nomor WA
        var waSent = false;
        var waError = '';
        if (cleanPhone) {
          try {
            var waResult = sendNewTicketNotification(
              cleanPhone,
              tiketId,
              payload.nama_customer,
              payload.kategori,
              payload.urgensi,
              payload.lokasi,
              payload.deskripsi
            );
            if (waResult && (waResult.status === true || waResult.success === true)) {
              waSent = true;
              Logger.log('WA new ticket notification sent to ' + cleanPhone);
            } else {
              waError = (waResult && waResult.error) || 'Gagal kirim WA';
              Logger.log('WA New Ticket Notification Error: ' + waError);
            }
          } catch (waErr) {
            waError = waErr.message;
            Logger.log('WA New Ticket Notification Error: ' + waError);
          }
        } else {
          waError = 'Nomor WA kosong/tidak valid';
          Logger.log('WA SKIPPED: no_wa kosong/tidak valid untuk ' + payload.nama_customer);
        }

        // ─── NOTIFIKASI KE ADMIN & STAFF MAINTENANCE ─────────
        // Kirim notifikasi ke semua Admin, Supervisor, dan Staff Maintenance yang punya nomor WA
        try {
          var allUsers = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);

          allUsers.forEach(function(admin) {
            // Filter: hanya user Aktif yang punya role Admin/Supervisor ATAU tim Maintenance
            if (admin.status !== 'Aktif') return;
            var isAdminOrSupervisor = (admin.role === CONFIG.ROLES.ADMIN || admin.role === CONFIG.ROLES.SUPERVISOR);
            var timLower = (admin.tim || '').toLowerCase();
            var isTimMaintenance = timLower === 'maintenance' || timLower === 'mnt';
            if (!isAdminOrSupervisor && !isTimMaintenance) return;

            var adminPhone = normalizePhone(admin.no_wa);
            if (!adminPhone) return;

            try {
              sendAutoTicketAdminNotification(
                adminPhone,
                admin.nama,
                payload.nama_customer,
                tiketId,
                payload.kategori,
                payload.lokasi,
                payload.deskripsi,
                payload.foto_kerusakan || ''
              );
              Logger.log('WA Notified: ' + admin.nama + ' (' + adminPhone + ', role=' + admin.role + ', tim=' + admin.tim + ') for ticket ' + tiketId);
            } catch (waErr) {
              Logger.log('WA Notification Error for ' + admin.nama + ': ' + waErr.message);
            }
          });
        } catch (adminErr) {
          Logger.log('WA Admin Notification Lookup Error: ' + adminErr.message);
        }

        // Hapus cache agar data langsung ter-refresh di list tiket
        try { CacheService.getScriptCache().remove('csd_Main_Data'); } catch(e) {}
        return successResponse({
          tiket_id: tiketId,
          wa_notification_sent: waSent,
          wa_error: waError
        }, 'Tiket "' + tiketId + '" berhasil dibuat.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Update status tiket & assign teknisi
 */
function updateComplaintStatus(tiketId, newStatus, assignData) {
  try {
    var user = getActiveUserSession();

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      var updates = { status: newStatus };

      if (newStatus === CONFIG.STATUS.IN_PROGRESS) {
        if (assignData && assignData.teknisi) {
          updates.teknisi = assignData.teknisi;

          // ─── WA NOTIFICATION ──────────────────────────
          // Kirim notifikasi ke customer bahwa tiket sedang dikerjakan
          var customerPhone = normalizePhone(found.data.no_wa);
          if (customerPhone) {
            try {
              sendTicketInProgressNotification(customerPhone, found.data.nama_customer, tiketId, assignData.teknisi);
              Logger.log('WA InProgress sent to ' + customerPhone);
            } catch (waErr) {
              Logger.log('WA InProgress Notification Error: ' + waErr.message);
            }
          } else {
            Logger.log('WA INPROGRESS SKIPPED: no_wa kosong/tidak valid');
          }

          // Kirim notifikasi WhatsApp ke teknisi yang ditugaskan
          try {
            var teknisiData = findRow(CONFIG.SHEETS.USER_LIST, 'nama', assignData.teknisi);
            var teknisiPhone = normalizePhone(teknisiData && teknisiData.data.no_wa);
            if (teknisiPhone) {
              sendTicketAssignedNotification(
                teknisiPhone,
                assignData.teknisi,
                tiketId,
                found.data.nama_customer,
                found.data.lokasi,
                found.data.deskripsi,
                found.data.urgensi
              );
              Logger.log('WA Assign sent to ' + assignData.teknisi + ' (' + teknisiPhone + ')');
            } else {
              Logger.log('Teknisi ' + assignData.teknisi + ' tidak punya nomor WA terdaftar.');
            }
          } catch (waErr) {
            Logger.log('WA Assign Notification Error: ' + waErr.message);
          }
        }
      }

      if (newStatus === CONFIG.STATUS.SELESAI) {
        var waktuSelesai = now();
        var startTime = new Date(found.data.timestamp);
        var duration = diffInHours(startTime, waktuSelesai);
        var targetSLA = Number(found.data.target_sla_jam) || 999;
        var slaStatus = duration <= targetSLA ? CONFIG.STATUS.ACHIEVED : CONFIG.STATUS.BREACHED;

        updates.waktu_selesai = waktuSelesai;
        updates.durasi_jam = duration;
        updates.status_sla = slaStatus;

        if (assignData && assignData.foto_perbaikan) {
          updates.foto_perbaikan = assignData.foto_perbaikan;
        }
        if (assignData && assignData.catatan) {
          updates.catatan = assignData.catatan;
        }
        if (assignData && assignData.teknisi) {
          updates.teknisi = assignData.teknisi;
        }

        // ─── WA NOTIFICATION ────────────────────────────
        // Kirim notifikasi selesai + survei ke pelapor
        var customerPhone = normalizePhone(found.data.no_wa || (assignData && assignData.no_wa) || '');
        
        if (customerPhone) {
          try {
            sendTicketCompletedNotification(
              customerPhone,
              found.data.nama_customer || '-',
              tiketId,
              (assignData && assignData.catatan) || '',
              found.data.kategori || '-'
            );
            Logger.log('WA Completed + Survey sent to ' + customerPhone);
          } catch (waErr) {
            Logger.log('WA Survey Error: ' + waErr.message);
          }
        } else {
          Logger.log('WA SELESAI SKIPPED: no_wa kosong');
        }
      }

      updateRowCells(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, updates);
      return successResponse(null, 'Status tiket berhasil diubah ke "' + newStatus + '".');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan rating survei kepuasan
 */
function saveSurveyRating(tiketId, rating) {
  try {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating harus antara 1-5.');
    }

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      updateCell(CONFIG.SHEETS.MAIN_DATA, found.rowIndex, 'rating_survei', rating);
      return successResponse(null, 'Rating survei berhasil disimpan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Buat tiket komplain dari WhatsApp webhook (tanpa auth session)
 * Dipanggil otomatis saat customer kirim pesan dengan format komplain
 */
function createComplaintFromWhatsApp(data) {
  try {
    if (!data.nama_customer || !data.lokasi || !data.deskripsi) {
      throw new Error('Data tidak lengkap. Nama, lokasi, dan deskripsi wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
      var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');
      var cleanPhone = normalizePhone(data.no_wa || '');
      var kategori = data.kategori || 'Lainnya';
      var urgensi = data.urgensi || 'Medium';
      var targetSLA = lookupSLA(kategori, data.sub_kategori || '', urgensi);

      sheet.appendRow([
        now(),                         // timestamp
        tiketId,                       // tiket_id
        cleanPhone,                    // no_wa
        data.nama_customer,            // nama_customer
        data.lokasi,                   // lokasi
        data.deskripsi,                // deskripsi
        data.foto_kerusakan || '',     // foto_kerusakan (dari WA)
        kategori,                      // kategori
        data.sub_kategori || '',       // sub_kategori
        urgensi,                       // urgensi
        targetSLA,                     // target_sla_jam
        CONFIG.STATUS.OPEN,            // status
        '',                            // teknisi
        '',                            // foto_perbaikan
        '',                            // catatan
        '',                            // waktu_selesai
        '',                            // durasi_jam
        '',                            // status_sla
        ''                             // rating_survei
      ]);

      // Force format no_wa column sebagai teks
      try {
        var noWaColIndex = 3;
        sheet.getRange(sheet.getLastRow(), noWaColIndex).setNumberFormat('@');
      } catch (fmtErr) {
        Logger.log('Format kolom no_wa error: ' + fmtErr.message);
      }

      // Kirim notifikasi ke customer
      var waSent = false;
      var waError = '';
      if (cleanPhone) {
        try {
          var waResult = sendNewTicketNotification(
            cleanPhone,
            tiketId,
            data.nama_customer,
            kategori,
            urgensi,
            data.lokasi,
            data.deskripsi
          );
          // sendWhatsApp mengembalikan { success, error } atau { status: true/false } dari Fonnte
          if (waResult && (waResult.status === true || waResult.success === true)) {
            waSent = true;
            Logger.log('WA new ticket notification sent to ' + cleanPhone);
          } else {
            waError = (waResult && waResult.error) || 'Gagal kirim WA (token/nomor tidak valid)';
            Logger.log('WA New Ticket Notification Error: ' + waError);
          }
        } catch (waErr) {
          waError = waErr.message;
          Logger.log('WA New Ticket Notification Error: ' + waError);
        }
      } else {
        waError = 'Nomor WA customer kosong/tidak valid';
        Logger.log('WA SKIPPED: no_wa kosong/tidak valid untuk ' + data.nama_customer);
      }

      Logger.log('WA Auto-Ticket: Created ' + tiketId + ' for ' + data.nama_customer + ' (' + cleanPhone + ')');

      // Hapus cache agar data langsung ter-refresh di list tiket
      try { CacheService.getScriptCache().remove('csd_Main_Data'); } catch(e) {}

      // ─── NOTIFIKASI KE ADMIN & STAFF MAINTENANCE ─────────
      // Kirim notifikasi ke semua Admin, Supervisor, dan Staff Maintenance yang punya nomor WA
      try {
        var allUsers = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);

        allUsers.forEach(function(admin) {
          // Filter: hanya user Aktif yang punya role Admin/Supervisor ATAU tim Maintenance
          if (admin.status !== 'Aktif') return;
          var isAdminOrSupervisor = (admin.role === CONFIG.ROLES.ADMIN || admin.role === CONFIG.ROLES.SUPERVISOR);
          var timLower = (admin.tim || '').toLowerCase();
          var isTimMaintenance = timLower === 'maintenance' || timLower === 'mnt';
          if (!isAdminOrSupervisor && !isTimMaintenance) return;

          var adminPhone = normalizePhone(admin.no_wa);
          if (!adminPhone) return;

          try {
            sendAutoTicketAdminNotification(
              adminPhone,
              admin.nama,
              data.nama_customer,
              tiketId,
              kategori,
              data.lokasi,
              data.deskripsi,
              data.foto_kerusakan || ''
            );
            Logger.log('WA Notified: ' + admin.nama + ' (' + adminPhone + ', role=' + admin.role + ', tim=' + admin.tim + ') for ticket ' + tiketId);
          } catch (waErr) {
            Logger.log('WA Notification Error for ' + admin.nama + ': ' + waErr.message);
          }
        });
      } catch (adminErr) {
        Logger.log('WA Admin Notification Lookup Error: ' + adminErr.message);
      }

      return successResponse({
        tiket_id: tiketId,
        wa_notification_sent: waSent,
        wa_error: waError
      }, 'Tiket "' + tiketId + '" berhasil dibuat dari WhatsApp.');
    });
  } catch (e) {
    Logger.log('createComplaintFromWhatsApp Error: ' + e.message);
    return errorResponse(e.message);
  }
}

/**
 * Kirim update komplain ke customer via WhatsApp
 */
function sendComplaintUpdate(tiketId, pesanTambahan) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
    if (!found) throw new Error('Tiket tidak ditemukan.');

    var customerPhone = normalizePhone(found.data.no_wa);
    if (!customerPhone) {
      throw new Error('Customer tidak memiliki nomor WhatsApp terdaftar.');
    }
    sendComplaintUpdateNotification(
      customerPhone,
      found.data.nama_customer,
      tiketId,
      found.data.status,
      pesanTambahan || ''
    );

    return successResponse(null, '✅ Update berhasil dikirim ke customer via WhatsApp.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus tiket komplain
 */
function deleteComplaint(tiketId) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MAIN_DATA, 'tiket_id', tiketId);
      if (!found) throw new Error('Tiket tidak ditemukan.');

      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Tiket berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MASTER SLA ─────────────────────────────────────────────

/**
 * Mendapatkan semua data Master SLA
 */
function getMasterSLA() {
  try {
    var data = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan / update entri Master SLA
 */
function saveMasterSLA(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    if (!payload.kategori || !payload.urgensi || !payload.target_sla_jam) {
      throw new Error('Kategori, urgensi, dan target SLA wajib diisi.');
    }

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MASTER_SLA);
      var data = getSheetData(CONFIG.SHEETS.MASTER_SLA);

      // Cek apakah sudah ada entry dengan kombinasi yang sama
      var existingIndex = -1;
      for (var i = 0; i < data.length; i++) {
        if (data[i].kategori === payload.kategori &&
            data[i].sub_kategori === (payload.sub_kategori || '') &&
            data[i].urgensi === payload.urgensi) {
          existingIndex = data[i]._rowIndex;
          break;
        }
      }

      if (payload._isUpdate && existingIndex > 0) {
        // UPDATE
        updateRowCells(CONFIG.SHEETS.MASTER_SLA, existingIndex, {
          kategori: payload.kategori,
          sub_kategori: payload.sub_kategori || '',
          urgensi: payload.urgensi,
          target_sla_jam: Number(payload.target_sla_jam)
        });
        return successResponse(null, 'SLA berhasil diperbarui.');
      } else {
        // CREATE
        sheet.appendRow([
          payload.kategori,
          payload.sub_kategori || '',
          payload.urgensi,
          Number(payload.target_sla_jam)
        ]);
        return successResponse(null, 'SLA baru berhasil ditambahkan.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus entri Master SLA
 */
function deleteMasterSLA(kategori, subKategori, urgensi) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var data = getSheetData(CONFIG.SHEETS.MASTER_SLA);
      var sheet = getSheet(CONFIG.SHEETS.MASTER_SLA);

      for (var i = 0; i < data.length; i++) {
        if (data[i].kategori === kategori &&
            data[i].sub_kategori === (subKategori || '') &&
            data[i].urgensi === urgensi) {
          sheet.deleteRow(data[i]._rowIndex);
          return successResponse(null, 'SLA berhasil dihapus.');
        }
      }

      throw new Error('Data SLA tidak ditemukan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Lookup SLA target dari Master_SLA
 */
function lookupSLA(kategori, subKategori, urgensi) {
  var data = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);

  // Cari exact match dulu
  for (var i = 0; i < data.length; i++) {
    if (data[i].kategori === kategori &&
        data[i].sub_kategori === subKategori &&
        data[i].urgensi === urgensi) {
      return Number(data[i].target_sla_jam);
    }
  }

  // Fallback: cari tanpa sub_kategori
  for (var j = 0; j < data.length; j++) {
    if (data[j].kategori === kategori && data[j].urgensi === urgensi) {
      return Number(data[j].target_sla_jam);
    }
  }

  // Default fallback
  var defaults = { 'Low': 48, 'Medium': 24, 'High': 8 };
  return defaults[urgensi] || 24;
}

/**
 * Mendapatkan daftar kategori unik dari Master SLA
 */
function getSLACategories() {
  try {
    var data = getCachedSheetData(CONFIG.SHEETS.MASTER_SLA, 3600);
    var categories = {};

    data.forEach(function(d) {
      if (!categories[d.kategori]) {
        categories[d.kategori] = [];
      }
      if (d.sub_kategori && categories[d.kategori].indexOf(d.sub_kategori) === -1) {
        categories[d.kategori].push(d.sub_kategori);
      }
    });

    return successResponse(categories);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── KPI MAINTENANCE ────────────────────────────────────────

/**
 * Hitung & simpan KPI Maintenance
 * Rumus: % Kepatuhan SLA = (Tiket SLA Achieved / Total Tiket Selesai) × 100%
 */
function calculateMaintenanceKPI() {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    var complaints = getSheetData(CONFIG.SHEETS.MAIN_DATA);
    var kpiMap = {};

    // Kalkulasi per teknisi (trim spasi untuk konsistensi)
    complaints.forEach(function(c) {
      var teknisi = (c.teknisi || '').trim();
      if (!teknisi) return;

      if (!kpiMap[teknisi]) {
        kpiMap[teknisi] = {
          nama_staff: teknisi,
          total_tiket: 0,
          tiket_selesai: 0,
          sla_achieved: 0,
          total_rating: 0,
          rating_count: 0
        };
      }

      kpiMap[teknisi].total_tiket++;

      if (c.status === CONFIG.STATUS.SELESAI) {
        kpiMap[teknisi].tiket_selesai++;
        if (c.status_sla === CONFIG.STATUS.ACHIEVED) {
          kpiMap[teknisi].sla_achieved++;
        }
        if (c.rating_survei && Number(c.rating_survei) > 0) {
          kpiMap[teknisi].total_rating += Number(c.rating_survei);
          kpiMap[teknisi].rating_count++;
        }
      }
    });

    // ─── GABUNGKAN DENGAN USER LIST ────────────────────────
    // Pastikan semua staff maintenance (Aktif) tetap muncul walau 0 tiket
    try {
      var allUsers = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
      allUsers.forEach(function(u) {
        if (u.status !== 'Aktif') return;
        var timLower = (u.tim || '').trim().toLowerCase();
        var namaStaff = (u.nama || '').trim();
        if (timLower !== 'maintenance' && timLower !== 'mnt') return;
        if (!namaStaff) return;
        // Cek dengan nama yang sudah di-trim
        if (!kpiMap[namaStaff]) {
          kpiMap[namaStaff] = {
            nama_staff: namaStaff,
            total_tiket: 0,
            tiket_selesai: 0,
            sla_achieved: 0,
            total_rating: 0,
            rating_count: 0
          };
        }
      });
    } catch (userErr) {
      Logger.log('KPI UserList merge error: ' + userErr.message);
    }

    // Hitung persentase dan skor
    var kpiData = Object.keys(kpiMap).map(function(key) {
      var k = kpiMap[key];
      var persenSLA = k.tiket_selesai > 0
        ? Math.round((k.sla_achieved / k.tiket_selesai) * 10000) / 100
        : 0;
      var avgRating = k.rating_count > 0
        ? Math.round((k.total_rating / k.rating_count) * 100) / 100
        : 0;

      // Skor Performa berdasarkan % SLA
      var skor = 'Perlu Perbaikan';
      if (persenSLA >= 90) skor = 'Excellent';
      else if (persenSLA >= 75) skor = 'Baik';
      else if (persenSLA >= 60) skor = 'Cukup';

      return {
        nama_staff: k.nama_staff,
        total_tiket: k.total_tiket,
        tiket_selesai: k.tiket_selesai,
        persen_sla: persenSLA,
        rata_rata_rating: avgRating,
        skor_performa: skor
      };
    });

    // Update sheet Dashboard_KPI_Mnt
    var sheet = getSheet(CONFIG.SHEETS.DASHBOARD_KPI_MNT);
    // Clear existing data (keep header)
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clear();
    }

    kpiData.forEach(function(k) {
      sheet.appendRow([
        k.nama_staff,
        k.total_tiket,
        k.tiket_selesai,
        k.persen_sla / 100, // Store as decimal for sheet formatting
        k.rata_rata_rating,
        k.skor_performa
      ]);
    });

    return successResponse(kpiData, 'KPI Maintenance berhasil dikalkulasi.');
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Mendapatkan data KPI Maintenance
 */
function getMaintenanceKPI() {
  try {
    var data = getCachedSheetData(CONFIG.SHEETS.DASHBOARD_KPI_MNT, 1800);

    data = data.map(function(d) {
      return {
        nama_staff: d.nama_staff,
        total_tiket: d.total_tiket,
        tiket_selesai: d.tiket_selesai,
        persen_sla: typeof d.persen_sla === 'number' && d.persen_sla < 1
          ? Math.round(d.persen_sla * 10000) / 100
          : d.persen_sla,
        rata_rata_rating: d.rata_rata_rating,
        skor_performa: d.skor_performa
      };
    });

    // ─── GABUNGKAN DENGAN USER LIST ────────────────────────
    // Pastikan semua staff maintenance (Aktif) tetap muncul walau belum ada di sheet KPI
    var existingNames = {};
    data.forEach(function(d) { existingNames[(d.nama_staff || '').trim()] = true; });
    try {
      var allUsers = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
      allUsers.forEach(function(u) {
        if (u.status !== 'Aktif') return;
        var timLower = (u.tim || '').trim().toLowerCase();
        var namaStaff = (u.nama || '').trim();
        if (timLower !== 'maintenance' && timLower !== 'mnt') return;
        if (!namaStaff) return;
        if (!existingNames[namaStaff]) {
          data.push({
            nama_staff: namaStaff,
            total_tiket: 0,
            tiket_selesai: 0,
            persen_sla: 0,
            rata_rata_rating: 0,
            skor_performa: 'Belum ada tiket'
          });
        }
      });
    } catch (userErr) {
      Logger.log('KPI get UserList merge error: ' + userErr.message);
    }

    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── DASHBOARD STATISTICS ───────────────────────────────────

/**
 * Mendapatkan statistik ringkasan untuk Dashboard utama
 */
function getDashboardStats() {
  try {
    var user = getActiveUserSession();

    var complaints = getCachedSheetData(CONFIG.SHEETS.MAIN_DATA, 15);
    var bookings = getCachedSheetData(CONFIG.SHEETS.ASSET_BOOKING, 15);
    var patrols = getCachedSheetData(CONFIG.SHEETS.PATROL_LOG, 15);
    var checklists = getCachedSheetData(CONFIG.SHEETS.CS_DAILY_CHECKLIST, 15);

    // Maintenance stats
    var totalComplaints = complaints.length;
    var openComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.OPEN; }).length;
    var inProgressComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.IN_PROGRESS; }).length;
    var completedComplaints = complaints.filter(function(c) { return c.status === CONFIG.STATUS.SELESAI; }).length;
    var slaAchieved = complaints.filter(function(c) { return c.status_sla === CONFIG.STATUS.ACHIEVED; }).length;
    var slaBreached = complaints.filter(function(c) { return c.status_sla === CONFIG.STATUS.BREACHED; }).length;

    // Booking stats
    var totalBookings = bookings.length;
    var activeBookings = bookings.filter(function(b) { return b.status_booking === 'Approved (Auto)'; }).length;

    // Security stats
    var totalPatrols = patrols.length;

    // Housekeeping stats
    var totalChecklists = checklists.length;
    var onSchedule = checklists.filter(function(c) { return c.kesesuaian_jadwal === 'On Schedule'; }).length;

    // Chart data: Komplain per kategori
    var categoryCount = {};
    complaints.forEach(function(c) {
      var cat = c.kategori || 'Lainnya';
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Chart data: Status distribusi
    var statusCount = {
      'Open': openComplaints,
      'In Progress': inProgressComplaints,
      'Selesai': completedComplaints
    };

    // Chart data: Urgensi distribusi
    var urgencyCount = {};
    complaints.forEach(function(c) {
      var urg = c.urgensi || 'Unknown';
      urgencyCount[urg] = (urgencyCount[urg] || 0) + 1;
    });

    // ─── FITUR #1: Tren bulanan komplain ───────────────────
    var monthlyTrend = {};
    complaints.forEach(function(c) {
      if (!c.timestamp) return;
      var monthKey = Utilities.formatDate(new Date(c.timestamp), CONFIG.TIMEZONE, 'yyyy-MM');
      if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { bulan: monthKey, total: 0, open: 0, selesai: 0 };
      monthlyTrend[monthKey].total++;
      if (c.status === CONFIG.STATUS.OPEN || c.status === CONFIG.STATUS.IN_PROGRESS) monthlyTrend[monthKey].open++;
      if (c.status === CONFIG.STATUS.SELESAI) monthlyTrend[monthKey].selesai++;
    });
    var trendData = Object.keys(monthlyTrend).sort().map(function(k) { return monthlyTrend[k]; });

    // ─── FITUR #1: Tiket open terbaru (5 teratas) ─────────
    var openTickets = complaints
      .filter(function(c) { return c.status === CONFIG.STATUS.OPEN || c.status === CONFIG.STATUS.IN_PROGRESS; })
      .sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); })
      .slice(0, 5)
      .map(function(c) {
        return {
          tiket_id: c.tiket_id,
          nama_customer: c.nama_customer,
          lokasi: c.lokasi,
          kategori: c.kategori,
          urgensi: c.urgensi,
          status: c.status,
          timestamp: formatDateId(c.timestamp)
        };
      });

    // ─── FITUR #1: SLA Warning (ticket mendekati breach) ──
    var slaWarningCount = 0;
    var highUrgentOpen = complaints.filter(function(c) {
      return (c.status === CONFIG.STATUS.OPEN || c.status === CONFIG.STATUS.IN_PROGRESS)
        && c.urgensi === 'High'
        && (!c.status_sla || c.status_sla === '-');
    }).length;

    return successResponse({
      maintenance: {
        total: totalComplaints,
        open: openComplaints,
        inProgress: inProgressComplaints,
        completed: completedComplaints,
        slaAchieved: slaAchieved,
        slaBreached: slaBreached,
        slaRate: completedComplaints > 0
          ? Math.round((slaAchieved / completedComplaints) * 100)
          : 0
      },
      booking: {
        total: totalBookings,
        active: activeBookings
      },
      security: {
        totalPatrols: totalPatrols
      },
      housekeeping: {
        totalChecklists: totalChecklists,
        onSchedule: onSchedule,
        complianceRate: totalChecklists > 0
          ? Math.round((onSchedule / totalChecklists) * 100)
          : 0
      },
      charts: {
        categoryCount: categoryCount,
        statusCount: statusCount,
        urgencyCount: urgencyCount
      },
      // ─── FITUR #1: Data tambahan dashboard ──────────────
      monthlyTrend: trendData,
      recentOpenTickets: openTickets,
      slaWarning: {
        highUrgentOpen: highUrgentOpen,
        total: openComplaints + inProgressComplaints
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── EXPORT DATA ─────────────────────────────────────────────

// ─── PUBLIC COMPLAINT (via QR Code) ─────────────────────────

/**
 * Simpan laporan kerusakan dari publik (via QR Code / ?page=report)
 * Tidak perlu session — bisa diakses oleh siapa saja
 * Dilengkapi rate limiting untuk mencegah spam
 */
function savePublicComplaint(payload) {
  try {
    // ─── HONEYPOT CHECK ─────────────────────────────
    // Jika field website terisi, pasti bot
    if (payload.website && payload.website.trim() !== '') {
      Logger.log('PUBLIC COMPLAINT SPAM: honeypot triggered');
      return successResponse({ tiket_id: 'SPAM' }, '✅ Laporan berhasil dikirim! Tim kami akan segera menindaklanjuti.');
    }

    // ─── RATE LIMIT ────────────────────────────────
    // Max 3 submission per nomor WA per jam, atau 5 per IP (pakai nama) per jam
    var cache = CacheService.getScriptCache();
    var rateKey = 'pcomp_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMddHH') + '_' + (payload.no_wa || 'anon_' + (payload.nama_customer || '').substring(0, 8));
    var count = parseInt(cache.get(rateKey) || '0', 10);
    if (count >= 3) {
      Logger.log('PUBLIC COMPLAINT RATE LIMITED: ' + JSON.stringify({ nama: payload.nama_customer, wa: payload.no_wa }));
      return successResponse({ tiket_id: 'LIMIT' }, '✅ Laporan berhasil dikirim! Tim kami akan segera menindaklanjuti.');
    }
    cache.put(rateKey, String(count + 1), 3600); // TTL 1 jam

    // ─── VALIDASI ─────────────────────────────────
    if (!payload.nama_customer || !payload.lokasi || !payload.deskripsi) {
      throw new Error('Nama, lokasi, dan deskripsi wajib diisi.');
    }
    if (payload.nama_customer.length < 2) throw new Error('Nama terlalu pendek (min 2 karakter).');
    if (payload.deskripsi.length < 5) throw new Error('Deskripsi terlalu pendek (min 5 karakter).');
    if (payload.deskripsi.length > 2000) throw new Error('Deskripsi terlalu panjang (max 2000 karakter).');
    if (payload.nama_customer.length > 100) throw new Error('Nama terlalu panjang (max 100 karakter).');
    
    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MAIN_DATA);
      var tiketId = generateSequentialId('MNT', CONFIG.SHEETS.MAIN_DATA, 'tiket_id');
      var cleanPhone = normalizePhone(payload.no_wa || '');
      var kategori = payload.kategori || 'Lainnya';
      var urgensi = payload.urgensi || 'Medium';
      var targetSLA = 24;
      try { targetSLA = lookupSLA(kategori, '', urgensi); } catch(e) {}

      sheet.appendRow([
        now(),                         // timestamp
        tiketId,                       // tiket_id
        cleanPhone,                    // no_wa
        payload.nama_customer,         // nama_customer
        payload.lokasi,                // lokasi
        payload.deskripsi,             // deskripsi
        '',                            // foto_kerusakan
        kategori,                      // kategori
        '',                            // sub_kategori
        urgensi,                       // urgensi
        targetSLA,                     // target_sla_jam
        CONFIG.STATUS.OPEN,            // status
        '',                            // teknisi
        '',                            // foto_perbaikan
        '',                            // catatan
        '',                            // waktu_selesai
        '',                            // durasi_jam
        '',                            // status_sla
        ''                             // rating_survei
      ]);

      // Format nomor WA sebagai teks
      try {
        sheet.getRange(sheet.getLastRow(), 3).setNumberFormat('@');
      } catch (fmtErr) {}

      // Kirim WA notifikasi ke customer
      if (cleanPhone) {
        try {
          sendNewTicketNotification(cleanPhone, tiketId, payload.nama_customer, kategori, urgensi, payload.lokasi, payload.deskripsi);
        } catch (waErr) {
          Logger.log('WA Public Complaint Notification Error: ' + waErr.message);
        }
      }

      // Kirim WA notifikasi ke admin & staff maintenance
      try {
        var allUsers = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
        allUsers.forEach(function(admin) {
          if (admin.status !== 'Aktif') return;
          var isAdminOrSupervisor = (admin.role === CONFIG.ROLES.ADMIN || admin.role === CONFIG.ROLES.SUPERVISOR);
          var timLower = (admin.tim || '').toLowerCase();
          var isTimMaintenance = timLower === 'maintenance' || timLower === 'mnt';
          if (!isAdminOrSupervisor && !isTimMaintenance) return;
          var adminPhone = normalizePhone(admin.no_wa);
          if (!adminPhone) return;
          try {
            sendAutoTicketAdminNotification(adminPhone, admin.nama, payload.nama_customer, tiketId, kategori, payload.lokasi, payload.deskripsi, '');
          } catch (waErr) {}
        });
      } catch (adminErr) {
        Logger.log('WA Admin Notification Lookup Error: ' + adminErr.message);
      }

      // Hapus cache agar data langsung ter-refresh
      try { CacheService.getScriptCache().remove('csd_Main_Data'); } catch(e) {}

      Logger.log('PUBLIC COMPLAINT: Created ' + tiketId + ' for ' + payload.nama_customer + ' (' + cleanPhone + ')');
      return successResponse({ tiket_id: tiketId }, '✅ Laporan berhasil dikirim! ID Tiket: ' + tiketId + '. Tim kami akan segera menindaklanjuti.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Export data tabel ke format CSV
 * @param {string} tableId - Nama sheet yang akan diexport
 * @param {Object} filters - Filter tambahan (optional)
 */
function exportDataToCSV(tableId, filters) {
  try {
    var user = getActiveUserSession();
    var sheetMap = {
      'maintenance': CONFIG.SHEETS.MAIN_DATA,
      'patrol': CONFIG.SHEETS.PATROL_LOG,
      'inspection': CONFIG.SHEETS.ASSET_INSPECTION,
      'booking': CONFIG.SHEETS.ASSET_BOOKING,
      'checklist': CONFIG.SHEETS.CS_DAILY_CHECKLIST,
      'audit': CONFIG.SHEETS.AUDIT_HOUSEKEEPING,
      'transaksi_kos': CONFIG.SHEETS.TRANSAKSI_KOS,
      'kamar': CONFIG.SHEETS.MASTER_KAMAR
    };

    var sheetName = sheetMap[tableId];
    if (!sheetName) throw new Error('Tabel tidak dikenali: ' + tableId);

    var data = getSheetData(sheetName);

    // Apply date filter if provided
    if (filters) {
      if (filters.tgl_mulai) {
        var tglMulai = new Date(filters.tgl_mulai);
        data = data.filter(function(d) { return d.timestamp && new Date(d.timestamp) >= tglMulai; });
      }
      if (filters.tgl_selesai) {
        var tglSelesai = new Date(filters.tgl_selesai);
        tglSelesai.setDate(tglSelesai.getDate() + 1);
        data = data.filter(function(d) { return d.timestamp && new Date(d.timestamp) <= tglSelesai; });
      }
    }

    // Ambil header dari sheet
    var sheet = getSheet(sheetName);
    var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var headers = headerRow.filter(function(h) { return h && h.toString().trim(); });

    // Build CSV
    var csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(function(row) {
      var vals = [];
      headers.forEach(function(h) {
        var val = String(row[h] || '');
        // Escape quotes and wrap in quotes if contains comma or quote
        if (val.indexOf(',') >= 0 || val.indexOf('"') >= 0 || val.indexOf('\n') >= 0) {
          val = '"' + val.replace(/"/g, '""') + '"';
        }
        vals.push(val);
      });
      csvRows.push(vals.join(','));
    });

    var newline = String.fromCharCode(10);
    var csvContent = csvRows.join(newline);
    return successResponse({ csv: csvContent, filename: tableId + '_' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd') + '.csv' });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── RATING SURVEY DASHBOARD ────────────────────────────────

/**
 * Mendapatkan statistik lengkap rating survei kepuasan
 * Menyajikan data untuk dashboard rating: agregasi per kategori, per teknisi, tren waktu
 */
function getRatingSurveyStats() {
  try {
    var user = getActiveUserSession();
    var complaints = getCachedSheetData(CONFIG.SHEETS.MAIN_DATA, 30);

    // Filter tiket yang punya rating
    var rated = complaints.filter(function(c) {
      return c.rating_survei && String(c.rating_survei).trim() !== '' && Number(c.rating_survei) > 0;
    });

    var totalRated = rated.length;
    var totalCompleted = complaints.filter(function(c) { return c.status === CONFIG.STATUS.SELESAI; }).length;
    var responseRate = totalCompleted > 0 ? Math.round((totalRated / totalCompleted) * 100) : 0;

    // Hitung rata-rata rating overall
    var sumRating = 0;
    rated.forEach(function(c) { sumRating += Number(c.rating_survei); });
    var avgRating = totalRated > 0 ? Math.round((sumRating / totalRated) * 100) / 100 : 0;

    // Distribusi rating (1-5)
    var distribution = [0, 0, 0, 0, 0];
    rated.forEach(function(c) {
      var r = Number(c.rating_survei);
      if (r >= 1 && r <= 5) distribution[r - 1]++;
    });

    // Rating per kategori
    var byCategory = {};
    rated.forEach(function(c) {
      var cat = c.kategori || 'Lainnya';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += Number(c.rating_survei);
      byCategory[cat].count++;
    });

    var categoryStats = Object.keys(byCategory).map(function(key) {
      return {
        kategori: key,
        avg: Math.round((byCategory[key].total / byCategory[key].count) * 100) / 100,
        count: byCategory[key].count
      };
    }).sort(function(a, b) { return b.avg - a.avg; });

    // Rating per teknisi
    var byTeknisi = {};
    rated.forEach(function(c) {
      var tek = c.teknisi || 'Belum di-assign';
      if (!byTeknisi[tek]) byTeknisi[tek] = { total: 0, count: 0 };
      byTeknisi[tek].total += Number(c.rating_survei);
      byTeknisi[tek].count++;
    });

    var teknisiStats = Object.keys(byTeknisi).map(function(key) {
      return {
        teknisi: key,
        avg: Math.round((byTeknisi[key].total / byTeknisi[key].count) * 100) / 100,
        count: byTeknisi[key].count
      };
    }).sort(function(a, b) { return b.avg - a.avg; });

    // Tren rating per bulan
    var byMonth = {};
    rated.forEach(function(c) {
      if (!c.timestamp) return;
      var monthKey = Utilities.formatDate(new Date(c.timestamp), CONFIG.TIMEZONE, 'yyyy-MM');
      if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, count: 0 };
      byMonth[monthKey].total += Number(c.rating_survei);
      byMonth[monthKey].count++;
    });

    var monthlyTrend = Object.keys(byMonth).sort().map(function(key) {
      return {
        bulan: key,
        avg: Math.round((byMonth[key].total / byMonth[key].count) * 100) / 100,
        count: byMonth[key].count
      };
    });

    // Detail semua rating untuk tabel
    var ratingDetails = rated.map(function(c) {
      return {
        tiket_id: c.tiket_id,
        timestamp: formatDateOnly(c.timestamp),
        nama_customer: c.nama_customer || '-',
        kategori: c.kategori || '-',
        teknisi: c.teknisi || '-',
        rating: Number(c.rating_survei)
      };
    }).sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return successResponse({
      overview: {
        total_rated: totalRated,
        total_completed: totalCompleted,
        avg_rating: avgRating,
        response_rate: responseRate,
        five_star: distribution[4],
        four_star: distribution[3],
        three_star: distribution[2],
        two_star: distribution[1],
        one_star: distribution[0]
      },
      distribution: {
        labels: ['⭐1 Buruk', '⭐2 Kurang', '⭐3 Cukup', '⭐4 Baik', '⭐5 Sgt Baik'],
        values: distribution
      },
      by_category: categoryStats,
      by_teknisi: teknisiStats,
      monthly_trend: monthlyTrend,
      details: ratingDetails
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
