# CodeRabbit limits: reference

The facts behind [coderabbit-review-setup.md](./coderabbit-review-setup.md). They were read from CodeRabbit's docs in November 2026. Limits and prices change, so re-read the sources at the bottom before you make a billing decision.

## Who the limit belongs to

- Limits are per developer seat, not per repo and not per organisation.
- A PR's review counts against the seat of the account involved. In the reference repo every factory PR is authored by the owner of `FACTORY_PAT`, so every review lands on one allowance.
- Extra seats do not help while one account opens every PR. Either budget for one identity or attribute PRs to real seats.
- The account matters. The CodeRabbit plan may sit on a different GitHub account or organisation than the repo. Check with `coderabbit auth status` and `coderabbit usage`.

## Hourly limits

Reviews per developer, per hour, on a rolling window. The plans page lists PR, IDE and CLI in separate columns:

- **Free:** PR 1 (summary only), IDE 3, CLI 3.
- **Essentials** (formerly Pro): PR 5, IDE 5, CLI 5.
- **Team** (formerly Pro+): PR 8, IDE 8, CLI 8.
- **Advanced:** PR 10, IDE 10, CLI 10.
- **Enterprise:** PR 12, IDE 12, CLI 12.

Files per review: 150 on Free and Essentials, 300 on Team, Advanced and Enterprise.

Capacity comes back as earlier reviews age out of the window. It does not reset all at once.

## The weekly slowdown (Fair Usage Limits Policy)

The policy looks at recent PR review activity over a rolling window, up to the past 7 days, and lowers how many reviews refill per hour.

**Essentials**, by PR reviews in the past 7 days:

- 0–29: 5 per hour.
- 30–39: 4 per hour.
- 40–49: 3 per hour.
- 50–59: 2 per hour.
- 60 or more: 1 per hour, one review at a time.

**Team:** 0–39: 8 per hour. 40–49: 6. 50–59: 4. 60–69: 2. 70 or more: 1.

**Advanced:** 0–49: 10 per hour. 50–59: 8. 60–69: 4. 70–79: 2. 80 or more: 1.

Reducing activity lets the count fall and restores the faster rate.

The setup doc's budget of 25 a week keeps an Essentials seat in the first band, with room for manual reviews.

## What costs a review

Each of these is one review event:

- Opening a PR (when automatic review is on).
- Marking a draft ready for review.
- Each separate push to a reviewed PR (when incremental review is on). Several commits pushed together count once.
- A force-push, a rebase, or reopening a PR.
- Editing a file in the GitHub web UI.
- GitHub's Update branch and Resolve conflicts buttons.
- `@coderabbitai review` and `@coderabbitai full review`.

These cost nothing:

- A push that is rate-limited. It does not delay the next review either.
- Unpushed commits, and pushes to a branch with no open PR.
- PRs excluded by the config.
- Chat messages.
- `@coderabbitai rate limit`, which reports the remaining capacity.

## When the allowance runs out

- CodeRabbit comments on the PR that the review was rate-limited.
- It adds a check titled "Review rate limited". The check passes by design, so it does not block a merge. A green check is therefore not proof that a review happened.
- New reviews wait until capacity returns, unless usage-based reviews are on.

## Paid overflow (usage-based reviews)

- Available on Essentials, Team and Advanced.
- $1.00 per credit, 4 files per credit: $0.25 per reviewed file. The same rate covers PR and CLI reviews.
- Three modes after the included limit:
  - **Automatic:** every eligible review continues and is billed.
  - **On demand:** reviews pause until a seat-holder authorises each one. On GitHub that is a "Review with credits" checkbox or `@coderabbitai review --use-credits`. In the CLI it is `coderabbit review --use-credits`.
  - **Off:** reviews stop at the limit.
- The spending cap defaults to unlimited. Set one.
- In headless or agent mode the CLI never assumes consent. At the limit it returns `status: "awaiting_confirmation"` with the file count and the maximum price.
- CLI and API-key reviews use the assigned user's plan allowance first. They are billed only past the limit.

## Config settings used

All under `reviews.auto_review` unless noted:

- `enabled` (default `true`): review PRs automatically.
- `labels`: with `enabled: false`, a positive label match triggers a review. A label that starts with `!` only excludes.
- `auto_incremental_review` (default `true`): re-review on each push. Set to `false` to review once, with later pushes ignored until a manual trigger.
- `auto_pause_after_reviewed_commits` (default 5): pause automatic reviews after this many reviewed commits.
- `drafts` (default `false`): draft PRs are skipped. Marking a draft ready triggers the first review.
- `base_branches`: branches other than the default branch to review. Each entry is an unanchored regex, so use `^dev$`.
- `ignore_usernames`: skip PRs by author. Exact match, and it wins over every other control.
- `ignore_title_keywords`: skip PRs whose title has a keyword.
- `reviews.path_filters`: include or exclude files from review.

## Not confirmed

Verify each of these before the build depends on it. Test on one PR, or ask CodeRabbit support.

1. **Do CLI reviews count towards the 7-day band on Essentials, Team and Advanced?** The policy says it uses "PR review activity" and that it "does not change trial, CLI, IDE, or self-hosted limits". The only explicit exclusion of CLI and IDE reviews is in the Enterprise section. Test: note the PR capacity with `@coderabbitai rate limit`, run one CLI review, and check again.
2. **Is a push during a running review charged?** An advisor said the running review is discarded and still charged. The docs did not confirm it. The Enterprise section says reviews superseded before delivery do not count. The setup avoids the case, so do not rely on either answer.
3. **Does `auto_incremental_review: false` also stop the force-push, rebase and reopen events?** The docs say later pushes are ignored. They do not mention the other three.
4. **Does the opt-in label override the base-branch filter?** Not stated. Step 6 adds `^dev$` and tests it.
5. **Label then ready: one review or two?** Step 2 adds the label to a draft and then marks it ready. Confirm on a test PR that this produces one review.
6. **`coderabbit usage` output.** It shows one "Your reviews" total for the billing period. It does not split PR from CLI reviews or show the 7-day count.
7. **How the facts were read.** These pages were read through a fetch tool that summarises. Exact wording and numbers may differ. Read the sources.

## Sources

- Plans and hourly limits: https://docs.coderabbit.ai/management/plans
- Review events and the Fair Usage Limits Policy: https://docs.coderabbit.ai/management/rate-limits
- Usage-based reviews and pricing: https://docs.coderabbit.ai/management/usage-based-addon
- Automatic review controls: https://docs.coderabbit.ai/configuration/auto-review
- Configuration reference: https://docs.coderabbit.ai/reference/configuration
- CLI: https://docs.coderabbit.ai/cli
- Headless CLI and API keys: https://docs.coderabbit.ai/cli/headless-cli-integration
- FAQ on usage limits: https://docs.coderabbit.ai/faq
