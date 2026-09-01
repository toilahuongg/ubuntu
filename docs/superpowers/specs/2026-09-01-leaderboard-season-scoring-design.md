# Design Spec: BXH theo kỳ (tuần/tháng/năm) + điểm cầu nguyện và điểm SĐT mới

**Date:** 2026-09-01
**Author:** Claude (gstack /spec)
**Status:** Approved (đã duyệt qua hội thoại)

## Problem Statement

BXH hiện chỉ tính theo **tháng**, cộng 3 nguồn điểm (`task_reward`, `task_streak_bonus_reward`, `customer_interaction_reward`) từ sổ `PointTransaction` — `leaderboard-service.ts:59-92`. Thiếu:

1. Điểm cầu nguyện đúng trọng số mong muốn (đang 10đ/lượt mặc định theo `task.pointReward`).
2. Điểm cho việc đưa SĐT mới vào hệ thống (+5đ cho người liên kết).
3. BXH theo tuần và theo năm; xem lại BXH các kỳ cũ trong năm.
4. Hệ số chuỗi 7/14/21/28 ngày là ×2/×3/×4/×5 — cần đổi thành ×0.5/×1/×1.5/×2.
5. Top KVT phải đứng trước Top Địa vực; bảng không có hoặc chỉ có 1 phần tử phải ẩn.

## Current State (verified 2026-09-01)

| Thành phần | Hiện tại | Vị trí |
|---|---|---|
| Tổng hợp BXH | Theo tháng duy nhất, `$match` 3 nguồn + `$group` theo userId | `src/lib/services/leaderboard-service.ts:59-132` |
| 7 bảng BXH | Thứ tự: Top Khu vực → Top Địa vực → TĐM → TĐ → NTĐ → ĐVT-NQL → Top KVT; limit 10 | `src/app/(app)/leaderboard/page.tsx:28-71` |
| Điểm nhiệm vụ | `countAwarded × task.pointReward` (mặc định 10đ, admin chỉnh được) | `src/lib/tasks/submission-service.ts:470-505`, `src/lib/tasks/constants.ts:2` |
| Chuỗi | DAILY_PER_MEMBER, mốc [7,14,21,28], hệ số ×2/×3/×4/×5, reset theo tháng, chống cộng trùng | `src/lib/tasks/streaks.ts:5-11,99-146` |
| Học viên | Không có trường SĐT; `caregiverIds` tối đa 3; tạo học viên không có điểm | `src/lib/models/customer.ts`, `src/lib/services/customer-service.ts:520-552` |
| XP | Sổ riêng `XpTransaction`, nhiệm vụ vẫn cộng XP theo `expReward` | `src/lib/models/xp-transaction.ts` |
| Tuần (maxPerWeek) | CN→T7 qua `getWeekRangeFromDateKey(dateKey, 7)` | `src/lib/dates.ts:58-77` |

## Architecture

### 1. Luật điểm cầu nguyện: 1đ/lượt

`src/lib/tasks/submission-service.ts:470-472`:

- Tính `effectivePointReward = normalizeTaskType(task.taskType) === "COUNT_TOTAL" ? 1 : task.pointReward`.
- `totalPoints = countAwarded × effectivePointReward` — áp cho cả tăng lẫn giảm (mode `set` giảm lượt → trừ đối xứng 1đ/lượt).
- XP giữ nguyên (`totalExp = countAwarded × expReward` như cũ).
- Nhiệm vụ `DAILY_PER_MEMBER` / `WEEKLY_PER_MEMBER` / `MONTHLY_PER_MEMBER` giữ nguyên luật điểm cũ.
- `COUNT_TOTAL` vẫn KHÔNG tham gia chuỗi (điều kiện `task.taskType !== "DAILY_PER_MEMBER"` ở `streaks.ts:102` giữ nguyên).

### 2. Điểm SĐT mới: +5đ cho người liên kết

**Schema** (`src/lib/models/customer.ts`):

```
phone: { default: null, trim: true, type: String }
```

- Sparse unique index trên `phone` (nhiều record `null` hợp lệ).
- Chuẩn hoá trước khi lưu/so khớp: strip mọi ký tự không phải chữ số (`normalizePhone` mới trong `src/lib/validation.ts`).

**Tạo học viên** (`src/lib/services/customer-service.ts:520-552`):

- Nếu `phone` non-empty:
  - Tồn tại học viên khác cùng phone → throw `"SĐT đã tồn tại."` — KHÔNG tạo học viên.
  - Phone mới → ghi `PointTransaction` cho **mỗi caregiver được gán** lúc tạo: `amount: 5`, `source: "new_customer_reward"`, `sourceId` = customerId, `description: "SĐT mới: <tên học viên>"`; đồng thời `$inc pointBalance: 5` cho từng người nhận. Không cộng XP.
  - Nếu `assignment.caregiverIds` rỗng → người tạo (`createdBy`) nhận 5đ.
