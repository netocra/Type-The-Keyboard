// --- BANCO DE PALABRAS ---
const WORDS = [
    'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
    'he','as','you','do','at','this','but','his','by','from','they','we','say','her','she',
    'or','an','will','my','one','all','would','there','their','what','so','up','out','if',
    'about','who','get','which','go','me','when','make','can','like','time','no','just',
    'him','know','take','people','into','year','your','good','some','could','them','see',
    'other','than','then','now','look','only','come','its','over','think','also','back',
    'after','use','two','how','our','work','first','well','way','even','new','want',
    'because','any','these','give','day','most','us','great','between','need','large',
    'under','never','city','tree','cross','farm','hard','start','might','story','saw',
    'far','sea','draw','left','late','run','while','press','close','night','real','life',
    'few','north','open','seem','together','next','white','children','begin','got','walk',
    'example','ease','paper','group','always','music','those','both','mark','often','letter',
    'until','mile','river','car','feet','care','second','book','carry','took','science',
    'eat','room','friend','began','idea','fish','mountain','stop','once','base','hear',
    'horse','cut','sure','watch','color','face','wood','main','enough','plain','girl',
    'usual','young','ready','above','ever','red','list','though','feel','talk','bird',
    'soon','body','dog','family','direct','pose','leave','song','measure','door','product',
    'black','short','numeral','class','wind','question','happen','complete','ship','area',
    'half','rock','order','fire','south','problem','piece','told','knew','pass','since',
    'top','whole','king','space','heard','best','hour','better','true','during','hundred',
    'five','remember','step','early','hold','west','ground','interest','reach','fast',
    'verb','sing','listen','six','table','travel','less','morning','ten','simple','several',
    'vowel','toward','war','lay','against','pattern','slow','center','love','person',
    'money','serve','appear','road','map','rain','rule','govern','pull','cold','notice',
    'voice','unit','power','town','fine','certain','fly','fall','lead','cry','dark',
    'machine','note','wait','plan','figure','star','box','noun','field','rest','correct',
    'able','pound','done','beauty','drive','stood','contain','front','teach','week',
    'final','gave','green','oh','quick','develop','ocean','warm','free','minute','strong',
    'special','mind','behind','clear','tail','produce','fact','street','inch','multiply',
    'nothing','course','stay','wheel','full','force','blue','object','decide','surface',
    'deep','moon','island','foot','system','busy','winter','sit','perhaps','fill','east',
    'hot','language','among','wild','game','keep','move','house','bring','heat','light'
];

// --- STATE ---
let gameTime = 15;
let timer = null;
let timeLeft = 15;
let started = false;
let finished = false;
let currentWordIndex = 0;
let currentCharIndex = 0;
let words = [];
let wordElements = [];
let correctChars = 0;
let incorrectChars = 0;
let totalCharsTyped = 0;
let tabPressed = false;

// Bomba
let bombInterval = null;
let bombCharIndex = 0;
let BOMB_SPEED = 1300;

// --- DIFICULTAD ---
const menuScreen = document.getElementById('menuScreen');
const gameContainer = document.getElementById('gameContainer');

function selectDifficulty(level) {
    switch (level) {
        case 'easy': BOMB_SPEED = 2000; break;
        case 'medium': BOMB_SPEED = 1300; break;
        case 'hard': BOMB_SPEED = 800; break;
    }
    menuScreen.style.display = 'none';
    gameContainer.style.display = '';
    restartGame();
}

function goToMenu() {
    clearInterval(timer);
    clearInterval(bombInterval);
    started = false;
    finished = false;
    gameContainer.style.display = 'none';
    menuScreen.style.display = '';
}

// --- ELEMENTS ---
const textDisplay = document.getElementById('textDisplay');
const cursor = document.getElementById('cursor');
const bombEl = document.getElementById('bomb');
const bombWarning = document.getElementById('bombWarning');
const startHint = document.getElementById('startHint');
const statsBar = document.getElementById('statsBar');
const liveWpm = document.getElementById('liveWpm');
const liveAcc = document.getElementById('liveAcc');
const liveTimer = document.getElementById('liveTimer');
const resultsDiv = document.getElementById('results');

// --- GENERAR PALABRAS ---
function generateWords(count) {
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
    }
    return result;
}

