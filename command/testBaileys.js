// command/testBaileys.js
// import makeWASocket, {
//   useMultiFileAuthState,
//   DisconnectReason,
// } from 'baileys'              // ⬅️ kalau di kamu masih @whiskeysockets/baileys, ganti string ini
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'

import qrcode from 'qrcode-terminal'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SESSION_DIR = path.join(__dirname, '..', 'auth-v7-test')

async function start() {
  console.log('=== start Baileys v7 test ===')

  // simpan auth ke folder auth-v7-test (multi-file, cuma untuk demo)
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  const sock = makeWASocket({
    auth: state,
    // v7: JANGAN pakai printQRInTerminal, sudah deprecated
    // opsi lain (optional): browser, markOnlineOnConnect, dsb
  })

  // simpan perubahan creds
  sock.ev.on('creds.update', async (creds) => {
    await saveCreds()
  })

  // event utama untuk koneksi + QR
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📲 QR baru, silakan scan pakai WhatsApp:')
      // tulis QR ke terminal pakai qrcode-terminal
      qrcode.generate(qr, { small: true })
    }

    console.log('update:', connection, lastDisconnect?.error?.output)

    if (connection === 'open') {
      console.log('✅ Connected (Baileys v7 test)')
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log('❌ Connection closed with code', code)

      // handle reconnect logic
      if (code === DisconnectReason.restartRequired) {
        console.log('🔁 Restart required, start() lagi...')
        start().catch(console.error)
      } else if (code !== DisconnectReason.loggedOut) {
        console.log('🔁 Bukan loggedOut, coba reconnect...')
        start().catch(console.error)
      } else {
        console.log('🚪 Logged out. Hapus folder auth-v7-test kalau mau mulai dari nol.')
      }
    }
  })
}

start().catch((err) => {
  console.error('🔥 Fatal error in testBaileys v7:', err)
})
