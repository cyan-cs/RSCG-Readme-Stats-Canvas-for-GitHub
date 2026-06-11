"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n";

export default function LangSetter({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
