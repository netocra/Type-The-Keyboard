// --- KEYBOARD VISUALIZER CLASS ---
// Renders a visual keyboard with finger position indicators and key highlighting

class KeyboardVisualizer {
    constructor(containerElement) {
        this.container = containerElement;
        this.keyElements = new Map(); // Maps key -> DOM element
        this.currentLayout = null;
        this.highlightTimeout = null;
    }

    // --- KEYBOARD LAYOUTS ---
    static LAYOUTS = {
        QWERTY_ES: {
            name: 'QWERTY Spanish',
            rows: [
                ['º', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¡'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '`', '+'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '´', 'ç'],
                ['<', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
            ],
            fingerMap: {
                // Row 1 (numbers)
                'º': 'left-pinky', '1': 'left-pinky', '2': 'left-ring', '3': 'left-middle', '4': 'left-index', '5': 'left-index',
                '6': 'right-index', '7': 'right-index', '8': 'right-middle', '9': 'right-ring', '0': 'right-pinky', "'": 'right-pinky', '¡': 'right-pinky',
                // Row 2 (QWERTY)
                'q': 'left-pinky', 'w': 'left-ring', 'e': 'left-middle', 'r': 'left-index', 't': 'left-index',
                'y': 'right-index', 'u': 'right-index', 'i': 'right-middle', 'o': 'right-ring', 'p': 'right-pinky', '`': 'right-pinky', '+': 'right-pinky',
                // Row 3 (home row)
                'a': 'left-pinky', 's': 'left-ring', 'd': 'left-middle', 'f': 'left-index', 'g': 'left-index',
                'h': 'right-index', 'j': 'right-index', 'k': 'right-middle', 'l': 'right-ring', 'ñ': 'right-pinky', '´': 'right-pinky', 'ç': 'right-pinky',
                // Row 4 (bottom row)
                '<': 'left-pinky', 'z': 'left-pinky', 'x': 'left-ring', 'c': 'left-middle', 'v': 'left-index', 'b': 'left-index',
                'n': 'right-index', 'm': 'right-index', ',': 'right-middle', '.': 'right-ring', '-': 'right-pinky',
                // Space
                ' ': 'thumb'
            }
        },
        QWERTY_LATAM: {
            name: 'QWERTY Latin American',
            rows: [
                ['|', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "'", '¿'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '´', '+'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '{', '}'],
                ['<', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-']
            ],
            fingerMap: {
                // Row 1 (numbers)
                '|': 'left-pinky', '1': 'left-pinky', '2': 'left-ring', '3': 'left-middle', '4': 'left-index', '5': 'left-index',
                '6': 'right-index', '7': 'right-index', '8': 'right-middle', '9': 'right-ring', '0': 'right-pinky', "'": 'right-pinky', '¿': 'right-pinky',
                // Row 2 (QWERTY)
                'q': 'left-pinky', 'w': 'left-ring', 'e': 'left-middle', 'r': 'left-index', 't': 'left-index',
                'y': 'right-index', 'u': 'right-index', 'i': 'right-middle', 'o': 'right-ring', 'p': 'right-pinky', '´': 'right-pinky', '+': 'right-pinky',
                // Row 3 (home row)
                'a': 'left-pinky', 's': 'left-ring', 'd': 'left-middle', 'f': 'left-index', 'g': 'left-index',
                'h': 'right-index', 'j': 'right-index', 'k': 'right-middle', 'l': 'right-ring', 'ñ': 'right-pinky', '{': 'right-pinky', '}': 'right-pinky',
                // Row 4 (bottom row)
                '<': 'left-pinky', 'z': 'left-pinky', 'x': 'left-ring', 'c': 'left-middle', 'v': 'left-index', 'b': 'left-index',
                'n': 'right-index', 'm': 'right-index', ',': 'right-middle', '.': 'right-ring', '-': 'right-pinky',
                // Space
                ' ': 'thumb'
            }
        }
    };

    // --- FINGER POSITION COLOR MAPPING (Catppuccin Theme) ---
    static FINGER_COLORS = {
        'left-pinky': '#f38ba8',     // Red
        'left-ring': '#fab387',      // Orange
        'left-middle': '#f9e2af',    // Yellow
        'left-index': '#a6e3a1',     // Green
        'thumb': '#89b4fa',          // Blue
        'right-index': '#a6e3a1',    // Green
        'right-middle': '#f9e2af',   // Yellow
        'right-ring': '#fab387',     // Orange
        'right-pinky': '#f38ba8'     // Red
    };

    // --- LAYOUT DETECTION ---
    async detectLayout() {
        // Try Keyboard API (experimental - Chrome only)
        if ('keyboard' in navigator && 'getLayoutMap' in navigator.keyboard) {
            try {
                const layoutMap = await navigator.keyboard.getLayoutMap();
                console.log('Keyboard API available - detecting layout...');

                // Check for Spanish-specific keys
                const semicolonKey = layoutMap.get('Semicolon');
                const backquoteKey = layoutMap.get('Backquote');

                if (semicolonKey === 'ñ') {
                    // Check if it's Spanish or Latin American
                    if (backquoteKey === 'º') {
                        console.log('Detected: QWERTY Spanish (ES)');
                        return KeyboardVisualizer.LAYOUTS.QWERTY_ES;
                    } else {
                        console.log('Detected: QWERTY Latin American');
                        return KeyboardVisualizer.LAYOUTS.QWERTY_LATAM;
                    }
                }
            } catch (error) {
                console.warn('Keyboard API failed:', error);
            }
        } else {
            console.log('Keyboard API not supported in this browser');
        }

        // Fallback to QWERTY Spanish
        console.log('Using default layout: QWERTY Spanish');
        return KeyboardVisualizer.LAYOUTS.QWERTY_ES;
    }

    // --- RENDER KEYBOARD ---
    render(layout) {
        if (!this.container) {
            console.error('Keyboard container not found');
            return;
        }

        this.currentLayout = layout;
        this.container.innerHTML = ''; // Clear existing content
        this.keyElements.clear();

        // Create keyboard rows
        layout.rows.forEach((rowKeys, rowIndex) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            rowDiv.id = `keyboardRow${rowIndex + 1}`;

            rowKeys.forEach(key => {
                const keyDiv = document.createElement('div');
                keyDiv.className = 'key';
                keyDiv.textContent = key;
                keyDiv.dataset.key = key;

                // Get finger position and apply color
                const finger = layout.fingerMap[key];
                if (finger) {
                    const color = KeyboardVisualizer.FINGER_COLORS[finger];
                    keyDiv.style.setProperty('--finger-color', color);
                    keyDiv.dataset.finger = finger;
                    
                    // Add subtle finger color indicator on the key
                    keyDiv.style.borderBottom = `2px solid ${color}`;
                }

                rowDiv.appendChild(keyDiv);
                this.keyElements.set(key, keyDiv);
            });

            this.container.appendChild(rowDiv);
        });

        // Add spacebar
        const spacebarRow = document.createElement('div');
        spacebarRow.className = 'keyboard-row';
        const spacebar = document.createElement('div');
        spacebar.className = 'key spacebar';
        spacebar.textContent = 'SPACE';
        spacebar.dataset.key = ' ';
        const spaceColor = KeyboardVisualizer.FINGER_COLORS['thumb'];
        spacebar.style.setProperty('--finger-color', spaceColor);
        spacebar.style.borderBottom = `2px solid ${spaceColor}`;
        spacebarRow.appendChild(spacebar);
        this.container.appendChild(spacebarRow);
        this.keyElements.set(' ', spacebar);

        // Show the keyboard
        this.container.style.display = 'flex';
        console.log('Keyboard rendered with', this.keyElements.size, 'keys');
    }

    // --- SET LAYOUT ---
    setLayout(layout) {
        this.render(layout);
    }

    // --- HIGHLIGHT KEY ---
    highlightKey(key, state) {
        // Normalize key to lowercase for lookup
        const normalizedKey = key.toLowerCase();
        const keyElement = this.keyElements.get(normalizedKey);

        if (!keyElement) {
            // Try to find the key in the current layout
            console.log('Key not found in keyboard:', normalizedKey);
            return;
        }

        // Clear previous highlight timeout
        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
            this.highlightTimeout = null;
        }

        // Remove all state classes
        keyElement.classList.remove('expected', 'correct', 'incorrect');

        // Apply new state
        switch (state) {
            case 'expected':
                keyElement.classList.add('expected');
                break;
            case 'correct':
                keyElement.classList.add('correct');
                // Auto-clear correct state after animation
                this.highlightTimeout = setTimeout(() => {
                    keyElement.classList.remove('correct');
                }, 200);
                break;
            case 'incorrect':
                keyElement.classList.add('incorrect');
                // Auto-clear incorrect state after animation
                this.highlightTimeout = setTimeout(() => {
                    keyElement.classList.remove('incorrect');
                }, 300);
                break;
        }
    }

    // --- CLEAR ALL HIGHLIGHTS ---
    clearHighlights() {
        this.keyElements.forEach(keyElement => {
            keyElement.classList.remove('expected', 'correct', 'incorrect');
        });

        if (this.highlightTimeout) {
            clearTimeout(this.highlightTimeout);
            this.highlightTimeout = null;
        }
    }

    // --- HIDE KEYBOARD ---
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    // --- SHOW KEYBOARD ---
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }
}

// --- EXPORT FOR USE IN OTHER SCRIPTS ---
if (typeof window !== 'undefined') {
    window.KeyboardVisualizer = KeyboardVisualizer;
}
