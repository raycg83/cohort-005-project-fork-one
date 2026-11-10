# Giving the agent a browser

This is how you drive a page in the app, and ask it questions.

It uses [agent-browser](https://github.com/vercel-labs/agent-browser), a CLI
built for exactly this — one command per action, an answer on stdout.

## Once, per machine

The factory workflows install it for you. On your own machine:

```bash
npm install -g agent-browser
agent-browser install
```

## Starting the app and signing in

Start the dev server and wait for it to answer, rather than sleeping a fixed
time:

```bash
(npm run dev > /tmp/dev.log 2>&1 &)
for i in $(seq 60); do curl -sf -o /dev/null http://localhost:5173/ && break; sleep 0.5; done
curl -sf -o /dev/null http://localhost:5173/ || { cat /tmp/dev.log; exit 1; }
```

Most pages need a user in the session. Pick one from the seeded database, then
post to the route the DevUI panel uses. The cookie lands in the browser:

```bash
# A Student and a lesson they are enrolled in.
IFS='|' read -r USER_ID SLUG LESSON_ID < <(sqlite3 data.db "select e.user_id,
  c.slug, l.id from enrollments e join courses c on c.id = e.course_id
  join modules m on m.course_id = c.id join lessons l on l.module_id = m.id
  limit 1")

agent-browser open http://localhost:5173/
agent-browser eval "fetch('/api/switch-user', {method: 'POST', body: new URLSearchParams({userId: '$USER_ID'})}).then(r => r.status)"
agent-browser open "http://localhost:5173/courses/$SLUG/lessons/$LESSON_ID"
```

`/api/set-dev-country` takes `country` the same way.

## Asking your own question

Start the app first (above). The examples below use
`http://localhost:5173`, the dev server's default address — if `npm run dev`
printed a different one, use that.

A screenshot is pixels. To verify a fix you need a yes or a no, so read the
DOM:

```bash
agent-browser open http://localhost:5173/courses
agent-browser find placeholder "Search courses..." fill "typescript"
agent-browser find role button click --name "Search"

# Did the search reach the URL?
agent-browser get url

# How many course cards came back?
agent-browser get count 'a[href^="/courses/"]'

# What does the empty state say, if there is one?
agent-browser get text main

# Did anything break?
agent-browser errors
agent-browser console
```

The commands worth knowing: `open`, `click`, `fill`,
`find <role|text|label|placeholder> …`, `wait`, `get text|html|attr|count|url`,
`is visible|enabled|checked`, `eval`, `snapshot` (the accessibility tree, with
refs), `screenshot`, `console`, `errors`, `close`. `agent-browser --help` has
the rest.

**Ask the page, do not ask the person.** A change you have not looked at is a
change you are reporting on trust.

Screenshots are PR evidence: a before and an after for a change that shows in
the UI.

## Two things that will bite you

**Hydration lags "networkidle".** The button is in the server HTML before
React attaches its `onClick`, so the first click can be a silent no-op. Poll
for the click's effect and click again, rather than waiting a fixed time.

**Vite re-optimizes on the first load.** On a fresh checkout, the first page
load discovers dependencies Vite has not pre-bundled, and pushes a full-page
reload a moment after the response has finished. Absorb it once against a
throwaway load before the real loop; otherwise it lands mid-interaction and
every click after it hits a page that is already navigating away.
