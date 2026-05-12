export interface LevelInfo {
  level: number;
  icon: string;
  nameVi: string;
  nameEn: string;
  description: string;
}

const LEVEL_INFO: LevelInfo[] = [
  {
    level: 1,
    icon: "/badges/badge-1.png",
    nameVi: "Người Tập Sự",
    nameEn: "Novice Attendant",
    description: "Người tập sự, học tập tấm lòng vâng phục và lắng nghe.",
  },
  {
    level: 2,
    icon: "/badges/badge-2.png",
    nameVi: "Người Hầu Sự",
    nameEn: "Servant Attendant",
    description: "Thực hiện các nhiệm vụ đơn giản, hỗ trợ các thiên sứ cấp cao.",
  },
  {
    level: 3,
    icon: "/badges/badge-3.png",
    nameVi: "Sứ Giả Tân Binh",
    nameEn: "Rookie Messenger",
    description: "Bắt đầu truyền đạt các thông điệp nhỏ.",
  },
  {
    level: 4,
    icon: "/badges/badge-4.png",
    nameVi: "Hộ Vệ Tập Sự",
    nameEn: "Novice Guardian",
    description: "Bắt đầu bảo vệ cá nhân hoặc gia đình được giao.",
  },
  {
    level: 5,
    icon: "/badges/badge-5.png",
    nameVi: "Thiên Sứ Sơ Cấp",
    nameEn: "Junior Angel",
    description: "Chính thức được công nhận là thiên sứ và phục vụ trong thiên giới.",
  },
  {
    level: 6,
    icon: "/badges/badge-6.png",
    nameVi: "Thiên Sứ Hộ Mệnh",
    nameEn: "Guardian Angel",
    description: "Bảo vệ con người và đồng hành, hướng dẫn họ.",
  },
  {
    level: 7,
    icon: "/badges/badge-7.png",
    nameVi: "Thiên Sứ Truyền Tin",
    nameEn: "Herald Angel",
    description: "Mang các thông điệp quan trọng từ Thiên Đàng đến nhân gian.",
  },
  {
    level: 8,
    icon: "/badges/badge-8.png",
    nameVi: "Thiên Sứ Chữa Lành",
    nameEn: "Healing Angel",
    description: "Mang đến sự an ủi, chữa lành và hy vọng cho mọi người.",
  },
  {
    level: 9,
    icon: "/badges/badge-9.png",
    nameVi: "Thiên Sứ Chiến Binh",
    nameEn: "Warrior Angel",
    description: "Chiến đấu chống lại các thế lực tăm tối, bảo vệ sự bình an.",
  },
  {
    level: 10,
    icon: "/badges/badge-10.png",
    nameVi: "Đội Trưởng Thiên Sứ",
    nameEn: "Angel Captain",
    description: "Chỉ huy một nhóm thiên sứ nhỏ, hoàn thành các nhiệm vụ được giao.",
  },
  {
    level: 11,
    icon: "/badges/badge-11.png",
    nameVi: "Chỉ Huy Thiên Quân",
    nameEn: "Heavenly Host Commander",
    description: "Lãnh đạo nhiều đội thiên sứ, điều phối các nhiệm vụ lớn hơn.",
  },
  {
    level: 12,
    icon: "/badges/badge-12.png",
    nameVi: "Tổng Quản Thiên Giới",
    nameEn: "Heavenly Realm Steward",
    description: "Quản lý và điều phối các công việc trong thiên giới.",
  },
];

const MAX_CONFIGURED_LEVEL = LEVEL_INFO.length;

export function getLevelInfo(level: number, gender: string = "male"): LevelInfo {
  const g = gender === "female" ? "female" : "male";
  const cappedLevel = Math.min(Math.max(Math.floor(level), 1), MAX_CONFIGURED_LEVEL);
  const info = LEVEL_INFO[cappedLevel - 1] ?? LEVEL_INFO[0]!;
  return { ...info, icon: `/badges/badge-${info.level}-${g}.png` };
}

export function getAllLevelInfos(gender: string = "male"): LevelInfo[] {
  const g = gender === "female" ? "female" : "male";
  return LEVEL_INFO.map(info => ({ ...info, icon: `/badges/badge-${info.level}-${g}.png` }));
}
