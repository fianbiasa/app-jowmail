import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { rateLimit } from "@/lib/rate-limit";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Rate limit: 20 unsubscribe requests per IP per 10 minutes
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`ratelimit:unsub:${ip}`, 20, 600);
  if (!allowed) {
    return <UnsubscribeMessage type="ratelimit" />;
  }

  const result = verifyUnsubscribeToken(token);

  if (!result.valid) {
    return <UnsubscribeMessage type="invalid" />;
  }

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: result.subscriberId },
    include: { list: { select: { name: true } } },
  });

  if (!subscriber) {
    return <UnsubscribeMessage type="notfound" />;
  }

  if (subscriber.status === "unsubscribed") {
    return <UnsubscribeMessage type="already" email={subscriber.email} />;
  }

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { status: "unsubscribed" },
  });

  return (
    <UnsubscribeMessage
      type="success"
      email={subscriber.email}
      listName={subscriber.list.name}
    />
  );
}

function UnsubscribeMessage({
  type,
  email,
  listName,
}: {
  type: "success" | "already" | "invalid" | "notfound" | "ratelimit";
  email?: string;
  listName?: string;
}) {
  const messages = {
    ratelimit: {
      title: "Terlalu Banyak Permintaan",
      body: "Terlalu banyak permintaan dari IP Anda. Coba lagi dalam beberapa menit.",
      icon: "⚠",
      color: "text-orange-600",
    },
    success: {
      title: "Berhasil Berhenti Berlangganan",
      body: `${email} telah dihapus dari list ${listName ?? ""}. Anda tidak akan menerima email lagi dari list ini.`,
      icon: "✓",
      color: "text-green-600",
    },
    already: {
      title: "Sudah Berhenti Berlangganan",
      body: `${email} sudah tidak aktif berlangganan.`,
      icon: "ℹ",
      color: "text-blue-600",
    },
    invalid: {
      title: "Link Tidak Valid",
      body: "Link unsubscribe ini tidak valid atau sudah kedaluwarsa.",
      icon: "✕",
      color: "text-red-600",
    },
    notfound: {
      title: "Subscriber Tidak Ditemukan",
      body: "Data subscriber tidak ditemukan.",
      icon: "✕",
      color: "text-red-600",
    },
  };

  const m = messages[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <div className={`text-4xl font-bold mb-4 ${m.color}`}>{m.icon}</div>
        <h1 className="text-2xl font-bold text-slate-800">{m.title}</h1>
        <p className="mt-4 text-slate-600">{m.body}</p>
        <p className="mt-6 text-xs text-slate-400">
          JowMail · Email Marketing Platform
        </p>
      </div>
    </div>
  );
}
