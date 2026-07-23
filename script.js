// --- GUITAR HERO STYLE WITH SENTENCE ACCUMULATION ---

// --- BANCO DE ORACIONES ---
// Fallback local en caso de que la API no esté disponible
const FALLBACK_SENTENCES = [
    "el gato negro salta sobre el muro alto",
    "la luna brilla en el cielo nocturno estrellado",
    "los ninos juegan felices en el parque verde",
    "el viento sopla fuerte entre los arboles altos",
    "la musica suena alegre durante toda la noche"
];

const FALLBACK_SENTENCES_EN = [
    "the quick brown fox jumps over the lazy dog",
    "she sells sea shells by the sea shore today",
    "the rain in spain stays mainly on the plain",
    "every good boy does fine when playing music notes",
    "pack my box with five dozen big red jugs"
];

// URL de la API de palabras en español
const SENTENCES_API_URL = 'https://random-word-api.herokuapp.com/word';

/**
 * Verifica si una palabra parece ser español válido para el juego.
 * Filtra palabras en inglés, con mayúsculas raras, espacios, acentos o caracteres no válidos.
 */
function isValidSpanishWord(word) {
    // Rechazar palabras vacías o muy cortas
    if (!word || word.length < 2) return false;
    // Rechazar palabras con espacios (frases compuestas)
    if (word.includes(' ')) return false;
    // Rechazar palabras que empiezan con mayúscula (nombres propios / inglés)
    if (word[0] !== word[0].toLowerCase()) return false;
    // Solo aceptar letras sin acento (a-z, ñ) — sin tildes para facilitar la escritura
    if (!/^[a-zñ]+$/.test(word)) return false;
    // Rechazar palabras con patrones típicos del inglés
    if (/th|sh|wh|ck|ght|ph|ow|aw|ew|wn|wr|kn|oo|ee|tt|ll$/.test(word)) return false;
    // Rechazar terminaciones comunes del inglés
    if (/ing$|tion$|ness$|ment$|ful$|less$|ous$|ive$|ble$|ly$|er$|ed$|ght$|tch$/.test(word)) return false;
    // Rechazar palabras que empiecen con combinaciones raras en español
    if (/^(wh|th|sh|ph|kn|wr|tw|sw|sc|sk|sl|sm|sn|sp|st|str|spr)/.test(word)) return false;
    return true;
}

/**
 * Verifica si una palabra parece ser inglés válido para el juego.
 * Filtra palabras en español, con acentos, ñ, o caracteres no ingleses.
 */
function isValidEnglishWord(word) {
    // Rechazar palabras vacías o muy cortas
    if (!word || word.length < 2) return false;
    // Rechazar palabras con espacios
    if (word.includes(' ')) return false;
    // Rechazar palabras que empiezan con mayúscula (nombres propios)
    if (word[0] !== word[0].toLowerCase()) return false;
    // Solo aceptar letras inglesas (a-z sin ñ ni acentos)
    if (!/^[a-z]+$/.test(word)) return false;
    // Rechazar palabras con ñ o patrones típicos del español
    if (/ñ|ción|mente$|idad$|ismo$|ista$/.test(word)) return false;
    return true;
}

/**
 * Carga palabras desde la API externa y las agrupa en oraciones.
 * Si la API falla, usa el fallback local.
 * @param {string} language - Idioma ('es' o 'en')
 * @param {string} difficulty - Dificultad ('easy', 'medium', 'hard')
 * @returns {Promise<string[]>} Array de oraciones
 */
