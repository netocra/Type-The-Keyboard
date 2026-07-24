# Implementation Plan: Advanced Typing Game Features

## Overview

This implementation plan transforms "Type The Keyboard" into an advanced, hackathon-winning typing game with dynamic audio, visual effects, adaptive learning, and cloud deployment. The plan follows a 4-phase approach (MVP → Analytics → Polish → Deployment) with each task building incrementally on previous work.

**Programming Language:** JavaScript (Vanilla ES6+) with HTML5 and CSS3

**Total Estimated Time:** 22-29 hours

## Tasks

### Phase 1: MVP - Core Features (8-10 hours)

- [x] 1. Initialize project dependencies and file structure
  - Download Tone.js v14+ library and add to project
  - Create `lib/` directory and move Tone.js there
  - Update `index.html` to include Tone.js script tag before `script.js`
  - Create placeholder sections in `index.html` for new UI components
  - Add canvas element for effects rendering
  - _Requirements: 2.1, 2.9_

- [x] 2. Implement Combo System with Multipliers
  - [ ] 2.1 Create ComboManager class in script.js
    - Implement `incrementCombo()`, `resetCombo()`, `getCurrentCombo()`, `getMultiplier()` methods
    - Implement multiplier calculation algorithm (1x for 0-5, 2x for 6-15, 3x for 16-25, 4x for 26-40, 5x for 41+)
    - Integrate with existing input handler to track correct/incorrect keystrokes
    - Store highest combo achieved per session
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [ ] 2.2 Add combo display UI components
    - Create combo counter display (value + "combo" label)
    - Create multiplier display (e.g., "3x")
    - Position UI in fixed right-side panel
    - Style with Catppuccin theme colors
    - _Requirements: 1.9, 1.10_
  
  - [ ] 2.3 Update scoring logic to use multipliers
    - Modify `markWordAsCompleted()` to call `comboManager.onWordComplete(basePoints)`
    - Apply multiplier to word points before adding to total score
    - Reset combo counter after word completion
    - _Requirements: 1.11_


- [x] 3. Implement Audio Engine with Tone.js
  - [ ] 3.1 Create AudioEngine class wrapper
    - Initialize Tone.js audio context with user gesture handling
    - Create Layer class for managing audio layers (beat, bass, percussion, melody, rhythm)
    - Implement audio layer configuration with synth types and patterns
    - Set up global transport tempo (120 BPM)
    - Handle audio initialization errors with graceful degradation
    - _Requirements: 2.1, 2.9, 2.10_
  
  - [ ] 3.2 Implement dynamic layer management
    - Create `updateLayers(comboCount)` method to activate/deactivate layers based on combo
    - Implement layer fade-in/fade-out transitions (0.5s fade-in, 0.3s fade-out)
    - Layer activation rules: 0-5 → beat only, 6-15 → beat+bass+percussion, 16+ → melody+bass+percussion+rhythm
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ] 3.3 Implement sound effect triggers
    - Create `playCorrectNote()` method for correct keystroke feedback
    - Create `playErrorSound()` method for breaking sound on errors
    - Create `playSentenceComplete()` method for satisfying chord progression
    - Wire up audio triggers in input handler
    - _Requirements: 2.2, 2.6, 2.8_
  
  - [ ] 3.4 Integrate audio engine with game lifecycle
    - Initialize AudioEngine on first user gesture (Enter key or click)
    - Stop all audio playback when game ends
    - Handle audio context suspension/resumption on tab visibility changes
    - _Requirements: 2.7, 2.10_

- [x] 4. Checkpoint - Core features working
  - Ensure all tests pass, verify combo system increments correctly
  - Test audio layer transitions at different combo levels
  - Ask the user if questions arise


- [x] 5. Implement Visual Keyboard System
  - [ ] 5.1 Create KeyboardVisualizer class
    - Define keyboard layout structures (QWERTY_ES and QWERTY_LATAM)
    - Create finger position color mapping (9 fingers with distinct colors)
    - Implement `render(layout)` method to generate keyboard DOM elements
    - Add CSS styles for keyboard container, rows, and individual keys
    - _Requirements: 3.1, 3.7, 3.8_
  
  - [ ] 5.2 Implement keyboard layout detection
    - Create `detectLayout()` method using Keyboard API
    - Detect Spanish vs Latin American layouts based on key mappings
    - Fallback to QWERTY_ES if Keyboard API unavailable
    - Handle browser compatibility (Chrome experimental feature)
    - _Requirements: 3.9, 3.10, 3.11_
  
  - [ ] 5.3 Implement key highlighting system
    - Create `highlightKey(key, state)` method with states: 'expected', 'correct', 'incorrect'
    - Apply color-coded finger position indicators
    - Update CSS for key states (border glow for expected, green for correct, red for incorrect)
    - Implement `clearHighlights()` method
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ] 5.4 Integrate keyboard visualizer with game
    - Initialize keyboard on page load
    - Highlight next expected key when word is active
    - Trigger key highlights on correct/incorrect input
    - Clear highlights on word completion
    - Add keyboard container to HTML below stats bar
    - _Requirements: 3.2, 3.5, 3.6_


