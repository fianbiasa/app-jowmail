# Product Requirements Document (PRD)
## JowMail — Email Marketing Platform Powered by Postal

---

## 1. Executive Summary

**Produk:** JowMail  
**Tujuan:** Platform email marketing berbasis web yang memungkinkan pengguna membuat campaign, mengelola subscriber, mengirim email dalam jumlah besar, dan melacak performa — dengan Postal Mail Server sebagai mesin pengiriman (MTA/API).  
**Target Rilis MVP:** 4–6 minggu  
**Lisensi/Bisnis:** SaaS multi-tenant (dengan perencanaan tenant isolation yang jelas).

---

## 2. Problem & Solution

### Problem
1. Email marketing tools existing (Mailchimp, SendGrid Marketing, dsb) mahal untuk skala kecil-menengah.
2. Self-hosted mail server seperti Postal punya API kirim email, tetapi tidak punya UI/CRM campaign siap pakai.
3. Pemilik bisnis/agen digital ingin punya platform sendiri tanpa bergantung penuh pada vendor email marketing.

### Solution
Bangun layer aplikasi (Next.js) di atas Postal yang menangani:
- Manajemen subscriber & segmentasi.
- Campaign builder & template editor.
- Queue pengiriman massal via Postal API.
- Analytics & tracking via Postal webhook.
- Multi-tenant SaaS ( roadmap setelah MVP stabil ).

---

## 3. Product Vision

Menjadi email marketing platform self-hosted/SaaS yang terbuka, murah, dan scalable bagi UKM, agency, dan developer — dengan Postal sebagai engine pengiriman yang reliable.

---

## 4. Target Users

| Segment | Kebutuhan Utama |
|---------|-----------------|
| UKM / E-commerce | Newsletter, promo, transaksional |
| Digital Agency | Kelola banyak brand/klien |
| SaaS Founder | Email onboarding & update produk |
| Developer / Sysadmin | Ingin kontrol penuh atas mail server |

---

## 5. MVP Feature Set

### 5.1 Authentication & User Management
- Register / Login dengan email + password (NextAuth.js atau Supabase Auth).
- Role: Owner, Admin, Member (RBAC dasar).
- Profil organisasi / workspace.

### 5.2 Organization Settings & Postal Integration
- Input Postal API credentials per organisasi:
  - Base URL (misal: `https://mail.jowmail.com`)
  - API Key
  - Default mail server / domain
- Validasi koneksi ke Postal saat simpan.

### 5.3 Subscriber Management
- CRUD subscriber.
- Import CSV / Excel.
- Subscriber Lists (tag-based atau list-based).
- Status: subscribed, unsubscribed, bounced, complained.
- Merge fields: `email`, `first_name`, `last_name`, `tags`, custom fields JSON.

### 5.4 Template Management
- WYSIWYG HTML editor (atau plain HTML editor).
- Preview email.
- Merge tags support: `{{first_name}}`, `{{email}}`, dsb.
- Template categories.

### 5.5 Campaign Builder
- Create campaign: name, subject, from name, from email, reply-to.
- Pilih template.
- Pilih subscriber list.
- Personalization dengan merge tags.
- Send test email.
- Schedule / Send now.

### 5.6 Sending Engine
- Queue-based sending menggunakan BullMQ + Redis.
- Batch sending (misal: 100 email per batch, throttle sesuai limit Postal).
- Logging status per penerima: queued, sent, delivered, opened, clicked, bounced, complained, failed.

### 5.7 Analytics Dashboard
- Total sent, delivered, opened, clicked, bounced, complained.
- Open rate & click rate.
- Chart per campaign (line chart harian).
- Top clicked links.
- Bounce / complaint detail.

### 5.8 Webhook Handler
- Endpoint menerima webhook dari Postal.
- Event yang diproses:
  - `MessageSent`
  - `MessageDelivered`
  - `MessageBounced`
  - `MessageComplained`
  - `MessageLoaded` (open)
  - `LinkClicked`
- Update status campaign log & subscriber.

### 5.9 Unsubscribe Management
- Auto-generate unsubscribe link per subscriber.
- Halaman unsubscribe publik.
- Update status subscriber saat unsubscribe.