- Không có phone → tạo bình thường, không cộng điểm.
- `updateCustomer` đổi caregiver → **điểm đi theo caregivers hiện tại** (amendment 2026-09-01, thay cho "không hồi tố" ban đầu): ghi giao dịch điều chỉnh dạng delta (±), KHÔNG xoá/sửa giao dịch cũ — BXH các tháng trước giữ nguyên, sự dịch chuyển nằm trong kỳ hiện tại:
  - SĐT mới: người bị gỡ −5 (description "Thu hồi SĐT mới: <tên>"), người mới thêm +5 — chỉ áp dụng nếu học viên đã từng được thưởng SĐT (tồn tại tx `new_customer_reward` của học viên đó); bất biến: mỗi caregiver hiện tại giữ net +5.
  - Chăm sóc học viên: mỗi interaction của học viên → target = caregivers hiện tại (nếu rỗng → fallback người tạo tương tác); người bị gỡ −score, người mới +score cho cả điểm (`customer_interaction_reward`) lẫn XP (`customer_interaction`); recalc level qua `getLevelFromXp` + `grantLevelUnlocks` khi lên level.
  - Danh sách caregiver không đổi (chỉ đổi team/zone/region hoặc phone) → không phát sinh giao dịch.

**Nguồn điểm** (`src/lib/models/point-transaction.ts:10-16`): thêm `"new_customer_reward"` vào `POINT_SOURCES`. Pattern `deleteModel` khi enum đổi đã có sẵn trong file — giữ nguyên.

### 3. Hệ số chuỗi: ×0.5/×1/×1.5/×2

`src/lib/tasks/streaks.ts:6-11`:

```
TASK_STREAK_BONUS_MULTIPLIERS = { 7: 0.5, 14: 1, 21: 1.5, 28: 2 }
```

- Một bảng chung, áp dụng cả XP lẫn điểm BXH (quyết định của user — D7).
- `bonus = floor(reward) × multiplier`. Nhiệm vụ 10đ: chuỗi 7 ngày → +5đ (+5 XP); 14 → +10; 21 → +15; 28 → +20.
- Giữ nguyên: mốc [7,14,21,28], phạm vi DAILY_PER_MEMBER, reset theo tháng, chống cộng trùng (dedupe theo description + periodKey, `submission-service.ts:527-583`).

### 4. BXH theo kỳ: tuần / tháng / năm

**Types + helper** (thêm trong `src/lib/services/leaderboard-service.ts` hoặc `src/lib/dates.ts`):

```
type LeaderboardPeriod = "week" | "month" | "year";
type PeriodRange = { start: Date; end: Date }; // [start, end)
```

- Key kỳ: week = `YYYY-MM-DD` (ngày bắt đầu tuần), month = `YYYY-MM`, year = `YYYY`.
- `resolvePeriodRange(period, periodKey)` (timezone app — `getAppTimezone()`):
  - week: `getWeekRangeFromDateKey(periodKey, 6)` (ISO weekday 6 = Thứ Bảy) → tuần **T7 → T6**; `start = fromZonedTime(startStr T00:00)`, `end = start + 7 ngày`.
  - month: logic từ `buildMonthlyPointsPipeline` hiện tại (`fromZonedTime("${ym}-01T00:00")` → đầu tháng kế).
  - year: `fromZonedTime("${y}-01-01T00:00")` → `fromZonedTime("${y+1}-01-01T00:00")`.

**Tổng hợp:**

- Đổi `buildMonthlyPointsPipeline(yearMonth)` → `buildPeriodPointsPipeline(range)` (giữ nguyên 3 nguồn `$match`, đổi `$match createdAt` theo range).
- Migrate 3 call sites: `getTopUsersByMonthlyXp` (đổi tên → `getTopUsersByPeriodPoints`), `getRoleLeaderboardRankAndScore` (`leaderboard-service.ts:424-475`), aggregate region/zone trong `getTopRegions`/`getTopZones` (`leaderboard-service.ts:162-279`).
- Tất cả hàm export `getTop*` + `getUserLeaderboardResult` nhận `(period: LeaderboardPeriod, periodKey: string)`; mặc định = kỳ hiện tại.
- `getDttClassLeaderboard` (BXH lớp DT) KHÔNG đổi.

**Giới hạn lịch sử — `listSelectablePeriods(period, now)`:**

- week: các tuần có ngày bắt đầu nằm trong năm hiện tại và ≤ hôm nay (không có tương lai).
- month: `01` → tháng hiện tại của năm nay.
- year: chỉ năm hiện tại.
- Chức năng "xem kỳ cũ" thay cho mũi tên chuyển vị trí (user đã chọn bỏ mũi tên — D8).