### Phase 2: Analytics & Progress (6-8 hours)

- [x] 6. Implement IndexedDB Persistence Layer
  - [ ] 6.1 Create StatsTracker class with IndexedDB integration
    - Define database schema (sessions, keyErrors, wordErrors object stores)
    - Implement `initDatabase()` function with version control
    - Create `initialize()` method to open database connection
    - Handle IndexedDB unavailability with in-memory fallback
    - Implement error handling for private browsing mode
    - _Requirements: 4.1_
  
  - [ ] 6.2 Implement session data persistence
    - Create SessionData interface structure
    - Implement `saveSession(sessionData)` method to write to IndexedDB
    - Implement `getAllSessions()` method to query historical data
    - Track key errors and word errors during gameplay
    - Calculate and store WPM history samples (every 5 seconds)
    - _Requirements: 4.2_
  
  - [ ] 6.3 Implement real-time WPM tracking
    - Create WPMCalculator class with sliding window
    - Track word completion timestamps in 5-second window
    - Calculate current WPM from window data
    - Update live WPM display during gameplay
    - Hide WPM graph when game ends (graph removed, only live stat remains)
    - _Requirements: 4.3, 4.4_
  
  - [ ] 6.4 Integrate stats tracking with game lifecycle
    - Modify `markWordAsMissed()` to call `statsTracker.trackWordError(word)`
    - Modify input handler to call `statsTracker.trackKeyError(key)` on incorrect input
    - Call `statsTracker.saveSession()` in `endGame()` with complete session data
    - Track perfect sentences (100% accuracy) for achievement system
    - _Requirements: 4.2_


- [x] 7. Create Statistics Dashboard UI
  - [ ] 7.1 Build overall statistics display
    - Create stats dashboard HTML structure in index.html
    - Add stat cards for: total words, total time played, best WPM, best combo
    - Implement `getOverallStats()` method to aggregate data from all sessions
    - Wire up dashboard with "View Stats" button in menu
    - Style dashboard with Catppuccin theme
    - _Requirements: 4.8, 4.9, 4.10, 4.11, 4.12_
  
  - [ ] 7.2 Generate historical accuracy chart
    - Add canvas element for accuracy chart
    - Implement `getHistoricalAccuracy()` method to fetch session accuracies
    - Use Canvas API to render line chart showing accuracy over time
    - Add axis labels and grid lines
    - _Requirements: 4.5_
  
  - [ ] 7.3 Generate keyboard heatmap visualization
    - Implement `getProblematicKeys()` method to query key error counts
    - Render keyboard layout with color-coded error frequency
    - Use gradient from green (low errors) to red (high errors)
    - Display top 10 most problematic keys
    - _Requirements: 4.6_
  
  - [ ] 7.4 Display top difficult words
    - Implement `getTopDifficultWords()` method to query word errors
    - Display top 5 words with highest error counts
    - Show attempt count for each word
    - _Requirements: 4.7_

- [x] 8. Checkpoint - Analytics working
  - Ensure all tests pass, verify IndexedDB stores session data
  - Test stats dashboard displays historical data correctly
  - Ask the user if questions arise


- [ ] 9. Implement Achievement System
  - [ ] 9.1 Create AchievementSystem class
    - Define achievement data structure (id, name, description, icon, condition, progressFn)
    - Create achievement definitions: Novato (100 words), Mecanógrafo (500 words + 80% acc), Combo Master (combo 30+), Perfeccionista (perfect sentence)
    - Implement `initialize()` method to load achievement state from LocalStorage
    - Implement `checkAchievements(gameState)` method to evaluate conditions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 9.2 Implement achievement unlock logic
    - Create `unlockAchievement(achievementId)` method to save to LocalStorage
    - Implement `getProgress(achievementId)` method for progress tracking
    - Track progress for multi-step achievements (e.g., Mecanógrafo requires words AND accuracy)
    - Return newly unlocked achievements from `checkAchievements()`
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 9.3 Create achievement notification UI
    - Design achievement notification component (icon, name, description)
    - Implement slide-in animation from right side
    - Auto-dismiss after 3.5 seconds with slide-out animation
    - Add particle effect burst on unlock
    - Style with gradient background and shadow
    - _Requirements: 5.6_
  
  - [ ] 9.4 Integrate achievement system with game
    - Call `achievementSystem.checkAchievements()` in `endGame()`
    - Build gameState object with total words, average accuracy, highest combo, perfect sentences
    - Display unlocked achievements in stats dashboard
    - Show locked achievements with progress bars
    - _Requirements: 5.7, 5.8_


