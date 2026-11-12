# Software factory workflows: how to add one

You are setting up an unattended agent job (a "factory workflow") in a repo. This doc gives the pattern and a recipe. The reference implementation is the `cohort-005-project` repo, and every path below is relative to it. Ask the user for any file you need. Do not guess its contents.

## 1. Vocabulary

- **Orchestrator.** It decides _when_ work happens and _what_ runs. It does no thinking. Here it is GitHub Actions: each workflow's `on:` block (label added, `schedule: cron`, `push`, `workflow_dispatch`, or one workflow running `gh workflow run` on another).
- **Runner.** The disposable machine where the work happens. It is the Actions VM (`runs-on: ubuntu-latest`). It checks out the repo, runs `npm ci`, and installs Claude Code (`npm install -g @anthropic-ai/claude-code`). Then it runs a Sandcastle script (`npx tsx .sandcastle/agent-workflows/<name>/<name>.ts`), which feeds `prompt.md` to the agent.
- **Agent.** Claude Code, launched by that script. It is the only part that thinks.
- **Ticket tracker.** GitHub Issues and PRs, plus labels. Labels carry state between jobs.
- **Human.** Merges PRs, handles `needs-a-human` and `agent:blocked`, and applies the approval labels.

Analogy: the orchestrator is the shift manager with the schedule, the runner is the workstation, and the agent is the worker.

## 2. The current factory

- **`agent-explore.yml`**
  - Trigger: `issues: [labeled]` with `agent:explore`.
  - What it does: batches every open `agent:explore` issue. A read-only agent groups them, explores them, and returns a plan with one `tag` and one comment per issue. An agent-less `apply` job validates the plan and then writes.
  - Hand-off: `easy-call` gets `agent:implement`. Any other tag gets `needs-a-human`. Duplicates are closed.
- **`agent-implement.yml`**
  - Trigger: `issues: [labeled]` with `agent:implement`.
  - What it does: builds on `agent/issue-<n>-<run id>`. The agent commits through the pre-commit hook. The workflow pushes and opens a **draft** PR.
  - Hand-off: adds `agent:review` to the PR.
- **`agent-review.yml`**
  - Trigger: `pull_request: [labeled]` with `agent:review`.
  - What it does: a memory-less review of the diff, `CODING_STANDARDS.md`, and the issue named in `Closes #n`. It fixes what it can as commits, posts inline comments and a verdict, then runs `gh pr ready`.
  - Hand-off: a human merges. On a failure or a rejected push it adds `agent:blocked`.
- **`agent-implement-spec.yml`**
  - Trigger: `agent:implement-spec` label, `cron: "*/15 * * * *"`, or `workflow_dispatch`.
  - What it does: `survey` (gh + jq) picks a mode. `decompose` writes `spec:<n>` + `agent:queued` tickets. `implement` builds the frontier ticket and closes it. `chain` re-dispatches the same workflow.
  - Hand-off: adds `agent:review` to each PR. Closing a ticket moves the queue on.

The chain: an issue gets `agent:explore` (human) → explore verdict → `easy-call` goes to `agent:implement`, anything else to `needs-a-human` → draft PR → `agent:review` → PR marked ready → a human merges.

The label lifecycle shared by every job:

1. Swap the trigger label for `agent:in-progress`.
2. On failure, add `agent:blocked` and comment "re-add the trigger to retry".
3. Remove `agent:in-progress` with `if: always()`.

Status comments carry a hidden `<!-- factory:status -->` marker, so later runs can drop them from the agent's input.

## 3. Principles

1. **Labels are the glue.** Jobs never call each other directly. A job listens for one label and ends by applying another. Adding a job leaves the existing files alone.
2. **Use `FACTORY_PAT`, not `GITHUB_TOKEN`, for hand-offs.**
   - A label applied with the built-in `GITHUB_TOKEN` starts no workflow. GitHub suppresses that so a workflow cannot loop on itself. The chain ends silently, with a green tick.
   - By default `GITHUB_TOKEN` also cannot open a PR, and `--attach` rejects it.
   - So one fine-grained PAT does every GitHub call. `GITHUB_TOKEN` only does the checkout, with `permissions: contents: read`, or `permissions: {}` in jobs that have no checkout.
