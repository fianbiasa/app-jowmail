import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { rateLimit } from "@/lib/rate-limit";
import { Card, CardContent } from "@/components/ui/card";

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
      bg: "bg-orange",
    },
    success: {
      title: "Berhasil Berhenti Berlangganan",
      body: `${email} telah dihapus dari list ${listName ?? ""}. Anda tidak akan menerima email lagi dari list ini.`,
      icon: "✓",
      bg: "bg-lime",
    },
    already: {
      title: "Sudah Berhenti Berlangganan",
      body: `${email} sudah tidak aktif berlangganan.`,
      icon: "ℹ",
      bg: "bg-cyan",
    },
    invalid: {
      title: "Link Tidak Valid",
      body: "Link unsubscribe ini tidak valid atau sudah kedaluwarsa.",
      icon: "✕",
      bg: "bg-red",
    },
    notfound: {
      title: "Subscriber Tidak Ditemukan",
      body: "Data subscriber tidak ditemukan.",
      icon: "✕",
      bg: "bg-red",
    },
  };

  const m = messages[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md text-center">
        <CardContent>
          <div className={`text-4xl font-black mb-4 mx-auto flex size-16 items-center justify-center border-3 border-foreground ${m.bg}`}>{m.icon}</div>
          <h1 className="text-2xl">{m.title}</h1>
          <p className="mt-4 font-semibold text-muted-foreground">{m.body}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            JowMail · Email Marketing Platform
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
