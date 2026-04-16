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
    payload: { icon: "👑" },
    cost: 500,
    unlockLevel: null,
  },
  {
    code: "prefix_sword",
    name: "Thanh kiếm",
    description: "Chiến binh dũng mãnh.",
    slot: "prefix",
    rarity: "rare",
    payload: { icon: "⚔️" },
    cost: 200,
    unlockLevel: null,
  },
  {
    code: "prefix_dragon",
    name: "Rồng thiêng",
    description: "Cấp cao độc quyền.",
    slot: "prefix",
    rarity: "legendary",
    payload: { icon: "🐉" },
    cost: null,
    unlockLevel: 20,
  },
  {
    code: "prefix_star",
    name: "Ngôi sao",
    description: "Ngôi sao sáng.",
    slot: "prefix",
    rarity: "common",
    payload: { icon: "🌟" },
    cost: 100,
    unlockLevel: null,
  },
  {
    code: "prefix_fire",
    name: "Ngọn lửa",
    description: "Nhiệt huyết rực cháy.",
    slot: "prefix",
    rarity: "rare",
    payload: { icon: "🔥" },
    cost: 300,
    unlockLevel: null,
  },

  // Suffix
  {
    code: "suffix_sparkle",
    name: "Lấp lánh",
    description: "Hào quang bé xinh.",
    slot: "suffix",
    rarity: "common",
    payload: { icon: "✨" },
    cost: 100,
    unlockLevel: null,
  },
  {
    code: "suffix_comet",
    name: "Sao chổi",
    description: "Đuôi sao lướt nhanh.",
    slot: "suffix",
    rarity: "rare",
    payload: { icon: "💫" },
    cost: 200,
    unlockLevel: null,
  },
  {
    code: "suffix_trophy",
    name: "Cúp vàng",
    description: "Quán quân tháng.",
    slot: "suffix",
    rarity: "epic",
    payload: { icon: "🏆" },
    cost: null,
    unlockLevel: 10,
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
];

async function main() {
  await connectToDatabase();

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

  console.log(`Seeded cosmetics: ${created} created, ${updated} updated.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
