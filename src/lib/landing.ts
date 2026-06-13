import type { Metadata } from "next";
import type { Locale } from "@/i18n";

const SITE_URL = "https://rscg.cy-an.net";

type LandingFeature = {
  title: string;
  description: string;
};

type LandingStep = {
  title: string;
  description: string;
};

type LandingFaq = {
  question: string;
  answer: string;
};

export type LandingContent = {
  locale: Locale;
  htmlLocale: string;
  openGraphLocale: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  previewLabel: string;
  previewTitle: string;
  previewStats: [string, string, string];
  previewLanguages: [string, string, string];
  featureHeading: string;
  featureIntro: string;
  features: LandingFeature[];
  stepsHeading: string;
  steps: LandingStep[];
  faqHeading: string;
  faqs: LandingFaq[];
  finalHeading: string;
  finalDescription: string;
  footerDescription: string;
};

export const landingLocales: Locale[] = ["en", "ja", "ko", "zh"];

export const landingContent: Record<Locale, LandingContent> = {
  en: {
    locale: "en",
    htmlLocale: "en",
    openGraphLocale: "en_US",
    metaTitle: "GitHub README Stats Card Generator",
    metaDescription:
      "Design custom GitHub README stats cards with a visual canvas editor. Add contributions, languages, badges, shapes, and more, then publish as SVG.",
    eyebrow: "Visual GitHub profile card builder",
    title: "Create a GitHub README",
    titleAccent: "stats card that feels like yours.",
    description:
      "Build dynamic profile cards in a visual canvas editor. Arrange GitHub stats, contribution graphs, language charts, badges, text, and shapes without editing SVG by hand.",
    primaryCta: "Open the editor",
    secondaryCta: "See how it works",
    previewLabel: "Live README preview",
    previewTitle: "My GitHub Stats",
    previewStats: ["Repositories 42", "Stars 1.2k", "Followers 318"],
    previewLanguages: ["TypeScript", "Python", "CSS"],
    featureHeading: "Everything needed for a distinctive README card",
    featureIntro:
      "Start from a template or design freely, then publish one URL that stays up to date with your GitHub activity.",
    features: [
      {
        title: "Visual canvas editor",
        description:
          "Move, resize, align, and style every element with direct manipulation and grid snapping.",
      },
      {
        title: "Dynamic GitHub data",
        description:
          "Show repositories, commits, stars, followers, languages, and contribution activity.",
      },
      {
        title: "Flexible components",
        description:
          "Combine text, badges, charts, avatars, progress bars, lines, and custom shapes.",
      },
      {
        title: "Ready-made templates",
        description:
          "Begin with layouts for profiles, rankings, activity, and contribution graphs.",
      },
      {
        title: "README-ready SVG",
        description:
          "Publish a lightweight SVG and copy Markdown that links the card from your profile README.",
      },
      {
        title: "Multilingual output",
        description:
          "Use English, Japanese, Korean, or Chinese labels with CJK-aware SVG rendering.",
      },
    ],
    stepsHeading: "From blank canvas to README in three steps",
    steps: [
      {
        title: "Sign in with GitHub",
        description:
          "Connect your account so RSCG can load the public statistics used by your card.",
      },
      {
        title: "Design visually",
        description:
          "Choose a template, add elements, and tune colors, spacing, typography, and layout.",
      },
      {
        title: "Publish and embed",
        description:
          "Publish the card and paste the generated Markdown into your GitHub profile README.",
      },
    ],
    faqHeading: "Frequently asked questions",
    faqs: [
      {
        question: "What is RSCG?",
        answer:
          "RSCG is a visual editor for building dynamic GitHub profile statistics cards for README files.",
      },
      {
        question: "Do I need to write SVG or HTML?",
        answer:
          "No. The editor generates the SVG card and README Markdown from the design you create visually.",
      },
      {
        question: "Does the card update automatically?",
        answer:
          "Published cards request current GitHub statistics when they are viewed, subject to normal caching and GitHub API availability.",
      },
      {
        question: "Which languages are supported?",
        answer:
          "The editor and card labels support English, Japanese, Korean, and Simplified Chinese.",
      },
    ],
    finalHeading: "Make your GitHub profile easier to remember.",
    finalDescription:
      "Open the canvas, choose a template, and publish a custom stats card for your README.",
    footerDescription:
      "A visual canvas editor for dynamic GitHub README statistics cards.",
  },
  ja: {
    locale: "ja",
    htmlLocale: "ja",
    openGraphLocale: "ja_JP",
    metaTitle: "GitHub README 統計カードジェネレーター",
    metaDescription:
      "ビジュアルキャンバスでGitHub README用の統計カードを作成。コントリビューション、使用言語、バッジ、図形などを配置し、SVGとして公開できます。",
    eyebrow: "GitHubプロフィールカードを視覚的に作成",
    title: "自分らしいGitHub README",
    titleAccent: "統計カードを、キャンバスから。",
    description:
      "GitHub統計、コントリビューショングラフ、使用言語、バッジ、テキスト、図形を自由に配置。SVGを手書きせず、ビジュアルエディタで動的なプロフィールカードを作れます。",
    primaryCta: "エディタを開く",
    secondaryCta: "使い方を見る",
    previewLabel: "READMEライブプレビュー",
    previewTitle: "My GitHub Stats",
    previewStats: ["リポジトリ 42", "スター 1.2k", "フォロワー 318"],
    previewLanguages: ["TypeScript", "Python", "CSS"],
    featureHeading: "印象に残るREADMEカードに必要な機能",
    featureIntro:
      "テンプレートから始めても、ゼロから自由に作ってもOK。公開したURLには最新のGitHubアクティビティが反映されます。",
    features: [
      {
        title: "ビジュアルキャンバス",
        description:
          "要素を直接移動・リサイズし、グリッドスナップや整列機能でレイアウトできます。",
      },
      {
        title: "動的なGitHubデータ",
        description:
          "リポジトリ、コミット、スター、フォロワー、使用言語、コントリビューションを表示できます。",
      },
      {
        title: "豊富なコンポーネント",
        description:
          "テキスト、バッジ、チャート、アバター、プログレスバー、線、図形を組み合わせられます。",
      },
      {
        title: "すぐ使えるテンプレート",
        description:
          "プロフィール、ランキング、アクティビティ、草グラフ向けレイアウトから始められます。",
      },
      {
        title: "README向けSVG",
        description:
          "軽量なSVGを公開し、プロフィールREADMEへ貼るMarkdownをそのままコピーできます。",
      },
      {
        title: "多言語表示",
        description:
          "英語、日本語、韓国語、中国語のラベルとCJK対応のSVG描画を利用できます。",
      },
    ],
    stepsHeading: "3ステップでREADMEへ追加",
    steps: [
      {
        title: "GitHubでログイン",
        description:
          "カードに使う公開統計を読み込むため、GitHubアカウントを接続します。",
      },
      {
        title: "画面上でデザイン",
        description:
          "テンプレートや要素を選び、色、余白、文字、レイアウトを調整します。",
      },
      {
        title: "公開して埋め込む",
        description:
          "カードを公開し、生成されたMarkdownをGitHubプロフィールREADMEへ貼り付けます。",
      },
    ],
    faqHeading: "よくある質問",
    faqs: [
      {
        question: "RSCGとは何ですか？",
        answer:
          "GitHubプロフィールREADME用の動的な統計カードを作るビジュアルエディタです。",
      },
      {
        question: "SVGやHTMLを書く必要はありますか？",
        answer:
          "ありません。画面上で作成したデザインからSVGカードとREADME用Markdownを生成します。",
      },
      {
        question: "カードの統計は自動更新されますか？",
        answer:
          "公開カードの表示時に現在のGitHub統計を取得します。通常のキャッシュとGitHub APIの可用性が適用されます。",
      },
      {
        question: "どの言語に対応していますか？",
        answer:
          "エディタとカードのラベルは英語、日本語、韓国語、簡体字中国語に対応しています。",
      },
    ],
    finalHeading: "記憶に残るGitHubプロフィールを作ろう。",
    finalDescription:
      "キャンバスを開き、テンプレートを選んで、README用の統計カードを公開できます。",
    footerDescription:
      "動的なGitHub README統計カードを作成するビジュアルキャンバスエディタ。",
  },
  ko: {
    locale: "ko",
    htmlLocale: "ko",
    openGraphLocale: "ko_KR",
    metaTitle: "GitHub README 통계 카드 생성기",
    metaDescription:
      "비주얼 캔버스에서 GitHub README 통계 카드를 디자인하세요. 기여도, 언어, 배지, 도형 등을 배치하고 SVG로 게시할 수 있습니다.",
    eyebrow: "시각적인 GitHub 프로필 카드 빌더",
    title: "나만의 GitHub README",
    titleAccent: "통계 카드를 캔버스에서 만드세요.",
    description:
      "GitHub 통계, 기여 그래프, 언어 차트, 배지, 텍스트와 도형을 자유롭게 배치하세요. SVG를 직접 작성하지 않고 동적 프로필 카드를 만들 수 있습니다.",
    primaryCta: "에디터 열기",
    secondaryCta: "사용 방법 보기",
    previewLabel: "README 라이브 미리보기",
    previewTitle: "My GitHub Stats",
    previewStats: ["저장소 42", "스타 1.2k", "팔로워 318"],
    previewLanguages: ["TypeScript", "Python", "CSS"],
    featureHeading: "개성 있는 README 카드에 필요한 모든 기능",
    featureIntro:
      "템플릿에서 시작하거나 자유롭게 디자인하고, 최신 GitHub 활동을 보여 주는 하나의 URL로 게시하세요.",
    features: [
      {
        title: "비주얼 캔버스 에디터",
        description:
          "모든 요소를 직접 이동하고 크기를 조절하며 그리드 스냅으로 정렬할 수 있습니다.",
      },
      {
        title: "동적 GitHub 데이터",
        description:
          "저장소, 커밋, 스타, 팔로워, 언어와 기여 활동을 표시할 수 있습니다.",
      },
      {
        title: "유연한 컴포넌트",
        description:
          "텍스트, 배지, 차트, 아바타, 진행 막대, 선과 도형을 조합할 수 있습니다.",
      },
      {
        title: "준비된 템플릿",
        description:
          "프로필, 랭킹, 활동과 기여 그래프용 레이아웃에서 시작할 수 있습니다.",
      },
      {
        title: "README용 SVG",
        description:
          "가벼운 SVG를 게시하고 프로필 README에 넣을 Markdown을 복사할 수 있습니다.",
      },
      {
        title: "다국어 출력",
        description:
          "영어, 일본어, 한국어, 중국어 레이블과 CJK 대응 SVG 렌더링을 지원합니다.",
      },
    ],
    stepsHeading: "세 단계로 README에 추가하세요",
    steps: [
      {
        title: "GitHub로 로그인",
        description:
          "카드에 사용할 공개 통계를 불러오기 위해 GitHub 계정을 연결합니다.",
      },
      {
        title: "시각적으로 디자인",
        description:
          "템플릿과 요소를 선택하고 색상, 간격, 글꼴과 레이아웃을 조정합니다.",
      },
      {
        title: "게시하고 삽입",
        description:
          "카드를 게시한 뒤 생성된 Markdown을 GitHub 프로필 README에 붙여 넣습니다.",
      },
    ],
    faqHeading: "자주 묻는 질문",
    faqs: [
      {
        question: "RSCG는 무엇인가요?",
        answer:
          "GitHub 프로필 README용 동적 통계 카드를 만드는 비주얼 에디터입니다.",
      },
      {
        question: "SVG나 HTML을 작성해야 하나요?",
        answer:
          "아니요. 화면에서 만든 디자인을 바탕으로 SVG 카드와 README Markdown을 생성합니다.",
      },
      {
        question: "카드 통계는 자동으로 업데이트되나요?",
        answer:
          "게시된 카드를 볼 때 현재 GitHub 통계를 요청합니다. 일반적인 캐시와 GitHub API 가용성이 적용됩니다.",
      },
      {
        question: "어떤 언어를 지원하나요?",
        answer:
          "에디터와 카드 레이블은 영어, 일본어, 한국어, 중국어 간체를 지원합니다.",
      },
    ],
    finalHeading: "기억에 남는 GitHub 프로필을 만드세요.",
    finalDescription:
      "캔버스를 열고 템플릿을 선택한 뒤 README용 맞춤 통계 카드를 게시하세요.",
    footerDescription:
      "동적 GitHub README 통계 카드를 위한 비주얼 캔버스 에디터.",
  },
  zh: {
    locale: "zh",
    htmlLocale: "zh-CN",
    openGraphLocale: "zh_CN",
    metaTitle: "GitHub README 统计卡片生成器",
    metaDescription:
      "使用可视化画布设计GitHub README统计卡片。添加贡献图、编程语言、徽章和图形，然后发布为SVG。",
    eyebrow: "可视化GitHub个人资料卡片生成器",
    title: "用画布创建属于你的",
    titleAccent: "GitHub README统计卡片。",
    description:
      "自由排列GitHub统计、贡献图、语言图表、徽章、文字和图形。无需手写SVG，即可创建动态个人资料卡片。",
    primaryCta: "打开编辑器",
    secondaryCta: "查看使用方法",
    previewLabel: "README实时预览",
    previewTitle: "My GitHub Stats",
    previewStats: ["仓库 42", "星标 1.2k", "关注者 318"],
    previewLanguages: ["TypeScript", "Python", "CSS"],
    featureHeading: "打造独特README卡片所需的一切",
    featureIntro:
      "从模板开始或自由设计，然后发布一个随GitHub活动更新的卡片URL。",
    features: [
      {
        title: "可视化画布编辑器",
        description:
          "直接移动、缩放和对齐每个元素，并使用网格吸附快速完成布局。",
      },
      {
        title: "动态GitHub数据",
        description: "展示仓库、提交、星标、关注者、编程语言和贡献活动。",
      },
      {
        title: "灵活的组件",
        description: "组合文字、徽章、图表、头像、进度条、线条和自定义图形。",
      },
      {
        title: "现成模板",
        description: "从个人资料、排名、活动和贡献图等专用布局开始设计。",
      },
      {
        title: "适用于README的SVG",
        description:
          "发布轻量SVG，并复制可直接添加到个人资料README的Markdown。",
      },
      {
        title: "多语言输出",
        description: "支持英语、日语、韩语、中文标签以及适配CJK字体的SVG渲染。",
      },
    ],
    stepsHeading: "三步添加到README",
    steps: [
      {
        title: "使用GitHub登录",
        description: "连接GitHub账号，以加载卡片需要使用的公开统计数据。",
      },
      {
        title: "可视化设计",
        description: "选择模板和元素，调整颜色、间距、字体与布局。",
      },
      {
        title: "发布并嵌入",
        description:
          "发布卡片，然后将生成的Markdown粘贴到GitHub个人资料README。",
      },
    ],
    faqHeading: "常见问题",
    faqs: [
      {
        question: "RSCG是什么？",
        answer:
          "RSCG是一个用于创建GitHub个人资料README动态统计卡片的可视化编辑器。",
      },
      {
        question: "需要编写SVG或HTML吗？",
        answer:
          "不需要。编辑器会根据你在画布中创建的设计生成SVG卡片和README Markdown。",
      },
      {
        question: "卡片数据会自动更新吗？",
        answer:
          "查看已发布卡片时会请求当前GitHub统计数据，并受正常缓存和GitHub API可用性影响。",
      },
      {
        question: "支持哪些语言？",
        answer: "编辑器和卡片标签支持英语、日语、韩语和简体中文。",
      },
    ],
    finalHeading: "创建一个更容易被记住的GitHub主页。",
    finalDescription:
      "打开画布，选择模板，然后为你的README发布自定义统计卡片。",
    footerDescription: "用于创建动态GitHub README统计卡片的可视化画布编辑器。",
  },
};

