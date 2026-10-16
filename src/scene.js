// Scenes: soft illustrated rooms the coach dances in. Used by the play stage and the scene picker.
// Calm by design: gentle sway and a beat pulse on the floor, nothing flashing.
import { hexA } from './figure.js';

export const DARK_SCENES = ['studio'];

// o: { t (s), pulse (0..1, beat), cx, floorY, s (coach scale), reduced }
export function drawScene(g, W, H, id, o = {}) {
  const t = o.reduced ? 0 : o.t || 0, pulse = o.pulse || 0, cx = o.cx ?? W / 2, fy = o.floorY ?? H * 0.78, s = o.s ?? H / 900;
  const lin = (y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([p, c]) => gr.addColorStop(p, c)); return gr; };
  const rect = (x, y, w, h, f) => { g.fillStyle = f; g.fillRect(x, y, w, h); };
  const leaf = (x, y, len, ang, col) => { g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.ellipse(0, -len / 2, len * 0.22, len / 2, 0, 0, 7); g.fillStyle = col; g.fill(); g.restore(); };
  const plant = (x, y, k) => { // pot + leaves
    const sway = Math.sin(t * 0.8 + x) * 0.05;
    for (let i = 0; i < 7; i++) leaf(x, y - 40 * k, (90 + (i % 3) * 30) * k, -1.1 + i * 0.36 + sway, i % 2 ? '#359FA0' : '#5DB8A8');
    g.beginPath(); g.moveTo(x - 34 * k, y - 46 * k); g.lineTo(x + 34 * k, y - 46 * k); g.lineTo(x + 26 * k, y); g.lineTo(x - 26 * k, y); g.closePath(); g.fillStyle = '#FF8C52'; g.fill();
    rect(x - 36 * k, y - 52 * k, 72 * k, 10 * k, '#E8692B');
  };
  if (id === 'porch') {
    rect(0, 0, W, fy, lin(0, fy, [[0, '#BDEBE7'], [1, '#FFF6DA']]));
    g.beginPath(); g.arc(W * 0.8, fy * 0.3, Math.min(W, H) * 0.08, 0, 7); g.fillStyle = 'rgba(255,211,107,0.9)'; g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); const x = ((i * 0.37 + t * 0.006) % 1.2 - 0.1) * W, y = fy * (0.18 + i * 0.12); g.ellipse(x, y, 70, 18, 0, 0, 7); g.ellipse(x + 40, y - 10, 46, 20, 0, 0, 7); g.fill(); }
    // string lights
    g.strokeStyle = 'rgba(80,60,40,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(W / 2, 110, W, 30); g.stroke();
    for (let i = 1; i < 16; i++) { const u = i / 16, x = u * W, y = 30 + 4 * 80 * u * (1 - u); g.beginPath(); g.arc(x, y + 8, 6, 0, 7); g.fillStyle = hexA('#FFD36B', 0.6 + 0.4 * Math.sin(t * 2 + i)); g.fill(); }
    rect(0, fy, W, H - fy, lin(fy, H, [[0, '#F0CFA0'], [1, '#E2B47D']]));
    g.strokeStyle = 'rgba(160,110,60,0.25)'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { const y = fy + (H - fy) * (i / 6) ** 1.4; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // railing
    rect(0, fy - 70 * s, W, 12 * s, '#FFFFFF'); rect(0, fy - 8 * s, W, 8 * s, '#F4E6CF');
    for (let x = 20; x < W; x += 46 * s) rect(x, fy - 64 * s, 10 * s, 60 * s, 'rgba(255,255,255,0.92)');
    plant(W * 0.1, fy + 6, s * 1.2); plant(W * 0.92, fy + 10, s);
  } else if (id === 'rooftop') {
    rect(0, 0, W, fy, lin(0, fy, [[0, '#9ED9D3'], [0.55, '#FFE2B8'], [1, '#FFB27A']]));
    g.beginPath(); g.arc(W * 0.25, fy * 0.72, Math.min(W, H) * 0.1, 0, 7); g.fillStyle = 'rgba(255,190,110,0.85)'; g.fill();
    const sky = (seed, base, col, hgt) => { g.fillStyle = col; let x = 0, i = 0; while (x < W) { const w = (40 + ((seed * (i + 3) * 37) % 70)) * s * 1.4, h = (hgt + ((seed * (i + 7) * 53) % 140)) * s; g.fillRect(x, base - h, w - 6, h); x += w; i++; } };
    sky(3, fy, 'rgba(120,170,172,0.55)', 120); sky(7, fy, 'rgba(70,128,132,0.75)', 60);
    g.fillStyle = 'rgba(255,240,197,0.75)'; for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = fy - 20 - ((i * 53) % 120) * s; if ((i + Math.floor(t * 0.3)) % 5) g.fillRect(x, y, 4, 6); }
    rect(0, fy, W, H - fy, lin(fy, H, [[0, '#EFE3CF'], [1, '#DCCBB0']]));
    rect(0, fy - 4, W, 8, '#FFFFFF');
    plant(W * 0.9, fy + 14, s);
  } else if (id === 'beach') {
    const sea = fy - 70 * s;
    rect(0, 0, W, sea, lin(0, sea, [[0, '#7FD0CA'], [1, '#EAFBF8']]));
    g.beginPath(); g.arc(W * 0.72, sea * 0.45, Math.min(W, H) * 0.09, 0, 7); g.fillStyle = 'rgba(255,211,107,0.95)'; g.fill();
    rect(0, sea, W, fy - sea + 10, lin(sea, fy, [[0, '#359FA0'], [1, '#6CC5BF']]));
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { g.beginPath(); for (let x = 0; x <= W; x += 20) { const y = sea + 14 + k * 18 + Math.sin(x * 0.03 + t * 1.2 + k) * 3; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    rect(0, fy, W, H - fy, lin(fy, H, [[0, '#FFE7BE'], [1, '#F6D29A']]));
    // palm
    const px = W * 0.1, py = fy + 20;
    g.strokeStyle = '#A9704A'; g.lineWidth = 16 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + 40 * s, py - 200 * s, px + 20 * s, py - 380 * s); g.stroke();
    const top = [px + 20 * s, py - 380 * s], sw = Math.sin(t * 0.7) * 0.06;
    for (let i = 0; i < 7; i++) { g.save(); g.translate(top[0], top[1]); g.rotate(-2.4 + i * 0.75 + sw); g.beginPath(); g.ellipse(80 * s, 0, 90 * s, 18 * s, 0.25, 0, 7); g.fillStyle = i % 2 ? '#359FA0' : '#4FAE9A'; g.fill(); g.restore(); }
  } else if (id === 'studio') {
    rect(0, 0, W, fy, lin(0, fy, [[0, '#183A43'], [1, '#2F4858']]));
    for (let i = 0; i < 5; i++) { const x = W * (0.12 + i * 0.19); g.fillStyle = hexA(i % 2 ? '#FF8C52' : '#8AD6D1', 0.5 + 0.3 * pulse); g.fillRect(x, 40, 6, fy * 0.6); g.fillStyle = hexA(i % 2 ? '#FF8C52' : '#8AD6D1', 0.12); g.fillRect(x - 20, 40, 46, fy * 0.6); }
    rect(0, fy, W, H - fy, lin(fy, H, [[0, '#244149'], [1, '#162D33']]));
    g.strokeStyle = 'rgba(138,214,209,0.18)'; g.lineWidth = 1.5; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(cx + i * 20 * s, fy); g.lineTo(cx + i * 220 * s, H + 20); g.stroke(); }
  } else { // room
    rect(0, 0, W, fy, lin(0, fy, [[0, '#FFF7E6'], [1, '#FFE8C4']]));
    // window with sky
    const wx = W * 0.07, wy = fy * 0.14, ww = Math.min(W * 0.2, 260), wh = fy * 0.52;
    rect(wx - 10, wy - 10, ww + 20, wh + 20, '#FFFFFF');
    rect(wx, wy, ww, wh, lin(wy, wy + wh, [[0, '#9EDBD5'], [1, '#FFF0C5']]));
    g.beginPath(); g.arc(wx + ww * 0.7, wy + wh * 0.3, ww * 0.12, 0, 7); g.fillStyle = 'rgba(255,190,110,0.85)'; g.fill();
    rect(wx + ww / 2 - 4, wy, 8, wh, '#FFFFFF'); rect(wx, wy + wh / 2 - 4, ww, 8, '#FFFFFF');
    g.fillStyle = 'rgba(255,140,82,0.22)'; g.fillRect(wx - 30, wy - 18, 34, wh + 40); g.fillRect(wx + ww - 4, wy - 18, 34, wh + 40);
    // wall art
    const ax = W * 0.78, ay = fy * 0.18, aw = Math.min(W * 0.12, 150), ah = aw * 1.25;
    rect(ax - 8, ay - 8, aw + 16, ah + 16, '#FFFFFF'); rect(ax, ay, aw, ah, '#FFF0C5');
    g.beginPath(); g.arc(ax + aw * 0.5, ay + ah * 0.42, aw * 0.26, 0, 7); g.fillStyle = '#FF8C52'; g.fill();
    g.beginPath(); g.arc(ax + aw * 0.5, ay + ah * 0.95, aw * 0.5, Math.PI, 0); g.fillStyle = '#8AD6D1'; g.fill();
    rect(0, fy, W, H - fy, lin(fy, H, [[0, '#F3D3A7'], [1, '#E9BE88']]));
    g.strokeStyle = 'rgba(160,110,60,0.18)'; g.lineWidth = 2; for (let i = 1; i < 7; i++) { const y = fy + (H - fy) * (i / 7) ** 1.3; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    rect(0, fy - 6, W, 10, '#FFFFFF');
    plant(W * 0.9, fy + 16, s * 1.1);
  }
  // rug / spotlight pool under the coach, pulsing gently on the beat
  const dark = DARK_SCENES.includes(id);
  g.beginPath(); g.ellipse(cx, fy + 40 * s, 300 * s, 54 * s, 0, 0, 7); g.fillStyle = dark ? hexA('#8AD6D1', 0.18 + 0.12 * pulse) : hexA('#8AD6D1', 0.42); g.fill();
  g.beginPath(); g.ellipse(cx, fy + 40 * s, 220 * s, 38 * s, 0, 0, 7); g.strokeStyle = hexA('#FFFFFF', 0.6); g.lineWidth = 3; g.stroke();
  g.beginPath(); g.ellipse(cx, fy + 40 * s, (300 + pulse * 40) * s, (54 + pulse * 8) * s, 0, 0, 7); g.strokeStyle = hexA('#FF8C52', 0.35 * pulse); g.lineWidth = 4; g.stroke();
}
