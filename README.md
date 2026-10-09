# CodeOutLoud

**Voice-First DSA Interview Simulator** — trains engineering students to solve Data Structures & Algorithms problems under realistic whiteboard conditions by enforcing verbal articulation before and during coding.

> Live demo: deploy to Vercel with `GROQ_API_KEY` set and share the URL.

---

## Problem Statement 4 — Open Innovation

Most campus placement rejections are not caused by algorithmic weakness alone. Students who can silently solve a LeetCode problem in 15 minutes frequently freeze when asked to explain their reasoning in a live whiteboard session. Existing platforms (LeetCode, HackerRank) are silent, text-in/text-out environments that actively reinforce bad interview habits.

**CodeOutLoud fixes this with a behavioral enforcement system:**

| Feature | What it enforces |
|---|---|
| Verbal Lock | Editor stays read-only until server-side AI scores a problem-specific baseline, efficient approach and reasoning, and time/space complexity above the difficulty threshold (60% Easy, 70% Medium, 85% Hard) |
| Hinglish Bridge | Mixed Hindi-English explanations are accepted and translated to polished corporate English in real time |
| Dead Air Monitor | A pulsing banner fires every 15 s of silence with a contextual prompt |
| AI Curveballs | The AI interviewer interrupts mid-coding with context-aware questions (nested loop, boundary checks, random) |
| Hireability Scorecard | A 0–100 score across algorithmic correctness (40%), communication (30%), and edge-case awareness (30%) with a timestamped audit trail |

---

## Evidence of Real Student Need

> This section satisfies the Track 4 mandatory evidence deliverable. Full data is in [`/evidence/`](./evidence/).

### Survey data (`/evidence/survey_results.csv`)

12 engineering students (Tier-2 and Tier-3 colleges) were surveyed on confidence, rejections, and language habits.

| Metric | Finding |
|---|---|
| Lower confidence explaining vs. coding silently | **83% (10/12)** reported lower confidence when explaining out loud |
| Rejections attributed to complexity explanation | **100% (12/12)** had at least 1 rejection linked to complexity or communication |
| Use of Hinglish during technical problem-solving | **100% (12/12)** use Hinglish or mixed-language narration |
| Dead air cited as a cause of perceived failure | **58% (7/12)** explicitly mentioned silence as a factor |
| Reported curveball/interruption unpreparedness | **50% (6/12)** froze specifically when the interviewer interrupted mid-solution |

**Average self-reported confidence scores (1 = very low, 10 = very high):**
- Coding silently: **2.8 / 10**
- Explaining the solution out loud: **4.4 / 10**

### Pain point ranking (from survey free-text)

1. 🥇 Communication paralysis during live verbal explanation
2. 🥈 Inability to articulate brute-force vs. optimal trade-off clearly
3. 🥉 Dead air and filler words under interviewer pressure
4. Missing boundary / edge-case checks while coding under time pressure
5. Difficulty converting Hinglish logic into polished corporate English on the spot

### Qualitative interviews (`/evidence/interviews.md`)

Five in-depth interviews were conducted with students from B.Tech CS, ECE, and Mechanical backgrounds targeting software roles.

**Cross-cutting pattern across all five:** Students consistently described frustration with silent coding environments, dead air during live sessions, and pressure to explain algorithmic reasoning in fluent professional English under time constraints — even when their underlying logic was sound.

**Verified direct quotes:**

> *"I can code the solution, but as soon as the interviewer asks why this is O(n), my mind goes blank."*
> — B.Tech CS, 3rd year, Tier-2 college

> *"In mock interviews, I often say 'uh' and then restart. It feels like I am not allowed to think out loud, and that destroys my confidence."*
> — ECE final-year student

> *"I solve on LeetCode but then freeze on a live problem because the recruiter interrupts with an edge-case question."*
> — CSE student, internship drive

> *"When I speak in Hinglish, I know the logic is correct, but I cannot convert it into polished corporate English under time pressure."*
> — Mechanical engineering graduate targeting software roles

> *"I know the brute-force logic, but when they ask for the optimal approach, I jump straight to the answer without explaining the trade-off."*
> — Data Structures student, placement prep cohort

