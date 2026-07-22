// --- AUDIO ENGINE WITH TONE.JS ---

/**
 * Layer class for managing individual audio layers (beat, bass, percussion, melody, rhythm)
 */
class Layer {
    constructor(name, synthConfig) {
        this.name = name;
        this.synthConfig = synthConfig;
        this.synth = null;
        this.volume = null;
        this.pattern = null;
        this.isActive = false;
    }

    async initialize() {
        try {
            // Create synth based on config
            const synthType = this.synthConfig.type;
            
            if (synthType === 'membrane') {
                this.synth = new Tone.MembraneSynth().toDestination();
            } else if (synthType === 'fatsawtooth') {
                this.synth = new Tone.FMSynth({
                    harmonicity: 1,
                    modulationIndex: 3,
                    oscillator: { type: 'sawtooth' },
                    envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.2 }
                }).toDestination();
            } else if (synthType === 'metalSynth') {
                this.synth = new Tone.MetalSynth({
                    frequency: 200,
                    envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                    harmonicity: 5.1,
                    modulationIndex: 32,
                    resonance: 4000,
                    octaves: 1.5
                }).toDestination();
            } else if (synthType === 'synth') {
                this.synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 }
                }).toDestination();
            } else if (synthType === 'pluckSynth') {
                this.synth = new Tone.PluckSynth({
                    attackNoise: 1,
                    dampening: 4000,
                    resonance: 0.7
                }).toDestination();
            } else {
                // Default synth
                this.synth = new Tone.Synth().toDestination();
            }

            // Create volume control
            this.volume = new Tone.Volume(this.synthConfig.volume || -10).toDestination();
            this.synth.connect(this.volume);

            // Create pattern
            if (this.synthConfig.pattern && this.synthConfig.interval) {
                this.pattern = new Tone.Pattern((time, note) => {
                    if (note !== null && this.isActive) {
                        this.synth.triggerAttackRelease(note, this.synthConfig.interval, time);
                    }
                }, this.synthConfig.pattern, 'up');
                this.pattern.interval = this.synthConfig.interval;
            }

        } catch (error) {
            console.error(`Failed to initialize layer ${this.name}:`, error);
        }
    }

    fadeIn(duration = 0.5) {
        if (!this.volume || this.isActive) return;
        
        this.isActive = true;
        const targetVolume = this.synthConfig.volume || -10;
        
        // Start from very low volume
        this.volume.volume.value = -60;
        this.volume.volume.rampTo(targetVolume, duration);
        
        // Start pattern
        if (this.pattern && Tone.Transport.state === 'started') {
            this.pattern.start(0);
        }
    }

    fadeOut(duration = 0.3) {
        if (!this.volume || !this.isActive) return;
        
        this.isActive = false;
        
        // Fade to silence
        this.volume.volume.rampTo(-60, duration);
        
        // Stop pattern after fade
        if (this.pattern) {
            setTimeout(() => {
                if (!this.isActive) {
                    this.pattern.stop();
                }
            }, duration * 1000);
        }
    }

    play() {
        if (!this.isActive) return;
        if (this.pattern && Tone.Transport.state === 'started') {
            this.pattern.start(0);
        }
    }

    stop() {
        this.isActive = false;
        if (this.pattern) {
            this.pattern.stop();
        }
    }

    dispose() {
        if (this.pattern) {
            this.pattern.dispose();
        }
        if (this.synth) {
            this.synth.dispose();
        }
        if (this.volume) {
            this.volume.dispose();
        }
    }
}

/**
 * AudioEngine class - manages dynamic audio synthesis with Tone.js
 */
class AudioEngine {
    constructor() {
        this.isInitialized = false;
        this.activeLayers = new Map();
        this.currentLayerSet = [];
        
        // Synths for sound effects
        this.correctNoteSynth = null;
        this.errorSynth = null;
        this.sentenceCompleteSynth = null;
        
        // Musical scale for correct notes
        this.noteScale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'];
        this.currentNoteIndex = 0;

        // Audio layer configurations
        this.layerConfigs = {
            beat: {
                type: 'membrane',
                volume: -10,
                pattern: ['C2', null, 'C2', null],
                interval: '8n'
            },
            bass: {
                type: 'fatsawtooth',
                volume: -12,
                pattern: ['C1', 'C1', 'G0', 'G0'],
                interval: '4n'
            },
            percussion: {
                type: 'metalSynth',
                volume: -15,
                pattern: [null, 'C4', null, 'C4'],
                interval: '8n'
            },
            melody: {
                type: 'synth',
                volume: -8,
                pattern: ['C4', 'E4', 'G4', 'B4'],
                interval: '8n'
            },
            rhythm: {
                type: 'pluckSynth',
                volume: -10,
                pattern: ['C3', 'D3', 'E3', 'G3'],
                interval: '16n'
            }
        };
    }

