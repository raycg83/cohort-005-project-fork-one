import { z } from "zod/v4";

// The findings the review left unfixed. The workflow posts each one as an
// inline comment on the pull request, on its file and line, and review.ts
// lists them in the verdict, one line each.
export const reviewSchema = z
  .strictObject({
    comments: z
      .array(
        z.strictObject({
          path: z
            .string()
            .min(1)
            .describe("The file, relative to the repository root."),
          line: z
            .number()
            .int()
            .positive()
            .describe(
              "A line in the file as it is now, inside a hunk of the diff against the base. A comment outside the hunks is dropped."
            ),
          rule: z
            .string()
            .min(1)
            .describe(
              'The heading of the standard it breaks, or "Spec" for a spec finding.'
            ),
          body: z
            .string()
            .min(1)
            .describe(
              "The finding, in Markdown: the rule or spec line it breaks, what to do instead, and the decision the human must make before it can be fixed."
            ),
        })
      )
      .describe("One entry per finding you left unfixed. Empty is fine."),
  })
  .describe("The review's inline comments.");
