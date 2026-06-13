import Link from "next/link";
import type { Locale } from "@/i18n";
import {
  createLandingStructuredData,
  landingContent,
  landingLocales,
} from "@/lib/landing";

const languageNames: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
};

function FeatureIcon({ index }: { index: number }) {
  const paths = [
    <path key="canvas" d="M4 5h16v14H4zM8 9h8M8 13h5" />,
    <path key="chart" d="M5 19V9m5 10V5m5 14v-7m4 7H3" />,
    <path
      key="blocks"
      d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
    />,
    <path key="template" d="M5 4h14v16H5zM5 9h14M10 9v11" />,
    <path key="code" d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-10-2 12" />,
    <path
      key="globe"
      d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2 0 3.5-4 3.5-9S14 3 12 3s-3.5 4-3.5 9 1.5 9 3.5 9ZM3 12h18"
    />,
  ];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[index]}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function LandingPage({ locale }: { locale: Locale }) {
  const content = landingContent[locale];
  const structuredData = createLandingStructuredData(locale);

  return (
    <div className="min-h-screen overflow-hidden bg-[#09090f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <header className="relative z-20 border-b border-white/8 bg-[#09090f]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 font-bold tracking-tight"
            aria-label="RSCG home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-700 text-sm font-black shadow-[0_10px_30px_rgba(124,58,237,0.35)]">
              R
            </span>
            <span>
              RSCG
              <span className="ml-2 hidden text-xs font-medium text-zinc-500 sm:inline">
                Readme Stats Canvas
              </span>
            </span>
          </Link>

          <nav
            aria-label="Language selection"
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
          >
            {landingLocales.map((language) => (
              <Link
                key={language}
                href={`/${language}`}
                hrefLang={language}
                lang={landingContent[language].htmlLocale}
                aria-current={language === locale ? "page" : undefined}
                className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:px-3 ${
                  language === locale
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {languageNames[language]}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,0.22),transparent_34%),radial-gradient(circle_at_85%_40%,rgba(88,166,255,0.12),transparent_32%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.02fr_0.98fr] lg:py-36">
            <div>
              <p className="mb-6 inline-flex items-center rounded-full border border-violet-400/25 bg-violet-500/8 px-4 py-2 text-xs font-bold tracking-[0.16em] text-violet-200 uppercase">
                {content.eyebrow}
              </p>
              <h1 className="max-w-4xl text-4xl leading-[1.06] font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                {content.title}
                <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
                  {content.titleAccent}
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
                {content.description}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold shadow-[0_16px_45px_rgba(124,58,237,0.32)] transition-colors hover:bg-violet-500"
                >
                  {content.primaryCta}
                  <ArrowIcon />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-bold text-zinc-200 transition-colors hover:bg-white/[0.08]"
                >
                  {content.secondaryCta}
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-10 rounded-full bg-violet-600/15 blur-3xl" />
              <div className="relative rounded-3xl border border-white/10 bg-[#111119] p-3 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-2 border-b border-white/8 px-3 pb-3 text-[11px] font-medium text-zinc-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2">{content.previewLabel}</span>
                </div>
                <div className="mt-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="text-xl font-bold text-[#58a6ff]">
                        {content.previewTitle}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        github.com/octocat
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-sky-500 text-sm font-black">
                      OC
                    </div>
                  </div>
                  <div className="mt-7 grid grid-cols-3 gap-2">
                    {content.previewStats.map((stat) => (
                      <div
                        key={stat}
                        className="rounded-lg border border-white/7 bg-white/[0.025] px-2 py-3 text-center text-[10px] font-semibold text-zinc-300 sm:text-xs"
                      >
                        {stat}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-zinc-800">
                    <span className="w-[58%] bg-[#3178c6]" />
                    <span className="w-[27%] bg-[#3572A5]" />
                    <span className="w-[15%] bg-[#663399]" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-zinc-400 sm:text-xs">
                    {content.previewLanguages.map((language, index) => (
                      <span
                        key={language}
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            ["bg-[#3178c6]", "bg-[#3572A5]", "bg-[#663399]"][
                              index
                            ]
                          }`}
                        />
                        {language}
                      </span>
                    ))}
                  </div>
                  <div className="mt-7 grid grid-cols-12 gap-1">
                    {Array.from({ length: 60 }, (_, index) => (
                      <span
                        key={index}
                        className={`aspect-square rounded-[2px] ${
                          index % 11 === 0
                            ? "bg-[#39d353]"
                            : index % 5 === 0
                              ? "bg-[#26a641]"
                              : index % 3 === 0
                                ? "bg-[#0e4429]"
                                : "bg-[#161b22]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/7 bg-white/[0.018]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-5xl">
                {content.featureHeading}
              </h2>
              <p className="mt-5 text-base leading-8 text-zinc-400">
                {content.featureIntro}
              </p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {content.features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-white/8 bg-[#101017] p-6 transition-colors hover:border-violet-400/25"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <FeatureIcon index={index} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl scroll-mt-10 px-5 py-20 sm:px-8 sm:py-28"
        >
          <h2 className="max-w-3xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            {content.stepsHeading}
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {content.steps.map((step, index) => (
              <article
                key={step.title}
                className="relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.04] to-transparent p-7"
              >
                <span className="text-6xl font-black text-white/[0.045]">
                  0{index + 1}
                </span>
                <h3 className="-mt-3 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/7 bg-[#0d0d14]">
          <div className="mx-auto max-w-4xl px-5 py-20 sm:px-8 sm:py-28">
            <h2 className="text-center text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              {content.faqHeading}
            </h2>
            <div className="mt-12 space-y-3">
              {content.faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-white/8 bg-white/[0.025] px-6 py-5"
                >
                  <summary className="cursor-pointer list-none pr-8 font-bold marker:hidden">
                    {faq.question}
                    <span className="float-right text-violet-300 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(124,58,237,0.28),transparent_50%)]" />
          <div className="relative mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
            <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              {content.finalHeading}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-zinc-400">
              {content.finalDescription}
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-4 text-sm font-bold shadow-[0_16px_45px_rgba(124,58,237,0.32)] transition-colors hover:bg-violet-500"
            >
              {content.primaryCta}
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 bg-[#07070b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-bold text-zinc-300">RSCG</p>
            <p className="mt-1">{content.footerDescription}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/editor" className="hover:text-white">
              {content.primaryCta}
            </Link>
            <a
              href="https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub"
              rel="noreferrer"
              className="hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