3. **The agent never holds a write token.**
   - Set `GH_TOKEN` per step, never on a job that runs an agent.
   - Check out with `persist-credentials: false`.
   - Push with the token handed to git for that one command, with hooks off (`-c core.hooksPath=/dev/null`). See the Push step in `agent-implement.yml`.
   - The strongest form is `agent-explore.yml`. The agent's job loses the PAT after "List the batch". A separate `apply` job runs **no agent** and validates the plan before it writes.
   - The headers admit that a token kept out of the agent's env on the same VM is "tidiness, not a wall". The real defence is reach. Only collaborator comments get in (`authorAssociation` in `OWNER`/`MEMBER`/`COLLABORATOR`), and only a collaborator can apply the labels.
4. **Structured output, checked deterministically.**
   - The agent returns JSON that matches a zod schema. Sandcastle validates it and retries.
   - The writer then re-checks the business rules with `jq`: every issue exactly once, known tags, non-empty comments.
   - On any problem, write nothing and exit 1.
   - Branch with a real `if` on an enum the agent picked, not on prose.
5. **Cheap gates first.** Decide with `gh` + `jq`, and skip the agent's steps when there is nothing to do (`if: steps.batch.outputs.numbers != '[]'`).
6. **Untrusted text goes through files and `env:`.** Issue text goes to `/tmp/*.json`. Agent output reaches the next step as `env: PLAN: ${{ needs.explore.outputs.plan }}`. Never put `${{ }}` with such data inside `run:`, because that is text bash executes.
7. **Draft PRs, human merge.** The reviewer marks a PR ready only when a real verdict exists (a `## Standards:` heading). Ready is not approved.
8. **Memory-less reviewer.** It shares nothing with the builder.
9. **Never lose work, never force-push.** Each run gets a fresh branch (`-${{ github.run_id }}`). A rejected push goes to a fallback branch and draft PR, and the original gets `agent:blocked`.
10. **Fail loud.** The last hand-off has no `|| true`. No commit or a dirty tree fails the run.
11. **Concurrency per resource, never cancelled.** Set `cancel-in-progress: false`. Only the trigger label joins the real group. Every other label gets `format('ignore-{0}', github.run_id)`, so it cannot bump the queued run.
12. **State lives on GitHub.** Runs have no memory. `agent-implement-spec.yml` keeps its queue in ticket bodies (`Position:`, `Depends on:`) and labels.
13. **Labels must exist.** No workflow can create the label that starts it, so create trigger labels by hand. Jobs create downstream labels with `gh label create ... || true`.
14. **Same-repo only.** Use `issues` / `pull_request`, never `pull_request_target`. A fork PR gets no secrets and fails, which is the right trade.

## 4. One workflow = one YAML file + one Sandcastle folder

- `.github/workflows/agent-<name>.yml`: trigger, permissions, concurrency, gates, label lifecycle, and every GitHub write.
- `.sandcastle/agent-workflows/<name>/<name>.ts`: launches the agent and writes JSON to `OUTPUT_DIR`.
- `.sandcastle/agent-workflows/<name>/prompt.md`: the instructions. Give the input file paths, the skills to use, and the limits ("read-only", "commit, do not push", "leave `.github/` untouched"). Warn about prompt injection in issue text.
- `.sandcastle/agent-workflows/<name>/<thing>-schema.ts` (optional): a `zod/v4` schema. Its `.describe()` text is printed into the extraction prompt.
- `.sandcastle/agent-workflows/shared/` (reuse, do not fork):
  - `common.ts` provides `claudeAgent()` (model `claude-opus-5-5`, env `CLAUDE_CODE_OAUTH_TOKEN`), `required(name)`, and `writeJson(file, value)`.
  - `run-with-extraction.ts` runs pass one with all tools, then resumes the session and asks only for the JSON.
  - `extraction-prompt.ts` renders the schema as JSON Schema inside a `<tag>` reply format.
