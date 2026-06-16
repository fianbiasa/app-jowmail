export type OrganizationRole = "owner" | "admin" | "member";

export type SubscriberStatus =
  | "subscribed"
  | "unsubscribed"
  | "bounced"
  | "complained";

export type CampaignStatus =
  | "draft"
  | "queued"
  | "sending"
  | "sent"
  | "paused"
  | "failed";

export type CampaignLogStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed";

export interface DashboardStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
}
