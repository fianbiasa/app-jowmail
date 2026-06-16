# Konfigurasi Webhook Postal untuk JowMail

Dokumen ini menjelaskan cara menghubungkan Postal Mail Server ke JowMail menggunakan webhook, sehingga event seperti email dibuka, link diklik, bounce, dan komplain dapat dilacak secara real-time.

---

## Prasyarat

- Postal Mail Server sudah terinstal dan berjalan
- JowMail sudah dapat diakses publik (misal: `https://app.jowmail.com`)
- Anda memiliki akses ke panel admin Postal

---

## Langkah Konfigurasi

### 1. Masuk ke Postal Admin

Buka browser dan akses panel admin Postal Anda, misalnya:
```
https://mail.jowmail.com
```

### 2. Pilih Server

Di halaman utama Postal, klik server yang digunakan untuk mengirim email campaign (biasanya bernama sama dengan domain Anda).

### 3. Buka Menu Webhook

Di sidebar kiri, klik **Settings** → **Webhooks** (atau langsung klik **Webhooks** jika tersedia di menu utama server).

### 4. Tambah Webhook Baru

Klik tombol **Add Webhook** atau **New Webhook**.

### 5. Isi Detail Webhook

| Field | Nilai |
|-------|-------|
| **URL** | `https://app.jowmail.com/api/webhooks/postal` |
| **All Events** | Aktifkan (toggle ON) |

Atau jika ingin memilih event secara manual, aktifkan event berikut:

| Event | Keterangan |
|-------|-----------|
| `MessageSent` | Email berhasil dikirim dari Postal |
| `MessageDelivered` | Email berhasil diterima server tujuan |
| `MessageLoaded` | Email dibuka oleh penerima |
| `LinkClicked` | Penerima mengklik link dalam email |
| `MessageBounced` | Email gagal terkirim (hard/soft bounce) |
| `MessageComplained` | Penerima melaporkan email sebagai spam |

### 6. Simpan Webhook

Klik **Save** atau **Create Webhook**.

### 7. Verifikasi

Setelah disimpan, Postal akan menampilkan webhook dalam daftar. Anda bisa klik **Test** atau **Send Test** untuk memastikan JowMail menerima event.

Di JowMail, cek di **Settings** → periksa log atau kirim campaign test untuk memastikan status update berjalan (misal: status berubah dari `queued` → `sent` → `delivered` → `opened`).

---

## Format Payload Webhook

JowMail menerima payload JSON dari Postal dengan format:

```json
{
  "event": "MessageDelivered",
  "timestamp": 1718500000,
  "payload": {
    "message": {
      "id": 12345,
      "token": "abc123xyz",
      "direction": "outgoing",
      "message_id": "<unique@mail.jowmail.com>",
      "to": "subscriber@example.com",
      "from": "sender@jowmail.com",
      "subject": "Newsletter Juni 2026",
      "timestamp": 1718500000
    }
  }
}
```

Untuk event `LinkClicked`, payload juga berisi:
```json
{
  "event": "LinkClicked",
  "payload": {
    "message": { "token": "abc123xyz", ... },
    "url": "https://example.com/produk",
    "ip_address": "1.2.3.4",
    "user_agent": "Mozilla/5.0 ..."
  }
}
```

Untuk event `MessageBounced`:
```json
{
  "event": "MessageBounced",
  "payload": {
    "message": { "token": "abc123xyz", ... },
    "details": "550 5.1.1 User unknown"
  }
}
```

---

## Cara Kerja di JowMail

1. Setiap email yang dikirim disimpan di database dengan `postalToken` di field `metadata`
2. Ketika Postal mengirim webhook, JowMail mencocokkan token dari payload dengan log campaign
3. Status subscriber dan log campaign diperbarui sesuai event:
   - `MessageSent` → status `sent`
   - `MessageDelivered` → status `delivered`
   - `MessageLoaded` → status `opened`
   - `LinkClicked` → status `clicked`, URL disimpan untuk analitik
   - `MessageBounced` → status `bounced`, subscriber ditandai bounced
   - `MessageComplained` → status `complained`, subscriber ditandai complained

---

## Troubleshooting

### Webhook tidak diterima
- Pastikan URL `https://app.jowmail.com/api/webhooks/postal` dapat diakses dari internet
- Cek apakah Nginx/firewall memblokir request dari IP Postal
- Cek log Postal untuk melihat apakah pengiriman webhook gagal

### Status campaign tidak berubah
- Pastikan `postalToken` tersimpan di metadata CampaignLog (diisi otomatis saat email dikirim)
- Cek tabel `WebhookEvent` di database untuk melihat apakah event diterima

### Cek database
```sql
-- Lihat webhook event terbaru
SELECT * FROM "WebhookEvent" ORDER BY "createdAt" DESC LIMIT 10;

-- Lihat log campaign terbaru
SELECT * FROM "CampaignLog" ORDER BY "updatedAt" DESC LIMIT 10;
```

---

## Catatan Keamanan

Endpoint webhook JowMail (`/api/webhooks/postal`) menerima request dari Postal tanpa autentikasi tambahan karena Postal tidak mendukung signing webhook secara default. Pastikan:

1. Firewall server hanya mengizinkan traffic dari IP server Postal ke endpoint ini
2. Atau tambahkan IP whitelist di konfigurasi Nginx:

```nginx
location /api/webhooks/postal {
    # Izinkan hanya dari IP server Postal
    allow 203.0.113.0/24;  # Ganti dengan IP server Postal Anda
    deny all;
    
    proxy_pass http://127.0.0.1:3000;
    # ... header lainnya
}
```
