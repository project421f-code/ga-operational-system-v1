/**
 * ============================================================
 * _setup_wa_token.gs — ONE-TIME SCRIPT
 * ============================================================
 * 
 * JALANKAN SATU KALI SAJA untuk menyimpan token WhatsApp
 * Hapus file ini setelah token tersimpan.
 * 
 * Cara jalanin: buka GAS Editor → pilih fungsi → klik Run
 */

function setupWAToken() {
  var token = 'RHtMeUdAnQqHSpdiv64e8n6BRc7Xomoa';
  var props = PropertiesService.getScriptProperties();
  props.setProperty('WA_API_TOKEN', token);
  
  Logger.log('✅ WA_API_TOKEN berhasil disimpan!');
  Logger.log('Token: ' + token.substring(0, 6) + '...' + token.slice(-4));
  
  // Verifikasi
  var saved = props.getProperty('WA_API_TOKEN');
  if (saved === token) {
    Logger.log('✅ Verifikasi berhasil! Token tersimpan dengan benar.');
  } else {
    Logger.log('❌ Verifikasi gagal! Token tidak cocok.');
  }
}