---

## Core Loop (3-minute table demo)

1. Choose difficulty, programming language, and up to eight LeetCode topic tags; fetch a matching free question and press **Start verbal pitch**
2. The microphone starts with the pitch. Explain the actual problem and your baseline, efficient approach and reasoning, and time/space complexity in English, Hinglish, or a mix; stop the mic and validate. The editor stays **locked** until server-side AI scores the explanation at 60% (Easy), 70% (Medium), or 85% (Hard). Problem relevance and a viable efficient approach are always required.
3. An incomplete answer receives a problem-specific spoken hint. After three unsuccessful attempts, the candidate can reveal the approach or choose another problem. On approval, the editor unlocks and the **Articulate Like a Pro** card shows the corporate English translation.
4. Write code and press **Submit code** to run the problem's public LeetCode example cases. A **curveball** also fires automatically after 30 s, played aloud via speech synthesis.
5. Review compile/runtime/sample feedback, then use **See results** for the hireability scorecard or **Next question** to select another problem.
6. The **Hireability Scorecard** shows the interview summary, audit trail, filler word count, and dead air %.

---

## Product surfaces

- `/` — public progress dashboard; shows Supabase history when a valid signed-in session is available, otherwise preview mode.
- `/login` — email/password sign-in and account creation.
- `/interview` — configure difficulty, language, and LeetCode topic tags, then practice against the fetched problem statement and language-specific starter code; guest results stay in this browser and signed-in results sync to Supabase.
- `/master-interview` — protected locked Pro-feature preview.