async function fetchSentences(language = 'es', difficulty = 'medium') {
    if (!SENTENCES_API_URL) {
        console.log('API no configurada, usando oraciones de fallback');
        return language === 'en' ? FALLBACK_SENTENCES_EN : FALLBACK_SENTENCES;
    }

    // Determinar cantidad de palabras según dificultad
    const wordsPerSentence = 5;
    const sentenceCount = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 6 : 5;
    const totalWords = wordsPerSentence * sentenceCount;

    // Pedir más palabras de las necesarias para compensar las que se filtren
    const requestCount = totalWords * 3;

    // Seleccionar idioma para la API y filtro correspondiente
    const apiLang = language === 'en' ? 'en' : 'es';
    const wordFilter = language === 'en' ? isValidEnglishWord : isValidSpanishWord;
    const fallback = language === 'en' ? FALLBACK_SENTENCES_EN : FALLBACK_SENTENCES;

    try {
        const response = await fetch(`${SENTENCES_API_URL}?lang=${apiLang}&number=${requestCount}`);

        if (!response.ok) {
            throw new Error(`API respondió con status ${response.status}`);
        }

        const words = await response.json();

        if (!Array.isArray(words) || words.length === 0) {
            throw new Error('Formato de respuesta inválido o sin palabras');
        }

        // Filtrar: solo palabras válidas del idioma seleccionado
        const cleanWords = words
            .map(w => w.toLowerCase().trim())
            .filter(wordFilter)
            .slice(0, totalWords);

        if (cleanWords.length < wordsPerSentence) {
            throw new Error(`Solo se obtuvieron ${cleanWords.length} palabras válidas`);
        }

        // Agrupar palabras en oraciones
        const sentences = [];
        for (let i = 0; i < cleanWords.length; i += wordsPerSentence) {
            const chunk = cleanWords.slice(i, i + wordsPerSentence);
            if (chunk.length === wordsPerSentence) {
                sentences.push(chunk.join(' '));
            }
        }

        if (sentences.length === 0) {
            throw new Error('No se pudieron formar oraciones completas');
        }

        console.log(`Cargadas ${sentences.length} oraciones en ${apiLang} desde API (${cleanWords.length} palabras)`);
        return sentences;

    } catch (error) {
        console.warn('Error al cargar palabras desde API:', error.message);
        console.log('Usando oraciones de fallback');
        return fallback;
    }
}

// Variable que almacena las oraciones cargadas para la partida actual
let sentenceBank = [...FALLBACK_SENTENCES];

// --- COMBO MANAGER CLASS ---
class ComboManager {
    constructor() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.highestCombo = 0;
    }

    incrementCombo() {
        this.comboCount++;
        if (this.comboCount > this.highestCombo) {
            this.highestCombo = this.comboCount;
        }
        this.multiplier = this.calculateMultiplier(this.comboCount);
        this.updateUI();
    }

    resetCombo() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.updateUI();
    }

    getCurrentCombo() {
        return this.comboCount;
    }

    getMultiplier() {
        return this.multiplier;
    }

    getHighestCombo() {
        return this.highestCombo;
    }

    calculateMultiplier(combo) {
        if (combo >= 41) return 5;
        if (combo >= 26) return 4;
        if (combo >= 16) return 3;
        if (combo >= 6) return 2;
        return 1;
    }

    onCorrectInput() {
        this.incrementCombo();
    }

    onIncorrectInput() {
        this.resetCombo();
    }

    onWordComplete(basePoints) {
        // Apply multiplier to points before resetting combo
        const multipliedPoints = basePoints * this.multiplier;
        this.resetCombo();
        return multipliedPoints;
    }

    updateUI() {
        const comboValue = document.getElementById('comboValue');
        const multiplierValue = document.getElementById('multiplierValue');
        const comboCounter = document.querySelector('.combo-counter');

        if (comboValue) {
            comboValue.textContent = this.comboCount;
        }
        if (multiplierValue) {
            multiplierValue.textContent = `${this.multiplier}x`;
        }

        // Add fire effect for combo 21+
        if (comboCounter) {
            if (this.comboCount >= 21) {
                comboCounter.classList.add('on-fire');
            } else {
                comboCounter.classList.remove('on-fire');
            }
        }
    }

    resetSession() {
        this.comboCount = 0;
        this.multiplier = 1;
        this.highestCombo = 0;
        this.updateUI();
    }
}

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

// Combo manager instance
let comboManager = null;

// Audio engine instance
let audioEngine = null;

// Keyboard visualizer instance
let keyboardVisualizer = null;