- Secrets (reuse): `CLAUDE_CODE_OAUTH_TOKEN`, `FACTORY_PAT`.

A structured-output script (`explore/explore.ts`):

```ts
const result = await runWithExtraction({
  name: "explore",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "prompt.md"),
  output: sandcastle.Output.object({ tag: "plan", schema: explorePlanSchema }),
  extractionPrompt: extractionPrompt("plan", explorePlanSchema),
});
writeJson("plan.json", result.output);
```

An agent that only edits and commits uses plain `sandcastle.run({ name, agent, sandbox, logging, promptFile })` (`implement/implement.ts`). `promptArgs: { PR_NUMBER }` fills `{{PR_NUMBER}}` in the prompt (`review/review.ts`).

## 5. Triggers cookbook

```yaml
# Daily (UTC) plus a manual button
on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch: {}
```

```yaml
# Label trigger, filtered at the job
on:
  issues: # or pull_request:
    types: [labeled]
concurrency:
  group: ${{ github.event.label.name == 'agent:foo' && 'agent-foo' || format('ignore-{0}', github.run_id) }}
  cancel-in-progress: false
jobs:
  foo:
    if: github.event.label.name == 'agent:foo'
```

```yaml
# Mixed triggers: non-label events fall through (agent-implement-spec.yml)
if: >-
  github.event_name != 'issues' ||
  github.event.label.name == 'agent:implement-spec'
```

```yaml
# Push to main, and PR events
on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, labeled]
```

**Self-chain.** End the run with `gh workflow run agent-<name>.yml --ref "$REF" --field key=value`, using `FACTORY_PAT` (it needs Actions: write). Give the chain a brake. The spec chain stops only when `survey` finds nothing to do, and it skips `agent:blocked` tickets so it never retries one failure forever.

Caveats:

- Cron is best-effort and can start minutes late. The top of the hour is the worst slot, so pick an odd minute.
- GitHub disables schedules in a repo with no commits for 60 days.
- `schedule` and `workflow_dispatch` use the file on the **default branch**, so merge the YAML first. (This is GitHub behaviour, not stated in this repo's files.)
- No workflow here uses `push` or non-label `pull_request` triggers. Those snippets are standard Actions syntax.

## 6. Recipe: add a workflow to any repo

**Once per new repo:**

1. Secrets:
   - `gh secret set CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`).
   - `gh secret set FACTORY_PAT`: a fine-grained PAT on this repo only, with **Issues, Pull requests, Contents, Workflows and Actions: read/write** (from the `agent-implement.yml` header).
   - To bill the API instead, swap in `ANTHROPIC_API_KEY` in `shared/common.ts` and in the workflow env.
2. Dependencies: `npm i -D @ai-hero/sandcastle@^0.14.0 tsx zod`. The code imports `zod/v4`, which needs zod ≥ 3.25 (this repo pins `^3.25.36`).
3. Copy `.sandcastle/agent-workflows/shared/` and `.sandcastle/agent-workflows/tsconfig.json`. The latter extends the root `tsconfig.json`.
4. Commit every skill the prompt names under `.claude/skills/<skill>/`. In this repo `.claude/skills` is a symlink to `.agents/skills`.
5. If agents commit, install the pre-commit hook through `npm ci` (husky `prepare`), and keep the `core.hooksPath` check from `agent-implement.yml`.
6. Check that `gh repo set-default --view` names your repo, not an upstream.

**Per workflow:**

1. Decide the shape:
   - Read-only (the explore pattern) or code-changing (the implement pattern)?
   - What is the trigger?
   - What is the cheap gate?
   - Which label does it end on?
   - Which label does a human use to retry?
