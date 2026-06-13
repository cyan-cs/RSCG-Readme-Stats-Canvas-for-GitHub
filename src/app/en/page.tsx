import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import { createLandingMetadata } from "@/lib/landing";

export const metadata: Metadata = createLandingMetadata("en");

export default function EnglishLandingPage() {
  return <LandingPage locale="en" />;
}
