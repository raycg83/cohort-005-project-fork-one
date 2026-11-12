# CodeRabbit in the software factory: setup

You are adding CodeRabbit review to a repo that runs a software factory. This doc is the plan. Follow the steps in order. Steps 4, 6 and 7 are optional: build them only when their trigger condition is met.

Read these first:

- [software-factory-workflows.md](./software-factory-workflows.md): the factory pattern (labels, `FACTORY_PAT`, Sandcastle scripts, the agent-less writer job). This doc does not repeat it.
- [coderabbit-limits-reference.md](./coderabbit-limits-reference.md): the rate limits, what costs a review, the facts that are **not confirmed**, and the sources. Verify the unconfirmed items before you rely on them.

Paths below are from the reference repo, `cohort-005-project`. In another repo, find the equivalent file. Do not guess its contents.

## The goal and the constraint

A factory opens many pull requests, and most are small. CodeRabbit's allowance is small and shared: it is counted per developer seat, across every repo that seat touches. In the reference repo every factory PR is authored by the account that owns `FACTORY_PAT`, so all reviews draw on one allowance.

So CodeRabbit is a budget the factory spends by rule:

- Nothing is reviewed by default.
- A deterministic gate picks the risky PRs and labels them.
- Each labelled PR gets one review. Fix commits do not trigger another.
- The gate stops labelling before the weekly slowdown starts.

The agent reviewer (`agent-review.yml`) stays the reviewer for every PR. CodeRabbit is a second reviewer for the risky ones.

## Step 1. Make CodeRabbit opt-in

Add `.coderabbit.yaml` at the repo root:

```yaml
reviews:
  auto_review:
    enabled: false # nothing is reviewed by default
    labels: ["coderabbit:review"] # this label requests a review
    auto_incremental_review: false # later pushes are not re-reviewed
    auto_pause_after_reviewed_commits: 1 # backstop if incremental is ever turned on
  path_filters: # keep generated files out of the review
    - "!**/package-lock.json"
    - "!drizzle/**"
    - "!**/*.snap"
```

- `enabled: false` plus a positive label is CodeRabbit's documented opt-in pattern.
- The `path_filters` entries are this repo's generated files. Replace them with the target repo's lockfiles, generated code and snapshots. Confirm the glob syntax against CodeRabbit's configuration reference, then run `coderabbit config validate`.
- Create the label once: `gh label create "coderabbit:review" --color 5319E7 --description "Ask CodeRabbit for one review"`.
- A human can add the label by hand to any PR at any time. That is the manual override.

## Step 2. Let the factory decide which PRs get the label

Add a gate to `.github/workflows/agent-review.yml`. It is `gh` + `jq` only, with no agent.

**The rule.** Label the PR when:

```
(size OR sensitive paths OR reviewer says high risk) AND under budget
```

Any one of the first three is enough. Sensitive paths and the reviewer's flag matter more than size, so keep the size threshold loose and the path list complete.

- **Size.** More than about 150 changed lines or 8 files, counted **after** dropping the same files `path_filters` excludes.
- **Sensitive paths.** In the reference repo: `app/db/schema.ts`, `drizzle/`, `.github/workflows/`, `.sandcastle/`, plus the auth and money code. In another repo, list its own: schema and migrations, auth, payments, row-level security policies, workflow files.
- **Reviewer's flag.** A closed enum the agent reviewer returns. See below.
- **Budget.** Fewer than 25 CodeRabbit reviews in the last 7 days, and fewer than 3–4 in the last hour. Count across all of the owner's repos, because the allowance is per developer and not per repo. Count reviews CodeRabbit actually posted, not labels: a label count misses manual `@coderabbitai review` comments and the other events that cost a review.

