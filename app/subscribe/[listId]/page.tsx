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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header strip */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-7">
            <p className="text-indigo-200 text-sm font-medium">{list.organization.name}</p>
            <h1 className="text-2xl font-bold text-white mt-1">{list.name}</h1>
            {list.description && (
              <p className="text-indigo-100 text-sm mt-2">{list.description}</p>
            )}
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <p className="text-slate-600 text-sm mb-6">
              Isi data di bawah ini untuk mulai berlangganan.
            </p>
            <SubscribeForm listId={list.id} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Didukung oleh <span className="font-medium">JowMail</span> · Anda dapat berhenti berlangganan kapan saja.
        </p>
      </div>
    </div>
  );
}