2. Create the labels: `gh label create "agent:<name>" --color 5319E7 --description "..."`.
3. Write the schema. Use `z.strictObject` throughout, and a closed `z.enum` for any value the YAML branches on.
4. Write `prompt.md` and `<name>.ts`. Copy the closest existing script.
5. Write the YAML. Copy the closest workflow (section 10). Keep `permissions`, `persist-credentials: false`, per-step `GH_TOKEN`, the label lifecycle, and `timeout-minutes`.
6. Typecheck: `npx tsc --noEmit -p .sandcastle/agent-workflows`.
7. Merge to the default branch, then test it:
   - `gh workflow run agent-<name>.yml`, or `gh issue edit <n> --add-label "agent:<name>"`.
   - `gh run list --workflow agent-<name>.yml --limit 1`.
   - `gh run watch <id>`.
8. Confirm the downstream workflow actually started. A green run with no follow-up means a label went on with `GITHUB_TOKEN`.

## 7. Worked example A: daily improve-codebase-architecture

**Flow:**

1. Cron, daily.
2. `gate` counts open `architecture` issues with gh + jq and stops if there are more than 5.
3. `scan` (agent, read-only, no write token) returns candidates that match a schema.
4. `apply` (no agent) validates them and files issues labelled `architecture`, **not** `agent:implement`.
5. A human reviews each one and adds `agent:implement`.
6. The existing implement → review chain takes over.

**Skill caveat.** `.claude/skills/improve-codebase-architecture/SKILL.md` is interactive. It has `disable-model-invocation: true`, it writes and opens an HTML report, and it ends by asking "Which of these would you like to explore?" Do not tell a headless agent to run it as written. In `prompt.md`:

- Tell it to follow only the skill's **step 1 (Explore)**: scope by `git log` hot spots, read `GLOSSARY.md` and `docs/adr/`, use the `codebase-design` vocabulary, and apply the deletion test.
- Tell it to skip the report and the question.
- Tell it to return the candidates as structured output.

Copy both `improve-codebase-architecture` and `codebase-design` into the target repo.

**Files:** `agent-architecture.yml`, and `architecture/{architecture.ts, prompt.md, candidates-schema.ts}`.

**Schema:** `{ candidates: [{ title, files[], problem, solution, benefits, strength: enum("Strong","Worth exploring","Speculative") }] }`, with `.max(3)`.

**Sketch** modelled on `agent-explore.yml` (not a working file):

```yaml
on:
  schedule: [{ cron: "17 6 * * *" }]
  workflow_dispatch: {}
concurrency: { group: agent-architecture, cancel-in-progress: false }
jobs:
  gate: # no agent, no checkout
    permissions: {}
    env: { GH_TOKEN: "${{ secrets.FACTORY_PAT }}" }
    outputs: { go: "${{ steps.count.outputs.go }}" }
    steps:
      - id: count
        run: |
          n=$(gh issue list -R "$GITHUB_REPOSITORY" --state open \
            --label architecture --json number | jq length)
          echo "go=$([ "$n" -le 5 ] && echo true || echo false)" >> "$GITHUB_OUTPUT"
  scan: # agent; no FACTORY_PAT anywhere in this job
    needs: gate
    if: needs.gate.outputs.go == 'true'
    permissions: { contents: read }
    outputs: { plan: "${{ steps.plan.outputs.json }}" }
    steps:
      # checkout (fetch-depth: 0, persist-credentials: false), setup-node,
      # npm ci, npm install -g @anthropic-ai/claude-code
      - env:
          CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          OUTPUT_DIR: ${{ runner.temp }}
        run: npx tsx .sandcastle/agent-workflows/architecture/architecture.ts
      - id: plan
        run: echo "json=$(jq -c . "$RUNNER_TEMP/candidates.json")" >> "$GITHUB_OUTPUT"
  apply: # no agent, no checkout; the only writer
    needs: scan
    permissions: {}
    env: { GH_TOKEN: "${{ secrets.FACTORY_PAT }}" }
    steps:
      - env: { PLAN: "${{ needs.scan.outputs.plan }}" }
        run: |
          printf '%s' "$PLAN" > /tmp/plan.json
          # jq rules: <= 3 items, known strength, non-empty fields, title not
          # already open. Any problem: exit 1 and write nothing.
          # Then per item: gh issue create --label architecture --body-file ...
```

