# Requirements Document

## Introduction

This document specifies the requirements for transforming the existing "Type The Keyboard" typing game into an advanced, hackathon-winning web application. The system will leverage creative use of browser APIs (Web Audio API, Keyboard API, Canvas API, Web Animations, LocalStorage/IndexedDB, Fullscreen API) to create an engaging, educational, and addictive typing experience. The enhanced game will feature generative audio, adaptive learning, visual feedback, detailed statistics, and cloud deployment capabilities.

## Glossary

- **System**: The Type The Keyboard web application
- **Player**: The user playing the typing game
- **Combo**: A counter representing consecutive correct keystrokes without errors
- **WPM**: Words Per Minutes, a measure of typing speed
- **Accuracy**: Percentage of correctly typed characters out of total typed characters
- **Session**: A single gameplay instance from start to finish
- **Heatmap**: A visual representation of key error frequency
- **Achievement**: A milestone unlocked by meeting specific gameplay criteria
- **Tone.js**: A Web Audio framework for creating interactive music in the browser
- **Keyboard_Layout**: The physical arrangement of keys (QWERTY Spanish, Latin American, etc.)
- **Visual_Keyboard**: An on-screen representation of the physical keyboard
- **Audio_Layer**: A musical component (beat, bass, melody) that can be added or removed dynamically
- **Adaptive_Practice_Engine**: A system that analyzes player performance and generates targeted practice content
- **Problematic_Key**: A key that the player frequently misses or types incorrectly
- **Canvas_Effect**: A visual animation rendered using the HTML5 Canvas API

## Requirements

### Requirement 1: Combo System with Point Multipliers

**User Story:** As a player, I want to build combos by typing correctly, so that I feel rewarded for sustained accuracy and can achieve higher scores.

#### Acceptance Criteria

1. THE System SHALL initialize the combo counter at zero when a session starts
2. WHEN the Player types a correct character, THE System SHALL increment the combo counter by one
3. WHEN the Player types an incorrect character, THE System SHALL reset the combo counter to zero
4. WHEN the combo counter is between 0 and 5, THE System SHALL apply a 1x point multiplier
5. WHEN the combo counter is between 6 and 15, THE System SHALL apply a 2x point multiplier
6. WHEN the combo counter is between 16 and 25, THE System SHALL apply a 3x point multiplier
7. WHEN the combo counter is between 26 and 40, THE System SHALL apply a 4x point multiplier
8. WHEN the combo counter is 41 or higher, THE System SHALL apply a 5x point multiplier
9. THE System SHALL display the current combo counter value in the game UI
10. THE System SHALL display the current point multiplier in the game UI
11. WHEN a word is completed, THE System SHALL first reset the combo counter to zero, then calculate the points as base_word_points multiplied by the multiplier active at word completion

### Requirement 2: Generative Audio System Using Tone.js

**User Story:** As a player, I want the music to respond dynamically to my performance, so that I feel immersed and motivated to maintain accuracy.

#### Acceptance Criteria

1. THE System SHALL initialize Tone.js audio context when the game starts
2. WHEN the Player types a correct character, THE System SHALL play a musical note in a predefined scale
3. WHEN the combo counter is between 0 and 5 inclusive, THE System SHALL play only a minimalist beat Audio_Layer
4. WHEN the combo counter is between 6 and 15 inclusive, THE System SHALL add bass and percussion Audio_Layers while maintaining the base beat
5. WHEN the combo counter is 16 or higher, THE System SHALL add melody and intensified rhythm Audio_Layers, and these high-tier layers may replace the base beat
6. WHEN the Player makes an error, THE System SHALL play a breaking sound effect
7. WHEN the Player makes an error, THE System SHALL remove all Audio_Layers except the base beat
8. WHEN the Player completes a sentence, THE System SHALL play a satisfying chord progression
9. THE System SHALL synthesize all audio in real-time using Tone.js
10. WHEN the game ends, THE System SHALL gracefully stop all audio playback

### Requirement 3: Interactive Visual Keyboard