Authentication and signed-in session persistence use Supabase Auth and PostgreSQL. Guest interview summaries are stored locally in the browser. Apply [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor before running the app. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to credentials from the same Supabase project. Sign-up uses Supabase email confirmation unless email confirmations are disabled in the project settings. Configure the callback redirect URL in Supabase Auth settings.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Code editor | `@monaco-editor/react` |
| Speech in | Web Speech API (`SpeechRecognition`) — zero latency, zero cost; manual textarea fallback |
| Speech out | Web Speech Synthesis API (`speechSynthesis`) |
| AI backend | Groq API — `openai/gpt-oss-120b` via Next.js Route Handlers |
| Code execution | Self-hosted Piston via an authenticated server-side endpoint |
| State persistence | Supabase PostgreSQL for signed-in users; browser storage for guest summaries |

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and add your Groq key
cp .env.local.example .env.local
# Set Supabase URL/key and your site URL in .env.local.
# Set the server-side GROQ_API_KEY for required verbal-pitch validation,
# the prep coach, and AI interview feedback. Do not use a NEXT_PUBLIC_ prefix.
# Self-host Piston as described below, then set server-side PISTON_API_URL,
# PISTON_API_USERNAME, and PISTON_API_PASSWORD in .env.local.

# 3. Apply supabase/schema.sql in Supabase Dashboard → SQL Editor
# Also allow http://localhost:3000/auth/callback in Supabase Auth URL settings.

# 4. Start dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Supabase project credentials and the SQL schema are required for sign-in and account history, but guest practice is available without signing in. LeetCode problem search and public sample retrieval use its public GraphQL endpoint and need no API key. Verbal-pitch validation, the prep coach, and AI interview feedback require a server-side `GROQ_API_KEY`. Pitch validation fails closed when the key or AI service is unavailable; it never substitutes a client-side heuristic or unlocks on an API error. Code submissions run server-side through the authenticated Piston endpoint configured with `PISTON_API_URL`, `PISTON_API_USERNAME`, and `PISTON_API_PASSWORD` for JavaScript, Python, C++, and Java. Piston's public endpoint is whitelist-only, so host the runner yourself as described below. Submitted code is sent to that service; only public LeetCode example cases are tested, not hidden acceptance tests. Guest summaries still save in this browser.

### Self-hosting the Piston runner

Piston's hosted public API became whitelist-only on February 15, 2026. This project includes [piston/compose.yaml](./piston/compose.yaml) for a small Linux VM with Docker, a DNS name, and ports 80/443 open. Piston itself is bound to localhost; Caddy provides HTTPS and Basic Authentication at the public edge. Do not expose port 2000 directly.

For local development with Docker Desktop on macOS, start the loopback-only runner from the repository root:

```bash
docker compose -f piston/compose.local.yaml up -d
```

The local stack does not expose Piston outside your computer. Keep `PISTON_API_URL=http://127.0.0.1:2000/api/v2/execute` in `.env.local` and leave the Piston username/password unset. The Piston container starts without language runtimes installed. Install the runtimes once using the upstream CLI on your Mac:

```bash
git clone https://github.com/engineer-man/piston /tmp/piston
cd /tmp/piston/cli
npm install
node index.js -u http://127.0.0.1:2000 ppman install javascript=18.15.0
node index.js -u http://127.0.0.1:2000 ppman install python=3.10.0
node index.js -u http://127.0.0.1:2000 ppman install c++=10.2.0
node index.js -u http://127.0.0.1:2000 ppman install java=15.0.2
```

To stop the local runner, run `docker compose -f piston/compose.local.yaml down` from the repository root. The local compose setup uses a persistent `piston/packages` directory; keep it in place to retain installed runtimes.

1. Point a DNS name (for example, `piston.example.com`) at the VM and install Docker Engine with Compose on a Linux host with cgroup v2 enabled.
2. On the VM, copy [`piston/env.example`](./piston/env.example) to `.env` in the `piston/` directory. Set `PISTON_DOMAIN` to the DNS name and choose a non-default `PISTON_AUTH_USERNAME`.
3. Generate a long random password for the proxy account. Run `docker run --rm caddy:2 caddy hash-password --plaintext '<your-random-password>'` and put the resulting hash in `PISTON_AUTH_HASH` (keep the hash single-quoted in `.env`). Do not share or commit the password or hash.
4. From `piston/`, run `docker compose up -d`. Caddy will request a TLS certificate for the configured DNS name.
5. Install the supported Piston runtimes from the VM:

   ```sh
   git clone https://github.com/engineer-man/piston /tmp/piston
   cd /tmp/piston/cli
   npm install
   node index.js -u http://127.0.0.1:2000 ppman install javascript=18.15.0
   node index.js -u http://127.0.0.1:2000 ppman install python=3.10.0
   node index.js -u http://127.0.0.1:2000 ppman install c++=10.2.0
   node index.js -u http://127.0.0.1:2000 ppman install java=15.0.2
   ```

6. Set `PISTON_API_URL=https://<your-dns-name>/api/v2/execute`, `PISTON_API_USERNAME`, and `PISTON_API_PASSWORD` as server-side environment variables in `.env.local` and in Vercel. Use the same username/password as the Caddy proxy account. Never use a `NEXT_PUBLIC_` prefix. Redeploy the Next.js app after setting the Vercel variables.

The Piston host runs arbitrary submitted programs inside Piston's Linux sandbox and must be kept patched and monitored. The interview only reports public example-case results, not hidden/full acceptance tests. See the [upstream Piston setup and API docs](https://github.com/engineer-man/piston#readme) for host requirements and runtime package details.

---

## Interviewer Persona Modes

| Persona | Behaviour |
|---|---|
| FAANG Bar Raiser | Aggressive Big-O and scalability challenges |
| Empathetic Senior Dev | Gentle structural hints when stuck |
| Strict Edge-Case Specialist | Attacks null, empty, overflow, and duplicates |

---

## Security

- API keys live server-side only in `.env.local` — never exposed to the client
- All AI inference is routed through Next.js Route Handlers (`/api/*`)
- Submitted code is sent to the operator-configured Piston host; do not submit secrets or sensitive code
- The Piston API stays on the VM's loopback interface; only the authenticated HTTPS proxy is public
- `.env.local` is git-ignored

---

## AI Attribution

The dashboard prep coach and interview AI endpoints use Groq / GPT-OSS 120B with the server-side `GROQ_API_KEY`. Pitch validation sends the current problem and transcript to the server, scores a structured evaluation against the required concepts, and keeps the editor locked if validation fails or is unavailable. Required pitch scores are 60% for Easy, 70% for Medium, and 85% for Hard; problem relevance and a viable efficient approach must each score at least 60%.
