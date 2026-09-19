import { NextResponse } from "next/server";
import { getCurrentOrganizationFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const { error, organization } = await getCurrentOrganizationFromRequest(
    request as unknown as import("next/server").NextRequest
  );
  if (error || !organization) return error;

  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId");
  const query = searchParams.get("q");

  const subscribers = await prisma.subscriber.findMany({
    where: {
      list: { organizationId: organization.id },
      ...(listId ? { listId } : {}),
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { list: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Email", "First Name", "Last Name", "List", "Status", "Created At"];
  const rows = subscribers.map((s) => [
    s.email,
    s.firstName ?? "",
    s.lastName ?? "",
    s.list.name,
    s.status,
    s.createdAt.toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((v) => csvEscape(String(v))).join(","))
    .join("\r\n");

  const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
