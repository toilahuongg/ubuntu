export type DailyScripture = {
  dayNumber: number;
  fullText: string;
  previewText: string;
  reference: string;
};

const DAILY_SCRIPTURES: readonly DailyScripture[] = [
  {
    dayNumber: 1,
    reference: "Công-vụ 20:24",
    previewText:
      "Nhưng tôi chẳng kể sự sống mình làm quí, miễn chạy cho xong việc đua tôi và chức vụ tôi đã lãnh...",
    fullText:
      "Nhưng tôi chẳng kể sự sống mình làm quí, miễn chạy cho xong việc đua tôi và chức vụ tôi đã lãnh nơi Đức Chúa Jêsus, để mà làm chứng về Tin lành của ơn Đức Chúa Trời.",
  },
  {
    dayNumber: 2,
    reference: "Phi-líp 3:14",
    previewText:
      "nhưng tôi cứ làm một điều: quên lửng sự ở đằng sau, mà bươn theo sự ở đằng trước, tôi nhắm mục đích mà chạy...",
    fullText:
      "nhưng tôi cứ làm một điều: quên lửng sự ở đằng sau, mà bươn theo sự ở đằng trước, tôi nhắm mục đích mà chạy, để giựt giải về sự kêu gọi trên trời của Đức Chúa Trời trong Đức Chúa Jêsus Christ.",
  },
  {
    dayNumber: 3,
    reference: "I Cô-rinh-tô 9:24",
    previewText:
      "Anh em há chẳng biết rằng trong cuộc chạy thi nơi trường đua, hết thảy đều chạy... Vậy, anh em hãy chạy cách nào cho được thưởng.",
    fullText:
      "Anh em há chẳng biết rằng trong cuộc chạy thi nơi trường đua, hết thảy đều chạy, nhưng chỉ một người được thưởng sao? Vậy, anh em hãy chạy cách nào cho được thưởng.",
  },
  {
    dayNumber: 4,
    reference: "Hê-bơ-rơ 12:1",
    previewText:
      "Thế thì, vì chúng ta được nhiều người chứng kiến vây lấy như đám mây rất lớn, chúng ta cũng nên quăng hết gánh nặng...",
    fullText:
      "Thế thì, vì chúng ta được nhiều người chứng kiến vây lấy như đám mây rất lớn, chúng ta cũng nên quăng hết gánh nặng và tội lỗi dễ vấn vương ta, lấy lòng nhịn nhục theo đòi cuộc chạy đua đã bày ra cho ta,",
  },
  {
    dayNumber: 5,
    reference: "II Ti-mô-thê 4:7",
    previewText:
      "Ta đã đánh trận tốt lành, đã xong sự chạy, đã giữ được đức tin.",
    fullText:
      "Ta đã đánh trận tốt lành, đã xong sự chạy, đã giữ được đức tin.",
  },
  {
    dayNumber: 6,
    reference: "Ê-sai 40:31",
    previewText:
      "Nhưng ai trông đợi Đức Giê-hô-va thì chắc được sức mới... chạy mà không mệt nhọc, đi mà không mòn mỏi.",
    fullText:
      "Nhưng ai trông đợi Đức Giê-hô-va thì chắc được sức mới, cất cánh bay cao như chim ưng; chạy mà không mệt nhọc, đi mà không mòn mỏi.",
  },
  {
    dayNumber: 7,
    reference: "Ga-la-ti 6:9",
    previewText:
      "Chớ mệt nhọc về sự làm lành, vì nếu chúng ta không trễ nải, thì đến kỳ, chúng ta sẽ gặt.",
    fullText:
      "Chớ mệt nhọc về sự làm lành, vì nếu chúng ta không trễ nải, thì đến kỳ, chúng ta sẽ gặt.",
  },
] as const;

const CYCLE_START_DATE_KEY = "2026-04-24";

function dateKeyToDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function getDailyScripture(dateKey: string): DailyScripture {
  const cycleLength = DAILY_SCRIPTURES.length;
  const dayOffset =
    dateKeyToDayNumber(dateKey) - dateKeyToDayNumber(CYCLE_START_DATE_KEY);
  const scriptureIndex = ((dayOffset % cycleLength) + cycleLength) % cycleLength;

  return DAILY_SCRIPTURES[scriptureIndex];
}
