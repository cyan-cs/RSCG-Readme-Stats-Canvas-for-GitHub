# RSCG - GitHub 프로필 통계 카드 캔버스

**RSCG**는 동적이고 고도로 커스터마이징 가능한 GitHub 프로필 통계 카드를 만들기 위한 시각적 에디터입니다. 몇 초 만에 자신만의 카드를 디자인하고 GitHub README에 직접 호스팅하세요.

[English](../../README.md) | [日本語](../ja/README.md) | [简体中文](../ch/README.md) | 한국어

---

### 주요 기능

- **시각적 드래그 앤 드롭 에디터**: 캔버스에서 직관적으로 요소를 배치하고 편집할 수 있습니다.
- **다양한 위젯**:
  - **GitHub 통계**: 커밋, 스타, 리포지토리, 팔로워 수.
  - **기여 히트맵**: 익숙한 GitHub "잔디" 시각화.
  - **언어 분포**: 주로 사용하는 프로그래밍 언어 동적 분석.
  - **커스텀 요소**: 배지, 진행 바, 도형, 아바타, 텍스트.
- **스마트 레이아웃**: 8px 그리드 스냅, 다중 선택, 실행 취소/다시 실행(Undo/Redo) 지원.
- **템플릿 시스템**: 사전 정의된 템플릿을 사용하거나 자신만의 디자인을 저장하세요.
- **다국어 지원**: 브라우저 설정에 따라 영어, 일본어, 중국어, 한국어를 자동으로 지원합니다.
- **CJK 폰트 지원**: SVG 렌더링 시 Noto Sans CJK 폰트를 사용하여 한중일 텍스트를 고품질로 표시합니다.
- **고성능**: ETag 캐싱 및 304 Not Modified 지원을 통해 최적화된 SVG 렌더링을 제공합니다.

### 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS 4
- **데이터베이스**: SQLite (`better-sqlite3` 사용)
- **인증**: Auth.js v5 (GitHub Provider)
- **아이콘**: Lucide React

---

## 시작하기

### 요구 사항

- Node.js 20.9.0 이상
- npm 10 이상

### 로컬 개발

1. **저장소 클론**:

   ```bash
   git clone https://github.com/cyan-cs/RSCG-Readme-Stats-Canvas-for-GitHub.git
   cd RSCG-Readme-Stats-Canvas-for-GitHub
   ```

2. **의존성 설치**:

   ```bash
   npm install
   ```

3. **환경 변수 설정**:
   예시 파일을 복사하여 `.env` 파일을 생성합니다.

   ```bash
   cp .env.example .env
   ```

   GitHub OAuth 자격 증명 및 기타 필요한 변수를 입력하세요.

4. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

### Docker 설정

1. **이미지 빌드**:

   ```bash
   docker build -t profilecanvas .
   ```

2. **컨테이너 실행**:
   ```bash
   docker run -p 3000:3000 \
     --env-file .env \
     -v $(pwd)/data:/app/data \
     profilecanvas
   ```
   _참고: 카드 데이터베이스를 유지하려면 `/app/data` 볼륨 마운트가 필요합니다._

---

## 환경 변수

| 변수명               | 설명                                               |
| -------------------- | -------------------------------------------------- |
| `AUTH_GITHUB_ID`     | GitHub OAuth App Client ID                         |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret                     |
| `AUTH_SECRET`        | 세션 암호화를 위한 랜덤 문자열                     |
| `AUTH_URL`           | 배포 환경의 기본 URL                               |
| `GITHUB_TOKEN`       | (선택 사항) API 속도 제한을 늘리기 위한 GitHub PAT |

---

## 📜 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다. 자세한 내용은 [LICENSE](../../LICENSE) 파일을 참조하세요.
