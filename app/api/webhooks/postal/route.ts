import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Postal webhook event payload shape (simplified)
interface PostalMessage {
  id: number;
  token: string;
  direction: string;
  message_id: string;
  to: string;
  from: string;
  subject: string;
  timestamp: number;
}

interface PostalWebhookPayload {
  event: string;
  timestamp: number;
  payload: {
    message?: PostalMessage;
    original_message?: PostalMessage; // present in MessageBounced
    bounce?: { id: number; subject?: string; to?: string };
    details?: string;
    url?: string;
    ip_address?: string;
    user_agent?: string;
  };
}

export async function POST(request: NextRequest) {
  // Rate limit: 300 req/min per IP (Postal can send bursts)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`ratelimit:webhook:${ip}`, 300, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: PostalWebhookPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Store raw event for audit
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      eventType: body.event,
      payload: body as object,
    },
  });

  try {
    await processWebhookEvent(body);

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // Return 200 so Postal doesn't retry indefinitely for processing errors
  }

  return NextResponse.json({ received: true });
}

async function processWebhookEvent(body: PostalWebhookPayload) {
  const { event, payload } = body;

  // MessageBounced uses original_message.token; all others use message.token
  const token = payload.original_message?.token ?? payload.message?.token;
  if (!token) return;

  const log = await prisma.campaignLog.findFirst({
    where: {
      metadata: {
        path: ["postalToken"],
        equals: token,
      },
    },
    include: { subscriber: true },
  });

  if (!log) return;

  const now = new Date();

  switch (event) {
    case "MessageSent":
      await prisma.campaignLog.update({
        where: { id: log.id },
        data: { status: "sent", sentAt: now },
      });
      break;

    case "MessageDelivered":
      await prisma.campaignLog.update({
        where: { id: log.id },
        data: { status: "delivered", deliveredAt: now },
      });
      break;

    case "MessageLoaded":
      // Only update if not already clicked (preserve highest engagement state)
      if (!["clicked"].includes(log.status)) {
        await prisma.campaignLog.update({
          where: { id: log.id },
          data: { status: "opened", openedAt: now },
        });
      }
      break;

    case "MessageLinkClicked":
      await prisma.campaignLog.update({
        where: { id: log.id },
        data: {
          status: "clicked",
          clickedAt: now,
          metadata: {
            ...(log.metadata as object),
            clickedUrl: payload.url,
            clickIp: payload.ip_address,
          },
        },
      });
      break;

    case "MessageBounced":
      await prisma.campaignLog.update({
        where: { id: log.id },
        data: {
          status: "bounced",
          bounceReason: payload.bounce?.subject || payload.details || "Hard bounce",
        },
      });
      // Mark subscriber as bounced
      await prisma.subscriber.update({
        where: { id: log.subscriberId },
        data: { status: "bounced" },
      });
      break;

    case "MessageComplained":
      await prisma.campaignLog.update({
        where: { id: log.id },
        data: { status: "complained" },
      });
      // Mark subscriber as complained (unsubscribe them)
      await prisma.subscriber.update({
        where: { id: log.subscriberId },
        data: { status: "complained" },
      });
      break;

    default:
      break;
  }
}
