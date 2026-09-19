import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "backend", "app", "assets", "sample.wav");
const sampleRate = 22050;
const durationSeconds = 20;
const samples = sampleRate * durationSeconds;
const dataBytes = samples * 2;
const buffer = Buffer.alloc(44 + dataBytes);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataBytes, 40);

const notes = [110, 146.83, 164.81, 220, 123.47, 164.81, 185, 246.94];
for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const beat = Math.floor(t * 2) % notes.length;
  const f = notes[beat];
  const beatPhase = (t * 2) % 1;
  const pad = Math.sin(2 * Math.PI * f * t) * 0.32
    + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.13
    + Math.sin(2 * Math.PI * f * 2 * t) * 0.07;
  const kickPhase = t % 0.5;
  const kick = Math.sin(2 * Math.PI * (58 - kickPhase * 34) * kickPhase) * Math.exp(-kickPhase * 14) * 0.52;
  const shimmer = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-beatPhase * 8) * 0.04;
  const fade = Math.min(1, t / 0.7, (durationSeconds - t) / 1.2);
  const value = Math.max(-1, Math.min(1, (pad + kick + shimmer) * fade * 0.72));
  buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, buffer);
console.log(`Created ${output}`);

