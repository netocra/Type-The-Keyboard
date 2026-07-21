// --- GUITAR HERO STYLE WITH SENTENCE ACCUMULATION ---

// --- BANCO DE ORACIONES ---
const sentenceBank = [
    "el gato negro salta sobre el muro alto",
    "la luna brilla en el cielo nocturno estrellado",
    "los ninos juegan felices en el parque verde",
    "el viento sopla fuerte entre los arboles altos",
    "la musica suena alegre durante toda la noche"
];

// --- STATE ---
let gameActive = false;
let gameStartTime = null;
let currentWordIndex = 0;
let currentTypedText = '';
let words = [];
let wordStates = []; // Track Y position and status for each word
let animationFrameId = null;
let currentDifficulty = 'medium';

// Stats tracking
let correctWords = 0;
let missedWords = 0;
let totalScore = 0;
let completedSentences = 0;
let accumulatedWords = []; // Words that have been typed correctly

// Game configuration
let WORD_SPEED = 1.5; // pixels per frame (adjusted per difficulty)
const WORD_SPACING = 120; // vertical spacing between words
const HIT_LINE_Y_RATIO = 1.0; // Hit line at the very bottom of container
let HIT_LINE_Y = 400; // Will be recalculated on init
const START_Y = -50; // Words start above the visible area

// Scoring
const POINTS_PER_WORD = 10;
const SENTENCE_BONUS = 100;

// --- ELEMENTS ---
const textDisplay = document.getElementById('textDisplay');
const accumulatedSentences = document.getElementById('accumulatedSentences');
const startHint = document.getElementById('startHint');
const statsBar = document.getElementById('statsBar');
const liveWpm = document.getElementById('liveWpm');
const liveAcc = document.getElementById('liveAcc');
const liveTimer = document.getElementById('liveTimer');
const liveScore = document.getElementById('liveScore');
const liveSentences = document.getElementById('liveSentences');
const resultsDiv = document.getElementById('results');
const gameContainer = document.getElementById('gameContainer');
const menuScreen = document.getElementById('menuScreen');

// --- CLEAN PREVIOUS GAME STATE ---
function cleanGameState() {
    // Cancel any running animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Reset all state variables
    gameActive = false;
    gameStartTime = null;
    currentWordIndex = 0;
    currentTypedText = '';
    words = [];
    wordStates = [];
    correctWords = 0;
    missedWords = 0;
    totalScore = 0;
    completedSentences = 0;
    accumulatedWords = [];

    // Clear DOM elements
    if (textDisplay) {
        textDisplay.innerHTML = '';
    }
    if (accumulatedSentences) {
        accumulatedSentences.innerHTML = '';
    }

    // Hide/reset UI elements
    if (startHint) startHint.classList.remove('hidden');
    if (statsBar) statsBar.classList.remove('visible');
    if (resultsDiv) resultsDiv.classList.remove('active');
}

// --- INITIALIZE GAME ---
function initGame() {
    // CRITICAL: Clean all previous state first
    cleanGameState();

    // Hide menu, show game
    if (menuScreen) menuScreen.style.display = 'none';
    if (gameContainer) gameContainer.style.display = '';

    // Generate sentences from bank
    const fullText = sentenceBank.join(' ');
    words = fullText.split(' ').filter(w => w.length > 0);

    // Initialize word states with staggered Y positions
    wordStates = words.map((word, index) => ({
        y: START_Y - (index * WORD_SPACING),
        status: 'pending', // pending, active, completed, missed
        element: null
    }));

    // Setup UI
    textDisplay.style.position = 'relative';
    textDisplay.style.overflow = 'hidden';
    textDisplay.style.display = '';

    // Calculate hit line based on actual container height
    HIT_LINE_Y = Math.floor(textDisplay.clientHeight * HIT_LINE_Y_RATIO);

    // Create hit line
    createHitLine();

    // Create word elements
    createWordElements();

    // Show start hint
    startHint.textContent = 'Presiona Enter para iniciar...';
    startHint.classList.remove('hidden');

    // Reset stats display
    liveWpm.textContent = '0';
    liveAcc.textContent = '100';
    liveTimer.textContent = '0';
    liveScore.textContent = '0';
    liveSentences.textContent = '0';

    // Focus for input
    textDisplay.focus();
}

// --- CREATE HIT LINE ---
function createHitLine() {
    // Hit line removed - the container border serves as the visual limit
}

// --- CREATE WORD ELEMENTS ---
function createWordElements() {
    wordStates.forEach((state, index) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'falling-word';
        wordDiv.dataset.index = index;

        // Create character spans
        words[index].split('').forEach(char => {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = char;
            wordDiv.appendChild(charSpan);
        });

        wordDiv.style.position = 'absolute';
        wordDiv.style.left = '50%';
        wordDiv.style.transform = 'translateX(-50%)';
        wordDiv.style.fontSize = '1.8rem';
        wordDiv.style.fontWeight = '600';
        wordDiv.style.whiteSpace = 'nowrap';
        wordDiv.style.visibility = 'hidden';

        textDisplay.appendChild(wordDiv);
        state.element = wordDiv;
    });
}