// Stats tracker instance
let statsTracker = null;

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

    // Reset combo manager
    if (comboManager) {
        comboManager.resetSession();
    }

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
async function initGame() {
    // CRITICAL: Clean all previous state first
    cleanGameState();

    // Initialize combo manager if not exists
    if (!comboManager) {
        comboManager = new ComboManager();
    }

    // Initialize audio engine if not exists
    if (!audioEngine) {
        audioEngine = new AudioEngine();
    }

    // Initialize stats tracker if not exists
    if (!statsTracker) {
        statsTracker = new StatsTracker();
        statsTracker.initialize().catch(error => {
            console.error('Failed to initialize stats tracker:', error);
        });
    }

    // Initialize keyboard visualizer if not exists
    if (!keyboardVisualizer) {
        const visualKeyboardContainer = document.getElementById('visualKeyboard');
        if (visualKeyboardContainer) {
            keyboardVisualizer = new KeyboardVisualizer(visualKeyboardContainer);

            // Detect and render keyboard layout
            keyboardVisualizer.detectLayout().then(layout => {
                keyboardVisualizer.render(layout);
                console.log('Keyboard layout rendered:', layout.name);
            }).catch(error => {
                console.error('Failed to detect keyboard layout:', error);
            });
        }
    }

    // Hide menu, show game
    if (menuScreen) menuScreen.style.display = 'none';
    if (gameContainer) gameContainer.style.display = '';

    // Cargar oraciones desde la API (o fallback)
    sentenceBank = await fetchSentences(currentLanguage, currentDifficulty);

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

    // Start stats tracking session
    if (statsTracker) {
        statsTracker.startSession();
    }

    // Initialize audio engine (requires user gesture)
    if (audioEngine && !audioEngine.isInitialized) {
        audioEngine.initialize().then(success => {
            if (success) {
                console.log('Audio initialized successfully');
                // Start with beat layer
                audioEngine.updateLayers(0);
            } else {
                console.warn('Audio initialization failed - continuing without audio');
            }
        }).catch(error => {
            console.error('Audio initialization error:', error);
        });
    }

    // Show keyboard visualizer
    if (keyboardVisualizer) {
        keyboardVisualizer.show();

        // Highlight the first expected key
        if (currentWordIndex < words.length && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
        }
    }

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

        // Track sentence completion (perfect if no errors in this sentence)
        if (statsTracker) {
            const hasErrors = false; // We'd need to track this per sentence
            statsTracker.trackSentenceCompleted(hasErrors);
        }

        // Play sentence complete sound
        if (audioEngine && audioEngine.isInitialized) {
            audioEngine.playSentenceComplete();
        }

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

    // Track word error
    if (statsTracker) {
        statsTracker.trackWordError(words[index]);
    }

    // Reset combo on missed word
    comboManager.onIncorrectInput();

    // Play error sound and remove layers
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.playErrorSound();
        audioEngine.removeLayers();
    }

    // Visual feedback
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Add missed word to accumulated area in red
    addMissedWordToAccumulated(words[index]);

    // Clear keyboard highlights
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
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

        // Highlight first key of next word
        if (keyboardVisualizer && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
        }
    }
}