**User Story:** As a player, I want to see a visual keyboard that mirrors my physical keyboard and highlights the next key to press, so that I can learn proper finger placement and improve my typing accuracy.

#### Acceptance Criteria

1. THE System SHALL render a Visual_Keyboard that matches the Player's physical Keyboard_Layout
2. WHEN a word appears, THE System SHALL highlight the next character to type on the Visual_Keyboard
3. THE System SHALL use color-coded indicators for each finger position (left pinky, left ring, left middle, left index, thumbs, right index, right middle, right ring, right pinky)
4. THE System SHALL display default visual state (highlight of expected key) even when the Player is not actively typing
5. WHEN the Player types a correct character, THE System SHALL illuminate the corresponding key in green
6. WHEN the Player types an incorrect character, THE System SHALL illuminate the corresponding key in red
7. THE Visual_Keyboard SHALL support QWERTY Spanish layout
8. THE Visual_Keyboard SHALL support QWERTY Latin American layout
9. THE System SHALL use the Keyboard API to detect the Player's Keyboard_Layout automatically
10. IF the Keyboard API successfully detects the layout, THEN THE System SHALL use the detected layout
11. IF the Keyboard API cannot determine the layout, THEN THE System SHALL default to QWERTY Spanish layout

### Requirement 4: Statistics Dashboard with Historical Data

**User Story:** As a player, I want to view detailed statistics about my typing performance over time, so that I can track my progress and identify areas for improvement.

#### Acceptance Criteria

1. THE System SHALL persist session data using IndexedDB
2. WHEN a session ends, THE System SHALL save WPM, accuracy, total words typed, total time played, highest combo, and problematic keys to IndexedDB
3. WHILE the gameplay session is active, THE System SHALL display a real-time WPM graph
4. WHEN the gameplay session ends, THE System SHALL hide the real-time WPM graph completely
5. THE System SHALL display a historical accuracy chart showing accuracy percentages across all sessions
6. THE System SHALL generate a heatmap showing Problematic_Keys based on error frequency
7. THE System SHALL display the top five most difficult words for the Player
8. THE System SHALL display total time played across all sessions
9. THE System SHALL display total words typed across all sessions
10. THE System SHALL display the highest combo ever achieved
11. THE System SHALL display the best WPM ever achieved
12. THE System SHALL provide a dashboard view accessible from the menu

### Requirement 5: Achievement System

**User Story:** As a player, I want to unlock achievements by reaching milestones, so that I feel motivated to continue playing and improving.

#### Acceptance Criteria

1. THE System SHALL track achievement progress using LocalStorage
2. WHEN the Player reaches the milestone of typing 100 words naturally during gameplay, THE System SHALL unlock the "Novato" achievement
3. WHEN the Player reaches the milestone of typing 500 words AND achieving 80% or higher average accuracy naturally during gameplay, THE System SHALL unlock the "Mecanógrafo" achievement
4. WHEN the Player reaches the milestone of achieving a combo of 30 or higher naturally during gameplay, THE System SHALL unlock the "Combo Master" achievement
5. WHEN the Player reaches the milestone of completing a sentence with 100% accuracy naturally during gameplay, THE System SHALL unlock the "Perfeccionista" achievement
6. THE System SHALL display a notification when an achievement is unlocked
7. THE System SHALL display all unlocked achievements in the statistics dashboard
8. THE System SHALL display locked achievements as grayed-out with progress indicators

### Requirement 6: Adaptive Practice Mode

**User Story:** As a player, I want the game to identify my weak points and give me targeted practice, so that I can improve my typing skills efficiently.

#### Acceptance Criteria

