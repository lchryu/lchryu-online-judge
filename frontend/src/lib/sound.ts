let audioCtx: AudioContext | null = null;
let isMuted = true; // default muted as planned

export function getMuteState(): boolean {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("sound_muted");
    if (saved !== null) {
      isMuted = saved === "true";
    }
  }
  return isMuted;
}

export function setMuteState(muted: boolean) {
  isMuted = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("sound_muted", String(muted));
  }
}

function initAudio(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// play a short subtle tick when a testcase succeeds
export function playTickSound() {
  if (getMuteState()) return;
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (err) {
    console.error("Audio error:", err);
  }
}

// play a quick short tick when a testcase fails
export function playFailureTickSound() {
  if (getMuteState()) return;
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.12);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  } catch (err) {
    console.error("Audio error:", err);
  }
}

// play a victory chime chord on full AC
export function playSuccessSound() {
  if (getMuteState()) return;
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Play a rising major chord arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.08;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, noteTime);
      
      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(noteTime);
      osc.stop(noteTime + 0.5);
    });
  } catch (err) {
    console.error("Audio error:", err);
  }
}

// play a failure warning sound
export function playFailureSound() {
  if (getMuteState()) return;
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Play a dual discordant descending tone
    const frequencies = [220, 210]; // close frequencies for beating effect
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.45);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      
      // simple lowpass filter to make sawtooth less harsh
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.45);
    });
  } catch (err) {
    console.error("Audio error:", err);
  }
}