// --- MARK WORD AS COMPLETED ---
function markWordAsCompleted(index) {
    const state = wordStates[index];
    if (state.status === 'completed') return;

    state.status = 'completed';
    correctWords++;

    // Track word completion in stats tracker
    if (statsTracker) {
        statsTracker.trackWordCompleted(Date.now());
    }

    // Calculate points with multiplier from ComboManager
    const basePoints = POINTS_PER_WORD;
    const multipliedPoints = comboManager.onWordComplete(basePoints);
    totalScore += multipliedPoints;

    // Add word to accumulated area
    addWordToAccumulated(words[index]);

    // Visual success effect
    if (state.element) {
        state.element.style.display = 'none';
    }

    // Clear keyboard highlights
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
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

        // Highlight first key of next word
        if (keyboardVisualizer && words[currentWordIndex].length > 0) {
            keyboardVisualizer.highlightKey(words[currentWordIndex][0], 'expected');
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

        // Check if character is correct
        const currentWord = words[currentWordIndex];
        const charIndex = currentTypedText.length - 1;
        const isCorrect = charIndex < currentWord.length &&
            currentTypedText[charIndex] === currentWord[charIndex];

        if (isCorrect) {
            // Correct character - increment combo
            comboManager.onCorrectInput();

            // Highlight key as correct
            if (keyboardVisualizer) {
                keyboardVisualizer.highlightKey(e.key, 'correct');
            }

            // Play correct note and update audio layers
            if (audioEngine && audioEngine.isInitialized) {
                audioEngine.playCorrectNote(comboManager.getCurrentCombo());
                audioEngine.updateLayers(comboManager.getCurrentCombo());
            }

            // Highlight next expected key
            if (currentTypedText.length < currentWord.length) {
                if (keyboardVisualizer) {
                    setTimeout(() => {
                        keyboardVisualizer.highlightKey(currentWord[currentTypedText.length], 'expected');
                    }, 150);
                }
            }
        } else {
            // Incorrect character - reset combo
            comboManager.onIncorrectInput();

            // Track key error
            if (statsTracker) {
                statsTracker.trackKeyError(e.key);
            }

            // Highlight key as incorrect
            if (keyboardVisualizer) {
                keyboardVisualizer.highlightKey(e.key, 'incorrect');
            }

            // Play error sound and remove layers
            if (audioEngine && audioEngine.isInitialized) {
                audioEngine.playErrorSound();
                audioEngine.removeLayers();
            }
        }

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

    // WPM calculation - use stats tracker if available
    let wpm = 0;
    if (statsTracker) {
        wpm = statsTracker.getCurrentWPM();
    } else {
        // Fallback calculation
        wpm = elapsedMinutes > 0 ? Math.round(correctWords / elapsedMinutes) : 0;
    }
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

    // Stop all audio playback
    if (audioEngine && audioEngine.isInitialized) {
        audioEngine.stopAll();
    }

    // Clear keyboard highlights and hide keyboard
    if (keyboardVisualizer) {
        keyboardVisualizer.clearHighlights();
        keyboardVisualizer.hide();
    }

    // Calculate session data and save to IndexedDB
    if (statsTracker) {
        const elapsedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
        const totalWords = correctWords + missedWords;
        const accuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 100;
        const wpm = statsTracker.getCurrentWPM();

        const sessionData = {
            timestamp: Date.now(),
            wpm: wpm,
            accuracy: accuracy,
            totalWords: totalWords,
            correctWords: correctWords,
            missedWords: missedWords,
            duration: elapsedSeconds,
            highestCombo: comboManager ? comboManager.getHighestCombo() : 0,
            difficulty: currentDifficulty,
            language: currentLanguage,
            sentencesCompleted: completedSentences
        };

        statsTracker.saveSession(sessionData).then(() => {
            console.log('Session saved successfully');
        }).catch(error => {
            console.error('Failed to save session:', error);
        });
    }

    // Hide game elements
    statsBar.classList.remove('visible');
    textDisplay.style.display = 'none';

    // Show results
    document.getElementById('resultScore').textContent = totalScore;
    document.getElementById('resultSentences').textContent = completedSentences;
    document.getElementById('resultWords').textContent = correctWords;
    document.getElementById('resultMissed').textContent = missedWords;
    document.getElementById('resultCombo').textContent = comboManager ? comboManager.getHighestCombo() : 0;

    resultsDiv.classList.add('active');
}

// --- RESTART GAME ---
async function restartGame() {
    resultsDiv.classList.remove('active');
    await initGame();
}

// --- GO TO MENU ---
function goToMenu() {
    cleanGameState();
    if (gameContainer) gameContainer.style.display = 'none';
    if (menuScreen) menuScreen.style.display = '';
}

// --- DIFFICULTY SELECTION ---
async function selectDifficulty(level) {
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
    await initGame();
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

// --- ABOUT GAME ---
function showAboutGame() {
    // Placeholder - implementar modal o vista de "Acerca del juego"
    alert('Acerca del juego: Type The Keyboard');
}

// --- HANDLE TAB VISIBILITY FOR AUDIO CONTEXT ---
document.addEventListener('visibilitychange', () => {
    if (audioEngine) {
        audioEngine.handleVisibilityChange();
    }
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

// --- STATISTICS DASHBOARD ---

// Show statistics dashboard
async function showStatsDashboard() {
    const dashboard = document.getElementById('statsDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!dashboard || !menuScreen) return;

    // Push state so browser back button closes the dashboard
    history.pushState({ view: 'stats' }, '', '#stats');

    // Hide menu
    menuScreen.style.display = 'none';

    // Show dashboard
    dashboard.style.display = 'block';

    // Load statistics
    await loadDashboardStatistics();
}

// Close statistics dashboard
function closeStatsDashboard() {
    const dashboard = document.getElementById('statsDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!dashboard || !menuScreen) return;

    // Hide dashboard
    dashboard.style.display = 'none';

    // Show menu
    menuScreen.style.display = '';

    // Go back in history if we pushed a state for stats
    if (history.state && history.state.view === 'stats') {
        history.back();
    }
}

// Handle browser back/forward button for stats dashboard
window.addEventListener('popstate', function (e) {
    const dashboard = document.getElementById('statsDashboard');
    const menuScreen = document.getElementById('menuScreen');

    if (!dashboard || !menuScreen) return;

    if (!e.state || e.state.view !== 'stats') {
        // Going back from stats → close dashboard, show menu
        dashboard.style.display = 'none';
        menuScreen.style.display = '';
    } else if (e.state && e.state.view === 'stats') {
        // Going forward to stats → show dashboard
        menuScreen.style.display = 'none';
        dashboard.style.display = 'block';
        loadDashboardStatistics();
    }
});

// Load and display all dashboard statistics
async function loadDashboardStatistics() {
    if (!statsTracker || !statsTracker.isInitialized) {
        console.warn('StatsTracker not initialized');
        showEmptyState();
        return;
    }

    try {
        // Get overall stats
        const overallStats = await statsTracker.getOverallStats();

        // Update overall stat cards
        updateOverallStatsDisplay(overallStats);

        // Generate historical accuracy chart
        await generateAccuracyChart();

        // Generate keyboard heatmap
        await generateKeyboardHeatmap();

        // Display top difficult words
        await displayTopDifficultWords();
    } catch (error) {
        console.error('Failed to load dashboard statistics:', error);
        showEmptyState();
    }
}

// Update overall statistics display
function updateOverallStatsDisplay(stats) {
    document.getElementById('dashTotalWords').textContent = stats.totalWords || 0;
    document.getElementById('dashTotalTime').textContent = Math.round((stats.totalTime || 0) / 60) || 0;
    document.getElementById('dashBestWpm').textContent = stats.bestWpm || 0;
    document.getElementById('dashBestCombo').textContent = stats.bestCombo || 0;
}

// Generate historical accuracy chart using Canvas API
async function generateAccuracyChart() {
    const canvas = document.getElementById('accuracyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const accuracies = await statsTracker.getHistoricalAccuracy();

    if (accuracies.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#585b70';
        ctx.font = '16px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos históricos disponibles', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Draw grid lines
    ctx.strokeStyle = '#313244';
    ctx.lineWidth = 1;

    // Horizontal grid lines (every 20%)
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Y-axis labels
        ctx.fillStyle = '#585b70';
        ctx.font = '12px "Roboto Mono"';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 20}%`, padding - 10, y + 4);
    }

    // Draw line chart
    if (accuracies.length > 1) {
        ctx.strokeStyle = '#89b4fa';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(137, 180, 250, 0.5)';

        ctx.beginPath();

        accuracies.forEach((accuracy, index) => {
            const x = padding + (chartWidth / (accuracies.length - 1)) * index;
            const y = padding + chartHeight - (accuracy / 100) * chartHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw data points
        ctx.fillStyle = '#89b4fa';
        accuracies.forEach((accuracy, index) => {
            const x = padding + (chartWidth / (accuracies.length - 1)) * index;
            const y = padding + chartHeight - (accuracy / 100) * chartHeight;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw axes
    ctx.strokeStyle = '#45475a';
    ctx.lineWidth = 2;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // X-axis label
    ctx.fillStyle = '#585b70';
    ctx.font = '14px "Roboto Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('Sesiones →', canvas.width / 2, canvas.height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Precisión (%)', 0, 0);
    ctx.restore();
}

// Generate keyboard heatmap visualization
async function generateKeyboardHeatmap() {
    const heatmapContainer = document.getElementById('keyboardHeatmap');
    const problematicKeysList = document.getElementById('problematicKeysList');

    if (!heatmapContainer || !problematicKeysList) return;

    const problematicKeys = await statsTracker.getProblematicKeys();

    if (problematicKeys.size === 0) {
        heatmapContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">¡Sin errores registrados!</div><div class="empty-state-hint">Sigue practicando para mantener este nivel</div></div>';
        problematicKeysList.innerHTML = '';
        return;
    }

    // Get max error count for color gradient
    const maxErrors = Math.max(...Array.from(problematicKeys.values()));

    // Define keyboard layout (QWERTY Spanish)
    const keyboardLayout = [
        ['º', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '`', '+'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '´', 'ç'],
        ['<', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
    ];

    // Render heatmap keyboard
    const heatmapKeyboard = document.createElement('div');
    heatmapKeyboard.className = 'heatmap-keyboard';

    keyboardLayout.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'heatmap-row';

        row.forEach(key => {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'heatmap-key';
            keyDiv.textContent = key;

            const errorCount = problematicKeys.get(key) || 0;
            if (errorCount > 0) {
                keyDiv.setAttribute('data-errors', errorCount);

                // Calculate color intensity (green to red gradient)
                const intensity = errorCount / maxErrors;
                const hue = (1 - intensity) * 120; // 120 = green, 0 = red
                keyDiv.style.backgroundColor = `hsl(${hue}, 70%, 40%)`;
                keyDiv.style.color = '#1e1e2e';
                keyDiv.style.borderColor = `hsl(${hue}, 70%, 30%)`;
            }

            rowDiv.appendChild(keyDiv);
        });

        heatmapKeyboard.appendChild(rowDiv);
    });

    heatmapContainer.innerHTML = '';
    heatmapContainer.appendChild(heatmapKeyboard);

    // Display top 10 problematic keys
    const sortedKeys = Array.from(problematicKeys.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    problematicKeysList.innerHTML = '';
    sortedKeys.forEach(([key, count]) => {
        const keyItem = document.createElement('div');
        keyItem.className = 'problematic-key-item';

        keyItem.innerHTML = `
            <div class="problematic-key-char">${key}</div>
            <div>
                <div class="problematic-key-count">${count}</div>
                <div class="problematic-key-label">errores</div>
            </div>
        `;

        problematicKeysList.appendChild(keyItem);
    });
}

// Display top difficult words
async function displayTopDifficultWords() {
    const difficultWordsList = document.getElementById('difficultWordsList');
    if (!difficultWordsList) return;

    const topWords = await statsTracker.getTopDifficultWords();

    if (topWords.length === 0) {
        difficultWordsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">¡Sin palabras difíciles!</div><div class="empty-state-hint">Todas las palabras se escriben perfectamente</div></div>';
        return;
    }

    difficultWordsList.innerHTML = '';
    topWords.forEach((item, index) => {
        const wordItem = document.createElement('div');
        wordItem.className = 'difficult-word-item';

        wordItem.innerHTML = `
            <div class="difficult-word-rank">#${index + 1}</div>
            <div class="difficult-word-text">${item.word}</div>
            <div class="difficult-word-errors">
                <div class="difficult-word-count">${item.errors}</div>
                <div class="difficult-word-label">intentos</div>
            </div>
        `;

        difficultWordsList.appendChild(wordItem);
    });
}

// Show empty state when no data available
function showEmptyState() {
    const emptyHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No hay estadísticas disponibles</div><div class="empty-state-hint">Juega algunas partidas para ver tus estadísticas</div></div>';

    document.getElementById('dashTotalWords').textContent = '0';
    document.getElementById('dashTotalTime').textContent = '0';
    document.getElementById('dashBestWpm').textContent = '0';
    document.getElementById('dashBestCombo').textContent = '0';

    const canvas = document.getElementById('accuracyChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#585b70';
        ctx.font = '16px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles', canvas.width / 2, canvas.height / 2);
    }

    const heatmapContainer = document.getElementById('keyboardHeatmap');
    if (heatmapContainer) heatmapContainer.innerHTML = emptyHTML;

    const difficultWordsList = document.getElementById('difficultWordsList');
    if (difficultWordsList) difficultWordsList.innerHTML = emptyHTML;
}