---

## 6. Out of Scope (MVP)

- A/B testing campaign.
- Automation / drip campaign.
- Advanced segmentation (AND/OR rules).
- Billing & subscription SaaS (roadmap fase 2).
- Multi-domain per organisasi.
- Advanced template marketplace.
- White-label custom domain.
- Mobile app.

---

## 7. Technical Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend / Fullstack | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js atau Lucia Auth |
| Queue | BullMQ + Redis |
| State Management | Zustand / React Query |
| Form Handling | React Hook Form + Zod |
| Email Editor | TipTap / React Email / custom HTML |
| Charts | Recharts |
| Mail Engine | Postal Mail Server API |
| Deployment | Docker / VPS / Railway / Hetzner |

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         End User Browser                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 14 App Router                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Dashboard   │  │  Campaign    │  │  Webhook Handler     │  │
│  │  UI          │  │  API Routes  │  │  /api/webhooks/postal│  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌─────────────────┐
│  PostgreSQL  │   │  Redis       │   │  Postal API     │
│  (Prisma)    │   │  (BullMQ)    │   │  mail.jowmail.com│
└──────────────┘   └──────────────┘   └─────────────────┘
```

### Alur Pengiriman Campaign

1. User membuat campaign dan klik "Send".
2. Sistem membagi subscriber menjadi batch (misal 100/batch).
3. Setiap job masuk ke BullMQ.
4. Worker memanggil Postal API `/api/v1/send/message` per subscriber.
5. Hasil (message_id / error) disimpan ke `campaign_logs`.
6. Postal mengirim webhook saat ada event delivery/open/click.
7. Webhook handler update `campaign_logs` dan subscriber status.

---

## 9. Postal API Integration Detail

### 9.1 Send Message

```http
POST https://mail.jowmail.com/api/v1/send/message
Authorization: Basic <api_key> (atau sesuai versi Postal)
Content-Type: application/json