    /**
     * Initialize Tone.js audio context (requires user gesture)
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('Audio already initialized');
            return true;
        }

        try {
            console.log('Initializing audio context...');
            await Tone.start();
            
            // Set global tempo
            Tone.Transport.bpm.value = 120;
            
            // Initialize all layers
            for (const [name, config] of Object.entries(this.layerConfigs)) {
                const layer = new Layer(name, config);
                await layer.initialize();
                this.activeLayers.set(name, layer);
            }

            // Initialize sound effect synths
            this.correctNoteSynth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 }
            }).toDestination();

            this.errorSynth = new Tone.NoiseSynth({
                noise: { type: 'white' },
                envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
            }).toDestination();

            this.sentenceCompleteSynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.02, decay: 0.1, sustain: 0.4, release: 1 }
            }).toDestination();

            // Start transport
            Tone.Transport.start();

            this.isInitialized = true;
            console.log('Audio engine initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Play a correct note based on current combo
     */
    playCorrectNote(combo) {
        if (!this.isInitialized || !this.correctNoteSynth) {
            return;
        }

        try {
            // Play next note in scale
            const note = this.noteScale[this.currentNoteIndex % this.noteScale.length];
            this.correctNoteSynth.triggerAttackRelease(note, '16n');
            
            this.currentNoteIndex++;
            
            // Reset note index periodically
            if (this.currentNoteIndex >= this.noteScale.length * 4) {
                this.currentNoteIndex = 0;
            }
        } catch (error) {
            console.error('Failed to play correct note:', error);
        }
    }

    /**
     * Play error/breaking sound
     */
    playErrorSound() {
        if (!this.isInitialized || !this.errorSynth) {
            return;
        }

        try {
            this.errorSynth.triggerAttackRelease('8n');
            
            // Also reset note progression
            this.currentNoteIndex = 0;
        } catch (error) {
            console.error('Failed to play error sound:', error);
        }
    }

    /**
     * Play satisfying chord progression for sentence completion
     */
    playSentenceComplete() {
        if (!this.isInitialized || !this.sentenceCompleteSynth) {
            return;
        }

        try {
            const now = Tone.now();
            // Play a satisfying chord progression: C major -> G major -> C major
            this.sentenceCompleteSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '4n', now);
            this.sentenceCompleteSynth.triggerAttackRelease(['G3', 'B3', 'D4'], '4n', now + 0.3);
            this.sentenceCompleteSynth.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '2n', now + 0.6);
        } catch (error) {
            console.error('Failed to play sentence complete sound:', error);
        }
    }

    /**
     * Determine which layers should be active based on combo count
     */
    determineActiveLayers(comboCount) {
        if (comboCount >= 16) {
            // High combo: melody, bass, percussion, rhythm (beat removed)
            return ['melody', 'bass', 'percussion', 'rhythm'];
        } else if (comboCount >= 6) {
            // Mid combo: beat, bass, percussion
            return ['beat', 'bass', 'percussion'];
        } else {
            // Low combo: beat only
            return ['beat'];
        }
    }

    /**
     * Update active audio layers based on combo count
     */
    updateLayers(comboCount) {
        if (!this.isInitialized) {
            return;
        }

        const newLayerSet = this.determineActiveLayers(comboCount);
        
        // Find layers to add (in newLayerSet but not in currentLayerSet)
        const layersToAdd = newLayerSet.filter(layer => !this.currentLayerSet.includes(layer));
        
        // Find layers to remove (in currentLayerSet but not in newLayerSet)
        const layersToRemove = this.currentLayerSet.filter(layer => !newLayerSet.includes(layer));

        // Fade in new layers
        layersToAdd.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer) {
                console.log(`Fading in layer: ${layerName}`);
                layer.fadeIn(0.5);
            }
        });

        // Fade out removed layers
        layersToRemove.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer) {
                console.log(`Fading out layer: ${layerName}`);
                layer.fadeOut(0.3);
            }
        });

        // Update current layer set
        this.currentLayerSet = newLayerSet;
    }

    /**
     * Stop all audio playback
     */
    stopAll() {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Stop all layers
            this.activeLayers.forEach(layer => {
                layer.stop();
            });

            // Stop transport
            Tone.Transport.stop();

            this.currentLayerSet = [];
            console.log('All audio stopped');
        } catch (error) {
            console.error('Failed to stop audio:', error);
        }
    }

    /**
     * Remove all layers except base beat (on error)
     */
    removeLayers() {
        if (!this.isInitialized) {
            return;
        }

        // Keep only beat layer
        const layersToRemove = ['bass', 'percussion', 'melody', 'rhythm'];
        
        layersToRemove.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer && layer.isActive) {
                layer.fadeOut(0.3);
            }
        });

        this.currentLayerSet = ['beat'];
    }

    /**
     * Handle audio context suspension/resumption
     */
    handleVisibilityChange() {
        if (!this.isInitialized) {
            return;
        }

        if (document.hidden) {
            // Suspend audio context when tab is hidden
            if (Tone.context.state === 'running') {
                Tone.context.suspend();
                console.log('Audio context suspended');
            }
        } else {
            // Resume audio context when tab is visible
            if (Tone.context.state === 'suspended') {
                Tone.context.resume();
                console.log('Audio context resumed');
            }
        }
    }

    /**
     * Dispose of all audio resources
     */
    dispose() {
        this.stopAll();

        // Dispose all layers
        this.activeLayers.forEach(layer => {
            layer.dispose();
        });
        this.activeLayers.clear();

        // Dispose sound effect synths
        if (this.correctNoteSynth) {
            this.correctNoteSynth.dispose();
        }
        if (this.errorSynth) {
            this.errorSynth.dispose();
        }
        if (this.sentenceCompleteSynth) {
            this.sentenceCompleteSynth.dispose();
        }

        this.isInitialized = false;
        console.log('Audio engine disposed');
    }
}