### 5. UI: thứ tự bảng + bộ chọn kỳ + ẩn bảng rỗng

**Đổi thứ tự bảng** (`src/app/(app)/leaderboard/page.tsx:28-71`):

```
regions (Top Khu vực) → leads (Top KVT) → zones (Top Địa vực) → tdm → members → ngv → zone-leads
```

**Bộ chọn kỳ:** dropdown `period` (Tuần | Tháng | Năm) + danh sách kỳ hợp lệ từ `listSelectablePeriods`; query params `?period=week&key=<weekKey>&board=<board>` (giữ tham số `board` hiện có). Kỳ mặc định: hiện tại.

**Luật ẩn bảng ≤1 phần tử:** với kỳ đang chọn, nếu entries của bảng ≤ 1 → ẩn tab trong `LeaderboardBoardSelect` và ẩn section trên trang. Áp dụng ĐÚNG 3 bảng: `regions` (Top Khu vực), `zones` (Top Địa vực), `zone-leads` (Top ĐVT-NQL). `leads` (Top KVT) và 3 bảng thành viên (tdm/members/ngv) LUÔN hiển thị. Thanh kết quả cá nhân không bị ảnh hưởng.

## Tiêu chí nghiệm thu

1. Tick 1 lượt nhiệm vụ cầu nguyện (`COUNT_TOTAL`) → `PointTransaction` +1đ, XP vẫn cộng theo `expReward` cũ.
2. Giảm 5 lượt cầu nguyện (mode `set`) → một transaction −5đ.
3. Tạo học viên có SĐT mới + 2 caregiver → mỗi caregiver +5đ (`new_customer_reward`), pointBalance tăng đúng.
4. Tạo học viên với SĐT đã tồn tại → throw, không tạo, không ai được điểm.
5. Học viên không SĐT → tạo thành công, 0 điểm.
6. Tạo học viên không gán caregiver → createdBy nhận 5đ.
7. Nhiệm vụ daily đạt chuỗi 7 ngày → +`pointReward × 0.5` điểm và +`expReward × 0.5` XP; nộp lại cùng ngày không cộng trùng.
8. BXH tuần T7→T6 tính đúng transaction từ 00:00 Thứ Bảy → 23:59 Thứ Sáu (timezone app), kể cả tuần vắt qua ranh giới tháng.
9. BXH tháng/năm tính đúng theo lịch dương; năm = 1/1 → 31/12.
10. Chọn tuần/tháng cũ trong năm nay → BXH đúng của kỳ đó; kỳ ngoài năm nay hoặc tương lai không chọn được.
11. Top KVT hiển thị trước Top Địa vực ở cả bộ chọn bảng và trang.
12. Kỳ có ≤1 phần tử: tab + section của Top Khu vực / Top Địa vực / Top ĐVT-NQL bị ẩn; Top KVT + 3 bảng thành viên vẫn hiển thị.
13. Bộ test hiện có (`leaderboard-service.test.ts`, `submission-service.test.ts`, `streak-points.test.ts`, `transaction-source.test.ts`, `streaks.test.ts`) được cập nhật và xanh.

## Testing

| Tầng | Nội dung | Số lượng |
|---|---|---|
| Unit | `calculateTaskStreakBonus` hệ số mới (4 mốc × XP/điểm) | +4 |
| Unit | `resolvePeriodRange`: tuần T7→T6 vắt qua ranh giới tháng; năm nhuận 29/2; ranh giới timezone | +3 |
| Unit | `normalizePhone` + `listSelectablePeriods` | +3 |
| Integration | Tạo học viên: SĐT mới/trùng/thiếu × caregiver/createdBy | +5 |
| Integration | Cầu nguyện: tăng/giảm lượt, mode `set` | +3 |
| Regression | Nguồn điểm cũ không đếm nhầm khi đổi kỳ; BXH tháng hiện tại khớp kết quả cũ (trừ luật 1đ) | +2 |

**Test cũ cần cập nhật:** mock `getCurrentYearMonth` trong `leaderboard-service.test.ts:18` thay bằng mock range của kỳ; test nguồn điểm thêm case `new_customer_reward` trong `transaction-source.test.ts`.

## Migration

Không cần script migration:

- Field `phone` MongoDB tự thêm; sparse unique index được Mongoose tạo khi model load lần đầu sau deploy.
- Dữ liệu điểm cũ giữ nguyên — BXH kỳ quá khứ phản ánh đúng giao dịch đã ghi lúc đó (không áp hồi tố luật 1đ).
- Đổi `POINT_SOURCES` → pattern `deleteModel` sẵn có tự nạp lại model với enum mới.

