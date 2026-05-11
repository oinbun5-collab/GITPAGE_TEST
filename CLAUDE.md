# GITPAGE_TEST — Personal Wiki + Two-Site Publishing System

옵시디언(Obsidian) Vault 겸 개인 위키. **단일 마크다운 source → 두 개 GitHub Pages 사이트로 빌드**.

---

## 폴더 구조

```
/
├── RAW/                 ← 사용자가 raw 자료 던지는 곳 (입력함)
│   └── _archived/       ← 정리 완료 후 원본 이동지
├── WIKI/                ← 정리된 최종 .md 파일 저장소 (single source of truth)
├── INDEX.md             ← 전체 목록 (최신순 + 카테고리별)
├── README.md            ← 사용자용 사용 설명서
├── CLAUDE.md            ← 이 파일 (에이전트 동작 규칙)
│
├── sites/
│   ├── public/          ← 🌸 사이트 A — Astro + Fuwari 테마
│   │                       구독자용 공개 사이트. publish: true 파일만 빌드.
│   │                       Pretendard 한글 폰트, Buttondown 뉴스레터 임베드.
│   │
│   └── personal/        ← 📓 사이트 B — Quartz v4
│                           본인용 공개 블로그. WIKI 전체 빌드. 그래프뷰/백링크.
│
├── scripts/
│   └── sync-wiki.mjs    ← WIKI/ → 각 사이트의 content/ 디렉토리 동기화
│
└── .github/workflows/
    ├── deploy-public.yml    ← 사이트 A 배포 (Astro)
    └── deploy-personal.yml  ← 사이트 B 배포 (Quartz)
```

---

## 두 사이트 구분 (핵심 개념)

| 사이트 | 역할 | 어떤 파일이 노출되나 | URL |
|--------|------|--------------------|-----|
| **public** (사이트 A) | 구독자 모집용 / 공개 마케팅 | frontmatter `publish: true` 인 파일만 | `negalab.github.io/GITPAGE_TEST/` (메인) |
| **personal** (사이트 B) | 본인 공개 블로그 / 전체 노출 | WIKI 전체 | `negalab.github.io/GITPAGE_TEST/notes/` (서브경로) |

> ⚠️ 두 사이트 모두 **공개**입니다. "personal"이라는 이름은 "본인 색깔" 의미일 뿐, 누구나 URL 알면 볼 수 있음. 정말 비공개로 두고 싶은 글은 RAW에 두거나 별도 vault로 관리.

---

## 트리거 단어

### RAW 정리 트리거
- "정리해" / "정리해줘"
- "RAW 정리"
- "위키화"
- "wiki it"

### 동기화/배포 트리거
- "동기화" / "sync" → `scripts/sync-wiki.mjs` 실행 (WIKI → 두 사이트의 content)
- "배포" / "deploy" / "올려" → git push (사용자 명시 확인 후)
- "공개해" + 파일명 → 해당 WIKI 파일의 frontmatter `publish: true`로 변경

---

## 정리 파이프라인 (RAW → WIKI)

### Step 1: RAW 폴더 스캔
- `RAW/*.md` 파일 전부 읽기 (`_archived/` 하위는 제외)
- 비어있으면 사용자에게 알리고 종료

### Step 2: 각 파일에 대해 처리

1. **내용 분석** → 카테고리 자동 분류 (아래 카테고리 표 참조)
2. **제목 추출** → 첫 H1, 또는 핵심 주제 한 줄로 명명
3. **파일명 생성** → `{kebab-case-title}.md` (영어/한글 혼용 OK, 공백은 `-`로)
4. **요약 생성** → 1-2 문장 한국어 요약 (INDEX 표시용)
5. **태그 추출** → 본문에서 핵심 키워드 3-5개
6. **frontmatter 부착** (아래 포맷 참조) — `publish: false` 기본값
7. **본문 정제** → 오타 수정, 구조화 (헤딩/리스트), 옵시디언 wiki-link `[[]]` 활용
8. **WIKI/{filename}.md 로 저장**
9. **원본 RAW 파일을 RAW/_archived/{원본파일명}로 이동** (mv 사용, 삭제 금지)

### Step 3: INDEX.md 갱신
- 새 항목을 "최신순" 표 맨 위에 삽입
- 해당 카테고리 섹션에도 추가 (없으면 새 섹션 생성)
- `🔓` 또는 `🔒` 아이콘으로 publish 상태 표시
- 갱신 후 사용자에게 결과 보고

---

## Frontmatter 포맷 (모든 WIKI 항목 필수)

```yaml
---
title: "{사람이 읽는 제목}"
category: "{카테고리 1개}"
tags: [tag1, tag2, tag3]
raw_source: "RAW/_archived/{원본파일명}"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
summary: "{1-2문장 한국어 요약}"
publish: false   # 공개 사이트(A)에 노출 여부. 기본 false. true로 바꾸면 사이트 A 빌드에 포함됨.
cover: ""        # (선택) 공개 사이트 썸네일/오픈그래프 이미지 경로
---
```

### `publish` 플래그 동작

- `publish: false` (기본값) → **personal 사이트에만** 노출 (전체 공개 블로그 B)
- `publish: true` → **public 사이트(A)에도** 노출 + personal 사이트(B)에도 노출
- 어떤 글을 "공개해"라고 사용자가 지정하면 → 해당 파일의 `publish: true`로 변경 + INDEX.md 아이콘 갱신

---

