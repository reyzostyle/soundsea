"use client";

import { useEffect, useRef } from "react";

// The swell along the bottom of the app: three thin lines in the text color with a
// faint wash under the front one. While a track plays the sea moves and rises a
// little; on pause it settles and holds still. It follows play state only, not the
// audio itself: analysing the sound means routing it through Web Audio, and on iOS
// that can stop playback once the screen locks, which is how this app gets used.

const LINES = [
  // amplitude (px), wavelength (px), speed, vertical offset (share of height), alpha
  { amp: 14, len: 520, speed: 0.35, y: 0.42, alpha: 0.1 },
  { amp: 10, len: 360, speed: -0.5, y: 0.55, alpha: 0.14 },
  { amp: 18, len: 680, speed: 0.6, y: 0.68, alpha: 0.2 },
];

export default function SeaWave({ playing, className }: { playing: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let rgb = "255,255,255";

    const readColor = () => {
      // --c-ink is a hex color; canvas needs the channels to vary alpha per line
      const hex = getComputedStyle(document.documentElement).getPropertyValue("--c-ink").trim();
      const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
      if (m) rgb = `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}`;
    };
    readColor();
    const themeObserver = new MutationObserver(readColor);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    let phase = 0;
    let energy = playingRef.current ? 1 : 0;
    let last = performance.now();
    let frame = 0;

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // ease toward the target so play/pause swells and settles instead of snapping
      const target = playingRef.current && !reduceMotion ? 1 : 0;
      energy += (target - energy) * Math.min(1, dt * 1.6);
      phase += dt * energy;

      ctx.clearRect(0, 0, width, height);
      LINES.forEach((line, i) => {
        const amp = line.amp * (0.55 + 0.45 * energy);
        const baseY = height * line.y - energy * 6;
        const shift = phase * line.speed * 120;
        ctx.beginPath();
        for (let x = 0; x <= width + 8; x += 8) {
          const t = ((x + shift) / line.len) * Math.PI * 2;
          // two sines at different lengths so the crest isn't a perfect repeat
          const y = baseY + Math.sin(t) * amp + Math.sin(t * 0.37 + i) * amp * 0.5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${rgb},${line.alpha})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();

        if (i === LINES.length - 1) {
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          const wash = ctx.createLinearGradient(0, baseY - amp, 0, height);
          wash.addColorStop(0, `rgba(${rgb},0.06)`);
          wash.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = wash;
          ctx.fill();
        }
      });

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
