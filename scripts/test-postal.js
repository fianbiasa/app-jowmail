#!/usr/bin/env node

/**
 * Script untuk test koneksi ke Postal Mail Server API.
 *
 * Usage:
 *   node scripts/test-postal.js <API_KEY> <FROM_EMAIL> <TO_EMAIL>
 *
 * Atau dengan environment variables:
 *   POSTAL_API_KEY=xxx POSTAL_FROM=admin@jowmail.com POSTAL_TO=test@example.com node scripts/test-postal.js
 */

const API_BASE_URL = process.env.POSTAL_BASE_URL || "https://mail.jowmail.com";

function getArgs() {
  const args = process.argv.slice(2);

  const apiKey = args[0] || process.env.POSTAL_API_KEY;
  const fromEmail = args[1] || process.env.POSTAL_FROM;
  const toEmail = args[2] || process.env.POSTAL_TO;

  return { apiKey, fromEmail, toEmail };
}

function validate({ apiKey, fromEmail, toEmail }) {
  if (!apiKey) {
    throw new Error("API Key tidak ditemukan. Sertakan sebagai argumen pertama atau POSTAL_API_KEY env var.");
  }
  if (!fromEmail) {
    throw new Error("From email tidak ditemukan. Sertakan sebagai argumen kedua atau POSTAL_FROM env var.");
  }
  if (!toEmail) {
    throw new Error("To email tidak ditemukan. Sertakan sebagai argumen ketiga atau POSTAL_TO env var.");
  }
}

async function sendTestEmail({ apiKey, fromEmail, toEmail }) {
  const url = `${API_BASE_URL}/api/v1/send/message`;

  const payload = {
    to: [toEmail],
    from: fromEmail,
    subject: "Test Koneksi JowMail ke Postal",
    html_body: `
      <html>
        <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h1 style="color: #2563eb;">Test Koneksi Berhasil!</h1>
          <p>JowMail berhasil terhubung dengan Postal Mail Server.</p>
          <p>Waktu pengiriman: ${new Date().toISOString()}</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Ini adalah email test otomatis.</p>
        </body>
      </html>
    `,
    plain_body: `Test Koneksi Berhasil! JowMail berhasil terhubung dengan Postal Mail Server. Waktu: ${new Date().toISOString()}`,
    tag: "jowmail-test",
  };

  console.log(`\n📤 Mengirim email test...`);
  console.log(`   URL: ${url}`);
  console.log(`   From: ${fromEmail}`);
  console.log(`   To: ${toEmail}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Server-API-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();

  let data;
  try {
    data = JSON.parse(responseBody);
  } catch {
    data = { raw: responseBody };
  }

  return { status: response.status, ok: response.ok, data };
}

async function main() {
  try {
    const config = getArgs();
    validate(config);

    const result = await sendTestEmail(config);

    console.log(`\n📥 HTTP Status: ${result.status}`);

    if (result.ok && result.data?.status === "success") {
      console.log("✅ Koneksi ke Postal BERHASIL!");
      console.log("   Response:", JSON.stringify(result.data, null, 2));
    } else {
      console.log("❌ Gagal mengirim email test.");
      console.log("   Response:", JSON.stringify(result.data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error("\n💥 Error:", error.message);
    process.exit(1);
  }
}

main();