// --- START GAME ---
function startGame() {
    if (gameActive) return;

    gameActive = true;
    gameStartTime = Date.now();
    startHint.classList.add('hidden');
    statsBar.classList.add('visible');

    // Show all words
    wordStates.forEach(state => {
        if (state.element) state.element.style.visibility = 'visible';
    });

    // Start animation loop
    animate();
}

// --- ANIMATION LOOP ---
function animate() {
    if (!gameActive) return;

    // Update word positions
    let allWordsFinished = true;

    wordStates.forEach((state, index) => {
        if (state.status === 'pending' || state.status === 'active') {
            state.y += WORD_SPEED;
            allWordsFinished = false;

            // If word reached the hit line, mark as missed immediately (don't render below)
            if (state.y >= HIT_LINE_Y) {
                if (index === currentWordIndex) {
                    markWordAsMissed(index);
                } else {
                    state.status = 'missed';
                    missedWords++;
                    if (state.element) state.element.style.display = 'none';
                }
                return;
            }

            // Update visual position (only if still above hit line)
            if (state.element) {
                state.element.style.top = state.y + 'px';
            }

            // Check if word has reached hit line area
            if (state.status === 'pending' && Math.abs(state.y - HIT_LINE_Y) < 30) {
                state.status = 'active';
                if (index === currentWordIndex) {
                    state.element.style.color = '#89b4fa';
                }
            }
        } else {
            // Word is completed or missed, check if all are done
            if (state.status !== 'completed' && state.status !== 'missed') {
                allWordsFinished = false;
            }
        }
    });

    // Update live stats
    updateLiveStats();

    // Check if game is complete
    if (allWordsFinished && currentWordIndex >= words.length) {
        endGame();
        return;
    }

    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
}

// --- ADD WORD TO ACCUMULATED AREA ---
function addWordToAccumulated(word) {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-accumulated';
    wordSpan.textContent = word;

    // Check if word ends with period (sentence end)
    if (word.endsWith('.')) {
        // Remove period from word and add separately
        wordSpan.textContent = word.slice(0, -1);
        accumulatedSentences.appendChild(wordSpan);

        const periodSpan = document.createElement('span');
        periodSpan.className = 'period';
        periodSpan.textContent = '.';
        accumulatedSentences.appendChild(periodSpan);

        // Mark sentence as complete and award bonus
        completedSentences++;
        totalScore += SENTENCE_BONUS;

        // Animate the completed sentence
        setTimeout(() => {
            const allWords = accumulatedSentences.querySelectorAll('.word-accumulated');
            allWords.forEach(w => w.classList.add('sentence-complete'));
            setTimeout(() => {
                allWords.forEach(w => w.classList.remove('sentence-complete'));
            }, 600);
        }, 100);
    } else {
        accumulatedSentences.appendChild(wordSpan);
    }

    // Add space after word
    const space = document.createTextNode(' ');
    accumulatedSentences.appendChild(space);
}

// --- MARK WORD AS MISSED ---
function addMissedWordToAccumulated(word) {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word-accumulated';
    wordSpan.textContent = word;
    wordSpan.style.color = '#f38ba8';
    accumulatedSentences.appendChild(wordSpan);

    // Add space after word
    const space = document.createTextNode(' ');
    accumulatedSentences.appendChild(space);
}

function markWordAsMissed(index) {
    const state = wordStates[index];
    if (state.status === 'missed' || state.status === 'completed') return;

    state.status = 'missed';
    missedWords++;

    // Visual feedback
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Add missed word to accumulated area in red
    addMissedWordToAccumulated(words[index]);

    // Move to next word
    currentWordIndex++;
    currentTypedText = '';

    // Highlight next active word
    if (currentWordIndex < words.length) {
        const nextState = wordStates[currentWordIndex];
        if (nextState.element) {
            nextState.element.style.color = '#89b4fa';
        }
    }
}

// --- MARK WORD AS COMPLETED ---
function markWordAsCompleted(index) {
    const state = wordStates[index];
    if (state.status === 'completed') return;

    state.status = 'completed';
    correctWords++;

    // Add points for word
    totalScore += POINTS_PER_WORD;

    // Add word to accumulated area
    addWordToAccumulated(words[index]);

    // Visual success effect
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Move to next word
    currentWordIndex++;
    currentTypedText = '';

    // Highlight next active word
    if (currentWordIndex < words.length) {
        const nextState = wordStates[currentWordIndex];
        if (nextState.element) {
            nextState.element.style.color = '#89b4fa';
        }
    }
}

