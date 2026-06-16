import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/organization";
import { updateOrganizationSettings } from "./actions";
import { SettingsForm } from "./settings-form";
import { InviteMemberForm } from "./invite-member-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/campaigns");

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: organization.id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const pendingInvites = await prisma.invitation.findMany({
    where: { organizationId: organization.id, acceptedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // Strip sensitive encrypted value before passing to client
  const safeOrg = {
    ...organization,
    postalApiKey: organization.postalApiKey ? "••••••••" : null,
    postalApiKeyIv: undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan</h1>
        <p className="text-slate-600">
          Kelola organisasi, Postal API, dan anggota tim.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organisasi & Postal</CardTitle>
          <CardDescription>
            Konfigurasi koneksi ke Postal Mail Server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm organization={safeOrg} updateAction={updateOrganizationSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anggota Tim</CardTitle>
          <CardDescription>Kelola akses anggota organisasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-slate-500">{m.user.email}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
          <InviteMemberForm organizationId={organization.id} pendingInvites={pendingInvites} />
        </CardContent>
      </Card>
    </div>
  );
}