## Rollback

- Revert PR là đủ (schema chỉ cộng thêm).
- Nếu thưởng SĐT ghi sai → xoá transaction theo `source: "new_customer_reward"` + `sourceId`, đối chiếu pattern `reverseCustomerInteractionRewards` (`customer-service.ts:462-517`).

## Ước lượng

| Hạng mục | Công việc |
|---|---|
| §1 Điểm cầu nguyện | ~1h — nhánh `COUNT_TOTAL` + test |
| §2 SĐT mới | ~4h — schema + validation + reward + test |
| §3 Hệ số chuỗi | ~0.5h — 1 hằng số + test |
| §4 Kỳ BXH | ~5h — pipeline + `resolvePeriodRange` + `listSelectablePeriods` + migrate hàm get* + test |
| §5 UI | ~3.5h — thứ tự bảng, bộ chọn kỳ, luật ẩn bảng |
| **Tổng** | **~14h** |

## Files Affected

| File | Change |
|------|--------|
| `src/lib/tasks/submission-service.ts:470` | Nhánh 1đ cho `COUNT_TOTAL` |
| `src/lib/models/customer.ts` | Thêm `phone` + sparse unique index |
| `src/lib/models/point-transaction.ts:10-16` | Thêm nguồn `new_customer_reward` |
| `src/lib/services/customer-service.ts:520` | Chuẩn hoá SĐT, check trùng, thưởng caregiver, `$inc pointBalance` |
| `src/lib/validation.ts` | `normalizePhone` |
| `src/lib/tasks/streaks.ts:6-11` | Đổi bảng hệ số |
| `src/lib/services/leaderboard-service.ts` | `resolvePeriodRange`, `buildPeriodPointsPipeline`, `listSelectablePeriods`, migrate get* + personal result |
| `src/lib/dates.ts` | (Nếu đặt `resolvePeriodRange` ở đây) |
| `src/app/(app)/leaderboard/page.tsx:28-71` | Thứ tự bảng, bộ chọn kỳ, luật ẩn bảng |
| `src/app/(app)/leaderboard/leaderboard-board-select.tsx` | Ẩn tab theo luật ≤1 |
| Test tương ứng | Cập nhật + bổ sung |

## Out of Scope

- Mũi tên chuyển vị trí (so sánh kỳ trước) — user chọn "xem kỳ cũ" thay thế.
- Đổi điểm chăm sóc học viên (SIMPLE 50 / EFFECTIVE 100 / BAPTIZED 1000) hay XP nhiệm vụ.
- BXH các năm trước năm hiện tại.
- Thêm caregiver/phone sau khi tạo mà học viên CHƯA từng được thưởng SĐT → không phát sinh thưởng SĐT (chỉ áp dụng bất invariant với học viên đã có tx thưởng).
- Bảng BXH riêng cho `TEAM_LEAD` (CS - ĐL) — hiện chưa tồn tại.

## Quyết định chi tiết (edge cases — từ codex quality gate 8/10)

1. **Tính nguyên tố ghi điểm SĐT mới:** ghi tuần tự theo pattern hiện có (`customer-interaction-service.ts:244-296` — ghi `PointTransaction` rồi `$inc pointBalance`), KHÔNG dùng MongoDB transaction. Nếu ghi điểm fail sau khi học viên đã tạo → học viên vẫn tồn tại, điểm thiếu; sửa bằng ghi bù theo `sourceId` (không auto-retry trong request).
2. **Rollout index phone:** field mới → mọi customer hiện có `phone = null`; sparse unique index build không thể xung đột khi deploy.
3. **Chuẩn hoá phone:** chỉ strip non-digit và so sánh chuỗi số; KHÔNG chuẩn hoá mã quốc gia / số 0 đầu (out of scope).
4. **Query param sai:** `period` ngoài {week, month, year} → rơi về `month`; `key` sai định dạng hoặc nằm ngoài `listSelectablePeriods` → clamp về kỳ hiện tại của period đó.
5. **`board` trỏ vào bảng bị ẩn:** fallback về bảng hiển thị đầu tiên theo thứ tự mới (regions → leads → zones → tdm → members → ngv → zone-leads); 3 bảng thành viên luôn hiển thị nên luôn có fallback hợp lệ.
6. **Backward compat hàm export:** cutover sạch — `getTop*` + `getUserLeaderboardResult` đổi chữ ký thành `(period, periodKey)`; caller production duy nhất là `src/app/(app)/leaderboard/page.tsx:121` (+ `page.test.ts`, `leaderboard-service.test.ts`) — cập nhật hết, KHÔNG giữ shim/alias.
7. **Lệnh test + ngưỡng:** `npm test` (`vitest run`) phải xanh 100% — không chấp nhận skip test.