function renderWords() {
    textDisplay.querySelectorAll('.word').forEach(w => w.remove());
    startHint.classList.remove('hidden');

    words = generateWords(10);
    wordElements = [];

    words.forEach((word, wi) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        wordSpan.dataset.index = wi;

        word.split('').forEach((char, ci) => {
            const charSpan = document.createElement('span');
            charSpan.className = 'char';
            charSpan.textContent = char;
            charSpan.dataset.word = wi;
            charSpan.dataset.char = ci;
            wordSpan.appendChild(charSpan);
        });

        textDisplay.appendChild(wordSpan);
        wordElements.push(wordSpan);
    });

    updateCursor();
}

// --- CURSOR ---
function updateCursor() {
    const wordEl = wordElements[currentWordIndex];
    if (!wordEl) return;

    const chars = wordEl.querySelectorAll('.char');
    let target;

    if (currentCharIndex < chars.length) {
        target = chars[currentCharIndex];
    } else if (chars.length > 0) {
        target = chars[chars.length - 1];
        const rect = target.getBoundingClientRect();
        const parentRect = textDisplay.getBoundingClientRect();
        cursor.style.left = (rect.right - parentRect.left) + 'px';
        cursor.style.top = (rect.top - parentRect.top + 2) + 'px';
        return;
    }

    if (target) {
        const rect = target.getBoundingClientRect();
        const parentRect = textDisplay.getBoundingClientRect();
        cursor.style.left = (rect.left - parentRect.left) + 'px';
        cursor.style.top = (rect.top - parentRect.top + 2) + 'px';
    }
}

// --- BOMBA ---
function startBomb() {
    bombCharIndex = 0;
    bombEl.style.display = '';
    bombEl.classList.remove('exploding');
    updateBombPosition();

    clearInterval(bombInterval);
    bombInterval = setInterval(() => {
        bombCharIndex++;
        updateBombPosition();
        checkBombCollision();
    }, BOMB_SPEED);
}

function updateBombPosition() {
    const wordEl = wordElements[currentWordIndex];
    if (!wordEl) return;

    const chars = wordEl.querySelectorAll('.char');

    if (bombCharIndex < chars.length) {
        const target = chars[bombCharIndex];
        const rect = target.getBoundingClientRect();
        const parentRect = textDisplay.getBoundingClientRect();
        bombEl.style.left = (rect.left - parentRect.left) + 'px';
        bombEl.style.top = (rect.top - parentRect.top + 2) + 'px';
    } else if (chars.length > 0) {
        const target = chars[chars.length - 1];
        const rect = target.getBoundingClientRect();
        const parentRect = textDisplay.getBoundingClientRect();
        bombEl.style.left = (rect.right - parentRect.left) + 'px';
        bombEl.style.top = (rect.top - parentRect.top + 2) + 'px';
    }
}

function checkBombCollision() {
    if (bombCharIndex >= currentCharIndex) {
        explodeBomb();
    }
}

function explodeBomb() {
    clearInterval(bombInterval);

    bombEl.classList.add('exploding');
    bombWarning.classList.add('flash');
    setTimeout(() => bombWarning.classList.remove('flash'), 300);

    const wordEl = wordElements[currentWordIndex];
    if (wordEl) {
        wordEl.classList.add('exploded');

        setTimeout(() => {
            wordEl.classList.remove('exploded');
            wordEl.querySelectorAll('.char.extra').forEach(el => el.remove());
            wordEl.querySelectorAll('.char').forEach(el => {
                el.classList.remove('correct', 'incorrect');
            });
            currentCharIndex = 0;
            updateCursor();

            setTimeout(() => {
                bombEl.classList.remove('exploding');
                startBomb();
            }, 400);
        }, 400);
    }
}

function resetBombForNewWord() {
    clearInterval(bombInterval);
    bombCharIndex = 0;
    startBomb();
}