// --- INPUT HANDLER ---
document.addEventListener('keydown', function (e) {
    if (!gameActive && !resultsDiv.classList.contains('active')) {
        // Start game only on Enter
        if (e.key === 'Enter') {
            startGame();
        }
        return;
    }

    if (!gameActive || resultsDiv.classList.contains('active')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'CapsLock', 'Escape', 'Enter', 'Tab'].includes(e.key)) return;

    e.preventDefault();

    // Get current word
    if (currentWordIndex >= words.length) return;
    const currentWord = words[currentWordIndex];
    const state = wordStates[currentWordIndex];

    // Ignore input if the word hasn't appeared on screen yet
    if (state.y < 0) return;

    // Handle backspace
    if (e.key === 'Backspace') {
        if (currentTypedText.length > 0) {
            currentTypedText = currentTypedText.slice(0, -1);
            updateWordDisplay(currentWordIndex);
        }
        return;
    }

    // Handle space (word completion attempt)
    if (e.key === ' ') {
        if (currentTypedText === currentWord) {
            markWordAsCompleted(currentWordIndex);
        } else {
            // Failed - mark as missed
            markWordAsMissed(currentWordIndex);
        }
        return;
    }

    // Handle character input
    if (e.key.length === 1) {
        currentTypedText += e.key;
        updateWordDisplay(currentWordIndex);

        // Auto-complete if word matches fully
        if (currentTypedText === currentWord) {
            markWordAsCompleted(currentWordIndex);
        }
        // Auto-fail if typed text is longer than word or doesn't match
        else if (currentTypedText.length >= currentWord.length ||
            !currentWord.startsWith(currentTypedText)) {
            markWordAsMissed(currentWordIndex);
        }
    }
});

// --- UPDATE WORD DISPLAY ---
function updateWordDisplay(index) {
    const state = wordStates[index];
    if (!state.element) return;

    const currentWord = words[index];
    const chars = state.element.querySelectorAll('.char');

    chars.forEach((charEl, charIndex) => {
        charEl.classList.remove('correct', 'incorrect');

        if (charIndex < currentTypedText.length) {
            if (currentTypedText[charIndex] === currentWord[charIndex]) {
                charEl.classList.add('correct');
                charEl.style.color = '#a6e3a1';
            } else {
                charEl.classList.add('incorrect');
                charEl.style.color = '#f38ba8';
            }
        } else {
            charEl.style.color = '#89b4fa';
        }
    });
}

// --- UPDATE LIVE STATS ---
function updateLiveStats() {
    if (!gameStartTime) return;

    const elapsedSeconds = (Date.now() - gameStartTime) / 1000;
    const elapsedMinutes = elapsedSeconds / 60;

    // WPM calculation
    const wpm = elapsedMinutes > 0 ? Math.round(correctWords / elapsedMinutes) : 0;
    liveWpm.textContent = wpm;

    // Accuracy calculation
    const totalWords = correctWords + missedWords;
    const accuracy = totalWords > 0
        ? Math.round((correctWords / totalWords) * 100)
        : 100;
    liveAcc.textContent = accuracy;

    // Timer (elapsed time)
    liveTimer.textContent = Math.floor(elapsedSeconds);

    // Score
    liveScore.textContent = totalScore;

    // Sentences
    liveSentences.textContent = completedSentences;
}

// --- END GAME ---
function endGame() {
    gameActive = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Hide game elements
    statsBar.classList.remove('visible');
    textDisplay.style.display = 'none';

    // Show results
    document.getElementById('resultScore').textContent = totalScore;
    document.getElementById('resultSentences').textContent = completedSentences;
    document.getElementById('resultWords').textContent = correctWords;
    document.getElementById('resultMissed').textContent = missedWords;

    resultsDiv.classList.add('active');
}

// --- RESTART GAME ---
function restartGame() {
    resultsDiv.classList.remove('active');
    initGame();
}

// --- GO TO MENU ---
function goToMenu() {
    cleanGameState();
    if (gameContainer) gameContainer.style.display = 'none';
    if (menuScreen) menuScreen.style.display = '';
}

// --- DIFFICULTY SELECTION ---
function selectDifficulty(level) {
    currentDifficulty = level;

    // Set speed based on difficulty
    switch (level) {
        case 'easy':
            WORD_SPEED = 1.0;
            break;
        case 'medium':
            WORD_SPEED = 1.5;
            break;
        case 'hard':
            WORD_SPEED = 2.5;
            break;
    }

    // Initialize game with selected difficulty
    initGame();
}

// --- FOCUS MANAGEMENT ---
if (textDisplay) {
    textDisplay.addEventListener('click', () => textDisplay.focus());
}

// --- SHOW MENU ON LOAD ---
window.addEventListener('load', () => {
    if (menuScreen) menuScreen.style.display = '';
    if (gameContainer) gameContainer.style.display = 'none';
});

// --- LANGUAGE TOGGLE (frontend only) ---
let currentLanguage = 'es';
function toggleLanguage() {
    currentLanguage = currentLanguage === 'es' ? 'en' : 'es';
    const ball = document.getElementById('toggleBall');
    const langEs = document.getElementById('langEs');
    const langEn = document.getElementById('langEn');

    if (currentLanguage === 'en') {
        ball.classList.add('right');
        langEs.classList.remove('lang-active');
        langEn.classList.add('lang-active');
    } else {
        ball.classList.remove('right');
        langEn.classList.remove('lang-active');
        langEs.classList.add('lang-active');
    }
}