To stop repeat proposals, give `scan` the open `architecture` titles as a file. Keep the dedupe in `apply` anyway.

## 8. Worked example B: auto-rebase open PRs

**Flow:**

1. Trigger: `push` to `main`, plus an optional daily cron and `workflow_dispatch`.
2. List the candidate PRs.
3. For each one, run a plain `git rebase origin/main`.
4. If it is clean, push with `--force-with-lease`.
5. If it conflicts, run the agent to resolve it and commit.
6. If that fails, or the checks fail, label `agent:blocked` or `needs-a-human` and comment.

**Guard against overwriting human work:**

- Scope to `agent/*` branches and/or an opt-in label (e.g. `agent:auto-rebase`). Skip a PR that has commits from a non-bot author (`gh pr view --json commits`).
- Push with `--force-with-lease=<branch>:<sha you fetched>`, so anything pushed mid-run makes the push fail instead of being overwritten. On rejection, label and stop. Do not retry.
- Hand the token to the push command only, with hooks off, as in `agent-implement.yml`'s Push step. The agent step gets no `GH_TOKEN`.
- After an agent-resolved rebase, re-add `agent:review`.

**Sketch** (not a working file):

```yaml
on:
  push: { branches: [main] }
  workflow_dispatch: {}
permissions: { contents: read }
jobs:
  list: # gh + jq only
    env: { GH_TOKEN: "${{ secrets.FACTORY_PAT }}" }
    outputs: { prs: "${{ steps.l.outputs.prs }}" }
    steps:
      - id: l
        run: |
          prs=$(gh pr list -R "$GITHUB_REPOSITORY" --state open \
            --json number,headRefName \
            --jq '[.[] | select(.headRefName | startswith("agent/")) | .number]')
          echo "prs=$prs" >> "$GITHUB_OUTPUT"
  rebase:
    needs: list
    if: needs.list.outputs.prs != '[]'
    strategy:
      max-parallel: 1
      matrix: { pr: "${{ fromJSON(needs.list.outputs.prs) }}" }
    steps:
      # checkout PR head (fetch-depth: 0, persist-credentials: false)
      # try:     git rebase origin/main -> clean=true|false
      # resolve: if clean == false, npx tsx .sandcastle/agent-workflows/rebase/rebase.ts
      #          (prompt: finish the rebase, keep both intents, run checks, no push)
      # push:    GH_TOKEN on this step only; hooks off; --force-with-lease=...
      # failure: gh pr edit --add-label agent:blocked, comment with the logs link
```

## 9. Checklist for the setup session

- [ ] `CLAUDE_CODE_OAUTH_TOKEN` and `FACTORY_PAT` are set, and the PAT has Issues, PRs, Contents, Workflows and Actions read/write.
- [ ] `@ai-hero/sandcastle`, `tsx`, and `zod` ≥ 3.25 are installed, and `shared/` is copied.
- [ ] The prompt's skills are committed, and none of them waits on a human answer.
- [ ] The trigger label was created by hand.
- [ ] The agent job holds no write token, and every write uses `FACTORY_PAT` (principle 3).
- [ ] Structured output is checked by a schema and by `jq`. A gh + jq gate runs before the agent.
- [ ] `concurrency`, `timeout-minutes`, the label lifecycle, and draft PRs are in place.
- [ ] The workflow is on the default branch, has been run with `gh workflow run` and watched with `gh run watch`, and the hand-off fired.

## 10. Which file to copy

- Read-only analysis that writes issues or comments (plan → apply): `agent-explore.yml` + `explore/`.
- Builds code and opens a draft PR: `agent-implement.yml` + `implement/`.
- Reads a PR, pushes fixes, comments on lines: `agent-review.yml` + `review/`.
- Cron, queue, or self-dispatching loop: `agent-implement-spec.yml` + `implement-spec/`.
