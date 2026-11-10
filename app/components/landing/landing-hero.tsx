import { Link } from "react-router";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CourseImage } from "~/components/course-image";

export type HeroCourse = {
  title: string;
  slug: string;
  coverImageUrl: string | null;
  instructorName: string | null;
  lessonCount: number;
};

const SELLING_POINTS = [
  "Structured modules and lessons",
  "Quizzes that check what you learned",
  "Progress saved as you go",
];

export function LandingHero({
  course,
  signedIn,
}: {
  course: HeroCourse | undefined;
  signedIn: boolean;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div className="text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            Courses for developers
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Learn to code,
            <br />
            <span className="text-muted-foreground">at your own pace</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Structured courses built by experienced instructors. Track your
            progress, take quizzes, and build real-world skills.
          </p>
          <SellingPoints />
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to="/courses">
                Browse Courses
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              {signedIn ? (
                <Link to="/dashboard">Go to your dashboard</Link>
              ) : (
                <Link to="/signup">Create a free account</Link>
              )}
            </Button>
          </div>
        </div>
        {course && <HeroPreview course={course} />}
      </div>
    </section>
  );
}

function HeroPreview({ course }: { course: HeroCourse }) {
  return (
    <div className="hidden lg:block">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Newest course
      </p>
      <Link
        to={`/courses/${course.slug}`}
        className="group block overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-shadow hover:shadow-xl"
      >
        <CourseImage
          src={course.coverImageUrl}
          alt={course.title}
          className="aspect-video w-full object-cover"
        />
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold group-hover:text-primary">
              {course.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {course.instructorName ?? "Instructor"}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="size-3" />
            {course.lessonCount} lessons
          </span>
        </div>
      </Link>
    </div>
  );
}

function SellingPoints() {
  return (
    <ul className="mt-8 space-y-2">
      {SELLING_POINTS.map((point) => (
        <li
          key={point}
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <CheckCircle2 className="size-4 text-primary" />
          {point}
        </li>
      ))}
    </ul>
  );
}
