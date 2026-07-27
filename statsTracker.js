// --- STATS TRACKER WITH INDEXEDDB PERSISTENCE ---

// Database configuration
const DB_NAME = 'TypeKeyboardDB';
const DB_VERSION = 1;

// --- WPM CALCULATOR CLASS ---
class WPMCalculator {
    constructor() {
        this.history = [];
        this.windowSize = 5000; // 5 second window
    }

    addWord(timestamp) {
        this.history.push(timestamp);
        // Remove entries older than window
        const cutoff = timestamp - this.windowSize;
        this.history = this.history.filter(t => t >= cutoff);
    }

    getCurrentWPM() {
        if (this.history.length < 2) return 0;

        const timeSpan = this.history[this.history.length - 1] - this.history[0];
        const wordsInWindow = this.history.length - 1;
        const minutes = timeSpan / 60000;

        return Math.round(wordsInWindow / minutes);
    }

    reset() {
        this.history = [];
    }

    getHistory() {
        return [...this.history];
    }
}

// --- STATS TRACKER CLASS ---
class StatsTracker {
    constructor() {
        this.db = null;
        this.fallbackMode = false;
        this.memoryStore = new Map();
        this.isInitialized = false;

        // Current session tracking
        this.currentSession = null;
        this.keyErrorsThisSession = new Map();
        this.wordErrorsThisSession = new Map();
        this.wpmCalculator = new WPMCalculator();
        this.wpmSamples = [];
        this.lastWPMSampleTime = 0;
        this.perfectSentences = 0;
        this.currentSentenceErrors = 0;
    }

