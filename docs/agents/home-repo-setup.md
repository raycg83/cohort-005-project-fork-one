# Home repo: setup brief for the dev box

This doc is for a Claude Code session on Raymond's dev box. It was written on his MacBook on 2026-11-12.

**The rule: follow Matt Pocock's article "The Home Repo Pattern" exactly.** Source: <https://www.aihero.dev/the-home-repo-pattern>. Raymond has decided this. Do not swap in another layout or method. If this doc and the article ever disagree, the article wins. If the article has changed since 2026-11-12, use the newer version.

The rest of this doc is background. It gives you facts about Claude Code and about Raymond's current setup, so you can answer the prompt's questions with less guessing. None of it changes Matt's method.

## 1. How to start

1. Open a terminal in the folder that holds Raymond's repos (Matt's examples use `~/repos`). Start Claude Code there, not inside one repo.
2. Paste the prompt in section 2 as the first message, or copy it fresh from the article.
3. Follow it step by step. Ask Raymond the decisions in rounds, as the prompt says. Change nothing until he approves the plan in Step 3.

## 2. Matt's setup prompt

Copied from the article on 2026-11-12. Matt publishes it for people to copy.

```text
Set up a Home Repo with me: one git repo that holds my shared skills,
AGENTS.md and shared docs, and points at my other repos. I'll run my agent
from it.

## How to work

- Look up every fact yourself (filesystem, git, gh), using subagents for
  wide searches. Bring me only decisions.
- Put decisions to me in rounds. Number each question, give your
  recommended answer, and word it so "yes" accepts it. A question that
  depends on one still open waits for a later round.
- Until I approve the plan in Step 3, only read.
- Secrets stay where they are: leave .env and other secret files unread.

## Step 1: Inventory the repos

Find every git repo under my home directory, skipping dependency folders.
For each, record its path, remote, visibility (public or private) and
last commit date.

In the first round, ask:

- which repos the Home Repo points at (recommend those with recent commits)
- where it lives, and whether it's new or an existing repo (recommend a
  new private repo beside the others)
- whether it's personal or shared with a team
- which file my harness loads at session start: AGENTS.md, CLAUDE.md or
  both (recommend what my setup shows)

Done when every repo found is marked in or out, and the other three
questions are answered.

## Step 2: Inventory the shared material

Across the chosen repos and my user-level skill folders (such as
~/.claude/skills), list every skill (a folder with a SKILL.md), every
AGENTS.md and CLAUDE.md, and every doc written for agents: coding
standards, glossaries, ADRs.

Sort each item into one bucket:

- shared: true across repos
- duplicate: the same item in several places; diff the copies and mark
  the newest
- repo-specific: about one repo's code, commands or domain
- installed: from a published skills repo or marketplace

Done when every item sits in exactly one bucket.

## Step 3: Agree the plan

Show a table of every item, where it is now, and its destination:

- shared and duplicate: move to the Home Repo, one copy, newest version
- repo-specific: stays in its repo
- installed: stays installed

Under it, show the Home Repo's AGENTS.md: a short intro, then an
"Other Repos" section with one pointer per repo:

  <name> (<what it is>): <local path>. Clone from <remote> if missing.

Add a hint where a repo needs one, such as "read its AGENTS.md first".
Past about 20 repos, group the pointers into one file per area and point
at those files instead.

Settle open items in further rounds. Done when I approve the table and
the AGENTS.md.

## Step 4: Apply the plan

1. Create the Home Repo and its AGENTS.md. If my harness loads a
   different file, add that file as a one-line pointer to AGENTS.md.
2. Copy each shared item in, keeping skill folders whole.
3. In each child repo, on a new local branch, remove the copies that
   moved. Repo-specific material stays.
4. Commit in the Home Repo. Pushing is my call.

Done when every row of the table is applied. Report each row's outcome,
the branches you created in each repo, and anything you skipped, with
the reason.
```

## 3. What Matt's method says, in short

From the article, his video, and his answers in the course Discord:

- **One home repo**, a new private repo **beside** the other repos. It holds shared skills, `AGENTS.md` with pointers, steering files (instruction files the agent loads), and shared docs. It holds no app code.
- **Always start the agent in the home repo.** Also grill features that cross repos there.
- **Pointers are one line per repo:** name, what it is, local path, and "clone from `<remote>` if missing". If the repo is on disk, the agent works there. If not, the agent clones it to that path. Examples from the article:
  - `Storefront (Next.js app): ~/repos/acme/storefront. Clone from git@github.com:acme/storefront.git if missing.`
  - `Payments API: ~/repos/acme/payments-api. Read its AGENTS.md before changing it.`
- **Each repo keeps its own** `AGENTS.md`, build and test commands, repo-specific docs, history, remote, and issue tracker.
- **Shared docs go in the home repo.** Coding standards that apply everywhere are "the first doc worth sharing". A shared glossary and decisions that affect the whole system go there too.
- **User folders (`~/.claude/skills`) are a stopgap.** In the video Matt explains why: they are invisible, so they fall behind, and the user folder is meant for personal tweaks, not the main setup. Skills that come from a published source stay installed, though (the "installed" bucket).
- **Keep the home repo lean.** Its `AGENTS.md` loads in every session.
- **Monorepo if you can.** The home repo is for when you can't, for example when you mix public and private repos.

## 4. Claude Code facts that matter here

Checked against <https://code.claude.com/docs/en/memory> and <https://code.claude.com/docs/en/skills> on 2026-11-12. If the installed version behaves differently, trust what you see and tell Raymond.

