# Spec: Type-The-Keyboard (Continuous Rhythm Stream)

## 1. Core Mechanics (Guitar Hero Style Stream)
- **Sequential Word Stream**: Words in a sentence flow downwards in a single, continuous, spaced sequence (like notes on a track in Guitar Hero).
- **Rhythm Flow**:
  - The player types the active word closest to the hit line.
  - **Success**: Word is cleared with a visual hit effect. Target focus moves smoothly to the next word immediately behind it.
  - **Miss / Typo**: If a word crosses the hit line or is failed, play a minor failure cue (word turns red/fades). The song/stream DOES NOT STOP. The target immediately shifts to the next approaching word in the sequence.
- **End of Stream**: When the full sentence/stream finishes, present a clean results card (WPM, Accuracy, Missed Words count).

## 2. Visual & UI Requirements
- Clean, minimalist terminal look (MonkeyType inspired, but vertical track flow).
- Words are visually aligned along a central lane/track moving down toward a fixed "hit line" at the bottom.

## 3. Tasks for Kiro
1. Refactor `script.js` to create a continuous track/queue system where words drop in fixed single-file order.
2. Ensure input validation targets ONLY the current active word at the hit line.
3. Handle misses seamlessly: flag the word as missed, advance the queue index, and keep the game loop/stream running smoothly without stutter.
4. Render a clean final score summary upon completion.