import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { createLandingMetadata } from "@/lib/landing";

export const metadata: Metadata = createLandingMetadata("ja");

export default function JapaneseLandingPage() {
  return <LandingPage locale="ja" />;
}
