import { Queue, Worker } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const emailQueue = new Queue("email-campaign", {
  connection: {
    url: redisUrl,
  },
});

export interface SendEmailJobData {
  campaignId: string;
  subscriberId: string;
  organizationId: string;
  from: string;
  subject: string;
  htmlBody: string;      // campaign body (WYSIWYG)
  templateHtml: string;  // template layout wrapper (contains {{content}})
  plainBody: string;
  replyTo?: string;
}

export function createEmailWorker(
  processor: (job: { data: SendEmailJobData }) => Promise<void>
) {
  return new Worker<SendEmailJobData>("email-campaign", processor, {
    connection: {
      url: redisUrl,
    },
  });
}
