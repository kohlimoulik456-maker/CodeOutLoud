# CodeOutLoud

CodeOutLoud is a voice-first DSA interview simulator designed to train students for realistic technical rounds where verbal reasoning matters as much as code correctness.

## Problem Statement 4: Open Innovation
This prototype focuses on the core pain point behind many campus placement rejections: students can often code the solution, but fail to communicate the approach, complexity, and edge-case reasoning in a live whiteboard interview.

## App Summary
- Locked editor until the student explains the brute-force intuition, data structure, and complexity.
- Live speech transcription using browser speech APIs with speech-synthesis narration for AI interviewer prompts.
- Hinglish-to-professional-English translation card for technical explanations.
- Dead-air monitoring, filler-word tracking, and curveball interruptions.
- Final hireability scorecard blending code correctness, communication clarity, and edge-case awareness.

## Evidence and Student Need

### Survey findings
We surveyed 12 engineering students from Tier-2 and Tier-3 backgrounds on how they prepare for DSA interviews.

Key findings:
- 83% reported at least some level of lower confidence when explaining solutions out loud compared with writing silently.
- 100% said they had been rejected or strongly questioned due to complexity explanations.
- 100% reported using Hinglish or mixed-language narration during technical problem solving.
- Several students explicitly said silence or dead air made them feel they were losing the round.

This data is captured in [evidence/survey_results.csv](./evidence/survey_results.csv).

### Qualitative interview notes
Five interview notes were collected and documented in [evidence/interviews.md](./evidence/interviews.md). The recurring pattern was consistent: students were not failing only because of algorithmic weakness; they were failing because they froze in verbal explanation, skipped complexity, or were unprepared for curveball questions.

### Pain point ranking
1. Communication paralysis during live explanation
2. Inability to state brute-force vs. optimal approach clearly
3. Dead air and filler words under interviewer pressure
4. Forgetting boundary and edge-case checks while coding
5. Difficulty converting Hinglish logic into polished corporate English

### Verified student quotes
- "I can code the solution, but as soon as the interviewer asks why this is O(n), my mind goes blank."
- "I solve on LeetCode but then freeze on a live problem because the recruiter interrupts with an edge-case question."
- "When I speak in Hinglish, I know the logic is correct, but I cannot convert it into polished corporate English under time pressure."

## Local run
```bash
npm install
npm run dev
```
Then open http://localhost:3000.

## Notes
This prototype is intentionally designed to be a behavior-enforcement system, not a passive coding challenge. It is built to simulate the voice-first interview conditions that real students experience during campus placement rounds.
