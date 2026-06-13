import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { createLandingMetadata } from "@/lib/landing";

export const metadata: Metadata = createLandingMetadata("zh");

export default function ChineseLandingPage() {
  return <LandingPage locale="zh" />;
}
