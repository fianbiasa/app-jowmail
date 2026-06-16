import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });

  if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold">Link Tidak Valid</h1>
          <p className="mt-2 text-slate-600">
            Undangan ini tidak valid atau sudah kedaluwarsa.
          </p>
          <Link href="/auth/login" className={`mt-4 inline-block ${buttonVariants()}`}>
            Ke Login
          </Link>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);

  // Auto-accept if already logged in
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.email !== invitation.email) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold">Email Tidak Cocok</h1>
            <p className="mt-2 text-slate-600">
              Undangan ini ditujukan untuk <strong>{invitation.email}</strong>, bukan akun Anda saat ini.
            </p>
          </div>
        </div>
      );
    }

    // Accept invitation
    await prisma.$transaction([
      prisma.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId: invitation.organizationId,
          },
        },
        update: { role: invitation.role },
        create: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    redirect("/campaigns");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold">Undangan ke {invitation.organization.name}</h1>
        <p className="mt-2 text-slate-600">
          Anda diundang bergabung sebagai <strong>{invitation.role}</strong>.
          Masuk atau daftar dengan email <strong>{invitation.email}</strong> untuk menerima undangan.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href={`/auth/login?callbackUrl=/auth/invite/${token}`}
            className={buttonVariants()}
          >
            Masuk
          </Link>
          <Link
            href={`/auth/register?email=${encodeURIComponent(invitation.email)}&callbackUrl=/auth/invite/${token}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Daftar
          </Link>
        </div>
      </div>
    </div>
  );
}
