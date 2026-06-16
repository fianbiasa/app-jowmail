export const PLANS = {
  free: {
    label: "Free",
    quotaSubscribers: 500,
    quotaEmailsPerMonth: 5_000,
  },
  starter: {
    label: "Starter",
    quotaSubscribers: 5_000,
    quotaEmailsPerMonth: 50_000,
  },
  pro: {
    label: "Pro",
    quotaSubscribers: 25_000,
    quotaEmailsPerMonth: 250_000,
  },
  unlimited: {
    label: "Unlimited",
    quotaSubscribers: -1,
    quotaEmailsPerMonth: -1,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function isUnlimited(quota: number) {
  return quota === -1;
}

export function formatQuota(quota: number) {
  return quota === -1 ? "Unlimited" : quota.toLocaleString("id-ID");
}
