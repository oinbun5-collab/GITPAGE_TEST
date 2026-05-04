---
title: "위키 시스템 설계 메모"
category: "Reference"
tags: [wiki, obsidian, workflow, claude-code, system-design]
raw_source: "RAW/_archived/sample-wiki-system-note.md"
created: "2026-05-04"
updated: "2026-05-04"
summary: "RAW→WIKI 파이프라인 핵심 아이디어 정리. RAW는 입력함, Claude가 정리, WIKI에 저장, INDEX로 추적."
publish: false
cover: ""
---

# 위키 시스템 설계 메모

> 2026-05-04 작성. RAW→WIKI 파이프라인의 기본 사상 기록.

## 핵심 컨셉

**RAW = 받은편지함**. 형식 신경 쓰지 않고 막 던져 넣는 곳. 메모, 링크, 정리 안 된 텍스트 모두 허용.

**Claude = 정리자**. RAW의 raw input을 읽고 frontmatter + 정제된 본문 + 카테고리로 변환.

**WIKI = 정본 저장소**. 정리된 `.md`만 들어감. 옵시디언이 직접 읽는 디렉토리.

**`_archived/` = 원본 백업**. 정리 후 원본은 삭제하지 않고 `RAW/_archived/`로 이동. 추적성 보장.

## INDEX.md 구조 (이중 뷰)

| 뷰 | 용도 |
|----|------|
| 최신순 표 | "최근에 뭘 추가했지?" 빠른 확인 |
| 카테고리별 리스트 | "AI 관련 자료만 보고 싶다" 주제 탐색 |

같은 항목이 양쪽에 동시 등장 — 사용자가 어떤 모드로 탐색하든 닿을 수 있게.

## 옵시디언 연동

- `[[wiki-link]]` 문법으로 항목 간 참조 → 그래프뷰 자동 생성
- frontmatter `tags:` 배열 → 옵시디언 태그 패널에서 필터링
- 이 폴더 자체를 Vault로 열기 → 별도 동기화 불필요

## 트리거

사용자가 "정리해" / "정리해줘" / "RAW 정리" / "위키화" / "wiki it" 중 하나를 말하면 파이프라인 가동.

## 향후 검토

- RAW에 PDF/이미지가 들어오면? → 현재는 `.md`로만 받음. 필요 시 OCR/추출 단계 추가 검토.
- WIKI 항목이 많아지면 폴더 분할 필요? → 100개 넘어가면 카테고리별 서브폴더 검토.
- 자동화 가능한 부분? → cron이나 Claude Code hook으로 RAW에 파일 추가 시 자동 트리거 검토 가능.

#wiki #obsidian #workflow #claude-code #system-design
