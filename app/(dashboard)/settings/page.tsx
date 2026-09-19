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
import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-2xl">Pengaturan</h1>
        <p className="text-muted-foreground">
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
          <div>
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3 border-b-2 border-dashed border-foreground/20 last:border-b-0">
                <div>
                  <p className="font-bold text-sm">{m.user.name || m.user.email}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge variant={m.role === "owner" ? "purple" : m.role === "admin" ? "cyan" : "neutral"}>
                  {m.role}
                </Badge>
              </div>
            ))}
          </div>
          <InviteMemberForm organizationId={organization.id} pendingInvites={pendingInvites} />
        </CardContent>
      </Card>
    </div>
  );
}
