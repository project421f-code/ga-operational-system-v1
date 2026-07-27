/**
 * ============================================================
 * API_Kos.gs — Modul Manajemen Kos (Boarding House)
 * (Master Kos, Master Kamar, Transaksi, Persiapan, Monitoring)
 * GA Operations Management System v1.0
 * ============================================================
 */

// ─── HOUSEKEEPING STAFF ─────────────────────────────────────

/**
 * Mendapatkan daftar staff Housekeeping & General Services dari User_List
 */
function getHousekeepingStaff() {
  try {
    var userData = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
    var staff = userData
      .filter(function(d) {
        return (d.tim === 'Housekeeping' || d.tim === 'General Services') && d.status === 'Aktif';
      })
      .map(function(d) {
        return { nama: d.nama, tim: d.tim, no_wa: d.no_wa || '' };
      });
    return successResponse(staff);
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MASTER KOS ──────────────────────────────────────────────

/**
 * Mendapatkan semua data Master Kos
 */
function getAllKos() {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    return successResponse(data);
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Simpan data Master Kos (Create/Update)
 */
function saveKos(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!payload.nama_kos) throw new Error('Nama kos wajib diisi.');

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MASTER_KOS);

      if (payload.id_kos) {
        // UPDATE
        var found = findRow(CONFIG.SHEETS.MASTER_KOS, 'id_kos', payload.id_kos);
        if (!found) throw new Error('Data kos tidak ditemukan.');
        updateRowCells(CONFIG.SHEETS.MASTER_KOS, found.rowIndex, {
          nama_kos: payload.nama_kos,
          alamat: payload.alamat || '',
          kontak: payload.kontak || '',
          jumlah_kamar: payload.jumlah_kamar || '0',
          status: payload.status || 'Aktif'
        });
        return successResponse(null, 'Data kos berhasil diperbarui.');
      } else {
        // CREATE
        var id = generateId('KOS');
        sheet.appendRow([id, payload.nama_kos, payload.alamat || '', payload.kontak || '', payload.jumlah_kamar || '0', 'Aktif']);
        return successResponse({ id_kos: id }, 'Kos "' + payload.nama_kos + '" berhasil ditambahkan.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus data Master Kos
 */
function deleteKos(idKos) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MASTER_KOS, 'id_kos', idKos);
      if (!found) throw new Error('Data kos tidak ditemukan.');
      var sheet = getSheet(CONFIG.SHEETS.MASTER_KOS);
      sheet.deleteRow(found.rowIndex);
      
      // Hapus juga kamar yang terkait
      try {
        var kamarData = getSheetData(CONFIG.SHEETS.MASTER_KAMAR);
        var kamarSheet = getSheet(CONFIG.SHEETS.MASTER_KAMAR);
        var kamarToDelete = kamarData.filter(function(d) { return d.id_kos === idKos; });
        kamarToDelete.sort(function(a, b) { return b._rowIndex - a._rowIndex; });
        kamarToDelete.forEach(function(k) { kamarSheet.deleteRow(k._rowIndex); });
      } catch(e) {
        Logger.log('Warning: Gagal hapus kamar terkait: ' + e.message);
      }
      
      return successResponse(null, 'Kos berhasil dihapus (' + (kamarToDelete ? kamarToDelete.length : 0) + ' kamar turut dihapus).');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MASTER KAMAR ────────────────────────────────────────────

/**
 * Mendapatkan semua data Master Kamar
 * @param {string} filterKos - Filter by id_kos (optional)
 */
function getAllKamar(filterKos, limit, offset) {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    
    if (filterKos) {
      data = data.filter(function(d) { return d.id_kos === filterKos; });
    }
    
    // Gabung dengan nama kos
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    var kosMap = {};
    kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
    
    data = data.map(function(d) {
      return {
        id_kamar: d.id_kamar,
        id_kos: d.id_kos,
        nama_kos: kosMap[d.id_kos] || '-',
        nomor_kamar: d.nomor_kamar,
        lantai: d.lantai,
        tipe_kamar: d.tipe_kamar,
        harga_sewa: d.harga_sewa,
        fasilitas: d.fasilitas,
        status_kamar: d.status_kamar
      };
    });
    
    // Default pagination: limit 50, offset 0
    var reqLimit = limit && !isNaN(limit) ? parseInt(limit) : 50;
    var reqOffset = offset && !isNaN(offset) ? parseInt(offset) : 0;
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
 * Simpan data Master Kamar (Create/Update)
 */
function saveKamar(payload) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    if (!payload.id_kos || !payload.nomor_kamar) throw new Error('Kos dan nomor kamar wajib diisi.');

    return withLock(function() {
      var sheet = getSheet(CONFIG.SHEETS.MASTER_KAMAR);

      if (payload.id_kamar) {
        // UPDATE
        var found = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', payload.id_kamar);
        if (!found) throw new Error('Data kamar tidak ditemukan.');
        updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, found.rowIndex, {
          id_kos: payload.id_kos,
          nomor_kamar: payload.nomor_kamar,
          lantai: payload.lantai || '',
          tipe_kamar: payload.tipe_kamar || 'Standard',
          harga_sewa: payload.harga_sewa || '0',
          fasilitas: payload.fasilitas || '',
          status_kamar: payload.status_kamar || 'Available'
        });
        return successResponse(null, 'Data kamar berhasil diperbarui.');
      } else {
        // CREATE
        var id = generateId('KMR');
        sheet.appendRow([id, payload.id_kos, payload.nomor_kamar, payload.lantai || '', payload.tipe_kamar || 'Standard', payload.harga_sewa || '0', payload.fasilitas || '', 'Available']);
        return successResponse({ id_kamar: id }, 'Kamar "' + payload.nomor_kamar + '" berhasil ditambahkan.');
      }
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus data Master Kamar
 */
function deleteKamar(idKamar) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', idKamar);
      if (!found) throw new Error('Data kamar tidak ditemukan.');
      var sheet = getSheet(CONFIG.SHEETS.MASTER_KAMAR);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Kamar berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── UPDATE STATUS KAMAR (Aksi Cepat) ──────────────────────

/**
 * Update status kamar secara langsung (aksi cepat dari card Monitoring Kos)
 * @param {string} idKamar - ID kamar
 * @param {string} newStatus - Status baru (Available / Preparation / Occupied / Maintenance)
 */
function updateRoomStatus(idKamar, newStatus) {
  try {
    var user = getActiveUserSession();

    if (!idKamar || !newStatus) throw new Error('ID kamar dan status baru wajib diisi.');
    var allowedStatus = ['Available', 'Preparation', 'Occupied', 'Maintenance'];
    if (allowedStatus.indexOf(newStatus) === -1) throw new Error('Status tidak valid.');

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', idKamar);
      if (!found) throw new Error('Kamar tidak ditemukan.');

      var oldStatus = found.data.status_kamar;

      // Validasi transisi status
      if (oldStatus === newStatus) throw new Error('Status kamar sudah "' + newStatus + '".');

      // Transisi yang diizinkan (dari → ke):
      // Available → Maintenance (kerusakan)
      // Maintenance → Available (selesai perbaikan)
      // Preparation → Available (selesai bersih)
      if (oldStatus === 'Occupied' && newStatus !== 'Preparation' && newStatus !== 'Available') {
        throw new Error('Kamar Occupied hanya bisa diubah ke Preparation (check-out) atau Available (jika check-out paksa).');
      }
      if (oldStatus === 'Preparation' && newStatus !== 'Available' && newStatus !== 'Maintenance') {
        throw new Error('Kamar Preparation hanya bisa diubah ke Available atau Maintenance.');
      }

      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, found.rowIndex, { status_kamar: newStatus });
      Logger.log('Room ' + idKamar + ': ' + oldStatus + ' → ' + newStatus + ' by ' + user.nama);

      return successResponse({
        id_kamar: idKamar,
        old_status: oldStatus,
        new_status: newStatus,
        nomor_kamar: found.data.nomor_kamar
      }, '✅ Status kamar ' + found.data.nomor_kamar + ' berhasil diubah: ' + oldStatus + ' → ' + newStatus);
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── TRANSAKSI KOS (Check-in / Check-out) ───────────────────

/**
 * Mendapatkan semua transaksi kos
 * @param {string} filterStatus - Filter by status (optional)
 */
function getAllTransaksiKos(filterStatus, limit, offset) {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.TRANSAKSI_KOS, 30);
    
    if (filterStatus && filterStatus !== 'Semua') {
      data = data.filter(function(d) { return d.status === filterStatus; });
    }
    
    // Gabung dengan nama kamar & kos
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    var kamarMap = {}, kosMap = {};
    kamarData.forEach(function(k) { kamarMap[k.id_kamar] = k; });
    kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
    
    data = data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    
    data = data.map(function(d) {
      var kmr = kamarMap[d.id_kamar] || {};
      return {
        id_transaksi: d.id_transaksi,
        id_kamar: d.id_kamar,
        id_kos: d.id_kos,
        nomor_kamar: kmr.nomor_kamar || '-',
        nama_kos: kosMap[d.id_kos] || '-',
        nama_tamu: d.nama_tamu,
        no_wa_tamu: d.no_wa_tamu,
        check_in: d.check_in ? formatDateId(d.check_in) : '-',
        rencana_check_out: d.rencana_check_out ? formatDateId(d.rencana_check_out) : '-',
        check_out_aktual: d.check_out_aktual ? formatDateId(d.check_out_aktual) : '-',
        total_bayar: d.total_bayar || '0',
        status: d.status,
        catatan: d.catatan || '',
        timestamp: d.timestamp ? formatDateId(d.timestamp) : '-'
      };
    });
    
    // Default pagination: limit 50, offset 0
    var reqLimit = limit && !isNaN(limit) ? parseInt(limit) : 50;
    var reqOffset = offset && !isNaN(offset) ? parseInt(offset) : 0;
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
 * Check-in tamu ke kamar kos
 */
function checkInKos(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.id_kamar || !payload.nama_tamu || !payload.check_in) {
      throw new Error('Kamar, nama tamu, dan tanggal check-in wajib diisi.');
    }

    return withLock(function() {
      // Validasi kamar tersedia
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', payload.id_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');
      if (kamarFound.data.status_kamar !== 'Available') {
        throw new Error('Kamar sedang tidak tersedia. Status saat ini: ' + kamarFound.data.status_kamar);
      }

      var sheet = getSheet(CONFIG.SHEETS.TRANSAKSI_KOS);
      var id = generateId('TRX');
      
      sheet.appendRow([
        id,
        payload.id_kamar,
        kamarFound.data.id_kos,
        payload.nama_tamu,
        payload.no_wa_tamu || '',
        payload.check_in,
        payload.rencana_check_out || '',
        '',               // check_out_aktual
        payload.total_bayar || '0',
        'Active',         // status
        payload.catatan || '',
        now()             // timestamp
      ]);

      // Update status kamar → Occupied
      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Occupied' });

      return successResponse({ id_transaksi: id }, '✅ Check-in berhasil! ' + payload.nama_tamu + ' — Kamar ' + kamarFound.data.nomor_kamar);
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Cari customer dari riwayat check-in sebelumnya (untuk fitur impor data customer)
 * Mencocokkan nama atau nomor WA dari transaksi yang sudah Completed/Cancelled
 */
function searchPreviousCustomer(query) {
  try {
    var user = getActiveUserSession();
    if (!query || query.length < 2) return successResponse([]);

    var data = getSheetData(CONFIG.SHEETS.TRANSAKSI_KOS);
    var q = query.toLowerCase().trim();
    var seen = {};
    var results = [];

    // Sort by timestamp descending (riwayat terbaru dulu)
    data.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    data.forEach(function(d) {
      var nama = (d.nama_tamu || '').toLowerCase();
      var wa = (d.no_wa_tamu || '').toLowerCase();
      var key = d.nama_tamu + '|' + d.no_wa_tamu;

      // Hanya dari transaksi Completed/Cancelled, dan unik per nama+wa
      if (d.status !== 'Completed' && d.status !== 'Cancelled') return;
      if (seen[key]) return;

      if (nama.indexOf(q) >= 0 || wa.indexOf(q) >= 0) {
        seen[key] = true;
        results.push({
          nama_tamu: d.nama_tamu,
          no_wa_tamu: d.no_wa_tamu || ''
        });
      }
    });

    // Batasi maksimal 10 hasil
    return successResponse(results.slice(0, 10));
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Check-out tamu dari kamar kos
 */
function checkOutKos(idTransaksi, checkOutDate, catatan) {
  try {
    var user = getActiveUserSession();

    if (!idTransaksi) throw new Error('ID transaksi wajib diisi.');

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.TRANSAKSI_KOS, 'id_transaksi', idTransaksi);
      if (!found) throw new Error('Transaksi tidak ditemukan.');
      if (found.data.status !== 'Active') throw new Error('Transaksi sudah tidak aktif.');

      var tglCheckout = checkOutDate || nowFormatted();
      
      updateRowCells(CONFIG.SHEETS.TRANSAKSI_KOS, found.rowIndex, {
        check_out_aktual: tglCheckout,
        status: 'Completed',
        catatan: catatan || found.data.catatan || ''
      });

      // Update status kamar → Preparation (perlu dibersihkan)
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', found.data.id_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');
      
      updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Preparation' });
      
      // ─── AUTO-CREATE PERSIAPAN KAMAR ───────────────────
      var prepSheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      var prepId = generateId('PREP');
      
      prepSheet.appendRow([
        prepId,
        found.data.id_kamar,
        kamarFound.data.id_kos,
        'After Check-out',
        '',  // assigned_to — dikosongkan, nanti staff ambil sendiri
        'Pending',
        'Auto dari check-out tamu ' + (found.data.nama_tamu || '') + '. ' + (catatan || ''),
        now(),
        ''
      ]);
      Logger.log('✅ Auto-created preparation task: ' + prepId);
      
      // ─── NOTIFIKASI WA KE STAFF HOUSEKEEPING ──────────
      try {
        var staffList = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
        var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
        var kosMap = {};
        kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
        
        var namaKos = kosMap[kamarFound.data.id_kos] || '-';
        
        staffList.forEach(function(s) {
          // Kirim ke semua staff Housekeeping yang aktif dan punya no_wa (tidak ke General Services)
          if (s.tim === 'Housekeeping' && s.status === 'Aktif' && s.no_wa) {
            sendRoomCleaningNotification(
              s.no_wa,
              s.nama,
              kamarFound.data.nomor_kamar,
              namaKos,
              found.data.nama_tamu,
              catatan || ''
            );
            Logger.log('📱 WA cleaning notification sent to ' + s.nama + ' (' + s.no_wa + ')');
          }
        });
      } catch (waErr) {
        Logger.log('⚠️ WA notification error: ' + waErr.message);
      }

      return successResponse({
        id_persiapan: prepId
      }, '✅ Check-out berhasil! Tugas pembersihan otomatis dibuat. Notif WA terkirim ke staff housekeeping.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Batalkan transaksi
 */
function cancelTransaksiKos(idTransaksi) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN, CONFIG.ROLES.SUPERVISOR]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.TRANSAKSI_KOS, 'id_transaksi', idTransaksi);
      if (!found) throw new Error('Transaksi tidak ditemukan.');

      updateRowCells(CONFIG.SHEETS.TRANSAKSI_KOS, found.rowIndex, { status: 'Cancelled' });

      // Kembalikan status kamar ke Available
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', found.data.id_kamar);
      if (kamarFound && kamarFound.data.status_kamar === 'Occupied') {
        updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Available' });
      }

      return successResponse(null, 'Transaksi berhasil dibatalkan.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── PERSIAPAN KAMAR (Housekeeping) ──────────────────────────

/**
 * Mendapatkan data persiapan kamar
 */
function getAllPersiapanKamar(filterStatus, limit, offset) {
  try {
    var user = getActiveUserSession();
    var data = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    
    if (filterStatus && filterStatus !== 'Semua') {
      data = data.filter(function(d) { return d.status === filterStatus; });
    }
    
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 30);
    var kamarMap = {}, kosMap = {};
    kamarData.forEach(function(k) { kamarMap[k.id_kamar] = k; });
    kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
    
    data = data.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
    
    data = data.map(function(d) {
      var kmr = kamarMap[d.id_kamar] || {};
      return {
        id_persiapan: d.id_persiapan,
        id_kamar: d.id_kamar,
        id_kos: d.id_kos,
        nomor_kamar: kmr.nomor_kamar || '-',
        nama_kos: kosMap[d.id_kos] || '-',
        jenis: d.jenis,
        assigned_to: d.assigned_to || '',
        status: d.status,
        catatan: d.catatan || '',
        timestamp: d.timestamp ? formatDateId(d.timestamp) : '-',
        selesai_pada: d.selesai_pada ? formatDateId(d.selesai_pada) : '-'
      };
    });
    
    // Default pagination: limit 50, offset 0
    var reqLimit = limit && !isNaN(limit) ? parseInt(limit) : 50;
    var reqOffset = offset && !isNaN(offset) ? parseInt(offset) : 0;
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
 * Buat tugas persiapan kamar untuk housekeeping
 */
function createPersiapanKamar(payload) {
  try {
    var user = getActiveUserSession();

    if (!payload.id_kamar || !payload.jenis) {
      throw new Error('Kamar dan jenis persiapan wajib diisi.');
    }

    return withLock(function() {
      var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', payload.id_kamar);
      if (!kamarFound) throw new Error('Kamar tidak ditemukan.');

      var sheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      var id = generateId('PREP');
      
      sheet.appendRow([
        id,
        payload.id_kamar,
        kamarFound.data.id_kos,
        payload.jenis,
        payload.assigned_to || '',
        'Pending',
        payload.catatan || '',
        now(),
        ''
      ]);

      // Update status kamar → Preparation (kalau dari Available atau Maintenance)
      if (kamarFound.data.status_kamar === 'Available' || kamarFound.data.status_kamar === 'Maintenance') {
        updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Preparation' });
      }

      return successResponse({ id_persiapan: id }, 'Tugas persiapan kamar berhasil dibuat.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Update status persiapan kamar
 */
function updateStatusPersiapan(idPersiapan, newStatus) {
  try {
    var user = getActiveUserSession();

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.PERSIAPAN_KAMAR, 'id_persiapan', idPersiapan);
      if (!found) throw new Error('Data persiapan tidak ditemukan.');

      var updates = { status: newStatus };
      
      if (newStatus === 'Completed') {
        updates.selesai_pada = now();
      }

      updateRowCells(CONFIG.SHEETS.PERSIAPAN_KAMAR, found.rowIndex, updates);

      // Jika selesai, update status kamar → Available
      if (newStatus === 'Completed') {
        var kamarFound = findRow(CONFIG.SHEETS.MASTER_KAMAR, 'id_kamar', found.data.id_kamar);
        if (kamarFound && kamarFound.data.status_kamar === 'Preparation') {
          updateRowCells(CONFIG.SHEETS.MASTER_KAMAR, kamarFound.rowIndex, { status_kamar: 'Available' });
        }
      } else if (newStatus === 'In Progress') {
        // Assign otomatis ke user yang mengerjakan
        updates.assigned_to = user.nama;
        updateRowCells(CONFIG.SHEETS.PERSIAPAN_KAMAR, found.rowIndex, { assigned_to: user.nama });
      }

      return successResponse(null, 'Status persiapan berhasil diubah ke "' + newStatus + '".');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * Hapus tugas persiapan
 */
function deletePersiapanKamar(idPersiapan) {
  try {
    var user = getActiveUserSession();
    requireRole(user.role, [CONFIG.ROLES.ADMIN]);

    return withLock(function() {
      var found = findRow(CONFIG.SHEETS.PERSIAPAN_KAMAR, 'id_persiapan', idPersiapan);
      if (!found) throw new Error('Data persiapan tidak ditemukan.');
      var sheet = getSheet(CONFIG.SHEETS.PERSIAPAN_KAMAR);
      sheet.deleteRow(found.rowIndex);
      return successResponse(null, 'Tugas persiapan berhasil dihapus.');
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── MONITORING STATUS KAMAR ────────────────────────────────

// ─── CLEANING TRACKER (Monthly) ────────────────────────────

/**
 * Tracker bulanan: jumlah kamar dibersihkan per staff Housekeeping & General Services
 * Data dari Persiapan_Kamar yang statusnya Completed
 *
 * @param {string} bulan - Bulan dalam format 'YYYY-MM' (optional, default: bulan ini)
 */
function getCleaningTracker(bulan) {
  try {
    var periode = bulan || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM');
    
    var prepData = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    
    var kamarMap = {};
    kamarData.forEach(function(k) { kamarMap[k.id_kamar] = k; });
    
    var kosMap = {};
    kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
    
    // Filter hanya yang completed di bulan ini
    var completed = prepData.filter(function(d) {
      if (d.status !== 'Completed' || !d.selesai_pada) return false;
      var tgl = Utilities.formatDate(new Date(d.selesai_pada), CONFIG.TIMEZONE, 'yyyy-MM');
      return tgl === periode;
    });
    
    // Group by staff
    var staffStats = {};
    var totalCleaned = 0;
    
    completed.forEach(function(d) {
      var nama = d.assigned_to || 'Unassigned';
      if (!staffStats[nama]) {
        staffStats[nama] = {
          nama: nama,
          total: 0,
          check_in_prep: 0,
          after_checkout: 0,
          maintenance_clean: 0,
          kamarList: []
        };
      }
      var s = staffStats[nama];
      s.total++;
      totalCleaned++;
      if (d.jenis === 'Check-in Prep') s.check_in_prep++;
      else if (d.jenis === 'After Check-out') s.after_checkout++;
      else if (d.jenis === 'Maintenance Clean') s.maintenance_clean++;
      
      var kmr = kamarMap[d.id_kamar] || {};
      s.kamarList.push({
        nomor_kamar: kmr.nomor_kamar || '-',
        nama_kos: kosMap[d.id_kos] || '-',
        jenis: d.jenis,
        selesai_pada: formatDateId(d.selesai_pada)
      });
    });
    
    // Sort by total descending
    var staffRanking = Object.values(staffStats).sort(function(a, b) { return b.total - a.total; });
    
    return successResponse({
      periode: periode,
      totalCleaned: totalCleaned,
      totalTasks: prepData.filter(function(d) { return d.status === 'Completed'; }).length,
      staffRanking: staffRanking,
      staffCount: staffRanking.length
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

/**
 * OPTIMASI: Mendapatkan SEMUA data monitoring dalam 1 API call
 * Gabung stats + detail kamar per kos — menggantikan N+1 API calls
 */
function getAllMonitoringData() {
  try {
    var user = getActiveUserSession();
    
    var kamarData = getCachedSheetData(CONFIG.SHEETS.MASTER_KAMAR, 30);
    var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
    var transaksiData = getCachedSheetData(CONFIG.SHEETS.TRANSAKSI_KOS, 30);
    var persiapanData = getCachedSheetData(CONFIG.SHEETS.PERSIAPAN_KAMAR, 30);
    
    // Map transaksi aktif per kamar
    var activeTrx = {};
    transaksiData.forEach(function(t) {
      if (t.status === 'Active') {
        activeTrx[t.id_kamar] = t;
      }
    });
    
    // Map nama kos
    var kosMap = {};
    kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
    
    // Stat global
    var total = kamarData.length;
    var available = 0, preparation = 0, occupied = 0, maintenance = 0;
    var activeTransactions = transaksiData.filter(function(d) { return d.status === 'Active'; }).length;
    var pendingPrep = persiapanData.filter(function(d) { return d.status === 'Pending' || d.status === 'In Progress'; }).length;
    
    // Group kamar by kos + build detail
    var kosSections = [];
    var kosGroup = {};
    
    kosData.forEach(function(k) {
      kosGroup[k.id_kos] = {
        id_kos: k.id_kos,
        nama_kos: k.nama_kos,
        total: 0, available: 0, preparation: 0, occupied: 0, maintenance: 0,
        kamarList: []
      };
    });
    
    kamarData.forEach(function(kmr) {
      var group = kosGroup[kmr.id_kos];
      if (!group) return;
      group.total++;
      switch (kmr.status_kamar) {
        case 'Available': group.available++; available++; break;
        case 'Preparation': group.preparation++; preparation++; break;
        case 'Occupied': group.occupied++; occupied++; break;
        case 'Maintenance': group.maintenance++; maintenance++; break;
      }
      
      var trx = activeTrx[kmr.id_kamar];
      group.kamarList.push({
        id_kamar: kmr.id_kamar,
        nomor_kamar: kmr.nomor_kamar,
        lantai: kmr.lantai,
        tipe_kamar: kmr.tipe_kamar,
        harga_sewa: kmr.harga_sewa,
        status_kamar: kmr.status_kamar,
        tamu_aktif: trx ? trx.nama_tamu : '',
        check_in: trx ? formatDateId(trx.check_in) : '',
        rencana_check_out: trx ? formatDateId(trx.rencana_check_out) : ''
      });
    });
    
    kosSections = Object.values(kosGroup);
    
    return successResponse({
      kosSections: kosSections,
      total: total,
      available: available,
      preparation: preparation,
      occupied: occupied,
      maintenance: maintenance,
      activeTransactions: activeTransactions,
      pendingPrep: pendingPrep
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// ─── PENCARIAN GLOBAL ─────────────────────────────────────────

/**
 * Pencarian global — mencari data di semua modul
 * Mencocokkan query dengan tiket, kamar, transaksi kos, dan user
 * 
 * @param {string} query - Kata kunci pencarian (min 2 karakter)
 * @return {Object} Hasil pencarian per kategori
 */
function globalSearch(query) {
  try {
    var user = getActiveUserSession();
    if (!query || query.length < 2) return successResponse({ tiket: [], kamar: [], transaksi: [], user: [] });

    var q = query.toLowerCase().trim();

    // ─── 1. Cari Tiket Komplain ───────────────────────────
    var tiketResults = [];
    try {
      var mainData = getSheetData(CONFIG.SHEETS.MAIN_DATA);
      mainData.forEach(function(d) {
        var tiketId = (d.tiket_id || '').toLowerCase();
        var nama = (d.nama_customer || '').toLowerCase();
        var lokasi = (d.lokasi || '').toLowerCase();
        var deskripsi = (d.deskripsi || '').toLowerCase();
        if (tiketId.indexOf(q) >= 0 || nama.indexOf(q) >= 0 || lokasi.indexOf(q) >= 0 || deskripsi.indexOf(q) >= 0) {
          tiketResults.push({
            type: 'tiket',
            id: d.tiket_id,
            label: d.tiket_id + ' — ' + (d.nama_customer || ''),
            sub: 'Lokasi: ' + (d.lokasi || '-') + ' | Status: ' + (d.status || ''),
            status: d.status,
            page: 'maintenance'
          });
        }
      });
    } catch (e) { Logger.log('Search tiket error: ' + e.message); }

    // ─── 2. Cari Kamar Kos ────────────────────────────────
    var kamarResults = [];
    try {
      var kosData = getCachedSheetData(CONFIG.SHEETS.MASTER_KOS, 1800);
      var kosMap = {};
      kosData.forEach(function(k) { kosMap[k.id_kos] = k.nama_kos; });
      
      var kamarData = getSheetData(CONFIG.SHEETS.MASTER_KAMAR);
      kamarData.forEach(function(d) {
        var nomor = (d.nomor_kamar || '').toLowerCase();
        var tipe = (d.tipe_kamar || '').toLowerCase();
        if (nomor.indexOf(q) >= 0 || tipe.indexOf(q) >= 0) {
          kamarResults.push({
            type: 'kamar',
            id: d.id_kamar,
            label: (kosMap[d.id_kos] || '-') + ' — Kamar ' + d.nomor_kamar,
            sub: 'Tipe: ' + (d.tipe_kamar || '-') + ' | Status: ' + (d.status_kamar || ''),
            status: d.status_kamar,
            page: 'kos'
          });
        }
      });
    } catch (e) { Logger.log('Search kamar error: ' + e.message); }

    // ─── 3. Cari Transaksi Kos ────────────────────────────
    var trxResults = [];
    try {
      var transaksiData = getSheetData(CONFIG.SHEETS.TRANSAKSI_KOS);
      transaksiData.forEach(function(d) {
        var nama = (d.nama_tamu || '').toLowerCase();
        var wa = (d.no_wa_tamu || '').toLowerCase();
        if (nama.indexOf(q) >= 0 || wa.indexOf(q) >= 0) {
          trxResults.push({
            type: 'transaksi',
            id: d.id_transaksi,
            label: d.nama_tamu + ' (' + (d.no_wa_tamu || '-') + ')',
            sub: 'Status: ' + (d.status || '-') + ' | Check-in: ' + (d.check_in || '-'),
            status: d.status,
            page: 'kostrx'
          });
        }
      });
    } catch (e) { Logger.log('Search transaksi error: ' + e.message); }

    // ─── 4. Cari User ─────────────────────────────────────
    var userResults = [];
    try {
      var userData = getCachedSheetData(CONFIG.SHEETS.USER_LIST, 600);
      userData.forEach(function(d) {
        var nama = (d.nama || '').toLowerCase();
        var email = (d.email || '').toLowerCase();
        var tim = (d.tim || '').toLowerCase();
        if (nama.indexOf(q) >= 0 || email.indexOf(q) >= 0 || tim.indexOf(q) >= 0) {
          userResults.push({
            type: 'user',
            id: d.user_id || d.email,
            label: d.nama + ' (' + (d.email || '') + ')',
            sub: 'Role: ' + (d.role || '-') + ' | Tim: ' + (d.tim || '-'),
            status: d.status,
            page: ''
          });
        }
      });
    } catch (e) { Logger.log('Search user error: ' + e.message); }

    var total = tiketResults.length + kamarResults.length + trxResults.length + userResults.length;

    return successResponse({
      total: total,
      tiket: tiketResults.slice(0, 10),
      kamar: kamarResults.slice(0, 10),
      transaksi: trxResults.slice(0, 10),
      user: userResults.slice(0, 10)
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