### Phase 3: Polish & Effects (6-8 hours)

- [ ] 10. Implement Adaptive Practice Engine
  - [ ] 10.1 Create SentenceGenerator class
    - Define Spanish vocabulary bank (articles, nouns, verbs, adjectives, prepositions, adverbs)
    - Create sentence templates (6-8 different grammatical patterns)
    - Implement `generate(targetKeys, count)` method to create sentences
    - Implement `fillTemplate()` to select words containing problematic keys
    - Implement `isValid()` to validate sentence structure (5-15 words, no duplicates)
    - Fallback to default sentences if generation fails
    - _Requirements: 6.2, 10.1, 10.2, 10.5, 10.6_
  
  - [ ] 10.2 Create AdaptivePracticeEngine class
    - Implement `identifyProblematicKeys(threshold)` method to analyze heatmap data
    - Filter keys with error count >= threshold (default 3)
    - Return top 10 most problematic keys sorted by error frequency
    - Integrate with StatsTracker to fetch key error data
    - _Requirements: 6.1_
  
  - [ ] 10.3 Implement practice mode UI and gameplay
    - Add "Practice Mode" button to menu
    - Modify game initialization to support practice mode (WORD_SPEED = 0, no time limit)
    - Display finger position tips for current problematic key
    - Show improvement progress bar for each problematic key
    - Generate targeted sentences using SentenceGenerator
    - _Requirements: 6.3, 6.4, 6.5_
  
  - [ ] 10.4 Implement improvement tracking
    - Create improvement counters map for each problematic key
    - Implement `trackImprovement(key)` method to increment counter on correct input
    - Reset counter on any error for that key
    - Mark key as improved after 5 consecutive correct inputs AND sentence completion AND adequate practice time
    - Display visual feedback showing improvement progress
    - _Requirements: 6.6, 6.7, 6.8_


- [x] 11. Implement Canvas Visual Effects
  - [x] 11.1 Create CanvasEffectsRenderer class
    - Initialize canvas context with proper dimensions
    - Create Particle class with position, velocity, color, lifetime
    - Create Trail class with point array and fade animation
    - Create ShakeEffect class with intensity and duration
    - Implement animation loop with requestAnimationFrame
    - _Requirements: 7.5_
  
  - [x] 11.2 Implement particle explosion effect
    - Create `particleExplosion(x, y, color)` method
    - Generate 30 particles in radial pattern
    - Apply gravity and velocity to particles
    - Fade out particles over 0.5-1 second lifetime
    - Trigger on sentence completion
    - _Requirements: 7.1_
  
  - [x] 11.3 Implement neon trail effect
    - Create `neonTrail(points, color)` method
    - Track last 10 positions of each falling word
    - Render smooth line with glow effect using shadowBlur
    - Fade out trail gradually
    - _Requirements: 7.2_
  
  - [x] 11.4 Implement screen shake effect
    - Create `screenShake(intensity, duration)` method
    - Apply random x/y offsets to game container transform
    - Decay shake intensity over duration
    - Trigger on player error
    - _Requirements: 7.3_
  
  - [x] 11.5 Implement combo fire animation
    - Create `comboFire(x, y)` method to generate continuous fire particles
    - Activate when combo >= 21
    - Use orange/red/yellow colors for fire effect
    - Add pulsing glow animation to combo display
    - _Requirements: 7.4_
  
  - [x] 11.6 Optimize canvas performance
    - Implement particle count limit (max 500)
    - Use object pooling for particle reuse
    - Batch canvas draw calls
    - Monitor FPS and implement adaptive quality reduction
    - _Requirements: 7.6_