1. THE Adaptive_Practice_Engine SHALL analyze the Player's heatmap data to identify Problematic_Keys
2. THE Adaptive_Practice_Engine SHALL generate sentences dynamically that contain a high frequency of Problematic_Keys
3. WHEN the Player selects Practice Mode, THE System SHALL present generated sentences focused on Problematic_Keys
4. WHILE in Practice Mode, THE System SHALL NOT apply time pressure (words do not fall)
5. WHILE in Practice Mode, THE System SHALL display finger position tips for the current Problematic_Key
6. WHEN the Player makes any error on a Problematic_Key in Practice Mode, THE System SHALL reset the consecutive correct counter for that key to zero
7. WHEN the Player types a Problematic_Key correctly five times consecutively in Practice Mode AND completes the sentences containing those keys AND meets time-based practice requirements, THE System SHALL mark it as improved
8. THE System SHALL provide visual feedback showing improvement progress for each Problematic_Key

### Requirement 7: Advanced Canvas Visual Effects

**User Story:** As a player, I want to see stunning visual effects during gameplay, so that the experience feels polished and satisfying.

#### Acceptance Criteria

1. WHEN a sentence is completed, THE System SHALL render a particle explosion Canvas_Effect at the completion point
2. WHILE words are falling, THE System SHALL render neon trail Canvas_Effects behind each word
3. WHEN the Player makes an error, THE System SHALL trigger a screen shake Canvas_Effect
4. WHEN the combo counter reaches 21 or higher, THE System SHALL render a fire animation Canvas_Effect around the combo display
5. THE System SHALL render all Canvas_Effects using the HTML5 Canvas API
6. THE System SHALL optimize Canvas_Effect rendering to maintain 60 FPS during gameplay

### Requirement 8: Fullscreen Immersive Mode

**User Story:** As a player, I want to play the game in fullscreen mode, so that I can focus without distractions.

#### Acceptance Criteria

1. THE System SHALL provide a fullscreen toggle button in the game menu
2. WHEN the Player activates fullscreen mode, THE System SHALL use the Fullscreen API to request fullscreen
3. IF the fullscreen request succeeds, THEN THE System SHALL enter fullscreen mode
4. IF the fullscreen request fails, THEN THE System SHALL log the error and notify the Player
5. WHEN the Player deactivates fullscreen mode, THE System SHALL exit fullscreen and return to normal view
6. WHILE in fullscreen mode, THE System SHALL hide browser UI elements
7. IF the browser does not support the Fullscreen API, THEN THE System SHALL disable the fullscreen toggle button

### Requirement 9: AWS Cloud Deployment

**User Story:** As a developer, I want to deploy the game to AWS so that anyone can access and play it online.

#### Acceptance Criteria

1. THE System SHALL host static assets (HTML, CSS, JavaScript, images) on AWS S3
2. THE System SHALL serve content through AWS CloudFront for global CDN distribution
3. THE System SHALL configure S3 bucket policies to allow public read access for game assets
4. THE System SHALL configure CloudFront to use HTTPS for secure content delivery
5. THE System SHALL provide a public URL for accessing the deployed game
6. WHERE a global leaderboard feature is implemented, THE System SHALL permit independent configuration of AWS Lambda for backend API
7. WHERE a global leaderboard feature is implemented, THE System SHALL permit independent configuration of AWS API Gateway for backend API
8. WHERE a global leaderboard feature is implemented, THE System SHALL permit independent configuration of AWS DynamoDB for leaderboard data persistence

### Requirement 10: Sentence Generation with Parser and Pretty Printer

**User Story:** As a developer, I want to dynamically generate and format practice sentences, so that the adaptive practice engine can create targeted content.

#### Acceptance Criteria

1. WHEN the Adaptive_Practice_Engine generates a sentence, THE System SHALL parse the sentence structure to validate grammar
2. WHEN a sentence is generated, THE Pretty_Printer SHALL format the sentence with proper spacing and punctuation
3. FOR ALL valid generated sentences, parsing then printing then parsing SHALL produce an equivalent sentence structure (round-trip property)
4. WHEN a generated sentence contains invalid grammar, THE System SHALL return a descriptive error
5. THE System SHALL ensure generated sentences contain between 5 and 15 words
6. THE System SHALL ensure generated sentences contain common Spanish vocabulary appropriate for typing practice

---

**End of Requirements Document**
