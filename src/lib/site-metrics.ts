import { getSiteMetrics, incrementSiteMetric } from "./storage";

export const SITE_METRIC_KEYS = {
  successfulSignIns: "auth.successful_sign_ins",
} as const;

export interface PublicSiteMetrics {
  successfulSignIns: number;
}

export async function recordSuccessfulSignIn(): Promise<number> {
  return incrementSiteMetric(SITE_METRIC_KEYS.successfulSignIns);
}

export async function getPublicSiteMetrics(): Promise<PublicSiteMetrics> {
  const values = await getSiteMetrics(Object.values(SITE_METRIC_KEYS));
  return {
    successfulSignIns: values[SITE_METRIC_KEYS.successfulSignIns] || 0,
  };
}

export function formatMetricCount(value: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.trunc(value)));
}