// --- TIMER ---
function startTimer() {
    started = true;
    timeLeft = gameTime;
    liveTimer.textContent = timeLeft;
    statsBar.classList.add('visible');
    startHint.classList.add('hidden');
    cursor.classList.add('typing');

    startBomb();

    timer = setInterval(() => {
        timeLeft--;
        liveTimer.textContent = timeLeft;
        updateLiveStats();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateLiveStats() {
    const elapsed = gameTime - timeLeft;
    if (elapsed > 0) {
        const wpm = Math.round((correctChars / 5) / (elapsed / 60));
        liveWpm.textContent = wpm || 0;
    }
    const total = correctChars + incorrectChars;
    const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    liveAcc.textContent = acc;
}

function endGame() {
    clearInterval(timer);
    clearInterval(bombInterval);
    finished = true;
    cursor.style.display = 'none';
    bombEl.style.display = 'none';
    textDisplay.style.display = 'none';
    startHint.style.display = 'none';
    statsBar.classList.remove('visible');

    const elapsed = gameTime;
    const wpm = Math.round((correctChars / 5) / (elapsed / 60));
    const total = correctChars + incorrectChars;
    const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;

    document.getElementById('resultWpm').textContent = wpm || 0;
    document.getElementById('resultAcc').textContent = acc + '%';
    document.getElementById('resultChars').textContent = correctChars + '/' + total;
    document.getElementById('resultErrors').textContent = incorrectChars;

    resultsDiv.classList.add('active');
}

function restartGame() {
    clearInterval(timer);
    clearInterval(bombInterval);
    started = false;
    finished = false;
    currentWordIndex = 0;
    currentCharIndex = 0;
    correctChars = 0;
    incorrectChars = 0;
    totalCharsTyped = 0;
    timeLeft = gameTime;
    bombCharIndex = 0;

    cursor.style.display = '';
    cursor.classList.remove('typing');
    bombEl.style.display = 'none';
    bombEl.classList.remove('exploding');
    textDisplay.style.display = '';
    startHint.style.display = '';
    resultsDiv.classList.remove('active');
    statsBar.classList.remove('visible');
    liveWpm.textContent = '0';
    liveAcc.textContent = '100';
    liveTimer.textContent = gameTime;

    renderWords();
    textDisplay.focus();
}

// --- INPUT ---
document.addEventListener('keydown', function(e) {
    if (finished) {
        return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (['Shift', 'CapsLock', 'Escape', 'Enter', 'Tab'].includes(e.key)) return;

    e.preventDefault();

    if (!started && !finished) {
        startTimer();
    }

    cursor.classList.add('typing');
    clearTimeout(cursor._blinkTimeout);
    cursor._blinkTimeout = setTimeout(() => {
        cursor.classList.remove('typing');
    }, 500);

    const wordEl = wordElements[currentWordIndex];
    if (!wordEl) return;
    const chars = wordEl.querySelectorAll('.char');
    const currentWord = words[currentWordIndex];

    if (e.key === 'Backspace') {
        if (currentCharIndex > 0) {
            currentCharIndex--;
            const charEl = wordEl.querySelectorAll('.char')[currentCharIndex];
            if (charEl) {
                charEl.classList.remove('correct', 'incorrect');
            }
        }
        updateCursor();
        return;
    }

    if (e.key === ' ') {
        if (currentCharIndex > 0) {
            for (let i = currentCharIndex; i < currentWord.length; i++) {
                const charEl = wordEl.querySelectorAll('.char')[i];
                if (charEl) {
                    charEl.classList.add('incorrect');
                    incorrectChars++;
                }
            }
            currentWordIndex++;
            currentCharIndex = 0;

            resetBombForNewWord();

            if (currentWordIndex >= wordElements.length) {
                currentWordIndex = 0;
                currentCharIndex = 0;
                renderWords();
                resetBombForNewWord();
            }
        }
        updateCursor();
        return;
    }

    if (e.key.length === 1) {
        if (currentCharIndex < currentWord.length) {
            const charEl = wordEl.querySelectorAll('.char')[currentCharIndex];
            if (e.key === currentWord[currentCharIndex]) {
                charEl.classList.add('correct');
                correctChars++;
            } else {
                charEl.classList.add('incorrect');
                incorrectChars++;
            }
            currentCharIndex++;
            totalCharsTyped++;
        }
        updateCursor();
    }
});

// --- FOCUS ---
textDisplay.addEventListener('click', () => textDisplay.focus());
document.addEventListener('click', () => textDisplay.focus());

// --- INIT ---
renderWords();
liveTimer.textContent = gameTime;
textDisplay.focus();
