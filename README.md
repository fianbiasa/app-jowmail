# JowMail — Email Marketing Platform

Platform email marketing self-hosted berbasis [Next.js](https://nextjs.org) yang ditenagai oleh [Postal Mail Server](https://postalserver.io) sebagai mesin pengiriman.

## Fitur Utama

- **Campaign Builder** — Buat campaign dengan WYSIWYG editor (TipTap), pilih template layout, subscriber list, dan jadwal pengiriman
- **Template Editor** — Buat HTML layout dengan placeholder `{{content}}`, preview langsung di browser
- **Subscriber Management** — CRUD subscriber, import via file CSV (drag & drop), form subscribe publik per list
- **Queue Sending** — Pengiriman massal via BullMQ + Redis, per-subscriber job dengan retry otomatis
- **Tracking** — Open rate & click rate via Postal webhook (`MessageLoaded`, `MessageLinkClicked`, `MessageBounced`, dst.)
- **Analytics Dashboard** — Grafik aktivitas 30 hari, top clicked links, statistik per campaign
- **Unsubscribe** — Link unsubscribe otomatis di setiap email, halaman publik untuk opt-out
- **Multi-tenant** — Organisasi dengan role (Owner/Admin/Member), invite via email
- **Quota & Plan** — Batas subscriber dan email per bulan per organisasi

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui (Base UI) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v4 (Credentials) |
| Queue | BullMQ + Redis |
| Mail Engine | Postal Mail Server API |
| Editor | TipTap v3 |
| Charts | Recharts |

## Struktur Proyek

```
app/
├── (dashboard)/          # Halaman terautentikasi
│   ├── dashboard/        # Overview & analytics
│   ├── campaigns/        # CRUD campaign + kirim
│   ├── lists/            # Subscriber lists + import CSV
│   ├── subscribers/      # Global subscriber view
│   ├── templates/        # HTML template editor
│   └── settings/         # Konfigurasi Postal & organisasi
├── api/                  # API routes
│   ├── campaigns/        # CRUD + send + test + analytics
│   ├── subscribers/      # CRUD + import
│   ├── templates/        # CRUD
│   ├── subscribe/        # Public subscribe endpoint
│   └── webhooks/postal/  # Postal event handler
├── subscribe/[listId]/   # Form subscribe publik
└── unsubscribe/[token]/  # Halaman opt-out publik
lib/
├── postal/               # Postal API client
├── queue.ts              # BullMQ setup
├── rate-limit.ts         # Redis rate limiter
└── crypto.ts             # AES-256 enkripsi API key
scripts/
└── worker.ts             # BullMQ worker process
```

## Instalasi

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Postal Mail Server (self-hosted)

### Setup

```bash
# Clone repo
git clone https://github.com/fianbiasa/app-jowmail.git
cd app-jowmail

# Install dependencies
npm install

# Copy dan isi environment variables
cp .env.example .env
# Edit .env sesuai konfigurasi

# Migrasi database
npx prisma migrate deploy
npx prisma generate

# Build
npm run build
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/jowmail"
NEXTAUTH_URL="https://app.jowmail.com"
NEXTAUTH_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
POSTAL_BASE_URL="https://mail.jowmail.com"
NEXT_PUBLIC_APP_URL="https://app.jowmail.com"
ENCRYPTION_KEY="your-32-char-hex-key"
UNSUBSCRIBE_SECRET="your-hmac-secret"
```

### Menjalankan

```bash
# Development
npm run dev

# Production (dengan PM2)
pm2 start ecosystem.config.js
```

Worker BullMQ harus berjalan terpisah:

```bash
npx tsx scripts/worker.ts
# atau via PM2 (sudah termasuk di ecosystem.config.js)
```

## Postal Webhook

Konfigurasikan webhook di Postal menuju:

```
https://app.jowmail.com/api/webhooks/postal
```

Event yang diproses: `MessageSent`, `MessageDelivered`, `MessageLoaded`, `MessageLinkClicked`, `MessageBounced`, `MessageComplained`.

Lihat [WEBHOOK.md](./WEBHOOK.md) untuk panduan lengkap.

## Merge Tags

Gunakan shortcode berikut di subject dan konten email:

| Tag | Nilai |
|-----|-------|
| `{{full_name}}` | Nama depan + belakang |
| `{{first_name}}` | Nama depan |
| `{{last_name}}` | Nama belakang |
| `{{email}}` | Alamat email subscriber |
| `{{unsubscribe_url}}` | Link unsubscribe |

## License

MIT
