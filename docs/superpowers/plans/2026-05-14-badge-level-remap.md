# Badge Level Remap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the visible badge progression from 18 available source designs to the 12 configured levels, then refresh sword-bearing high-level badges.

**Architecture:** Keep application logic stable: `src/lib/level-utils.ts` already exposes 12 levels and resolves gendered files under `/badges/badge-N-gender.png`. Normalize the asset set by replacing the 12 public badge files with the approved source mapping and regenerate the preview sheet from those canonical files.

**Tech Stack:** Next.js app assets under `public/`, Vitest for level mapping tests, ImageMagick/Pillow-style image tooling for preview generation, built-in imagegen skill for regenerated sword badge art.

---

### Task 1: Lock 12-Level Contract

**Files:**
- Test: `src/lib/level-utils.test.ts`

- [x] **Step 1: Write/confirm the test**

```ts
it("returns all 12 configured levels with the requested gendered path", () => {
  const levels = getAllLevelInfos("female");

  expect(levels).toHaveLength(12);
  expect(levels[0]?.icon).toBe("/badges/badge-1-female.png");
  expect(levels[11]).toMatchObject({
    icon: "/badges/badge-12-female.png",
    nameEn: "Heavenly Realm Steward",
    nameVi: "Tổng Quản Thiên Giới",
  });
});
```

- [x] **Step 2: Run the focused test**

Run: `npm test -- src/lib/level-utils.test.ts`

Expected: pass before asset work, proving the code contract is already 12 levels.

### Task 2: Normalize Badge Files

**Files:**
- Modify: `public/badges/badge-1..12-{male,female}.png`
- Keep: `public/badges/badge-13..18-{male,female}.png` as unused source/reference files unless cleanup is requested later.

- [x] **Step 1: Back up current assets**

```bash
mkdir -p public/badges/_archive-18-source
cp public/badges/badge-*-male.png public/badges/badge-*-female.png public/badges/_archive-18-source/
```

- [x] **Step 2: Apply approved 18-to-12 visual mapping**

```text
level 1  <- old badge 1
level 2  <- old badge 2
level 3  <- old badge 3
level 4  <- old badge 4
level 5  <- old badge 5
level 6  <- old badge 6
level 7  <- old badge 8
level 8  <- old badge 9
level 9  <- old badge 10
level 10 <- old badge 12
level 11 <- old badge 15
level 12 <- old badge 18
```

Copy both `male` and `female` variants into canonical `badge-1..12` names.

### Task 3: Regenerate Sword Badges

**Files:**
- Modify: `public/badges/badge-9-{male,female}.png`
- Modify: `public/badges/badge-10-{male,female}.png`
- Modify: `public/badges/badge-11-{male,female}.png`
- Modify: `public/badges/badge-12-{male,female}.png`

- [x] **Step 1: Use imagegen for high-level sword-bearing angel badges**

Generate polished chibi angel bust badges matching the current 640x709 transparent PNG style: centered character, wings, ornate robe/crown progression, shield/book where appropriate, elegant sword visible but not oversized, no text.

- [x] **Step 2: Save accepted outputs into the canonical badge filenames**

Preserve transparent PNG format and approximate original dimensions.

### Task 4: Preview And Verify

**Files:**
- Modify: `public/badges/_preview-sheet.png`

- [x] **Step 1: Regenerate the preview sheet from canonical badge files**

Render the 12 male badges and 12 female badges in order so level progression can be visually checked.

- [x] **Step 2: Run tests**

Run: `npm test -- src/lib/level-utils.test.ts`

Expected: all tests pass.