- **Which file loads.** Claude Code loads `CLAUDE.md`. It reads `AGENTS.md` only when no `CLAUDE.md` or `CLAUDE.local.md` exists in the start folder or above it (needs version 2.1.277 or later). `~/.claude/CLAUDE.md` does not count for that check. The article answers this too: "Claude Code loads CLAUDE.md." So for Step 1's fourth question, the answer on Raymond's setup is `CLAUDE.md`, and Step 4.1 means a one-line `CLAUDE.md` in the home repo containing `@AGENTS.md`. An `@path` line pulls that file in.
- **Other repos' steering files do not load on their own.** Claude Code loads `CLAUDE.md` from the start folder, the folders above it, and subfolders below it. A repo beside the home repo is none of those. That is why Matt's hint "Read its AGENTS.md before changing it" matters. Put that hint on every pointer to a repo with its own rules, such as `cohort-005-project`.
- **Skills.** Skills in the home repo's `.claude/skills/` load in every session started there. Skills in `~/.claude/skills/` load in every session on the machine. If two have the same name, the `~/.claude/skills` one wins. So after shared skills move into the home repo, an old copy left in `~/.claude/skills` would still be the one that runs. Raise this with Raymond in Step 3.
- **File access.** Claude Code asks permission before it touches files outside the folder it started in. Matt's video mentions keeping a versioned `.claude/settings.json` in the home repo. Its `permissions.additionalDirectories` setting can grant access to the repos folder. This grants file access only. It does not load those repos' skills or steering files. This is an option to offer, not part of the prompt.

## 5. What the MacBook looks like today

The dev box may differ. Use this only to know what to look for in Step 2.

- **User-level skills.** Real files are in `~/.agents/skills/`. Most entries in `~/.claude/skills/` are symlinks (shortcuts) to them, and some are plain copies. This is the layout made by the `skills` CLI (`npx skills add ...`).
- **Installed skills.** `cohort-005-project` has a `skills-lock.json`. It lists only three skills, all from `mattpocock/skills`: `grill-me`, `grilling`, and `handoff`. These fit the "installed" bucket. Many other skills (such as `tdd` and `domain-modeling`) look like they came from Matt's skills too, but they are not in the lockfile, so check where each one came from before choosing its bucket.
- **Duplicates.** Several skills exist both in `~/.claude/skills` and in the project's `.agents/skills/`, such as `tdd`, `grilling`, `codebase-design`, and `diagnosing-bugs`. Diff them as Step 2 says.
- **Repo-specific skills.** `cohort-005-project` has skills about its own code, such as `database-migrations`, `mutation-testing`, and `pr`. These likely stay in the repo. Confirm in Step 2.
- **Steering files.** `cohort-005-project` has a `CLAUDE.md` and an `AGENTS.md` that are identical copies. Its `.claude/skills` is a symlink to `../.agents/skills`.
- **Personal preferences.** `~/.claude/CLAUDE.md` holds Raymond's writing preferences (section 8). This is a personal file, not shared material. Leave it where it is.

## 6. Raymond's earlier questions, answered by Matt's method

1. **"My skills are installed globally. Does that change?"** Skills from a published source stay installed. Skills he wrote or changed himself, and used across repos, move into the home repo's `.claude/skills/`, where git tracks them.
2. **"Do my preferences go in each project's CLAUDE.md?"** No. Personal preferences stay in `~/.claude/CLAUDE.md`. Shared working rules go in the home repo's `AGENTS.md`. A project's file holds only that project's rules.
3. **Notes and wiki.** These go in the home repo, as a folder of Markdown files.
4. **"How does Claude know which project I mean?"** From the pointers. Raymond names the project in his request, and the pointer gives its path. If a request could fit more than one repo, ask him.
5. **"Each project has its own glossary?"** Words used in only one project stay in that project. A glossary shared across projects goes in the home repo.

## 7. After the setup (not part of the prompt)

Mention these to Raymond at the end. Do not set them up unless he asks.

- **Worktrees.** Each repo is cloned once. Each feature gets a worktree (a separate working copy on its own branch) inside that clone, so several agents can work in one repo at once. Clean up old worktrees from time to time.
- **Issues.** The agent can reach every repo's issue tracker, and it can file each issue where it fits.
- **Tooling.** Not needed to start. Later, the home repo is the place for a CLI that connects the agent to outside services.
- **CI.** In a software factory, the home repo runs in the sandbox and clones the other repos as it needs them.
- **Many repos.** Past about 20, group the pointers into one file per area, as the prompt says.
- **Pushing** the home repo is Raymond's call. It should be a private repo.

How to check the result with him:

1. Start `claude` in the home repo. Run `/memory` and confirm the home `CLAUDE.md` loads and pulls in `AGENTS.md`.
2. Run `/skills` and confirm the skills he expects are there.
3. Ask "where is cohort-005-project?" Claude should give the path from its pointer.
4. Ask Claude to make a tiny read-only check in that repo. Confirm it reads the repo's `AGENTS.md` first, as the hint says.

## 8. How to write to Raymond

Copied from his `~/.claude/CLAUDE.md`, in case the dev box lacks it:

- Lead with the answer in one or two plain sentences, then the details.
- Short sentences, everyday words. Explain any technical term in plain words right after it.
- No filler openers, no hype words, and no em dashes.
- Do not leave out facts he needs. Simple words, full answer.
