# CodeOutLoud

**Voice-First DSA Interview Simulator** — trains engineering students to solve Data Structures & Algorithms problems under realistic whiteboard conditions by enforcing verbal articulation before and during coding.

> Live demo: deploy to Vercel with `GROQ_API_KEY` set and share the URL.

---

## Problem Statement 4 — Open Innovation

Most campus placement rejections are not caused by algorithmic weakness alone. Students who can silently solve a LeetCode problem in 15 minutes frequently freeze when asked to explain their reasoning in a live whiteboard session. Existing platforms (LeetCode, HackerRank) are silent, text-in/text-out environments that actively reinforce bad interview habits.

**CodeOutLoud fixes this with a behavioral enforcement system:**

| Feature | What it enforces |
|---|---|
| Verbal Lock | Editor stays read-only until the candidate speaks a valid pitch covering brute force, algorithm, and Big-O complexity |
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

1. Select difficulty and interviewer persona → press **Start verbal pitch**
2. Speak your approach in Hinglish — the editor stays **locked** until brute-force, algorithm, and complexity are all detected
3. On approval, the editor unlocks and the **Articulate Like a Pro** card shows the corporate English translation
4. Write code — a **curveball** fires automatically after 30 s, played aloud via speech synthesis
5. Answer the curveball (typed or spoken), then press **Submit interview**
6. View the **Hireability Scorecard**: index /100, four sub-scores, timestamped audit trail, filler word count, and dead air %

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Code editor | `@monaco-editor/react` |
| Speech in | Web Speech API (`SpeechRecognition`) — zero latency, zero cost; manual textarea fallback |
| Speech out | Web Speech Synthesis API (`speechSynthesis`) |
| AI backend | Groq API — `llama-3.3-70b-versatile` via Next.js Route Handlers (under 1.5 s per call) |
| State persistence | `localStorage` — session survives page refresh |

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and add your Groq key
cp .env.local.example .env.local
# Edit .env.local → set GROQ_API_KEY=your_groq_api_key_here
# Get a free key at https://console.groq.com

# 3. Start dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The app works without a Groq key — pitch validation falls back to a client-side heuristic and the scorecard skips the AI audit trail.

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
- `.env.local` is git-ignored

---

## AI Attribution

All interviewer interactions, curveball questions, pitch validations, corporate-English translations, and scorecard audit trails are **generated by AI** (Groq / Llama 3.3 70B). This is disclosed in the UI via a persistent badge in the header.
