import dotenv from "dotenv";
dotenv.config();

import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/mongoose";
import { CosmeticModel } from "@/lib/models";

type SeedItem = {
  code: string;
  name: string;
  description: string;
  slot: "prefix" | "suffix" | "color" | "effect";
  rarity: "common" | "rare" | "epic" | "legendary";
  payload: {
    icon?: string | null;
    cssClass?: string | null;
    gradient?: string[] | null;
  };
  cost: number | null;
  unlockLevel: number | null;
};

const ITEMS: SeedItem[] = [
  // Prefix
  {
    code: "prefix_crown",
    name: "Vương miện",
    description: "Biểu tượng vua của team.",
    slot: "prefix",
    rarity: "epic",
    payload: { icon: "/cosmetics/prefix-crown.png" },
    cost: 500,
    unlockLevel: null,
  },
  {
    code: "prefix_sword",
    name: "Thanh kiếm",
    description: "Chiến binh dũng mãnh.",
    slot: "prefix",
    rarity: "rare",
    payload: { icon: "/cosmetics/prefix-sword.png" },
    cost: 200,
    unlockLevel: null,
  },
  {
    code: "prefix_galaxy",
    name: "Ngân hà",
    description: "Dành cho người chơi chạm tới tầng sao cao hơn.",
    slot: "prefix",
    rarity: "legendary",
    payload: { icon: "/cosmetics/galaxy-core.png" },
    cost: null,
    unlockLevel: 20,
  },
  {
    code: "prefix_star",
    name: "Ngôi sao",
    description: "Ngôi sao sáng.",
    slot: "prefix",
    rarity: "common",
    payload: { icon: "/cosmetics/starburst-gold.png" },
    cost: 100,
    unlockLevel: null,
  },
  {
    code: "prefix_fire",
    name: "Ngọn lửa",
    description: "Nhiệt huyết rực cháy.",
    slot: "prefix",
    rarity: "rare",
    payload: { icon: "/cosmetics/prefix-fire.png" },
    cost: 300,
    unlockLevel: null,
  },
  {
    code: "prefix_shield",
    name: "Khiên bạc",
    description: "Vững vàng và bền bỉ.",
    slot: "prefix",
    rarity: "common",
    payload: { icon: "/cosmetics/prefix-shield.png" },
    cost: 120,
    unlockLevel: null,
  },
  {
    code: "prefix_moon",
    name: "Trăng non",
    description: "Điềm tĩnh và bí ẩn.",
    slot: "prefix",
    rarity: "rare",
    payload: { icon: "/cosmetics/prefix-moon.png" },
    cost: 260,
    unlockLevel: null,
  },
  {
    code: "prefix_lotus",
    name: "Liên hoa",
    description: "Thanh nhã nhưng khó bỏ qua.",
    slot: "prefix",
    rarity: "epic",
    payload: { icon: "/cosmetics/prefix-lotus.png" },
    cost: 650,
    unlockLevel: null,
  },
  {
    code: "prefix_diamond",
    name: "Sao băng",
    description: "Một vệt sáng lướt qua là đủ gây chú ý.",
    slot: "prefix",
    rarity: "epic",
    payload: { icon: "/cosmetics/comet-trail.png" },
    cost: 900,
    unlockLevel: null,
  },
  {
    code: "prefix_thunder",
    name: "Tinh vân",
    description: "Vệt sáng dữ dội giữa khoảng tối của vũ trụ.",
    slot: "prefix",
    rarity: "legendary",
    payload: { icon: "/cosmetics/nebula-violet.png" },
    cost: null,
    unlockLevel: 12,
  },

  // Suffix
  {
    code: "suffix_sparkle",
    name: "Lấp lánh",
    description: "Hào quang bé xinh.",
    slot: "suffix",
    rarity: "common",
    payload: { icon: "/cosmetics/suffix-sparkle.png" },
    cost: 100,
    unlockLevel: null,
  },
  {
    code: "suffix_comet",
    name: "Sao chổi",
    description: "Đuôi sáng kéo dài phía sau tên.",
    slot: "suffix",
    rarity: "rare",
    payload: { icon: "/cosmetics/comet-orbit.png" },
    cost: 200,
    unlockLevel: null,
  },
  {
    code: "suffix_trophy",
    name: "Cúp vàng",
    description: "Quán quân tháng.",
    slot: "suffix",
    rarity: "epic",
    payload: { icon: "/cosmetics/suffix-trophy.png" },
    cost: null,
    unlockLevel: 10,
  },
  {
    code: "suffix_leaf",
    name: "Lá ngọc",
    description: "Nhẹ mà vẫn nổi bật.",
    slot: "suffix",
    rarity: "common",
    payload: { icon: "/cosmetics/suffix-leaf.png" },
    cost: 120,
    unlockLevel: null,
  },
  {
    code: "suffix_wave",
    name: "Thủy triều",
    description: "Dịu mà có lực.",
    slot: "suffix",
    rarity: "rare",
    payload: { icon: "/cosmetics/suffix-wave.png" },
    cost: 260,
    unlockLevel: null,
  },
  {
    code: "suffix_snow",
    name: "Băng tuyết",
    description: "Mát lạnh và sắc nét.",
    slot: "suffix",
    rarity: "rare",
    payload: { icon: "/cosmetics/suffix-snow.png" },
    cost: 280,
    unlockLevel: null,
  },
  {
    code: "suffix_wings",
    name: "Quỹ đạo",
    description: "Một vòng quỹ đạo nhỏ ôm theo tên hiển thị.",
    slot: "suffix",
    rarity: "epic",
    payload: { icon: "/cosmetics/orbit-ring.png" },
    cost: 750,
    unlockLevel: null,
  },
  {
    code: "suffix_heart",
    name: "Tim sao",
    description: "Nhỏ xinh nhưng đủ làm người khác nhớ.",
    slot: "suffix",
    rarity: "epic",
    payload: { icon: "/cosmetics/suffix-heart.png" },
    cost: 820,
    unlockLevel: null,
  },
  {
    code: "suffix_medal",
    name: "Siêu tân tinh",
    description: "Dấu ấn bùng nổ dành cho hành trình rất dài.",
    slot: "suffix",
    rarity: "legendary",
    payload: { icon: "/cosmetics/supernova-burst.png" },
    cost: null,
    unlockLevel: 18,
  },

  // Color
  {
    code: "color_gold",
    name: "Vàng kim",
    description: "Gradient vàng sang trọng.",
    slot: "color",
    rarity: "rare",
    payload: {
      cssClass: "cn-gradient-gold",
      gradient: ["#ffd700", "#ff9a00"],
    },
    cost: 500,
    unlockLevel: null,
  },
  {
    code: "color_rainbow",
    name: "Cầu vồng",
    description: "Bảy sắc cầu vồng.",
    slot: "color",
    rarity: "epic",
    payload: { cssClass: "cn-gradient-rainbow" },
    cost: 1200,
    unlockLevel: null,
  },
  {
    code: "color_neon_blue",
    name: "Neon xanh",
    description: "Xanh điện phát sáng.",
    slot: "color",
    rarity: "rare",
    payload: {
      cssClass: "cn-gradient-neon",
      gradient: ["#00eaff", "#0066ff"],
    },
    cost: 600,
    unlockLevel: null,
  },
  {
    code: "color_fire",
    name: "Lửa đỏ",
    description: "Gradient lửa cháy.",
    slot: "color",
    rarity: "rare",
    payload: {
      cssClass: "cn-gradient-fire",
      gradient: ["#ff4d00", "#ffd000"],
    },
    cost: 600,
    unlockLevel: null,
  },
  {
    code: "color_emerald",
    name: "Lục bảo",
    description: "Xanh ngọc sạch và sang.",
    slot: "color",
    rarity: "common",
    payload: {
      gradient: ["#00b894", "#55efc4"],
    },
    cost: 220,
    unlockLevel: null,
  },
  {
    code: "color_sakura",
    name: "Hồng đào",
    description: "Tone mềm nhưng không nhạt.",
    slot: "color",
    rarity: "common",
    payload: {
      gradient: ["#ff7eb3", "#ff758c"],
    },
    cost: 240,
    unlockLevel: null,
  },
  {
    code: "color_ocean",
    name: "Thiên hà lam",
    description: "Xanh chuyển tầng như dải sáng ngoài không gian.",
    slot: "color",
    rarity: "rare",
    payload: {
      gradient: ["#36d1dc", "#5b86e5"],
    },
    cost: 480,
    unlockLevel: null,
  },
  {
    code: "color_sunset",
    name: "Hoàng hôn",
    description: "Cam đỏ ấm và giàu năng lượng.",
    slot: "color",
    rarity: "rare",
    payload: {
      gradient: ["#fa709a", "#fee140"],
    },
    cost: 520,
    unlockLevel: null,
  },
  {
    code: "color_amethyst",
    name: "Tinh vân tím",
    description: "Màu tím hồng gợi cảm giác của một đám mây sao.",
    slot: "color",
    rarity: "epic",
    payload: {
      gradient: ["#7f00ff", "#e100ff"],
    },
    cost: 880,
    unlockLevel: null,
  },
  {
    code: "color_aurora",
    name: "Cực quang sao",
    description: "Dải màu chuyển mượt như bầu trời xuyên ngân hà.",
    slot: "color",
    rarity: "epic",
    payload: {
      gradient: ["#43e97b", "#38f9d7", "#667eea"],
    },
    cost: 1100,
    unlockLevel: null,
  },
  {
    code: "color_void",
    name: "Vũ trụ sâu",
    description: "Bảng màu tối cho cảm giác nhìn thẳng vào khoảng không sao trời.",
    slot: "color",
    rarity: "legendary",
    payload: {
      gradient: ["#0f172a", "#312e81", "#9333ea"],
    },
    cost: null,
    unlockLevel: 14,
  },

  // Effect
  {
    code: "effect_glow",
    name: "Phát sáng",
    description: "Hào quang quanh tên.",
    slot: "effect",
    rarity: "common",
    payload: { cssClass: "cn-glow" },
    cost: 400,
    unlockLevel: null,
  },
  {
    code: "effect_shimmer",
    name: "Lấp lánh",
    description: "Tia sáng chạy qua chữ.",
    slot: "effect",
    rarity: "epic",
    payload: { cssClass: "cn-shimmer" },
    cost: 2000,
    unlockLevel: null,
  },
  {
    code: "effect_pulse",
    name: "Nhịp đập",
    description: "Tên co giãn theo nhịp.",
    slot: "effect",
    rarity: "rare",
    payload: { cssClass: "cn-pulse" },
    cost: 800,
    unlockLevel: null,
  },
  {
    code: "effect_rainbow_hue",
    name: "Đổi màu cầu vồng",
    description: "Hoạt ảnh xoay màu liên tục — chỉ cho cấp cao.",
    slot: "effect",
    rarity: "legendary",
    payload: { cssClass: "cn-rainbow" },
    cost: null,
    unlockLevel: 15,
  },
  {
    code: "effect_soft_glow",
    name: "Hào quang mềm",
    description: "Một lớp sáng nhẹ, dễ phối với mọi màu.",
    slot: "effect",
    rarity: "common",
    payload: { cssClass: "cn-glow" },
    cost: 250,
    unlockLevel: null,
  },
  {
    code: "effect_heartbeat",
    name: "Nhịp tim",
    description: "Hiệu ứng co giãn rõ hơn cho tên hiển thị.",
    slot: "effect",
    rarity: "rare",
    payload: { cssClass: "cn-pulse" },
    cost: 950,
    unlockLevel: null,
  },
  {
    code: "effect_starlight",
    name: "Ánh sao quét",
    description: "Một đường sáng lướt qua đều đặn.",
    slot: "effect",
    rarity: "epic",
    payload: { cssClass: "cn-shimmer" },
    cost: 1450,
    unlockLevel: null,
  },
  {
    code: "effect_prism",
    name: "Ngân hà xoay",
    description: "Tên đổi màu liên tục như một dải ngân hà đang chuyển động.",
    slot: "effect",
    rarity: "legendary",
    payload: { cssClass: "cn-rainbow" },
    cost: null,
    unlockLevel: 22,
  },
];

export async function seedCosmetics() {
  let created = 0;
  let updated = 0;

  for (const item of ITEMS) {
    const existing = await CosmeticModel.findOne({ code: item.code });
    if (existing) {
      await CosmeticModel.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: item.name,
            description: item.description,
            slot: item.slot,
            rarity: item.rarity,
            payload: item.payload,
            cost: item.cost,
            unlockLevel: item.unlockLevel,
            active: true,
          },
        },
      );
      updated += 1;
    } else {
      await CosmeticModel.create({ ...item, active: true });
      created += 1;
    }
  }

  return { created, updated, total: ITEMS.length };
}

async function main() {
  await connectToDatabase();
  const result = await seedCosmetics();
  console.log(
    `Seeded cosmetics: ${result.created} created, ${result.updated} updated, ${result.total} total.`,
  );
  await mongoose.disconnect();
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
