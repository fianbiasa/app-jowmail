export interface PostalConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PostalSendOptions {
  to: string[];
  from: string;
  subject: string;
  htmlBody?: string;
  plainBody?: string;
  replyTo?: string;
  tag?: string;
  headers?: Record<string, string>;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface PostalSendResult {
  status: string;
  time: number;
  flags: Record<string, unknown>;
  data: {
    message_id: string;
    messages: Record<string, { id: number; token: string }>;
  };
}

export class PostalClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: PostalConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  async sendMessage(options: PostalSendOptions): Promise<PostalSendResult> {
    const payload: Record<string, unknown> = {
      to: options.to,
      from: options.from,
      subject: options.subject,
    };

    if (options.htmlBody) payload.html_body = options.htmlBody;
    if (options.plainBody) payload.plain_body = options.plainBody;
    if (options.replyTo) payload.reply_to = options.replyTo;
    if (options.tag) payload.tag = options.tag;
    if (options.headers) payload.headers = options.headers;
    payload.track_opens = options.trackOpens !== false;   // default true
    payload.track_clicks = options.trackClicks !== false; // default true

    const response = await fetch(`${this.baseUrl}/api/v1/send/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Server-API-Key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as PostalSendResult;

    if (!response.ok || data.status !== "success") {
      throw new Error(
        `Postal API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return data;
  }

  async getMessage(id: number): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Server-API-Key": this.apiKey,
      },
      body: JSON.stringify({ id, _expansions: true }),
    });

    return response.json();
  }
}

export function createPostalClient(config: PostalConfig): PostalClient {
  return new PostalClient(config);
}
