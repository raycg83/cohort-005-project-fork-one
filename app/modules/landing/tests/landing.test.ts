import { describe, it, expect } from "vitest";
import { landingStats } from "../index";

describe("landingStats", () => {
  it("lists courses, categories, then the self-paced promise", () => {
    expect(landingStats({ totalCourses: 4, totalCategories: 5 })).toEqual([
      { key: "courses", value: "4", label: "Courses available" },
      { key: "categories", value: "5", label: "Categories" },
      { key: "pace", value: "Self-paced", label: "Learn on your schedule" },
    ]);
  });

  it("words a single course and a single category in the singular", () => {
    const [courses, categories] = landingStats({
      totalCourses: 1,
      totalCategories: 1,
    });
    expect(courses).toEqual({
      key: "courses",
      value: "1",
      label: "Course available",
    });
    expect(categories).toEqual({
      key: "categories",
      value: "1",
      label: "Category",
    });
  });

  it("words zero in the plural", () => {
    const [courses, categories] = landingStats({
      totalCourses: 0,
      totalCategories: 0,
    });
    expect(courses.label).toBe("Courses available");
    expect(categories.label).toBe("Categories");
  });
});
