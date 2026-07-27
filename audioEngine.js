// --- AUDIO ENGINE WITH TONE.JS - MUSIC GENRE PROGRESSION SYSTEM ---
//
// Genres unlock as the player's total score grows:
//   0-200   -> trap        (dark, minimal, kick 808)
//   200-500 -> lofi        (chill, jazz piano, vinyl)
//   500-1000-> synthwave   (retro 80s, arpeggios, neon)
//   1000-2000-> dnb        (fast, intense, reese bass)
//   2000+   -> futurebass  (epic, wobble, brightness)
//
// Combo-based layering is preserved within each genre, so bigger combos still
// unlock richer layers inside the currently active genre.

/**
 * Layer class for managing individual audio layers.
 * Each layer builds its own synth + local FX chain and feeds into a shared output node
 * (the AudioEngine's master compressor) so all layers share the same global "glue".
 */
class Layer {
    constructor(name, synthConfig, output) {
        this.name = name;
        this.synthConfig = synthConfig;
        this.output = output || null; // shared master input (compressor)
        this.synth = null;
        this.volume = null;
        this.pattern = null;
        this.effects = []; // per-layer effects (distortion, filter, reverb...)
        this.lfos = [];    // LFOs for wobble/modulation effects
        this.isActive = false;
    }

    async initialize() {
        try {
            const cfg = this.synthConfig;
            const type = cfg.type;

            // --- Build synth per layer flavor ---
            switch (type) {
                // ------------------ TRAP ------------------
                case 'kick808': {
                    this.synth = new Tone.MembraneSynth({
                        pitchDecay: 0.05,
                        octaves: 10,
                        oscillator: { type: 'sine' },
                        envelope: {
                            attack: 0.001, decay: 0.4, sustain: 0.01,
                            release: 0.4, attackCurve: 'exponential'
                        }
                    });
                    break;
                }
                case 'sub808': {
                    this.synth = new Tone.MonoSynth({
                        oscillator: { type: 'sine' },
                        envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 2.0 },
                        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
                        filterEnvelope: {
                            attack: 0.05, decay: 0.2, sustain: 0.5, release: 2,
                            baseFrequency: 120, octaves: 2.6
                        }
                    });
                    this.effects.push(new Tone.Distortion({ distortion: 0.3, wet: 0.55 }));
                    break;
                }
                case 'trapHat': {
                    this.synth = new Tone.MetalSynth({
                        frequency: 250,
                        envelope: { attack: 0.001, decay: 0.02, release: 0.01 },
                        harmonicity: 8,
                        modulationIndex: 40,
                        resonance: 4000,
                        octaves: 0.5
                    });
                    break;
                }
                case 'darkLead': {
                    this.synth = new Tone.PolySynth(Tone.FMSynth, {
                        harmonicity: 2,
                        modulationIndex: 6,
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.5 },
                        modulation: { type: 'triangle' },
                        modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 1 }
                    });
                    this.effects.push(
                        new Tone.Filter({ frequency: 2200, type: 'lowpass', rolloff: -24, Q: 1 }),
                        new Tone.Reverb({ decay: 2, wet: 0.3 })
                    );
                    break;
                }
                case 'trapSnare': {
                    this.synth = new Tone.NoiseSynth({
                        noise: { type: 'pink' },
                        envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.3 }
                    });
                    this.effects.push(new Tone.Reverb({ decay: 1.5, wet: 0.4 }));
                    break;
                }

                // ------------------ LO-FI ------------------
                case 'lofiKick': {
                    // Soft, muffled kick
                    this.synth = new Tone.MembraneSynth({
                        pitchDecay: 0.02,
                        octaves: 4,
                        oscillator: { type: 'sine' },
                        envelope: {
                            attack: 0.005, decay: 0.5, sustain: 0.02,
                            release: 0.5, attackCurve: 'exponential'
                        }
                    });
                    this.effects.push(new Tone.Filter({ frequency: 3000, type: 'lowpass', rolloff: -12 }));
                    break;
                }
                case 'lofiBass': {
                    // Warm FM bass, sine oscillator
                    this.synth = new Tone.FMSynth({
                        harmonicity: 1.2,
                        modulationIndex: 3,
                        oscillator: { type: 'sine' },
                        envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.5 },
                        modulation: { type: 'sine' },
                        modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 1 }
                    });
                    this.effects.push(new Tone.Filter({ frequency: 1200, type: 'lowpass', rolloff: -12 }));
                    break;
                }
                case 'lofiHat': {
                    // Filtered, attenuated hi-hat
                    this.synth = new Tone.MetalSynth({
                        frequency: 200,
                        envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
                        harmonicity: 5,
                        modulationIndex: 20,
                        resonance: 2000,
                        octaves: 0.3
                    });
                    this.effects.push(new Tone.Filter({ frequency: 4000, type: 'lowpass', rolloff: -24, Q: 0.5 }));
                    break;
                }
                case 'lofiPiano': {
                    // Jazz piano with triangle wave, long decay
                    this.synth = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: 'triangle' },
                        envelope: { attack: 0.01, decay: 0.8, sustain: 0.2, release: 1.2 }
                    });
                    this.effects.push(
                        new Tone.Chorus({ frequency: 1.5, delayTime: 3, depth: 0.4, wet: 0.4 }).start(),
                        new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.3, wet: 0.25 }),
                        new Tone.Reverb({ decay: 3, wet: 0.4 })
                    );
                    break;
                }
                case 'vinylNoise': {
                    // Constant pink noise for that vinyl warmth
                    this.synth = new Tone.NoiseSynth({
                        noise: { type: 'pink' },
                        envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1.5 }
                    });
                    this.effects.push(new Tone.Filter({ frequency: 6000, type: 'lowpass', rolloff: -12 }));
                    break;
                }

                // ------------------ SYNTHWAVE ------------------
                case 'synthKick': {
                    this.synth = new Tone.MembraneSynth({
                        pitchDecay: 0.03,
                        octaves: 6,
                        oscillator: { type: 'sine' },
                        envelope: {
                            attack: 0.001, decay: 0.35, sustain: 0.01,
                            release: 0.35, attackCurve: 'exponential'
                        }
                    });
                    break;
                }
                case 'synthBass': {
                    this.synth = new Tone.MonoSynth({
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.2 },
                        filter: { Q: 3, type: 'lowpass', rolloff: -24 },
                        filterEnvelope: {
                            attack: 0.005, decay: 0.1, sustain: 0.4, release: 0.2,
                            baseFrequency: 200, octaves: 3
                        }
                    });
                    break;
                }
                case 'synthHat': {
                    // Bright 80s hat
                    this.synth = new Tone.MetalSynth({
                        frequency: 400,
                        envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
                        harmonicity: 10,
                        modulationIndex: 50,
                        resonance: 6000,
                        octaves: 0.7
                    });
                    this.effects.push(new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.2, wet: 0.2 }));
                    break;
                }
                case 'synthLead': {
                    // Retro sawtooth lead with filter sweep + chorus + reverb
                    this.synth = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 0.8 }
                    });
                    this.effects.push(
                        new Tone.Filter({ frequency: 3500, type: 'lowpass', rolloff: -24, Q: 2 }),
                        new Tone.Chorus({ frequency: 2, delayTime: 2.5, depth: 0.6, wet: 0.5 }).start(),
                        new Tone.Reverb({ decay: 2.5, wet: 0.35 })
                    );
                    break;
                }
                case 'synthArp': {
                    // Plucky arpeggio with delay
                    this.synth = new Tone.PluckSynth({
                        attackNoise: 1,
                        dampening: 5000,
                        resonance: 0.9
                    });
                    this.effects.push(
                        new Tone.FeedbackDelay({ delayTime: '8n.', feedback: 0.4, wet: 0.35 }),
                        new Tone.Reverb({ decay: 2, wet: 0.25 })
                    );
                    break;
                }

                // ------------------ DRUM & BASS ------------------
                case 'dnbKick': {
                    this.synth = new Tone.MembraneSynth({
                        pitchDecay: 0.02,
                        octaves: 8,
                        oscillator: { type: 'sine' },
                        envelope: {
                            attack: 0.0005, decay: 0.25, sustain: 0.01,
                            release: 0.2, attackCurve: 'exponential'
                        }
                    });
                    break;
                }
                case 'reeseBass': {
                    // Heavy modulated reese bass
                    this.synth = new Tone.FMSynth({
                        harmonicity: 0.5,
                        modulationIndex: 12,
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.02, decay: 0.4, sustain: 0.8, release: 1.5 },
                        modulation: { type: 'sawtooth' },
                        modulationEnvelope: { attack: 0.05, decay: 0.3, sustain: 0.7, release: 1 }
                    });
                    this.effects.push(
                        new Tone.Distortion({ distortion: 0.4, wet: 0.7 }),
                        new Tone.Filter({ frequency: 800, type: 'lowpass', rolloff: -24, Q: 2 })
                    );
                    break;
                }
                case 'dnbHat': {
                    // Fast, aggressive hats
                    this.synth = new Tone.MetalSynth({
                        frequency: 300,
                        envelope: { attack: 0.001, decay: 0.03, release: 0.01 },
                        harmonicity: 12,
                        modulationIndex: 60,
                        resonance: 5000,
                        octaves: 0.6
                    });
                    break;
                }
                case 'dnbStab': {
                    // Short aggressive pluck
                    this.synth = new Tone.PluckSynth({
                        attackNoise: 2,
                        dampening: 2500,
                        resonance: 0.7
                    });
                    this.effects.push(
                        new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.25, wet: 0.3 }),
                        new Tone.Filter({ frequency: 3000, type: 'lowpass', rolloff: -12 })
                    );
                    break;
                }
                case 'dnbSnare': {
                    // Fast breakbeat snare
                    this.synth = new Tone.NoiseSynth({
                        noise: { type: 'white' },
                        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.15 }
                    });
                    this.effects.push(
                        new Tone.Filter({ frequency: 2500, type: 'highpass', Q: 1 }),
                        new Tone.Reverb({ decay: 1.2, wet: 0.3 })
                    );
                    break;
                }

                // ------------------ FUTURE BASS ------------------
                case 'epicKick': {
                    this.synth = new Tone.MembraneSynth({
                        pitchDecay: 0.04,
                        octaves: 8,
                        oscillator: { type: 'sine' },
                        envelope: {
                            attack: 0.001, decay: 0.5, sustain: 0.02,
                            release: 0.5, attackCurve: 'exponential'
                        }
                    });
                    this.effects.push(new Tone.Distortion({ distortion: 0.15, wet: 0.4 }));
                    break;
                }
                case 'wobbleBass': {
                    // Bass with LFO modulating filter frequency for a wobble
                    this.synth = new Tone.MonoSynth({
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.02, decay: 0.2, sustain: 0.8, release: 0.4 },
                        filter: { Q: 6, type: 'lowpass', rolloff: -24 },
                        filterEnvelope: {
                            attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3,
                            baseFrequency: 200, octaves: 2
                        }
                    });
                    // LFO wobble on the filter frequency
                    const wobbleLfo = new Tone.LFO({
                        frequency: '4n',
                        min: 200,
                        max: 2000,
                        type: 'sine'
                    });
                    wobbleLfo.connect(this.synth.filter.frequency);
                    wobbleLfo.start();
                    this.lfos.push(wobbleLfo);
                    break;
                }
                case 'brightHat': {
                    // Bright hats with delay for sparkle
                    this.synth = new Tone.MetalSynth({
                        frequency: 500,
                        envelope: { attack: 0.001, decay: 0.05, release: 0.02 },
                        harmonicity: 12,
                        modulationIndex: 55,
                        resonance: 7000,
                        octaves: 0.8
                    });
                    this.effects.push(new Tone.FeedbackDelay({ delayTime: '16n', feedback: 0.3, wet: 0.3 }));
                    break;
                }
                case 'pitchedLead': {
                    // Modern chiptune-style lead using AM
                    this.synth = new Tone.PolySynth(Tone.AMSynth, {
                        harmonicity: 3,
                        oscillator: { type: 'square' },
                        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.6 },
                        modulation: { type: 'sine' },
                        modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.5 }
                    });
                    this.effects.push(
                        new Tone.Chorus({ frequency: 3, delayTime: 2, depth: 0.7, wet: 0.5 }).start(),
                        new Tone.Reverb({ decay: 4, wet: 0.4 })
                    );
                    break;
                }
                case 'chordStab': {
                    // Epic major 7 chord stabs
                    this.synth = new Tone.PolySynth(Tone.Synth, {
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.02, decay: 0.4, sustain: 0.5, release: 1.2 }
                    });
                    this.effects.push(
                        new Tone.Filter({ frequency: 4000, type: 'lowpass', rolloff: -12 }),
                        new Tone.Reverb({ decay: 4, wet: 0.5 })
                    );
                    break;
                }

                default: {
                    this.synth = new Tone.Synth();
                }
            }

            // Volume node closes the layer chain
            this.volume = new Tone.Volume(cfg.volume != null ? cfg.volume : -10);

            // Wire chain: synth -> [effects...] -> volume -> output/destination
            const nodes = [this.synth, ...this.effects, this.volume];
            for (let i = 0; i < nodes.length - 1; i++) {
                nodes[i].connect(nodes[i + 1]);
            }
            if (this.output) {
                this.volume.connect(this.output);
            } else {
                this.volume.toDestination();
            }

            // Warm up any Reverb impulse responses so first hit isn't silent
            for (const eff of this.effects) {
                if (eff instanceof Tone.Reverb && typeof eff.generate === 'function') {
                    try { await eff.generate(); } catch (e) { /* ignore */ }
                }
            }

            // Pattern
            if (cfg.pattern && cfg.interval) {
                const noteDur = cfg.noteDuration || cfg.interval;
                this.pattern = new Tone.Pattern((time, note) => {
                    if (note === null || !this.isActive) return;
                    try {
                        // NoiseSynth has no pitch argument
                        if (this.synth instanceof Tone.NoiseSynth) {
                            this.synth.triggerAttackRelease(noteDur, time);
                        } else {
                            this.synth.triggerAttackRelease(note, noteDur, time);
                        }
                    } catch (err) {
                        // Swallow scheduler race errors, don't kill the whole pattern
                    }
                }, cfg.pattern, 'up');
                this.pattern.interval = cfg.interval;
            }
        } catch (error) {
            console.error(`Failed to initialize layer ${this.name}:`, error);
        }
    }

    fadeIn(duration = 0.5) {
        if (!this.volume || this.isActive) return;

        this.isActive = true;
        const targetVolume = this.synthConfig.volume != null ? this.synthConfig.volume : -10;

        // Ramp from silence to target
        this.volume.volume.value = -60;
        this.volume.volume.rampTo(targetVolume, duration);

        if (this.pattern && Tone.Transport.state === 'started') {
            this.pattern.start(0);
        }
    }

    fadeOut(duration = 0.3) {
        if (!this.volume || !this.isActive) return;

        this.isActive = false;
        this.volume.volume.rampTo(-60, duration);

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
            try { this.pattern.dispose(); } catch (e) { }
        }
        for (const lfo of this.lfos) {
            try { lfo.stop(); lfo.dispose(); } catch (e) { }
        }
        this.lfos = [];
        if (this.synth) {
            try { this.synth.dispose(); } catch (e) { }
        }
        for (const eff of this.effects) {
            try { eff.dispose(); } catch (e) { }
        }
        this.effects = [];
        if (this.volume) {
            try { this.volume.dispose(); } catch (e) { }
        }
    }
}

