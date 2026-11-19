let ctx, bus

function context() {
  if (!ctx) {
    ctx = new AudioContext({
      latencyHint: 'interactive'
    });
    bus = ctx.createDynamicsCompressor();
    bus.connect(ctx.destination)
  }
  return ctx
}
export function unlock() {
  const c = context();
  if (c.state === 'suspended') c.resume();
  return c
}

function synth(hz, delay, output, onEnded) {
  const c = unlock(),
    t = c.currentTime + delay,
    g = c.createGain();
  g.connect(output);
  g.gain.value = 1;
  let remaining = 0;
  const waves = [1, .44, .21, .09, .045, .018].flatMap((a, i) => {
    const f = hz * (i + 1) * Math.sqrt(1 + .00009 * i * i);
    if (f >= c.sampleRate / 2) return [];
    const o = c.createOscillator(),
      v = c.createGain();
    o.frequency.value = f;
    v.gain.setValueAtTime(.00001, t);
    v.gain.exponentialRampToValueAtTime(.16 * a, t + .006);
    v.gain.exponentialRampToValueAtTime(.00001, t + 6 / (1 + i * .4));
    o.connect(v).connect(g);
    o.start(t);
    o.stop(t + 6.05);
    remaining++;
    o.onended = () => {
      o.disconnect();
      v.disconnect();
      if (--remaining === 0) { g.disconnect(); onEnded?.() }
    };
    return [o]
  });
  return (length) => {
    const end = length === undefined ? c.currentTime : t + length;
    g.gain.setTargetAtTime(.00001, Math.max(t, end), .025);
    for (const o of waves) o.stop(Math.max(t, Math.min(t + 6.05, end + .18)))
  }
}
export async function microphone() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });
  const c = unlock(),
    src = c.createMediaStreamSource(stream),
    a = c.createAnalyser();
  a.fftSize = 4096;
  src.connect(a);
  const b = new Float32Array(a.fftSize);
  return {
    read() {
      a.getFloatTimeDomainData(b);
      let energy = 0;
      for (let i = 0; i < 1024; i++) energy += b[i] * b[i];
      if (energy < .025) return null;
      let prev = 1,
        best = 0,
        lag = 0;
      for (let k = Math.floor(c.sampleRate / 2000); k < c.sampleRate / 55; k++) {
        let xy = 0,
          xx = 0,
          yy = 0;
        for (let i = 0; i < 1024; i += 2) {
          const x = b[i],
            y = b[i + k];
          xy += x * y;
          xx += x * x;
          yy += y * y
        }
        const r = xy / Math.sqrt(xx * yy || 1);
        if (prev > .9 && prev > r && lag === k - 1) return c.sampleRate / lag;
        if (r > best) {
          best = r;
          lag = k
        }
        prev = r
      }
      return null
    },
    close() {
      stream.getTracks().forEach(t => t.stop());
      src.disconnect();
      a.disconnect()
    }
  }
}

const bank = new Map()
async function preload(m) {
  const pitch = ['C', '', '', 'Ds', '', '', 'Fs', '', '', 'A'][m % 12]
  const file = pitch + (Math.floor(m / 12) - 1) + '.mp3'
  const response = await fetch(new URL('../piano/' + file, import.meta.url))
  if (!response.ok) throw Error(file)
  bank.set(m, await context().decodeAudioData(await response.arrayBuffer()))
}
export const ready = Promise.allSettled(Array.from({
  length: 30
}, (_, i) => preload(21 + i * 3)))
export function voice(hz, delay = 0, output = null, onEnded = null) {
  const midi = 69 + 12 * Math.log2(hz / 440)
  const root = Math.max(21, Math.min(108, 21 + 3 * Math.round((midi - 21) / 3)))
  const sample = bank.get(root)
  const c = unlock()
  const destination = output ?? bus
  if (!sample) return synth(hz, delay, destination, onEnded)
  const start = c.currentTime + delay,
    source = c.createBufferSource(),
    amp = c.createGain()
  source.buffer = sample
  source.playbackRate.value = 2 ** ((midi - root) / 12)
  amp.gain.setValueAtTime(.0001, start)
  amp.gain.linearRampToValueAtTime(.65, start + .004)
  source.connect(amp).connect(destination)
  source.start(start)
  amp.gain.setTargetAtTime(.0001, start + 5.9, .025)
  source.stop(start + 6.12)
  source.onended = () => {
    source.disconnect();
    amp.disconnect()
    onEnded?.()
  }
  return duration => {
    const end = Math.max(c.currentTime, start + Math.min(6, duration ?? 0))
    amp.gain.setTargetAtTime(.0001, end, .025)
    source.stop(end + .18)
  }
}


// Live taps ring after key-up. Damp a repeated string and bound the number of
// overlapping tails without changing the timing captured by the recorder.
const live = new Map()
export function liveVoice(hz, onDuration) {
  const c = unlock()
  const previous = live.get(hz)
  if (previous) previous.damp()
  if (live.size >= 16) live.values().next().value.damp()

  const gate = c.createGain()
  gate.connect(bus)
  const start = c.currentTime
  let durationLimit = 6
  let damped = false
  const entry = {
    damp() {
      live.delete(hz)
      damped = true
      gate.gain.setTargetAtTime(0, c.currentTime, .012)
      durationLimit = Math.min(durationLimit, c.currentTime - start)
      release(durationLimit)
      onDuration?.(Math.max(.001, durationLimit))
    }
  }
  const release = voice(hz, 0, gate, () => {
    if (live.get(hz) === entry) live.delete(hz)
    gate.disconnect()
  })
  live.set(hz, entry)
  return duration => {
    if (!damped) {
      durationLimit = duration
      release(duration)
      onDuration?.(duration)
    }
  }
}
