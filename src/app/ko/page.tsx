import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { createLandingMetadata } from "@/lib/landing";

export const metadata: Metadata = createLandingMetadata("ko");

export default function KoreanLandingPage() {
  return <LandingPage locale="ko" />;
}