{
  "to": ["user@example.com"],
  "from": "noreply@jowmail.com",
  "subject": "Hello {{first_name}}",
  "html_body": "<html>...</html>",
  "plain_body": "...",
  "headers": {
    "X-Campaign-ID": "campaign_123",
    "X-Subscriber-ID": "sub_456"
  },
  "tag": "campaign_123"
}
```

> Note: merge tags diproses di aplikasi sebelum dikirim ke Postal.

### 9.2 Webhook Events

| Event | Aksi di JowMail |
|-------|-----------------|
| `MessageSent` | Update log status `sent` |
| `MessageDelivered` | Update log status `delivered` |
| `MessageBounced` | Update log status `bounced`, tandai subscriber |
| `MessageComplained` | Update log status `complained`, tandai subscriber |
| `MessageLoaded` | Update log status `opened`, increment open count |
| `LinkClicked` | Simpan click event, update log status `clicked` |

### 9.3 Postal Multi-Org / Multi-Server

Postal mendukung multi-organisation dan multi-mail-server. Untuk SaaS, setiap tenant/customer dapat dipetakan ke:
- Organisasi Postal tersendiri (strong isolation), atau
- Mail server tersendiri dalam satu organisasi, atau
- Shared mail server dengan domain terpisah.

Rekomendasi: untuk produksi SaaS, gunakan **organisation per paying tenant** untuk isolasi reputasi & quota.

---

## 10. Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  memberships   OrganizationMember[]
}

model Organization {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  postalApiKey  String?
  postalBaseUrl String    @default("https://mail.jowmail.com")
  postalServer  String?
  createdAt     DateTime  @default(now())
  members       OrganizationMember[]
  lists         SubscriberList[]
  templates     Template[]
  campaigns     Campaign[]
}

model OrganizationMember {
  id              String        @id @default(cuid())
  userId          String
  organizationId  String
  role            String        // owner, admin, member
  user            User          @relation(fields: [userId], references: [id])
  organization    Organization  @relation(fields: [organizationId], references: [id])
  @@unique([userId, organizationId])
}

model SubscriberList {
  id              String        @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  organization    Organization  @relation(fields: [organizationId], references: [id])
  subscribers     Subscriber[]
  campaigns       Campaign[]
}

model Subscriber {
  id              String          @id @default(cuid())
  listId          String
  email           String
  firstName       String?
  lastName        String?
  status          String          @default("subscribed") // subscribed, unsubscribed, bounced, complained
  customFields    Json?           @default("{}")
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  list            SubscriberList  @relation(fields: [listId], references: [id])
  logs            CampaignLog[]
}

model Template {
  id              String        @id @default(cuid())
  organizationId  String
  name            String
  subject         String
  htmlContent     String        @db.Text
  plainContent    String?       @db.Text
  organization    Organization  @relation(fields: [organizationId], references: [id])
  campaigns       Campaign[]
}

model Campaign {
  id              String        @id @default(cuid())
  organizationId  String
  listId          String
  templateId      String
  name            String
  subject         String
  fromName        String
  fromEmail       String
  replyTo         String?
  status          String        @default("draft") // draft, queued, sending, sent, paused, failed
  scheduledAt     DateTime?
  sentAt          DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  organization    Organization  @relation(fields: [organizationId], references: [id])
  list            SubscriberList @relation(fields: [listId], references: [id])
  template        Template      @relation(fields: [templateId], references: [id])
  logs            CampaignLog[]
}

model CampaignLog {
  id              String      @id @default(cuid())
  campaignId      String
  subscriberId    String
  postalMessageId String?
  status          String      @default("queued") // queued, sent, delivered, opened, clicked, bounced, complained, failed
  sentAt          DateTime?
  deliveredAt     DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  bounceReason    String?
  metadata        Json?       @default("{}")
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  campaign        Campaign    @relation(fields: [campaignId], references: [id])
  subscriber      Subscriber  @relation(fields: [subscriberId], references: [id])
  @@index([campaignId])
  @@index([subscriberId])
  @@index([postalMessageId])
}

model WebhookEvent {
  id              String    @id @default(cuid())
  eventType       String
  payload         Json
  processed       Boolean   @default(false)
  processedAt     DateTime?
  createdAt       DateTime  @default(now())
}
```

---

## 11. API Routes (Next.js)

