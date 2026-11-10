export type LandingStatKey = "courses" | "categories" | "pace";

export type LandingStat = {
  key: LandingStatKey;
  value: string;
  label: string;
};

export type LandingCounts = {
  totalCourses: number;
  totalCategories: number;
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function buildLandingStats({
  totalCourses,
  totalCategories,
}: LandingCounts): LandingStat[] {
  return [
    {
      key: "courses",
      value: String(totalCourses),
      label: plural(totalCourses, "Course available", "Courses available"),
    },
    {
      key: "categories",
      value: String(totalCategories),
      label: plural(totalCategories, "Category", "Categories"),
    },
    { key: "pace", value: "Self-paced", label: "Learn on your schedule" },
  ];
}
