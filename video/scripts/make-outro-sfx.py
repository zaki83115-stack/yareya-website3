"""Synthesise the outro sound design, timed to the Outro composition (30 fps).

Usage: python3 scripts/make-outro-sfx.py public/outro/outro-sfx.wav
"""

import sys
import wave

import numpy as np

SR = 48000
FPS = 30
DURATION = 8.0
N = int(SR * DURATION)
rng = np.random.default_rng(7)

left = np.zeros(N)
right = np.zeros(N)


def at(frame):
    return int(frame / FPS * SR)


def place(sig, frame, gain=1.0, pan=0.0):
    """Mix a mono (or (L, R) tuple) signal in at a frame. pan: -1 left .. 1 right."""
    if isinstance(sig, tuple):
        sl, sr_ = sig
    else:
        sl = sig * np.sqrt((1 - pan) / 2)
        sr_ = sig * np.sqrt((1 + pan) / 2)
    i = at(frame)
    n = min(len(sl), N - i)
    left[i : i + n] += sl[:n] * gain
    right[i : i + n] += sr_[:n] * gain


def one_pole_lp(x, cutoff):
    """Lowpass with a per-sample cutoff (Hz) array or scalar."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc = (1 - a[k]) * x[k] + a[k] * acc
        y[k] = acc
    return y


def bandpass(x, lo, hi):
    return one_pole_lp(x, hi) - one_pole_lp(one_pole_lp(x, hi), lo)


def env(n, attack, release, curve=3.0):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    r = np.clip((n / SR - t) / max(release, 1e-4), 0, 1) ** curve
    return a * r


def reverb(sig, seconds=2.2, wet=0.35):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir_l = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir_r = rng.standard_normal(n) * np.exp(-t * 3.2)
    ir_l = one_pole_lp(ir_l, 5000)
    ir_r = one_pole_lp(ir_r, 5000)
    size = len(sig) + n
    f = np.fft.rfft(sig, size)
    wl = np.fft.irfft(f * np.fft.rfft(ir_l, size), size)
    wr = np.fft.irfft(f * np.fft.rfft(ir_r, size), size)
    norm = 0.02
    dry = np.pad(sig, (0, n))
    return dry + wl * wet * norm, dry + wr * wet * norm


def whoosh(seconds, f_lo, f_hi, peak=0.55):
    n = int(SR * seconds)
    t = np.linspace(0, 1, n)
    shape = np.sin(np.pi * np.clip(t / peak, 0, 1) * 0.5) ** 2
    shape *= np.clip((1 - t) / (1 - peak), 0, 1) ** 1.6
    cutoff = f_lo + (f_hi - f_lo) * np.sin(np.pi * t) ** 1.5
    noise = rng.standard_normal(n)
    body = one_pole_lp(one_pole_lp(noise, cutoff), cutoff * 1.4)
    air = noise - one_pole_lp(noise, 6000)
    return (body * 1.6 + air * 0.08 * shape) * shape


def impact(seconds=2.0, f0=95, f1=38):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    freq = f1 + (f0 - f1) * np.exp(-t * 9)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    sub = np.sin(phase) * np.exp(-t * 2.6)
    click = rng.standard_normal(n) * np.exp(-t * 60)
    click = one_pole_lp(click, 2500)
    thump = one_pole_lp(rng.standard_normal(n), 400) * np.exp(-t * 12) * 3
    return sub * 0.9 + click * 0.5 + thump * 0.4


def bell(freq, seconds=1.6, decay=3.5):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    s = (
        np.sin(2 * np.pi * freq * t)
        + 0.45 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t * 4)
        + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t * 7)
    )
    return s * np.exp(-t * decay) * env(n, 0.002, 0.05)


def shimmer(seconds=1.4, count=16, base=2200):
    n = int(SR * seconds)
    sl = np.zeros(n)
    sr_ = np.zeros(n)
    for k in range(count):
        start = int(k / count * n * 0.7)
        f = base * (1 + rng.random() * 1.6)
        b = bell(f, seconds=0.8, decay=6) * (0.5 + 0.5 * rng.random())
        p = rng.uniform(-0.9, 0.9)
        m = min(len(b), n - start)
        sl[start : start + m] += b[:m] * np.sqrt((1 - p) / 2)
        sr_[start : start + m] += b[:m] * np.sqrt((1 + p) / 2)
    return sl, sr_


def pluck(freq, seconds=0.5):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
    return s * np.exp(-t * 14) * env(n, 0.001, 0.02)


def tick():
    n = int(SR * 0.08)
    t = np.arange(n) / SR
    s = bandpass(rng.standard_normal(n), 1800, 6000) * np.exp(-t * 70)
    return s


def pop(seconds=0.35):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    freq = 280 + 900 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 16)
    return s * env(n, 0.001, 0.03)


# --- ambient pad bed (A minor add9, slow swell, fades with the picture) ---
t = np.arange(N) / SR
pad = np.zeros(N)
for f, g in [(110, 0.5), (164.81, 0.35), (220, 0.3), (261.63, 0.22), (329.63, 0.16), (493.88, 0.08)]:
    detune = 1 + 0.003 * np.sin(2 * np.pi * 0.13 * t + f)
    pad += g * (np.sin(2 * np.pi * f * detune * t) + 0.5 * np.sin(2 * np.pi * f * 1.004 * t))
pad = one_pole_lp(pad, 1800)
pad_env = np.clip(t / 1.2, 0, 1) * np.clip((DURATION - 0.1 - t) / 0.9, 0, 1)
pad *= pad_env * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t))
left += pad * 0.05
right += pad * 0.05

# --- riser into the first logo ---
riser_n = at(22)
rt = np.linspace(0, 1, riser_n)
riser = one_pole_lp(rng.standard_normal(riser_n), 300 + 5000 * rt**2) * rt**2.5
place(riser, 0, gain=0.22)

# --- light sweep whoosh, panned left -> right ---
w = whoosh(1.4, 250, 4200, peak=0.5)
pan = np.linspace(-0.9, 0.9, len(w))
place((w * np.sqrt((1 - pan) / 2), w * np.sqrt((1 + pan) / 2)), 4, gain=0.32)

# --- Luluat Al Bakhet logo: main cinematic hit ---
place(reverb(impact(), seconds=2.6, wet=0.5), 22, gain=0.95)
place(reverb(whoosh(0.7, 400, 3000, peak=0.8), wet=0.4), 10, gain=0.45, pan=0.4)

# --- Changan logo: lighter whoosh + hit from the left ---
place(reverb(whoosh(0.75, 350, 3500, peak=0.75), wet=0.4), 30, gain=0.45)
place(reverb(impact(1.4, 120, 55), wet=0.4), 42, gain=0.42)

# --- divider and shine sweeps ---
place(reverb(whoosh(0.9, 1500, 9000, peak=0.5), wet=0.5), 50, gain=0.12)
place(reverb(shimmer(1.5, 18, 2400)[0], wet=0.6), 86, gain=0.12, pan=0.4)
place(reverb(shimmer(1.5, 14, 2000)[1], wet=0.6), 96, gain=0.12, pan=-0.4)

# --- underline + words (soft ticks, right to left) ---
place(reverb(whoosh(0.8, 800, 6000, peak=0.6), wet=0.4), 96, gain=0.2)
for i in range(4):
    place(reverb(tick(), seconds=0.8, wet=0.4), 104 + i * 6, gain=0.35, pan=0.5 - i * 0.33)

# --- number digits: rising plucks, then badge pop ---
notes = [659.25, 783.99, 880.0, 1046.5]
for i, f in enumerate(notes):
    place(reverb(pluck(f), seconds=1.5, wet=0.5), 122 + i * 5, gain=0.2, pan=-0.3 + i * 0.2)
place(reverb(pop(), wet=0.4), 128, gain=0.45, pan=-0.3)
place(reverb(impact(1.2, 140, 60), wet=0.5), 138, gain=0.3)

# --- closing sparkle tail ---
for i, f in enumerate([1318.5, 1760.0, 2093.0]):
    place(reverb(bell(f, 2.5, 2.2), seconds=2.5, wet=0.7), 150 + i * 4, gain=0.08, pan=(i - 1) * 0.6)

# --- master: gentle fade-out matching the picture, soft clip, normalise ---
fade = np.clip((DURATION - t) / 0.55, 0, 1)
mix = np.stack([left * fade, right * fade], axis=1)
mix = np.tanh(mix * 1.2)
mix *= 0.84 / np.max(np.abs(mix))

with wave.open(sys.argv[1], "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", sys.argv[1])
