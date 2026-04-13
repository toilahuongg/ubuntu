import { describe, expect, it } from "vitest";

import { validateSubmissionValues } from "@/lib/validation";

describe("validateSubmissionValues", () => {
  it("parses checkbox, number, and text values correctly", () => {
    const formData = new FormData();
    formData.set("field-sales", "42");
    formData.set("field-note", "Da check xong");
    formData.set("field-checked", "on");

    expect(
      validateSubmissionValues(
        [
          { id: "sales", label: "Sales", required: true, type: "number" },
          { id: "note", label: "Note", required: false, type: "shortText" },
          { id: "checked", label: "Checked", required: true, type: "checkbox" },
        ],
        formData,
      ),
    ).toEqual({
      checked: true,
      note: "Da check xong",
      sales: 42,
    });
  });

  it("throws when a required field is missing", () => {
    const formData = new FormData();

    expect(() =>
      validateSubmissionValues(
        [{ id: "note", label: "Note", required: true, type: "shortText" }],
        formData,
      ),
    ).toThrow('Trường "Note" là bắt buộc.');
  });
});