- [ ] 12. Implement Fullscreen Mode
  - [ ] 12.1 Create FullscreenManager class
    - Implement vendor prefix handling (webkit, moz, ms)
    - Create `enterFullscreen()` method with error handling
    - Create `exitFullscreen()` method
    - Implement `isFullscreenSupported()` check
    - Implement `isCurrentlyFullscreen()` state check
    - _Requirements: 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 12.2 Add fullscreen toggle UI
    - Add fullscreen button to menu screen
    - Update button icon based on fullscreen state (🖥️ vs 🗗)
    - Disable button if Fullscreen API not supported
    - Display tooltip for unsupported browsers
    - _Requirements: 8.1, 8.7_
  
  - [ ] 12.3 Integrate fullscreen with game
    - Initialize FullscreenManager on page load
    - Listen for fullscreenchange events (all vendor prefixes)
    - Update UI when entering/exiting fullscreen
    - Hide browser UI elements in fullscreen mode
    - _Requirements: 8.6_

- [ ] 13. Checkpoint - Visual effects and polish complete
  - Ensure all tests pass, verify canvas effects render at 60 FPS
  - Test fullscreen mode in supported browsers
  - Verify practice mode generates targeted sentences
  - Ask the user if questions arise


### Phase 4: AWS Deployment (2-3 hours)

- [ ] 14. Configure AWS S3 Static Hosting
  - [ ] 14.1 Create and configure S3 bucket
    - Create S3 bucket with unique name (e.g., type-the-keyboard-game)
    - Enable static website hosting with index.html as root
    - Configure bucket policy for public read access
    - Upload all project files (HTML, CSS, JS, images, lib/)
    - _Requirements: 9.1, 9.3_
  
  - [ ] 14.2 Set up file structure and cache headers
    - Organize files in S3: index.html, script.js, styles.css, lib/tone.js, img/, assets/
    - Set cache-control headers: HTML (1 hour), JS/CSS (1 year with versioning)
    - Verify file permissions and MIME types
    - Test S3 website endpoint URL
    - _Requirements: 9.1_

- [ ] 15. Configure AWS CloudFront CDN
  - [ ] 15.1 Create CloudFront distribution
    - Create distribution with S3 bucket as origin
    - Configure default cache behavior (redirect HTTP to HTTPS)
    - Set price class and enable compression
    - Configure default root object (index.html)
    - _Requirements: 9.2, 9.4_
  
  - [ ] 15.2 Configure cache invalidation
    - Create cache invalidation for "/*" paths after updates
    - Document invalidation command for future deployments
    - Test CloudFront distribution URL
    - _Requirements: 9.2_


- [ ] 16. Create Deployment Automation
  - [ ] 16.1 Create deployment script
    - Write bash script (deploy.sh) to sync files to S3
    - Include cache header configuration in script
    - Add CloudFront invalidation command
    - Make script executable and test locally
    - _Requirements: 9.5_
  
  - [ ] 16.2 Verify production deployment
    - Test game on CloudFront URL
    - Verify all assets load correctly (Tone.js, images, styles)
    - Test gameplay features work in production
    - Verify HTTPS certificate is valid
    - Share public URL for access
    - _Requirements: 9.4, 9.5_

- [ ] 17. Final checkpoint - Production deployment complete
  - Verify game is accessible via public CloudFront URL
  - Test all features work in production environment
  - Confirm audio, effects, and persistence work correctly
  - Ask the user if questions arise

## Notes

- All tasks build incrementally on previous work
- Each phase delivers a complete, testable feature set
- Phase 1 (MVP) provides playable game with core features
- Phase 2 adds retention through analytics and achievements
- Phase 3 adds polish and "wow factor" for hackathon judges
- Phase 4 makes the game publicly accessible
- IndexedDB and LocalStorage provide client-side persistence
- Tone.js handles all audio synthesis without external files
- Canvas API renders all visual effects
- AWS provides global CDN distribution


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "5.2"] },
    { "id": 3, "tasks": ["2.3", "3.3", "5.3"] },
    { "id": 4, "tasks": ["3.4", "5.4"] },
    { "id": 5, "tasks": ["6.1", "9.1", "10.1"] },
    { "id": 6, "tasks": ["6.2", "9.2", "10.2"] },
    { "id": 7, "tasks": ["6.3", "7.1", "9.3", "10.3"] },
    { "id": 8, "tasks": ["6.4", "7.2", "9.4", "10.4"] },
    { "id": 9, "tasks": ["7.3", "11.1"] },
    { "id": 10, "tasks": ["7.4", "11.2", "11.3", "12.1"] },
    { "id": 11, "tasks": ["11.4", "11.5", "12.2"] },
    { "id": 12, "tasks": ["11.6", "12.3"] },
    { "id": 13, "tasks": ["14.1"] },
    { "id": 14, "tasks": ["14.2", "15.1"] },
    { "id": 15, "tasks": ["15.2", "16.1"] },
    { "id": 16, "tasks": ["16.2"] }
  ]
}
```
