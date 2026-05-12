import { describe, expect, it } from "vitest";

import { getAllLevelInfos, getLevelInfo } from "@/lib/level-utils";

describe("level-utils", () => {
  it("returns angel level names with gendered badge paths", () => {
    expect(getLevelInfo(1, "male")).toMatchObject({
      icon: "/badges/badge-1-male.png",
      level: 1,
      nameEn: "Novice Attendant",
      nameVi: "Người Tập Sự",
    });

    expect(getLevelInfo(12, "female")).toMatchObject({
      icon: "/badges/badge-12-female.png",
      level: 12,
      nameEn: "Heavenly Realm Steward",
      nameVi: "Tổng Quản Thiên Giới",
    });
  });

  it("caps levels above 12 at the final angel badge", () => {
    expect(getLevelInfo(20, "female")).toEqual({
      description: "Quản lý và điều phối các công việc trong thiên giới.",
      icon: "/badges/badge-12-female.png",
      level: 12,
      nameEn: "Heavenly Realm Steward",
      nameVi: "Tổng Quản Thiên Giới",
    });
  });

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
});