## 카테고리 자동 분류 규칙

| 카테고리 | 분류 키워드 / 내용 |
|---------|-----------------|
| `AI` | LLM, GPT, Claude, 프롬프트, 에이전트, ML, 모델 |
| `Tech` | 코드, 개발, 프레임워크, 도구, CLI, 라이브러리 |
| `Business` | 사업, 매출, 마케팅, 고객, 전략, 수익 |
| `Education` | 강의, 학습, 책, 튜토리얼, 강좌 기획 |
| `Content` | 유튜브, 블로그, 글쓰기, 영상 기획, 썸네일 |
| `Personal` | 일상, 생각, 일기, 회고, 관계 |
| `Reference` | 링크 모음, 자료, 인용, 외부 출처 |
| `Idea` | 아이디어, 초안, 브레인스토밍, 미완성 |

새 카테고리가 더 적합하면 만들어도 됨. 단, INDEX.md 카테고리 섹션도 같이 추가.

---

## 파일명 규칙

- 형식: `{kebab-case}.md`
- 한글 가능 (옵시디언 wiki-link 호환)
- 공백 → `-` 치환
- 특수문자 제거 (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
- 중복 시: `{name}-2.md`, `{name}-3.md` 식으로 suffix

---

## INDEX.md 갱신 방법

INDEX.md는 두 섹션 + publish 상태 표시:

### 1. "최신순" 섹션 — 표 형식

```markdown
| 추가일 | 제목 | 카테고리 | 공개 | 요약 | 원본 |
|--------|------|---------|------|------|------|
| 2026-05-04 | [[wiki-system-design]] | Reference | 🔓 | RAW→WIKI 파이프라인 정리 | [원본](RAW/_archived/...) |
```

`🔓` = `publish: true` (사이트 A 노출), `🔒` = `publish: false` (사이트 B만)

### 2. "카테고리별" 섹션 — 카테고리당 하위 리스트

```markdown
## AI
- 🔓 [[claude-code-skills]] — Claude Code의 스킬 시스템 정리
- 🔒 [[gpt5-review]] — ...
```

---

## 옵시디언 호환 규칙

- 모든 항목 간 참조는 `[[파일명]]` (확장자 제외) 사용
- 외부 링크는 `[텍스트](URL)` 표준 마크다운
- Tag는 frontmatter `tags:` 배열 + 본문 끝 `#tag` 양쪽 다
- 이미지/첨부는 `WIKI/_assets/` 하위에 저장

---

## 마이그레이션 상태 (GitHub Pages → Cloudflare Pages)

### 현황
- **현재**: GitHub Pages 배포 중
  - sites/public → `negalab.github.io/GITPAGE_TEST/`
  - sites/personal → `negalab.github.io/GITPAGE_TEST/notes/`
- **목표**: Cloudflare Pages로 이전 (서버 함수 활성화 필요)
- **이유**: 결제, 데이터베이스, 이메일 등 서버 기능 필요 (GitHub Pages는 정적 호스팅만 가능)
- **우선순위**: 1) 인프라 마이그레이션 완료 → 2) Toss Payments 통합

### Cloudflare Pages 설정값 (미배포)
| 사이트 | Framework | Build 명령어 | Output | 목표 URL |
|--------|-----------|-------------|--------|---------|
| public (A) | Astro | `npm run build` | `sites/public/dist` | `{project}.pages.dev` |
| personal (B) | Static (Quartz v4) | `cd sites/personal && npx quartz build` | `sites/personal/_site` | `{project}-personal}.pages.dev` |

### TODO
- [ ] Cloudflare 계정 생성
- [ ] GitHub 리포지토리 연동 (GITPAGE_TEST)
- [ ] sites/public Cloudflare Pages 배포
- [ ] sites/personal Cloudflare Pages 배포
- [ ] 도메인 설정 (선택사항)
- [ ] GitHub Actions 워크플로우 수정 (GitHub Pages → Cloudflare Pages)
- [ ] Toss Payments 테스트 모드 연동 (별도 PR)

---

## 동기화 / 빌드 / 배포

### 로컬 개발

```bash
# 사이트 A (public) 로컬 미리보기
cd sites/public && npm run dev   # http://localhost:4321

# 사이트 B (personal) 로컬 미리보기
cd sites/personal && npx quartz build --serve   # http://localhost:8080
```

### 동기화 (WIKI → 사이트 content)

```bash
node scripts/sync-wiki.mjs
```

이 스크립트가 하는 일:
1. WIKI/*.md 전체 → `sites/personal/content/`로 복사
2. WIKI/*.md 중 `publish: true`만 → `sites/public/src/content/posts/`로 복사
3. 각 사이트의 build 호환 형식으로 frontmatter 변환

### 배포

`main` 브랜치에 push되면 GitHub Actions가 두 사이트 모두 자동 빌드/배포.

---

## 안 하는 것 (해선 안 되는 행동)

- ❌ RAW 원본 **삭제** — 무조건 `_archived/`로 이동
- ❌ INDEX.md 전체 재생성 — 항상 **증분 갱신**
- ❌ 기존 WIKI 파일 덮어쓰기 — 같은 주제면 사용자에게 "병합/새파일/스킵?" 묻기
- ❌ 카테고리 무한 증식
- ❌ `git push` 자동 실행 — 항상 사용자 명시 확인 후
- ❌ frontmatter `publish` 값을 **사용자 동의 없이** true로 변경 — 공개는 의도적 결정
