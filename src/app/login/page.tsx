import type { Metadata } from "next";
import { signIn } from "@/auth";
import { LogIn } from "lucide-react";
import { headers } from "next/headers";
import { resolveLocale, translate, type TranslationKey } from "@/i18n";
import { normalizeCallbackUrl } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Sign in to RSCG",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const acceptLanguage = (await headers()).get("accept-language") || "";
  const locale = resolveLocale(acceptLanguage);
  const t = (key: TranslationKey) => translate(locale, key);
  const callbackUrl = normalizeCallbackUrl((await searchParams).callbackUrl);
  return (
    <div className="min-h-screen bg-[#1e1e24] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121217] rounded-2xl border border-[#2a2a32] p-8 shadow-2xl text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {t("auth.welcome")}
          </h1>
          <p className="text-zinc-400 text-sm">{t("auth.description")}</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 py-3 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-[0.98]"
          >
            <LogIn size={20} />
            {t("auth.signIn")}
          </button>
        </form>

        <div className="pt-4 border-t border-[#2a2a32]">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            {t("auth.securityNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
