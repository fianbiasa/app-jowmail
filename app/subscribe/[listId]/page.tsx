import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SubscribeForm } from "./subscribe-form";

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;

  const list = await prisma.subscriberList.findUnique({
    where: { id: listId },
    select: {
      id: true,
      name: true,
      description: true,
      organization: { select: { name: true } },
    },
  });

  if (!list) notFound();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="border-4 border-foreground bg-card shadow-brutal-md overflow-hidden">
          {/* Header strip */}
          <div className="bg-purple border-b-4 border-foreground px-8 py-7">
            <p className="text-white/80 text-sm font-bold uppercase tracking-wide">{list.organization.name}</p>
            <h1 className="text-2xl text-white mt-1">{list.name}</h1>
            {list.description && (
              <p className="text-white/90 text-sm mt-2 font-semibold">{list.description}</p>
            )}
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <p className="text-muted-foreground text-sm mb-6 font-semibold">
              Isi data di bawah ini untuk mulai berlangganan.
            </p>
            <SubscribeForm listId={list.id} />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 font-semibold">
          Didukung oleh <span className="font-black text-foreground">JowMail</span> · Anda dapat berhenti berlangganan kapan saja.
        </p>
      </div>
    </div>
  );
}
