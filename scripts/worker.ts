import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createEmailWorker } from "@/lib/queue";
import { sendViaOrganization } from "@/lib/postal/send";
import { generateUnsubscribeToken } from "@/lib/unsubscribe-token";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function replaceMergeTags(
  content: string,
  vars: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

const worker = createEmailWorker(async ({ data }) => {
  const {
    campaignId,
    subscriberId,
    organizationId,
    from,
    subject,
    htmlBody,       // campaign.htmlContent — the WYSIWYG body
    templateHtml,   // template.htmlContent — the layout wrapper
    plainBody,
    replyTo,
  } = data;

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
  });

  if (!subscriber || subscriber.status !== "subscribed") {
    await prisma.campaignLog.updateMany({
      where: { campaignId, subscriberId },
      data: { status: "failed", metadata: { reason: "Subscriber not active" } },
    });
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const unsubscribeToken = generateUnsubscribeToken(subscriber.id);
  const unsubscribeUrl = `${appUrl}/unsubscribe/${unsubscribeToken}`;

  const unsubscribeFooter = `
<p style="font-size:12px;color:#6b7280;text-align:center;margin-top:32px;">
  Untuk berhenti berlangganan, <a href="${unsubscribeUrl}" style="color:#6366f1;">klik di sini</a>.
</p>`;

  const fullName = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(" ");
  const vars = {
    email: subscriber.email,
    first_name: subscriber.firstName || "",
    last_name: subscriber.lastName || "",
    full_name: fullName,
    unsubscribe_url: unsubscribeUrl,
  };

  try {
    // Inject campaign body into template layout ({{content}} placeholder)
    // If template has no {{content}} placeholder, append body after template
    const mergedHtml = templateHtml.includes("{{content}}")
      ? templateHtml.replace("{{content}}", htmlBody)
      : templateHtml + htmlBody;

    const processedHtml = replaceMergeTags(mergedHtml, vars) + unsubscribeFooter;
    const result = await sendViaOrganization({
      organizationId,
      to: [subscriber.email],
      from,
      subject: replaceMergeTags(subject, vars),
      htmlBody: processedHtml,
      plainBody: replaceMergeTags(plainBody, vars) + `\n\nBerhenti berlangganan: ${unsubscribeUrl}`,
      replyTo,
      tag: `campaign-${campaignId}`,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Campaign-ID": campaignId,
        "X-Subscriber-ID": subscriberId,
      },
    });

    const messageId = result.data?.message_id;
    const recipient = result.data?.messages?.[subscriber.email];

    await prisma.campaignLog.updateMany({
      where: { campaignId, subscriberId },
      data: {
        status: "sent",
        sentAt: new Date(),
        postalMessageId: messageId || null,
        metadata: {
          postalId: recipient?.id,
          postalToken: recipient?.token,
        },
      },
    });

    console.log(`✉️ Sent to ${subscriber.email} (campaign: ${campaignId})`);
  } catch (error) {
    console.error(
      `❌ Failed to send to ${subscriber.email}:`,
      error instanceof Error ? error.message : error
    );

    await prisma.campaignLog.updateMany({
      where: { campaignId, subscriberId },
      data: {
        status: "failed",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    });

    throw error;
  }

  // After each job, check if all logs for this campaign are done
  await checkAndFinalizeCampaign(campaignId);
});

async function checkAndFinalizeCampaign(campaignId: string) {
  const [total, pending] = await Promise.all([
    prisma.campaignLog.count({ where: { campaignId } }),
    prisma.campaignLog.count({
      where: { campaignId, status: { in: ["queued"] } },
    }),
  ]);

  if (total > 0 && pending === 0) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: "sending" },
      data: { status: "sent" },
    });
    console.log(`📬 Campaign ${campaignId} finalized → sent (${total} emails)`);
  }
}

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

console.log("🚀 Email worker started. Waiting for jobs...");