| Method | Route | Deskripsi |
|--------|-------|-----------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/organizations` | List organisasi user |
| POST | `/api/organizations` | Buat organisasi |
| PUT | `/api/organizations/[id]/postal` | Simpan credential Postal |
| GET/POST | `/api/subscribers` | CRUD subscriber |
| POST | `/api/subscribers/import` | Import CSV |
| GET/POST | `/api/lists` | CRUD subscriber list |
| GET/POST | `/api/templates` | CRUD template |
| GET/POST | `/api/campaigns` | CRUD campaign |
| POST | `/api/campaigns/[id]/send` | Queue campaign |
| POST | `/api/campaigns/[id]/test` | Kirim test email |
| GET | `/api/campaigns/[id]/analytics` | Statistik campaign |
| POST | `/api/webhooks/postal` | Terima webhook Postal |
| GET | `/unsubscribe/[token]` | Halaman unsubscribe publik |

---

## 12. Security & Compliance

### 12.1 Keamanan
- API key Postal disimpan terenkripsi di database (AES-256) atau gunakan secrets manager.
- Semua panggilan ke Postal hanya dari server-side Next.js.
- Validasi webhook signature jika Postal menyediakan mekanisme signature.
- Rate limiting pada API publik (unsubscribe, webhook).
- Input sanitization untuk HTML template mencegah XSS.

### 12.2 Compliance
- **Unsubscribe** wajib disertakan di setiap email marketing.
- **Permission-based**: hanya kirim ke subscriber yang `subscribed`.
- **Bounce/Complaint handling**: otomatis nonaktifkan subscriber yang bounce keras atau complaint.
- **GDPR/CCPA**: sediakan mekanisme export/delete data subscriber.

---

## 13. SaaS Feasibility Analysis

### Bisa Dibuat SaaS?
**Ya, bisa.** Postal dirancang untuk multi-organisation dan multi-mail-server, yang cocok untuk model SaaS multi-tenant.

### Cara Isolasi Tenant

| Isolasi Level | Kelebihan | Kekurangan |
|---------------|-----------|------------|
| **Organisation per tenant** | Isolasi reputasi & quota paling kuat | Lebih kompleks manage & mahal |
| **Mail server per tenant** | Isolasi IP/domain, masih dalam satu org | Manajemen IP lebih banyak |
| **Shared mail server** | Termurah & termudah | Risiko reputasi silang antar tenant |

Rekomendasi: mulai dengan **shared mail server** untuk MVP, lalu upgrade ke **organisation per tenant** untuk plan premium.

### Komponen Tambahan untuk SaaS
- **Billing & Subscription**: Stripe / Lemon Squeezy.
- **Plan & Quota**: limit email per bulan, jumlah subscriber, jumlah organisasi.
- **Tenant Onboarding**: provisioning organisasi/mail server di Postal secara otomatis (jika Postal API mendukung).
- **White-label**: custom domain untuk dashboard & unsubscribe page.
- **Admin Panel**: superadmin untuk manage tenant, suspend, monitoring.

### Risiko SaaS dengan Postal
1. **IP Reputation**: satu tenant spam bisa merusak deliverability semua tenant (jika shared).
2. **Support Infrastructure**: Postal self-hosted memerlukan maintenance mail server sendiri.
3. **Scalability Queue**: butuh Redis + worker yang scalable.
4. **Legal**: tanggung jawab atas konten email tenant.
5. **API Limit**: perlu handle rate limit dan retry dengan baik.

### Kesimpulan SaaS
Cocok untuk:
- Agency yang ingin jual layanan email marketing ke klien.
- SaaS lokal/regional dengan kebutuhan data di Indonesia.
- Bisnis yang ingin mengurangi biaya Mailchimp/SendGrid.

Tidak cocok untuk:
- Platform email marketing massal tanpa tim ops yang kuat.
- Use case dengan volume ratusan juta email/bulan tanpa infrastructure matang.

---

## 14. Roadmap

### Fase 1 — MVP (4–6 minggu)
- Auth & organisasi dasar.
- Subscriber list & import CSV.
- Template editor sederhana.
- Campaign creation & send.
- BullMQ queue sending.
- Webhook tracking.
- Dashboard analytics dasar.
- Unsubscribe page.

### Fase 2 — Stabilisasi & SaaS Foundation (4–6 minggu)
- Role-based access control lengkap.
- Template marketplace / save blocks.
- Billing & subscription (Stripe).
- Plan & quota.
- Tenant isolation improvement.
- Audit log.

### Fase 3 — Advanced Marketing (8+ minggu)
- Automation / drip campaign.
- A/B testing.
- Advanced segmentation.
- Form subscriber embed.
- API publik untuk integrasi pihak ketiga.
- White-label custom domain.

---

## 15. Success Metrics

| Metrik | Target MVP |
|--------|------------|
| Campaign creation < 5 menit | Ya |
| Email delivery rate | > 95% |
| Bounce rate | < 3% |
| Unsubscribe handled otomatis | Ya |
| Webhook processing latency | < 5 detik |
| Uptime | > 99.5% |

---

## 16. Open Questions

1. Apakah Postal di `mail.jowmail.com` sudah dikonfigurasi multi-organisation?
2. Berapa volume email harian/bulanan yang diharapkan?
3. Apakah perlu white-label dari awal atau bisa MVP tanpa white-label?
4. Apakah subscriber data perlu disimpan di Indonesia (data residency)?
5. Apakah ada kebutuhan integrasi dengan e-commerce/platform tertentu?

---

## 17. Next Steps

1. **Setup project Next.js** dengan Prisma, NextAuth, Tailwind, shadcn/ui.
2. **Integrasi pertama ke Postal**: test kirim email via API.
3. **Setup database & schema** sesuai PRD.
4. **Implement subscriber list & template CRUD**.
5. **Build campaign send dengan BullMQ**.
6. **Implement webhook handler**.
7. **Dashboard analytics**.

---

*Dokumen ini akan direvisi seiring perkembangan proyek.*