    // --- INITIALIZATION ---
    async initialize() {
        try {
            this.db = await this.initDatabase();
            this.fallbackMode = false;
            this.isInitialized = true;
            console.log('StatsTracker initialized with IndexedDB');
        } catch (error) {
            console.error('IndexedDB unavailable:', error);
            this.fallbackMode = true;
            this.isInitialized = true;
            console.log('StatsTracker initialized in fallback mode (in-memory)');
        }
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            // Check if IndexedDB is available
            if (!window.indexedDB) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error('Failed to open database: ' + request.error));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionsStore.createIndex('wpm', 'wpm', { unique: false });
                }

                // Create key errors store
                if (!db.objectStoreNames.contains('keyErrors')) {
                    db.createObjectStore('keyErrors', { keyPath: 'key' });
                }

                // Create word errors store
                if (!db.objectStoreNames.contains('wordErrors')) {
                    db.createObjectStore('wordErrors', { keyPath: 'word' });
                }

                console.log('Database schema created');
            };
        });
    }

    // --- SESSION MANAGEMENT ---
    startSession() {
        this.currentSession = {
            id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            startTime: Date.now()
        };
        this.keyErrorsThisSession.clear();
        this.wordErrorsThisSession.clear();
        this.wpmCalculator.reset();
        this.wpmSamples = [];
        this.lastWPMSampleTime = Date.now();
        this.perfectSentences = 0;
        this.currentSentenceErrors = 0;
    }

    // --- REAL-TIME TRACKING ---
    trackKeyError(key) {
        if (!this.currentSession) return;

        // Update session map
        const count = this.keyErrorsThisSession.get(key) || 0;
        this.keyErrorsThisSession.set(key, count + 1);

        // Track for current sentence
        this.currentSentenceErrors++;
    }

    trackWordError(word) {
        if (!this.currentSession) return;

        const count = this.wordErrorsThisSession.get(word) || 0;
        this.wordErrorsThisSession.set(word, count + 1);

        // Track for current sentence
        this.currentSentenceErrors++;
    }

    trackWordCompleted(timestamp) {
        if (!this.currentSession) return;

        // Add to WPM calculator
        this.wpmCalculator.addWord(timestamp || Date.now());

        // Sample WPM every 5 seconds
        const now = Date.now();
        if (now - this.lastWPMSampleTime >= 5000) {
            const currentWPM = this.wpmCalculator.getCurrentWPM();
            this.wpmSamples.push({
                time: now - this.currentSession.startTime,
                wpm: currentWPM
            });
            this.lastWPMSampleTime = now;
        }
    }

    trackSentenceCompleted(hasErrors = false) {
        if (!this.currentSession) return;

        // Track perfect sentences (100% accuracy)
        if (!hasErrors && this.currentSentenceErrors === 0) {
            this.perfectSentences++;
        }

        // Reset sentence error counter
        this.currentSentenceErrors = 0;
    }

    getCurrentWPM() {
        return this.wpmCalculator.getCurrentWPM();
    }

    getPerfectSentences() {
        return this.perfectSentences;
    }

    // --- SESSION PERSISTENCE ---
    async saveSession(sessionData) {
        if (!this.isInitialized) {
            console.warn('StatsTracker not initialized, cannot save session');
            return;
        }

        // Prepare session data
        const session = {
            id: this.currentSession ? this.currentSession.id : `session-${Date.now()}`,
            timestamp: sessionData.timestamp || Date.now(),
            wpm: sessionData.wpm || 0,
            accuracy: sessionData.accuracy || 0,
            totalWords: sessionData.totalWords || 0,
            correctWords: sessionData.correctWords || 0,
            missedWords: sessionData.missedWords || 0,
            duration: sessionData.duration || 0,
            highestCombo: sessionData.highestCombo || 0,
            difficulty: sessionData.difficulty || 'medium',
            language: sessionData.language || 'es',
            keyErrors: Array.from(this.keyErrorsThisSession.entries()).map(([key, count]) => ({ key, count })),
            wordErrors: Array.from(this.wordErrorsThisSession.entries()).map(([word, count]) => ({ word, count })),
            wpmHistory: this.wpmSamples,
            sentencesCompleted: sessionData.sentencesCompleted || 0,
            perfectSentences: this.perfectSentences
        };

        if (this.fallbackMode) {
            // In-memory fallback
            this.memoryStore.set(session.id, session);
            console.log('Session saved to memory store:', session.id);
            return;
        }

        try {
            // Save to IndexedDB
            await this.putData('sessions', session);
            console.log('Session saved to IndexedDB:', session.id);

            // Update aggregated key/word errors
            await this.updateAggregatedErrors();
        } catch (error) {
            console.error('Failed to save session:', error);
            // Fallback to memory
            this.memoryStore.set(session.id, session);
        }
    }

    async updateAggregatedErrors() {
        if (this.fallbackMode || !this.db) return;

        try {
            // Update key errors
            for (const [key, count] of this.keyErrorsThisSession.entries()) {
                const existing = await this.getData('keyErrors', key);
                const newCount = existing ? existing.count + count : count;
                const sessions = existing ? existing.sessions || [] : [];
                sessions.push(this.currentSession.id);

                await this.putData('keyErrors', {
                    key,
                    count: newCount,
                    lastUpdated: Date.now(),
                    sessions
                });
            }

            // Update word errors
            for (const [word, count] of this.wordErrorsThisSession.entries()) {
                const existing = await this.getData('wordErrors', word);
                const newCount = existing ? existing.count + count : count;

                await this.putData('wordErrors', {
                    word,
                    count: newCount,
                    lastUpdated: Date.now(),
                    averageAttempts: newCount // Simplified
                });
            }
        } catch (error) {
            console.error('Failed to update aggregated errors:', error);
        }
    }

    // --- QUERY METHODS ---
    async getAllSessions() {
        if (this.fallbackMode) {
            return Array.from(this.memoryStore.values());
        }

        try {
            return await this.getAllData('sessions');
        } catch (error) {
            console.error('Failed to get sessions:', error);
            return [];
        }
    }

    async getHistoricalAccuracy() {
        const sessions = await this.getAllSessions();
        return sessions.map(s => s.accuracy);
    }

    async getProblematicKeys() {
        if (this.fallbackMode) {
            const keys = new Map();
            this.memoryStore.forEach(session => {
                session.keyErrors.forEach(({ key, count }) => {
                    keys.set(key, (keys.get(key) || 0) + count);
                });
            });
            return keys;
        }

        try {
            const allKeyErrors = await this.getAllData('keyErrors');
            const keys = new Map();
            allKeyErrors.forEach(error => {
                keys.set(error.key, error.count);
            });
            return keys;
        } catch (error) {
            console.error('Failed to get problematic keys:', error);
            return new Map();
        }
    }

    async getTopDifficultWords() {
        if (this.fallbackMode) {
            const words = new Map();
            this.memoryStore.forEach(session => {
                session.wordErrors.forEach(({ word, count }) => {
                    words.set(word, (words.get(word) || 0) + count);
                });
            });
            const sorted = Array.from(words.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([word, errors]) => ({ word, errors }));
            return sorted;
        }

        try {
            const allWordErrors = await this.getAllData('wordErrors');
            const sorted = allWordErrors
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(error => ({ word: error.word, errors: error.count }));
            return sorted;
        } catch (error) {
            console.error('Failed to get difficult words:', error);
            return [];
        }
    }

    async getOverallStats() {
        const sessions = await this.getAllSessions();

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalWords: 0,
                totalTime: 0,
                bestWpm: 0,
                bestCombo: 0,
                averageAccuracy: 0
            };
        }

        const totalWords = sessions.reduce((sum, s) => sum + s.totalWords, 0);
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        const bestWpm = Math.max(...sessions.map(s => s.wpm));
        const bestCombo = Math.max(...sessions.map(s => s.highestCombo));
        const avgAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length;

        return {
            totalSessions: sessions.length,
            totalWords,
            totalTime,
            bestWpm,
            bestCombo,
            averageAccuracy: Math.round(avgAccuracy)
        };
    }

    // --- INDEXEDDB HELPERS ---
    putData(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    getData(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getAllData(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // --- GETTERS FOR CURRENT SESSION ---
    getCurrentKeyErrors() {
        return this.keyErrorsThisSession;
    }

    getCurrentWordErrors() {
        return this.wordErrorsThisSession;
    }

    getWPMHistory() {
        return this.wpmSamples;
    }

    async getTotalWords() {
        const stats = await this.getOverallStats();
        return stats.totalWords;
    }

    async getAverageAccuracy() {
        const stats = await this.getOverallStats();
        return stats.averageAccuracy;
    }
}