**Where it goes.** In the "Mark the pull request ready" step, or a new step right before it. That is after "Push the review's fixes", so nothing is pushed once the label is on. Run it only when a real verdict was posted (the step's existing `## Standards:` check) and the push did not fall back to another branch. Add the label first, then run `gh pr ready`, and confirm on a test PR that this produces exactly one CodeRabbit review.

**The reviewer's flag.** `.sandcastle/agent-workflows/review/review-schema.ts` has one top-level key today, `comments`. Add a second:

```ts
risk: z
  .enum(["low", "high"])
  .describe("high when a mistake here could lose data, money or access."),
```

`review.ts` builds `review-comments.json` as the request body for GitHub's reviews endpoint, so do not put `risk` in that file. Write it to its own file (`writeJson("review-risk.json", { risk })`) and tell the agent in `review/prompt.md` how to choose the value. The gate branches on the enum, never on prose.

**Sketch** (not a working step; test every query before you trust it):

```bash
set -euo pipefail
EXCLUDE='package-lock\.json$|^drizzle/|\.snap$'
SENSITIVE='^app/db/schema\.ts$|^drizzle/|^\.github/workflows/|^\.sandcastle/'

gh pr view "$PR_NUMBER" --json files > /tmp/files.json
lines=$(jq --arg x "$EXCLUDE" '[.files[] | select(.path | test($x) | not)
  | .additions + .deletions] | add // 0' /tmp/files.json)
count=$(jq --arg x "$EXCLUDE" '[.files[] | select(.path | test($x) | not)]
  | length' /tmp/files.json)
sensitive=$(jq --arg s "$SENSITIVE" 'any(.files[]; .path | test($s))' /tmp/files.json)
risk=$(jq -r .risk "$RUNNER_TEMP/review-risk.json")

risky=false
if [ "$lines" -gt 150 ] || [ "$count" -gt 8 ] \
  || [ "$sensitive" = true ] || [ "$risk" = high ]; then risky=true; fi

# Budget: reviews in the last 7 days, across the owner's repos.
since=$(date -u -d '7 days ago' +%Y-%m-%d)
used=$(gh search prs --owner "$GITHUB_REPOSITORY_OWNER" \
  --label "coderabbit:review" --updated ">=$since" --json number --jq length)

if [ "$risky" = true ] && [ "$used" -lt 25 ]; then
  gh pr edit "$PR_NUMBER" --add-label "coderabbit:review"
fi
```

The budget query above counts labelled PRs, which undercounts. Replace it with a count of reviews authored by `coderabbitai[bot]` once you have a query that works across repos, and add the hourly cap the same way. When the gate skips a risky PR for budget, say so in a PR comment, so a human can add the label later.

## Step 3. Fix CodeRabbit's findings once

A new workflow, `agent-coderabbit-fix.yml`, modelled on `agent-review.yml`, with its own Sandcastle folder (`.sandcastle/agent-workflows/coderabbit-fix/`).

1. CodeRabbit submits its review on a labelled PR.
2. The workflow collects CodeRabbit's comments into a file.
3. An agent fixes the valid ones and commits.
4. The workflow runs the checks, pushes, and comments.
5. A human merges.

It cannot loop: step 1 turns off re-review on push, so the fix commit does not start another CodeRabbit review.

Step 5 lists the guardrails this workflow must have. Step 4 sits between them only because it is optional.

## Step 4 (optional). Batch small PRs into `dev`

**Build this only if** the gate labels more than about 25 PRs a week.

- Point the factory's PRs at `dev` instead of the default branch. In `agent-implement.yml` that is the `--base` argument of `gh pr create`.
- Once a day, open one `dev → main` PR and label it `coderabbit:review`. One review then covers every ticket in the batch.

Trade-offs:

- `Closes #n` closes the issue only when the PR merges into the default branch.
- A very large diff gets a weaker review, and CodeRabbit has a files-per-review limit. Cap the batch.

## Step 5. Guardrails for the fix workflow

These apply to the workflow from step 3. Build them with it.

- **Bot-only trigger.** `on: pull_request_review: types: [submitted]`, with `if: github.event.review.user.login == 'coderabbitai[bot]'`. A review from anyone else must not start an agent.
- **Once per PR.** Use the per-PR concurrency group from `agent-review.yml`, with `cancel-in-progress: false`. Add a marker label when the round is done (for example `coderabbit:fixed`) and skip PRs that have it, so a later manual review does not start a second round.
- **Scope.** Fix only findings that are valid and critical or major. Leave nits. One commit, one round, then a human.
- **Untrusted input.** CodeRabbit's text quotes the PR, so treat it like issue text: write it to a file, pass the path to the agent, and never interpolate it into `run:`. Warn about prompt injection in `prompt.md`.
- **Token.** Push with `FACTORY_PAT`, handed to the push command only, hooks off, never forced. Copy the "Push the review's fixes" step. The agent's step gets no GitHub token.
- **Checks.** Run `npm run check` as a workflow step after the agent and before the push. If it fails, do not push, and add `agent:blocked`. The reference repo has no CI workflow and no branch protection, and its pre-commit hook does not run the tests, so this step is the only gate.
- **Report.** Comment on the PR with what was fixed and what was left, and why.
- **Sensitive PRs.** Nobody reviews the fix commit. If the PR touches the sensitive paths from step 2, add `needs-a-human`.

**On a repo with CI and branch protection:** keep the checks step, and also require the CI checks before merge. A push made with a PAT starts CI. A push made with the built-in `GITHUB_TOKEN` does not.

## Step 6 (optional). Config for batching

Only with step 4.

- By default CodeRabbit reviews PRs into the default branch only. Add `dev`:

  ```yaml
  reviews:
    auto_review:
      base_branches: ["^dev$"]
  ```

- Test it: label one PR into `dev` and confirm CodeRabbit reviews it. Unlabelled PRs into `dev` stay unreviewed, because `enabled` is `false`.
- Cost: a risky PR is reviewed on its way into `dev` and again inside the batch.

## Step 7 (optional). The CodeRabbit CLI as a second channel

**Build this only if** PR reviews run short, and after you confirm on the account that CLI reviews are counted separately.

- Run `coderabbit review --agent --api-key "$CODERABBIT_API_KEY"` as a step in `agent-review.yml`, save the output to a file, and give that file to the agent reviewer as one more source. Findings are then fixed before the PR goes ready, and no PR review is spent.
- `CODERABBIT_API_KEY` is an "Agentic API key". It must belong to a user with an assigned seat, so reviews use that seat's allowance.
- The plans table lists the CLI's hourly limit in its own column, separate from PR reviews.
- Paid overflow is $0.25 per reviewed file. If you enable it, use the "On demand" mode and set a spending cap: the default is unlimited. In On demand mode a headless run at the limit returns `status: "awaiting_confirmation"` and does not charge. Handle that result as "no CodeRabbit input this run".

CLI notes:

- The Homebrew install provides `coderabbit` only. There is no `cr` alias.
- `coderabbit usage` shows the billing period's reviews and spend.
- If it prints "Failed to fetch usage", the session has probably expired (a 401 in `~/.coderabbit/logs/`), even when `coderabbit auth status` looks signed in. Run `coderabbit auth login`.

## Interactions to respect

- **Auto-rebase.** A rebase or force-push can cost a review. An auto-rebase workflow must skip PRs labelled `coderabbit:review`.
- **Never push during a running review.** The gate labels after the reviewer's push, and the fix workflow starts after CodeRabbit finishes. Keep both orderings.
- **`@coderabbitai review` always costs one review.** Use it only when a second look is worth it.
- **`@coderabbitai rate limit`** reports remaining capacity without spending a review. Use it by hand before a busy day. Do not parse its reply in a workflow.
- **GitHub's Update branch and Resolve conflicts buttons** each cost a review on a PR CodeRabbit is watching.

## Checklist

- [ ] `.coderabbit.yaml` is on the default branch and passes `coderabbit config validate`.
- [ ] The `coderabbit:review` label exists.
- [ ] `review-schema.ts` has the `risk` enum, `review.ts` writes it to its own file, and the prompt explains it.
- [ ] The gate runs after the reviewer's push, labels by the rule above, and enforces the weekly and hourly budget across the owner's repos.
- [ ] A test PR that is small and safe gets no CodeRabbit review.
- [ ] A test PR that touches a sensitive path gets exactly one review, and a later push gets none.
- [ ] The fix workflow triggers only on `coderabbitai[bot]`, runs once per PR, runs the checks before it pushes, and comments.
- [ ] Every unconfirmed item in the limits reference that the build depends on has been tested.
