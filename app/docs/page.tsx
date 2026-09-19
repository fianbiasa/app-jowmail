import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./code-block";

export const metadata: Metadata = {
  title: "Dokumentasi API — JowMail",
  description:
    "Cara menyambungkan JowMail dengan WHMCS, WordPress, aMember, atau sistem lain lewat API subscribe.",
};

const TOC = [
  { href: "#ringkasan", label: "Ringkasan" },
  { href: "#autentikasi", label: "Autentikasi & Limit" },
  { href: "#endpoint", label: "Endpoint Subscribe" },
  { href: "#contoh", label: "Contoh Kode" },
  { href: "#error", label: "Referensi Error" },
  { href: "#roadmap", label: "Roadmap" },
];

const FIELDS = [
  { name: "listId", type: "string", required: true, note: "ID subscriber list tujuan. Lihat cara mengambilnya di bawah." },
  { name: "email", type: "string", required: true, note: "Harus format email valid, atau request ditolak dengan 400." },
  { name: "firstName", type: "string", required: false, note: "Opsional, maks. 100 karakter." },
  { name: "lastName", type: "string", required: false, note: "Opsional, maks. 100 karakter." },
];

const RESPONSES = [
  { code: "200", body: '{"status":"subscribed"}', desc: "Subscriber baru berhasil ditambahkan." },
  { code: "200", body: '{"status":"already"}', desc: "Email sudah subscribed di list ini, tidak ada perubahan." },
  { code: "200", body: '{"status":"resubscribed"}', desc: "Email pernah unsubscribe, diaktifkan ulang & nama diperbarui." },
];

const ERRORS = [
  { code: "400", body: '{"error":"Invalid request"}', desc: "JSON body tidak valid / gagal di-parse." },
  { code: "400", body: '{"error":"Email tidak valid"}', desc: "Format email salah, atau listId tidak dikirim." },
  { code: "403", body: '{"error":"Pendaftaran sementara ditutup."}', desc: "Kuota jumlah subscriber organisasi sudah penuh." },
  { code: "404", body: '{"error":"Form subscribe tidak ditemukan."}', desc: "listId tidak cocok dengan list mana pun." },
  { code: "429", body: '{"error":"Terlalu banyak permintaan..."}', desc: "Lebih dari 10 request/menit dari IP yang sama." },
];

const CURL_EXAMPLE = `curl -X POST https://app.jowmail.com/api/subscribe \\
  -H "Content-Type: application/json" \\
  -d '{
    "listId": "clx7abc123",
    "email": "pelanggan@contoh.com",
    "firstName": "Budi",
    "lastName": "Santoso"
  }'`;

const PHP_EXAMPLE = `function jowmail_subscribe(string $listId, string $email, string $firstName = '', string $lastName = ''): array {
    $ch = curl_init('https://app.jowmail.com/api/subscribe');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'listId'    => $listId,
            'email'     => $email,
            'firstName' => $firstName,
            'lastName'  => $lastName,
        ]),
    ]);
    $body = curl_exec($ch);
    curl_close($ch);
    return json_decode($body, true) ?? [];
}`;

const WHMCS_EXAMPLE = `<?php
use WHMCS\\Database\\Capsule;

add_hook('AfterCartCheckoutCompleteThankYou', 1, function ($vars) {
    $client = Capsule::table('tblclients')->find($vars['userid']);
    if (!$client) return;

    jowmail_subscribe(
        'clx7abc123',           // ganti dengan listId Anda
        $client->email,
        $client->firstname,
        $client->lastname
    );
});`;