export function createLandingMetadata(locale: Locale): Metadata {
  const content = landingContent[locale];
  const path = `/${locale}`;
  const languageAlternates = Object.fromEntries(
    landingLocales.map((language) => [language, `/${language}`]),
  );

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: {
      canonical: path,
      languages: {
        ...languageAlternates,
        "x-default": "/en",
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Readme Stats Canvas for GitHub",
      locale: content.openGraphLocale,
      alternateLocale: landingLocales
        .filter((language) => language !== locale)
        .map((language) => landingContent[language].openGraphLocale),
      title: content.metaTitle,
      description: content.metaDescription,
      images: [
        {
          url: "/api/og",
          width: 1200,
          height: 630,
          type: "image/png",
          alt: "RSCG visual GitHub README stats card editor",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.metaTitle,
      description: content.metaDescription,
      images: ["/api/og"],
    },
  };
}

export function createLandingStructuredData(locale: Locale) {
  const content = landingContent[locale];
  const localizedUrl = `${SITE_URL}/${locale}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Readme Stats Canvas for GitHub",
        alternateName: "RSCG",
        url: localizedUrl,
        inLanguage: content.htmlLocale,
      },
      {
        "@type": "WebApplication",
        name: "RSCG",
        url: localizedUrl,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        description: content.metaDescription,
        inLanguage: content.htmlLocale,
        isAccessibleForFree: true,
      },
    ],
  };
}
