export const AGE_BRACKETS = [
  "UNDER_15",
  "15_TO_20",
  "20_TO_25",
  "25_TO_30",
  "30_TO_35",
  "35_TO_40",
  "40_TO_45",
  "45_TO_50",
  "OVER_50",
] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const AGE_BRACKET_LABELS: Record<AgeBracket, string> = {
  UNDER_15: "Dưới 15",
  "15_TO_20": "15 - 20",
  "20_TO_25": "20 - 25",
  "25_TO_30": "25 - 30",
  "30_TO_35": "30 - 35",
  "35_TO_40": "35 - 40",
  "40_TO_45": "40 - 45",
  "45_TO_50": "45 - 50",
  OVER_50: "Trên 50",
};

export const OCCUPATIONS = [
  "STUDENT",
  "OFFICE_WORKER",
  "HIGH_SCHOOL_STUDENT",
  "FREELANCER",
  "BUSINESS_OWNER",
  "FACTORY_WORKER",
  "SELF_EMPLOYED",
] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  STUDENT: "Sinh viên",
  OFFICE_WORKER: "NV văn phòng",
  HIGH_SCHOOL_STUDENT: "Học sinh",
  FREELANCER: "Lao động tự do",
  BUSINESS_OWNER: "Chủ doanh nghiệp",
  FACTORY_WORKER: "Công nhân",
  SELF_EMPLOYED: "Kinh doanh tự do",
};

export const PERSONALITIES = [
  "INTROVERT_NEGATIVE",
  "INTROVERT_POSITIVE",
  "EXTROVERT",
] as const;
export type Personality = (typeof PERSONALITIES)[number];

export const PERSONALITY_LABELS: Record<Personality, string> = {
  INTROVERT_NEGATIVE: "Hướng nội tiêu cực",
  INTROVERT_POSITIVE: "Hướng nội tích cực",
  EXTROVERT: "Hướng ngoại",
};

export const HEART_STATUSES = [
  "LEARN_MORE",
  "VERY_WANTED_LEARN",
  "NOT_INTERESTED",
  "DOUBTFUL",
  "STOP_KEEP_CONTACT",
  "STOP_NO_CONTACT",
  "WANT_BT",
  "VERY_WANT_BT",
  "NOT_WANT_BT_YET",
] as const;
export type HeartStatus = (typeof HEART_STATUSES)[number];

export const HEART_STATUS_LABELS: Record<HeartStatus, string> = {
  LEARN_MORE: "Bình thường – học tiếp",
  VERY_WANTED_LEARN: "Rất muốn – học tiếp",
  NOT_INTERESTED: "Không hứng thú lắm",
  DOUBTFUL: "Hơi nghi ngờ – lo lắng",
  STOP_KEEP_CONTACT: "Dừng lại – giữ liên lạc",
  STOP_NO_CONTACT: "Dừng lại – không giữ liên lạc",
  WANT_BT: "Muốn BT bình thường",
  VERY_WANT_BT: "Rất muốn BT",
  NOT_WANT_BT_YET: "Chưa muốn BT",
};

export const HEART_STATUS_COLORS: Record<HeartStatus, string> = {
  LEARN_MORE: "bg-blue-100 text-blue-800",
  VERY_WANTED_LEARN: "bg-sky-100 text-sky-800",
  NOT_INTERESTED: "bg-gray-100 text-gray-800",
  DOUBTFUL: "bg-yellow-100 text-yellow-800",
  STOP_KEEP_CONTACT: "bg-orange-100 text-orange-800",
  STOP_NO_CONTACT: "bg-red-100 text-red-800",
  WANT_BT: "bg-emerald-100 text-emerald-800",
  VERY_WANT_BT: "bg-green-100 text-green-800",
  NOT_WANT_BT_YET: "bg-purple-100 text-purple-800",
};

export const INTERACTION_TYPES = [
  "MESSAGE",
  "CALL",
  "SHARE_CONTENT",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  MESSAGE: "Nhắn tin",
  CALL: "Gọi điện",
  SHARE_CONTENT: "Chia sẻ nội dung",
};

export const INTERACTION_OUTCOMES = [
  "NONE",
  "SIMPLE",
  "EFFECTIVE",
  "BAPTIZED",
] as const;
export type InteractionOutcome = (typeof INTERACTION_OUTCOMES)[number];

export const ONE_TIME_INTERACTION_OUTCOMES = [
  "SIMPLE",
  "EFFECTIVE",
  "BAPTIZED",
] as const satisfies readonly InteractionOutcome[];

export const INTERACTION_OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  NONE: "Không",
  SIMPLE: "Đơn thuần",
  EFFECTIVE: "Hữu hiệu",
  BAPTIZED: "Đã BT",
};

export const SHARED_CONTENTS = [
  "GM",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B9",
  "B10",
  "B11",
  "B12",
  "B13",
] as const;
export type SharedContent = (typeof SHARED_CONTENTS)[number];

export const SHARED_CONTENT_LABELS: Record<SharedContent, string> = {
  GM: "GM",
  M1: "M1",
  M2: "M2",
  M3: "M3",
  M4: "M4",
  M5: "M5",
  M6: "M6",
  M7: "M7",
  B1: "B1",
  B2: "B2",
  B3: "B3",
  B4: "B4",
  B5: "B5",
  B6: "B6",
  B7: "B7",
  B8: "B8",
  B9: "B9",
  B10: "B10",
  B11: "B11",
  B12: "B12",
  B13: "B13",
};