const WP_EXAMPLE = `add_action('user_register', function ($user_id) {
    $user = get_userdata($user_id);

    wp_remote_post('https://app.jowmail.com/api/subscribe', [
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 8,
        'body'    => wp_json_encode([
            'listId'    => 'clx7abc123', // ganti dengan listId Anda
            'email'     => $user->user_email,
            'firstName' => $user->first_name,
            'lastName'  => $user->last_name,
        ]),
    ]);
});`;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-purple border-b-4 border-foreground">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <Badge variant="yellow">Publik · Tanpa API Key</Badge>
          <h1 className="mt-4 text-3xl text-white sm:text-4xl">
            Dokumentasi API JowMail
          </h1>
          <p className="mt-3 max-w-2xl text-white/90 font-semibold">
            Cara menyambungkan JowMail dengan sistem lain — WHMCS, WordPress, aMember, atau
            billing engine apa pun — supaya pelanggan baru otomatis masuk ke subscriber list
            email marketing Anda.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 border-2 border-white/40 bg-white/10 px-4 py-2 font-mono text-sm text-white">
            <span className="text-white/70">Base URL</span>
            <span>https://app.jowmail.com</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[200px_1fr]">
        {/* TOC */}
        <nav className="h-fit space-y-1 text-sm lg:sticky lg:top-10">
          {TOC.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block border-2 border-transparent px-3 py-1.5 font-bold text-muted-foreground hover:border-foreground hover:bg-card hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <div className="space-y-14">
          <section id="ringkasan" className="scroll-mt-6 space-y-3">
            <h2 className="text-xl">Ringkasan</h2>
            <p className="text-muted-foreground font-semibold">
              Saat ini JowMail membuka <strong>satu endpoint publik</strong> yang bisa dipanggil
              dari luar tanpa login: menambahkan subscriber ke sebuah list. Ini cocok dipakai
              sebagai jembatan dari sistem lain — begitu ada pelanggan baru daftar di WHMCS,
              checkout selesai di WooCommerce, atau member baru aktif di aMember, sistem
              tersebut tinggal memanggil endpoint ini supaya orangnya otomatis tercatat sebagai
              subscriber di JowMail.
            </p>
            <Card className="bg-cyan/20">
              <CardContent className="text-sm font-semibold">
                <span className="mb-1 block font-mono text-xs font-black uppercase tracking-wide">
                  Endpoint lain di dashboard
                </span>
                Endpoint seperti <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">/api/campaigns</code>,{" "}
                <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">/api/subscribers</code>, atau{" "}
                <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">/api/lists</code> masih memakai
                sesi login (cookie NextAuth) dan hanya dipanggil dari dalam aplikasi JowMail
                sendiri. Endpoint tersebut <strong>belum</strong> bisa diakses dari server pihak
                ketiga — lihat bagian Roadmap.
              </CardContent>
            </Card>
          </section>

          <section id="autentikasi" className="scroll-mt-6 space-y-3">
            <h2 className="text-xl">Autentikasi &amp; Rate Limit</h2>
            <p className="text-muted-foreground font-semibold">
              Endpoint subscribe tidak memerlukan API key atau token — cukup kirim request POST
              biasa. Sebagai gantinya, permintaan dibatasi per alamat IP pengirim untuk mencegah
              penyalahgunaan:
            </p>
            <Card className="bg-yellow/25">
              <CardContent className="text-sm font-semibold">
                <span className="mb-1 block font-mono text-xs font-black uppercase tracking-wide">
                  Rate limit
                </span>
                <strong>10 permintaan / 60 detik</strong> per IP. Lewat batas itu, server
                membalas status <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">429</code>. Jika
                sistem Anda mengirim dalam jumlah besar (misalnya migrasi data lama), beri jeda
                antar-request atau hubungi kami untuk kebutuhan bulk import.
              </CardContent>
            </Card>
          </section>

          <section id="endpoint" className="scroll-mt-6 space-y-4">
            <h2 className="text-xl">Endpoint Subscribe</h2>
            <p className="text-muted-foreground font-semibold">
              Menambahkan satu email ke satu subscriber list. Jika email sudah pernah
              unsubscribe dari list itu, statusnya otomatis dikembalikan ke{" "}
              <em>subscribed</em>.
            </p>

            <Card className="py-0">
              <CardHeader className="flex-row items-center gap-3 border-b-4 border-foreground bg-muted !py-3">
                <Badge variant="lime">POST</Badge>
                <CardTitle className="font-mono text-sm normal-case">/api/subscribe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 py-4">
                <div>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Body request (JSON)</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {FIELDS.map((f) => (
                        <TableRow key={f.name}>
                          <TableCell className="font-mono">{f.name}</TableCell>
                          <TableCell className="text-muted-foreground">{f.type}</TableCell>
                          <TableCell>
                            <Badge variant={f.required ? "red" : "neutral"}>
                              {f.required ? "wajib" : "opsional"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{f.note}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Card className="bg-cyan/20">
                  <CardContent className="text-sm font-semibold">
                    <span className="mb-1 block font-mono text-xs font-black uppercase tracking-wide">
                      Cara mendapatkan listId
                    </span>
                    Buka dashboard JowMail → menu <strong>Lists</strong> → pilih list tujuan →
                    tombol <strong>&quot;Copy Subscribe Link&quot;</strong>. ID list ada di
                    bagian akhir URL, contoh:{" "}
                    <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">
                      https://app.jowmail.com/subscribe/<strong>clx7abc123</strong>
                    </code>{" "}
                    → <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">listId</code> ={" "}
                    <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">clx7abc123</code>.
                  </CardContent>
                </Card>

                <div>
                  <h3 className="mb-2 text-sm font-black uppercase tracking-wide">Contoh response</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>HTTP</TableHead>
                        <TableHead>Body</TableHead>
                        <TableHead>Arti</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {RESPONSES.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono font-black">{r.code}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{r.body}</TableCell>
                          <TableCell className="text-muted-foreground">{r.desc}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="contoh" className="scroll-mt-6 space-y-4">
            <h2 className="text-xl">Contoh Kode</h2>
            <p className="text-muted-foreground font-semibold">
              Empat pola yang paling umum dipakai untuk menyambungkan sistem berbasis PHP
              (WHMCS, aMember) maupun WordPress ke endpoint ini.
            </p>

            <Tabs defaultValue="curl">
              <TabsList className="h-auto flex-wrap">
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="php">PHP (generik)</TabsTrigger>
                <TabsTrigger value="whmcs">WHMCS Hook</TabsTrigger>
                <TabsTrigger value="wp">WordPress</TabsTrigger>
              </TabsList>

              <TabsContent value="curl" className="mt-3">
                <CodeBlock label="bash" code={CURL_EXAMPLE} />
              </TabsContent>

              <TabsContent value="php" className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">
                  Fungsi generik ini bisa dipanggil dari file PHP mana pun — termasuk dari
                  dalam hook WHMCS atau plugin aMember, tinggal panggil{" "}
                  <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">jowmail_subscribe(...)</code>{" "}
                  di titik yang sesuai.
                </p>
                <CodeBlock label="php" code={PHP_EXAMPLE} />
              </TabsContent>

              <TabsContent value="whmcs" className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">
                  WHMCS memicu hook setiap kali order selesai atau akun klien baru dibuat.
                  Simpan sebagai file baru di{" "}
                  <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">includes/hooks/jowmail.php</code>:
                </p>
                <CodeBlock label="php · includes/hooks/jowmail.php" code={WHMCS_EXAMPLE} />
                <p className="text-sm text-muted-foreground font-semibold">
                  Sesuaikan nama hook dengan alur bisnis Anda — misalnya{" "}
                  <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">UserRegistrationComplete</code>{" "}
                  jika ingin subscribe langsung saat akun dibuat, bukan menunggu checkout selesai.
                  Cek dokumentasi hook WHMCS yang sedang Anda pakai untuk nama event yang tepat.
                </p>
              </TabsContent>

              <TabsContent value="wp" className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground font-semibold">
                  Tambahkan ke <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">functions.php</code>{" "}
                  tema/plugin Anda. Contoh ini subscribe otomatis saat user baru register di
                  WordPress:
                </p>
                <CodeBlock label="php · functions.php" code={WP_EXAMPLE} />
                <p className="text-sm text-muted-foreground font-semibold">
                  Pakai WooCommerce? Ganti hook di atas dengan{" "}
                  <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">woocommerce_order_status_completed</code>{" "}
                  dan ambil email dari objek <code className="border-2 border-foreground/20 bg-muted px-1 py-0.5 font-mono">WC_Order</code>.
                </p>
              </TabsContent>
            </Tabs>

            <Card className="bg-cyan/20">
              <CardContent className="text-sm font-semibold">
                <span className="mb-1 block font-mono text-xs font-black uppercase tracking-wide">
                  aMember Pro
                </span>
                aMember tidak punya hook bawaan yang seragam di semua versi — cek plugin/event
                yang tersedia di instalasi Anda (biasanya event saat member baru ditambahkan
                atau order selesai), lalu panggil fungsi{" "}
                <code className="border-2 border-foreground/20 bg-card px-1 py-0.5 font-mono">jowmail_subscribe()</code> di
                atas dari situ, persis seperti pola WHMCS.
              </CardContent>
            </Card>
          </section>

          <section id="error" className="scroll-mt-6 space-y-3">
            <h2 className="text-xl">Referensi Error</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Body</TableHead>
                  <TableHead>Penyebab</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ERRORS.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono font-black text-red">{e.code}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{e.body}</TableCell>
                    <TableCell className="text-muted-foreground">{e.desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section id="roadmap" className="scroll-mt-6 space-y-3">
            <h2 className="text-xl">Roadmap</h2>
            <p className="text-muted-foreground font-semibold">
              Endpoint subscribe ini sengaja dibuat publik karena kasus penggunaannya sederhana
              dan aman tanpa autentikasi. Untuk kebutuhan integrasi yang lebih dalam — menarik
              data subscriber, memicu pengiriman campaign, atau mengecek sisa kuota dari sistem
              luar — dibutuhkan mekanisme <strong>API key per organisasi</strong> yang belum
              tersedia hari ini.
            </p>
            <p className="text-sm text-muted-foreground font-semibold">
              Kalau kebutuhan integrasi Anda sudah melampaui sekadar &quot;tambah subscriber&quot;,
              beri tahu tim JowMail spesifik alur yang diinginkan supaya endpoint ber-API-key
              yang tepat bisa dirancang.
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t-4 border-foreground bg-foreground py-6 text-center text-xs font-bold uppercase tracking-wide text-yellow">
        Didukung oleh <Link href="/" className="underline decoration-2">JowMail</Link> ·
        Dokumen ini mengikuti implementasi endpoint per 27 Agustus 2026.
      </footer>
    </div>
  );
}
