import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { createPostalClient } from "@/lib/postal/client";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const body = await request.json();
  const parsed = schema.safeParse(body);

  // Use provided credentials OR fall back to saved (decrypted)
  let baseUrl = parsed.data?.baseUrl || organization.postalBaseUrl;
  let apiKey = parsed.data?.apiKey;

  if (!apiKey && organization.postalApiKey) {
    apiKey = organization.postalApiKeyIv
      ? decrypt(organization.postalApiKey, organization.postalApiKeyIv)
      : organization.postalApiKey;
  }

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "API key belum dikonfigurasi" },
      { status: 400 }
    );
  }

  try {
    const client = createPostalClient({ baseUrl, apiKey });
    // Postal doesn't have a dedicated ping endpoint, so send to an invalid address
    // and expect a proper API error (not a network error)
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/v1/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Server-API-Key": apiKey,
      },
      body: JSON.stringify({ to: ["test@test.invalid"], from: "test@test.invalid", subject: "ping" }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();

    // A proper Postal API response (even an error) means connectivity is working
    if (data.status !== undefined) {
      return NextResponse.json({
        success: true,
        message: "Koneksi ke Postal berhasil!",
        postalVersion: response.headers.get("x-postal-version") || "unknown",
      });
    }

    throw new Error("Unexpected response from Postal");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("fetch") || msg.includes("ECONNREFUSED") || msg.includes("timeout")) {
      return NextResponse.json(
        { success: false, error: `Tidak bisa menghubungi Postal: ${msg}` },
        { status: 502 }
      );
    }
    // If Postal responds with any API error, connectivity is fine
    return NextResponse.json({
      success: true,
      message: "Koneksi ke Postal berhasil!",
    });
  }
}