/**
 * AudioEngine class - manages dynamic audio synthesis with Tone.js.
 * Uses a genre-progression system: as the player's total score grows,
 * the engine transitions through 5 distinct genres, each with its own
 * BPM, scale, and set of layer configurations. Within each genre, the
 * combo-based layering behavior is preserved.
 */
class AudioEngine {
    constructor() {
        this.isInitialized = false;
        this.activeLayers = new Map();
        this.currentLayerSet = [];

        // Master bus nodes
        this.masterFilter = null;
        this.globalReverb = null;
        this.compressor = null;

        // Sound effect synths
        this.correctNoteSynth = null;
        this.correctVolume = null;

        this.errorSynth = null;
        this.errorFilter = null;
        this.errorDrop = null;

        this.sentenceCompleteSynth = null;
        this.sentenceReverb = null;

        // Genre progression state
        this.currentGenre = 'trap';
        this.lastKnownCombo = 0;
        this.onGenreChangeCallback = null;
        this.isTransitioning = false;

        // Musical scale (starts at trap; updated per genre transition)
        this.noteScale = ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5'];
        this.currentNoteIndex = 0;

        // Per-genre configurations. Each genre defines: bpm, note scale,
        // and 5 layers keyed by role (beat / bass / percussion / melody / rhythm).
        this.genreConfigs = {
            // -------------------- TRAP (0 - 200) --------------------
            trap: {
                bpm: 140,
                noteScale: ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5'],
                layers: {
                    beat: {
                        type: 'kick808',
                        volume: -6,
                        pattern: ['C1', null, null, null, 'C1', null, null, null],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    bass: {
                        type: 'sub808',
                        volume: -10,
                        pattern: ['C1', null, 'C1', 'Eb1', null, 'G0', 'C1', null],
                        interval: '4n',
                        noteDuration: '2n'
                    },
                    percussion: {
                        type: 'trapHat',
                        volume: -20,
                        pattern: ['C6', 'C6', 'C6', null, 'C6', 'C6', null, 'C6'],
                        interval: '16n',
                        noteDuration: '32n'
                    },
                    melody: {
                        type: 'darkLead',
                        volume: -14,
                        pattern: ['C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'Eb4'],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    rhythm: {
                        type: 'trapSnare',
                        volume: -12,
                        pattern: [null, null, null, null, 'C4', null, null, null],
                        interval: '8n',
                        noteDuration: '16n'
                    }
                }
            },

            // -------------------- LO-FI (200 - 500) --------------------
            lofi: {
                bpm: 85,
                noteScale: ['C4', 'D4', 'E4', 'G4', 'A4', 'Bb4'],
                layers: {
                    beat: {
                        type: 'lofiKick',
                        volume: -8,
                        pattern: ['C1', null, null, null, 'C1', null, null, null],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    bass: {
                        type: 'lofiBass',
                        volume: -12,
                        pattern: ['C2', null, 'Eb2', null, 'F2', null, 'G2', null],
                        interval: '8n',
                        noteDuration: '4n'
                    },
                    percussion: {
                        type: 'lofiHat',
                        volume: -22,
                        pattern: ['C6', null, null, 'C6', null, null, 'C6', null],
                        interval: '8n',
                        noteDuration: '16n'
                    },
                    melody: {
                        type: 'lofiPiano',
                        volume: -14,
                        pattern: ['C4', 'E4', 'G4', null, 'Bb4', 'G4', 'E4', null],
                        interval: '8n',
                        noteDuration: '4n'
                    },
                    rhythm: {
                        type: 'vinylNoise',
                        volume: -34,
                        pattern: ['C4', null, 'C4', null, 'C4', null, 'C4', null],
                        interval: '2n',
                        noteDuration: '2n'
                    }
                }
            },

            // -------------------- SYNTHWAVE (500 - 1000) --------------------
            synthwave: {
                bpm: 110,
                noteScale: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
                layers: {
                    beat: {
                        type: 'synthKick',
                        volume: -6,
                        pattern: ['C1', null, null, null, 'C1', null, null, null],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    bass: {
                        type: 'synthBass',
                        volume: -10,
                        pattern: ['C2', 'C2', 'G1', 'G1', 'Ab1', 'Ab1', 'Bb1', 'Bb1'],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    percussion: {
                        type: 'synthHat',
                        volume: -20,
                        pattern: ['C6', null, 'C6', null, 'C6', null, 'C6', null],
                        interval: '16n',
                        noteDuration: '32n'
                    },
                    melody: {
                        type: 'synthLead',
                        volume: -14,
                        pattern: ['C5', 'G4', 'E5', 'G4', 'A4', 'E5', 'D5', 'C5'],
                        interval: '8n',
                        noteDuration: '8n'
                    },
                    rhythm: {
                        type: 'synthArp',
                        volume: -16,
                        pattern: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4', 'E4'],
                        interval: '16n',
                        noteDuration: '16n'
                    }
                }
            },

            // -------------------- DRUM & BASS (1000 - 2000) --------------------
            dnb: {
                bpm: 174,
                noteScale: ['C4', 'Eb4', 'F4', 'G4', 'Bb4', 'C5'],
                layers: {
                    beat: {
                        type: 'dnbKick',
                        volume: -6,
                        pattern: ['C1', null, null, 'C1', null, 'C1', null, null],
                        interval: '16n',
                        noteDuration: '16n'
                    },
                    bass: {
                        type: 'reeseBass',
                        volume: -12,
                        pattern: ['C1', null, null, null, null, null, null, null],
                        interval: '4n',
                        noteDuration: '2n'
                    },
                    percussion: {
                        type: 'dnbHat',
                        volume: -20,
                        pattern: ['C6', 'C6', 'C6', 'C6', 'C6', null, 'C6', 'C6'],
                        interval: '16n',
                        noteDuration: '32n'
                    },
                    melody: {
                        type: 'dnbStab',
                        volume: -14,
                        pattern: ['C4', null, 'Eb4', null, 'G4', null, 'Bb4', null],
                        interval: '16n',
                        noteDuration: '16n'
                    },
                    rhythm: {
                        type: 'dnbSnare',
                        volume: -10,
                        pattern: [null, null, null, null, 'C4', null, null, null],
                        interval: '16n',
                        noteDuration: '32n'
                    }
                }
            },

            // -------------------- FUTURE BASS (2000+) --------------------
            futurebass: {
                bpm: 150,
                noteScale: ['C4', 'D4', 'E4', 'G4', 'A4', 'B4'],
                layers: {
                    beat: {
                        type: 'epicKick',
                        volume: -6,
                        pattern: ['C1', null, null, null, 'C1', null, 'C1', null],
                        interval: '16n',
                        noteDuration: '8n'
                    },
                    bass: {
                        type: 'wobbleBass',
                        volume: -10,
                        pattern: ['C2', 'C2', 'F2', 'F2', 'Ab2', 'Ab2', 'Bb2', 'Bb2'],
                        interval: '16n',
                        noteDuration: '16n'
                    },
                    percussion: {
                        type: 'brightHat',
                        volume: -20,
                        pattern: ['C6', 'C6', null, 'C6', 'C6', 'C6', null, 'C6'],
                        interval: '16n',
                        noteDuration: '32n'
                    },
                    melody: {
                        type: 'pitchedLead',
                        volume: -14,
                        pattern: ['C5', 'E5', 'G5', 'B5', 'A5', 'G5', 'E5', 'D5'],
                        interval: '16n',
                        noteDuration: '16n'
                    },
                    rhythm: {
                        type: 'chordStab',
                        volume: -12,
                        pattern: ['C4', null, null, 'F4', null, null, 'Ab4', null],
                        interval: '8n',
                        noteDuration: '4n'
                    }
                }
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
            console.log('Initializing audio engine (genre progression)...');
            await Tone.start();

            // Load initial genre config
            const initialGenre = this.genreConfigs[this.currentGenre];
            Tone.Transport.bpm.value = initialGenre.bpm;
            this.noteScale = initialGenre.noteScale;

            // --- Master bus: synth -> compressor -> master filter -> reverb -> destination ---
            this.masterFilter = new Tone.Filter({
                frequency: 12000,
                type: 'lowpass',
                rolloff: -12
            }).toDestination();

            this.globalReverb = new Tone.Reverb({ decay: 2, wet: 0.15 });
            try { await this.globalReverb.generate(); } catch (e) { /* ignore */ }
            this.globalReverb.connect(this.masterFilter);

            this.compressor = new Tone.Compressor({
                threshold: -18,
                ratio: 6,
                attack: 0.003,
                release: 0.1
            });
            this.compressor.connect(this.globalReverb);

            // Initialize the initial genre's layers
            for (const [name, config] of Object.entries(initialGenre.layers)) {
                const layer = new Layer(name, config, this.compressor);
                await layer.initialize();
                this.activeLayers.set(name, layer);
            }

            // --- One-shot sound effects (shared across genres, but use noteScale) ---

            this.correctNoteSynth = new Tone.PluckSynth({
                attackNoise: 0.5,
                dampening: 3200,
                resonance: 0.8
            });
            this.correctVolume = new Tone.Volume(-14);
            this.correctNoteSynth.connect(this.correctVolume);
            this.correctVolume.connect(this.compressor);

            this.errorSynth = new Tone.NoiseSynth({
                noise: { type: 'pink' },
                envelope: { attack: 0.005, decay: 0.22, sustain: 0, release: 0.1 }
            });
            this.errorFilter = new Tone.Filter({
                frequency: 4000,
                type: 'bandpass',
                Q: 4
            });
            const errorVolume = new Tone.Volume(-14);
            this.errorSynth.chain(this.errorFilter, errorVolume, this.compressor);

            this.errorDrop = new Tone.MembraneSynth({
                pitchDecay: 0.2,
                octaves: 6,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.3 }
            });
            const errorDropVolume = new Tone.Volume(-10);
            this.errorDrop.connect(errorDropVolume);
            errorDropVolume.connect(this.compressor);

            this.sentenceCompleteSynth = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 2,
                modulationIndex: 5,
                oscillator: { type: 'sawtooth' },
                envelope: { attack: 0.03, decay: 0.4, sustain: 0.5, release: 2 },
                modulation: { type: 'triangle' },
                modulationEnvelope: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 1 }
            });
            this.sentenceReverb = new Tone.Reverb({ decay: 3, wet: 0.4 });
            try { await this.sentenceReverb.generate(); } catch (e) { /* ignore */ }
            const sentenceVolume = new Tone.Volume(-10);
            this.sentenceCompleteSynth.chain(this.sentenceReverb, sentenceVolume, this.compressor);

            // Start transport
            Tone.Transport.start();

            this.isInitialized = true;
            console.log(`Audio engine initialized. Starting genre: ${this.currentGenre}`);
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Play a correct-note pluck using the current genre's scale
     */
    playCorrectNote(combo) {
        if (!this.isInitialized || !this.correctNoteSynth) return;

        try {
            const note = this.noteScale[this.currentNoteIndex % this.noteScale.length];
            this.correctNoteSynth.triggerAttackRelease(note, '32n');

            this.currentNoteIndex++;
            if (this.currentNoteIndex >= this.noteScale.length * 4) {
                this.currentNoteIndex = 0;
            }
        } catch (error) {
            console.error('Failed to play correct note:', error);
        }
    }

    /**
     * Error sound: vinyl scratch + short 808 sub "stop"
     */
    playErrorSound() {
        if (!this.isInitialized || !this.errorSynth) return;

        try {
            const now = Tone.now();

            if (this.errorFilter && this.errorFilter.frequency) {
                this.errorFilter.frequency.cancelScheduledValues(now);
                this.errorFilter.frequency.setValueAtTime(4000, now);
                this.errorFilter.frequency.exponentialRampToValueAtTime(300, now + 0.22);
            }
            this.errorSynth.triggerAttackRelease('16n', now);

            if (this.errorDrop) {
                this.errorDrop.triggerAttackRelease('C1', '8n', now);
            }

            // Reset melodic progression on error
            this.currentNoteIndex = 0;
        } catch (error) {
            console.error('Failed to play error sound:', error);
        }
    }

    /**
     * Sentence-complete chord progression, using notes from the current scale
     */
    playSentenceComplete() {
        if (!this.isInitialized || !this.sentenceCompleteSynth) return;

        try {
            const now = Tone.now();
            const s = this.noteScale;
            // Build 3-note chords from the scale (roughly root/3rd/5th positions)
            const chord1 = [s[0], s[2] || s[0], s[4] || s[0]];
            const chord2 = [s[3] || s[0], s[5] || s[0], s[1] || s[0]];
            const chord3 = [s[2] || s[0], s[4] || s[0], s[0]];
            const chord4 = [s[4] || s[0], s[1] || s[0], s[3] || s[0]];
            this.sentenceCompleteSynth.triggerAttackRelease(chord1, '4n', now);
            this.sentenceCompleteSynth.triggerAttackRelease(chord2, '4n', now + 0.3);
            this.sentenceCompleteSynth.triggerAttackRelease(chord3, '4n', now + 0.6);
            this.sentenceCompleteSynth.triggerAttackRelease(chord4, '2n', now + 0.9);
        } catch (error) {
            console.error('Failed to play sentence complete sound:', error);
        }
    }

    /**
     * Determine which layers should be active based on combo count
     * (same rules across genres — combo unlocks richness within the current genre)
     */
    determineActiveLayers(comboCount) {
        if (comboCount >= 16) {
            return ['melody', 'bass', 'percussion', 'rhythm'];
        } else if (comboCount >= 6) {
            return ['beat', 'bass', 'percussion'];
        } else {
            return ['beat'];
        }
    }

    /**
     * Update active audio layers based on combo count
     */
    updateLayers(comboCount) {
        if (!this.isInitialized) return;

        // Track the latest combo so genre transitions can restore layers
        this.lastKnownCombo = comboCount;

        // Ignore layer updates during a genre transition — the transition
        // itself picks the correct layers to activate afterwards.
        if (this.isTransitioning) return;

        const newLayerSet = this.determineActiveLayers(comboCount);

        const layersToAdd = newLayerSet.filter(layer => !this.currentLayerSet.includes(layer));
        const layersToRemove = this.currentLayerSet.filter(layer => !newLayerSet.includes(layer));

        layersToAdd.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer) {
                console.log(`Fading in layer: ${layerName}`);
                layer.fadeIn(0.5);
            }
        });

        layersToRemove.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer) {
                console.log(`Fading out layer: ${layerName}`);
                layer.fadeOut(0.3);
            }
        });

        this.currentLayerSet = newLayerSet;
    }

    /**
     * Restart audio playback after stopAll() was called.
     * Resets to the initial genre (trap) and starts the transport again.
     * Safe to call multiple times; a no-op if the engine was never initialized.
     */
    async restart() {
        if (!this.isInitialized) return;

        try {
            console.log('Restarting audio engine...');

            // 1. Stop the transport just in case it's running
            try { Tone.Transport.stop(); } catch (e) { /* ignore */ }

            // 2. Stop and dispose currently active layers
            this.activeLayers.forEach(layer => {
                try { layer.stop(); } catch (e) { /* ignore */ }
                try { layer.dispose(); } catch (e) { /* ignore */ }
            });
            this.activeLayers.clear();
            this.currentLayerSet = [];

            // 3. Reset progression state back to the initial genre (trap)
            this.currentGenre = 'trap';
            this.lastKnownCombo = 0;
            this.currentNoteIndex = 0;
            this.isTransitioning = false;

            // 4. Load initial genre configuration
            const initialGenre = this.genreConfigs[this.currentGenre];
            this.noteScale = initialGenre.noteScale;

            // 5. Ramp BPM back to the initial tempo
            try {
                Tone.Transport.bpm.rampTo(initialGenre.bpm, 0.3);
            } catch (e) {
                Tone.Transport.bpm.value = initialGenre.bpm;
            }

            // 6. Rebuild layers for the initial genre
            for (const [name, config] of Object.entries(initialGenre.layers)) {
                const layer = new Layer(name, config, this.compressor);
                await layer.initialize();
                this.activeLayers.set(name, layer);
            }

            // 7. Restart the transport
            Tone.Transport.start();

            // 8. Activate initial layers (beat only, since combo is 0)
            this.updateLayers(0);

            console.log('Audio engine restarted successfully');
        } catch (error) {
            console.error('Failed to restart audio engine:', error);
        }
    }

    /**
     * Stop all audio playback
     */
    stopAll() {
        if (!this.isInitialized) return;

        try {
            this.activeLayers.forEach(layer => layer.stop());
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
        if (!this.isInitialized) return;

        const layersToRemove = ['bass', 'percussion', 'melody', 'rhythm'];
        layersToRemove.forEach(layerName => {
            const layer = this.activeLayers.get(layerName);
            if (layer && layer.isActive) {
                layer.fadeOut(0.3);
            }
        });

        this.currentLayerSet = ['beat'];
    }

    // -------------------------------------------------------------
    // ------------------- GENRE PROGRESSION API -------------------
    // -------------------------------------------------------------

    /**
     * Determine which genre corresponds to the given total score.
     */
    determineGenre(totalScore) {
        if (totalScore >= 2000) return 'futurebass';
        if (totalScore >= 1000) return 'dnb';
        if (totalScore >= 500) return 'synthwave';
        if (totalScore >= 200) return 'lofi';
        return 'trap';
    }

    /**
     * Public: called from script.js whenever total score changes.
     * Triggers a smooth genre transition if the score crossed a threshold.
     */
    updateGenre(totalScore) {
        if (!this.isInitialized || this.isTransitioning) return;
        const newGenre = this.determineGenre(totalScore);
        if (newGenre !== this.currentGenre) {
            // fire-and-forget; transition is async
            this.transitionToGenre(newGenre).catch(err => {
                console.error('Genre transition failed:', err);
                this.isTransitioning = false;
            });
        }
    }

    /**
     * Smoothly transition to a new genre:
     *   fade out current layers -> dispose -> ramp BPM ->
     *   build new layers -> fade in the ones the current combo unlocks.
     */
    async transitionToGenre(newGenre) {
        if (!this.genreConfigs[newGenre]) {
            console.warn(`Unknown genre: ${newGenre}`);
            return;
        }
        if (this.isTransitioning) return;

        this.isTransitioning = true;

        const oldGenre = this.currentGenre;
        console.log(`🎵 Genre change: ${oldGenre} -> ${newGenre}`);

        try {
            // 1. Fade out currently active layers
            const activeLayerNames = [...this.currentLayerSet];
            activeLayerNames.forEach(layerName => {
                const layer = this.activeLayers.get(layerName);
                if (layer) layer.fadeOut(0.8);
            });

            // 2. Wait for fade out to complete
            await new Promise(r => setTimeout(r, 800));

            // 3. Dispose old layers
            this.activeLayers.forEach(layer => {
                try { layer.dispose(); } catch (e) { /* ignore */ }
            });
            this.activeLayers.clear();
            this.currentLayerSet = [];

            // 4. Ramp BPM to the new genre's tempo
            const newConfig = this.genreConfigs[newGenre];
            try {
                Tone.Transport.bpm.rampTo(newConfig.bpm, 0.5);
            } catch (e) {
                Tone.Transport.bpm.value = newConfig.bpm;
            }

            // 5. Update current genre state
            this.currentGenre = newGenre;
            this.noteScale = newConfig.noteScale;
            this.currentNoteIndex = 0;

            // 6. Build the new genre's layers
            for (const [name, config] of Object.entries(newConfig.layers)) {
                const layer = new Layer(name, config, this.compressor);
                await layer.initialize();
                this.activeLayers.set(name, layer);
            }

            // 7. Reactivate the layers appropriate for the current combo
            const currentCombo = this.lastKnownCombo || 0;
            const layersToActivate = this.determineActiveLayers(currentCombo);
            layersToActivate.forEach(layerName => {
                const layer = this.activeLayers.get(layerName);
                if (layer) layer.fadeIn(0.5);
            });
            this.currentLayerSet = layersToActivate;

            // 8. Notify UI listeners
            if (typeof this.onGenreChangeCallback === 'function') {
                try {
                    this.onGenreChangeCallback(newGenre, oldGenre);
                } catch (cbErr) {
                    console.error('Genre change callback error:', cbErr);
                }
            }
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Register a callback invoked whenever the genre changes.
     * signature: (newGenre, oldGenre) => void
     */
    setGenreChangeCallback(callback) {
        this.onGenreChangeCallback = callback;
    }

    /**
     * Get the current genre id (e.g. 'trap', 'lofi', ...)
     */
    getCurrentGenre() {
        return this.currentGenre;
    }

    /**
     * Get a human-readable display name for a genre.
     */
    getGenreDisplayName(genre) {
        const names = {
            trap: 'TRAP',
            lofi: 'LO-FI HIP HOP',
            synthwave: 'SYNTHWAVE',
            dnb: 'DRUM & BASS',
            futurebass: 'FUTURE BASS'
        };
        return names[genre] || String(genre || '').toUpperCase();
    }

    /**
     * Handle audio context suspension/resumption
     */
    handleVisibilityChange() {
        if (!this.isInitialized) return;

        if (document.hidden) {
            if (Tone.context.state === 'running') {
                Tone.context.suspend();
                console.log('Audio context suspended');
            }
        } else {
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

        this.activeLayers.forEach(layer => layer.dispose());
        this.activeLayers.clear();

        const nodesToDispose = [
            this.correctNoteSynth,
            this.correctVolume,
            this.errorSynth,
            this.errorFilter,
            this.errorDrop,
            this.sentenceCompleteSynth,
            this.sentenceReverb,
            this.compressor,
            this.globalReverb,
            this.masterFilter
        ];
        for (const node of nodesToDispose) {
            if (node) {
                try { node.dispose(); } catch (e) { /* ignore */ }
            }
        }

        this.correctNoteSynth = null;
        this.correctVolume = null;
        this.errorSynth = null;
        this.errorFilter = null;
        this.errorDrop = null;
        this.sentenceCompleteSynth = null;
        this.sentenceReverb = null;
        this.compressor = null;
        this.globalReverb = null;
        this.masterFilter = null;

        this.onGenreChangeCallback = null;
        this.isTransitioning = false;

        this.isInitialized = false;
        console.log('Audio engine disposed');
    }
}
