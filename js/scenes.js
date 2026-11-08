// Hi-res "close-up" scenes (like the trainer-battle screens): cafe table, selfies, shows.
import { canvas, crisp, outline, shade, ell, poly, px, rrect, mulberry, rgba } from './util.js';
import { portrait, PW, PH } from './chars.js';
import { drawText } from './font.js';
import { carSprite } from './art.js';

export const SW = 320, SH = 200;

/* ------------------------------- food ------------------------------- */
const plate = (g, x, y, rx, ry, col = '#f8f8f4') => { ell(g, x, y + 1, rx + 1, ry + 1, '#b8b4ac'); ell(g, x, y, rx, ry, col); ell(g, x, y, rx - 3, ry - 2, shade(col, -0.04)); };
const bowl = (g, x, y, r, col = '#f4f4f0') => { ell(g, x, y + 3, r, r * 0.55, shade(col, -0.2)); poly(g, [x - r, y, x + r, y, x + r * 0.7, y + r * 0.6, x - r * 0.7, y + r * 0.6], col); ell(g, x, y, r, r * 0.35, shade(col, -0.1)); };
const glass = (g, x, y, h, liquid, top) => { px(g, x - 5, y - h, 10, h, 'rgba(220,240,255,0.55)'); px(g, x - 4, y - h * 0.8, 8, h * 0.8, liquid); if (top) ell(g, x, y - h * 0.8, 4, 1.5, top); px(g, x - 4, y - h, 1, h, '#ffffff'); px(g, x - 5, y, 10, 1, '#b8c8d8'); };
const cup = (g, x, y, liquid, col = '#ffffff') => { ell(g, x, y + 2, 9, 3, '#e8e4dc'); poly(g, [x - 6, y - 8, x + 6, y - 8, x + 5, y, x - 5, y], col); ell(g, x, y - 8, 6, 2, liquid); px(g, x + 6, y - 6, 3, 4, col); };

export function drawFood(g, kind, x, y, bites = 0) {
  g.save();
  switch (kind) {
    case 'breakfast': plate(g, x, y, 18, 9); ell(g, x - 6, y - 1, 6, 4, '#ffffff'); ell(g, x - 6, y - 1, 2.5, 2, '#f2b830'); for (let k = 0; k < 2; k++) rrect(g, x + 1 + k * 6, y - 5, 4, 9, 2, '#9a4a2a'); px(g, x - 2, y + 3, 12, 3, '#d8a050'); ell(g, x + 12, y + 2, 3, 2, '#d42a2a'); ell(g, x - 13, y + 3, 3, 2, '#3a8a3a'); break;
    case 'rumball': plate(g, x, y, 12, 6); for (let k = -1; k <= 1; k += 2) { ell(g, x + k * 5, y - 3, 5, 5, '#5a2a14'); for (let d = 0; d < 6; d++) px(g, x + k * 5 - 3 + d, y - 6 + (d % 3) * 2, 1, 1, '#f2d0a0'); } break;
    case 'pastry': case 'brownie': plate(g, x, y, 13, 6); poly(g, [x - 9, y + 1, x + 9, y + 1, x + 9, y - 9, x - 9, y - 4], kind === 'brownie' ? '#4a2614' : '#3a1a0c'); px(g, x - 9, y - 4, 18, 2, '#7a3a1a'); px(g, x - 9, y - 1, 18, 1, '#f2d0a0'); ell(g, x + 4, y - 10, 2.5, 2.5, kind === 'brownie' ? '#f4f0e0' : '#c0182a'); break;
    case 'tart': plate(g, x, y, 12, 6); ell(g, x, y - 2, 9, 4, '#d8a050'); ell(g, x, y - 3, 7, 3, '#f2e05a'); ell(g, x - 2, y - 4, 2, 1, '#fff6a0'); break;
    case 'sandwich': case 'croissant': plate(g, x, y, 15, 7); if (kind === 'croissant') { for (let k = -2; k <= 2; k++) ell(g, x + k * 4, y - 3 - (2 - Math.abs(k)), 4, 4, k % 2 ? '#d89040' : '#e8a850'); } else { poly(g, [x - 12, y + 1, x + 2, y - 8, x + 2, y + 1], '#f2d8a0'); px(g, x - 9, y - 1, 10, 2, '#5ab84a'); px(g, x - 8, y - 3, 9, 2, '#e88a7a'); poly(g, [x + 3, y + 1, x + 13, y - 6, x + 13, y + 1], '#f2d8a0'); } break;
    case 'omelette': plate(g, x, y, 15, 7); ell(g, x, y - 1, 11, 5, '#f2d050'); for (let k = 0; k < 5; k++) px(g, x - 7 + k * 3, y - 2 + (k % 2), 2, 1, '#3a8a3a'); break;
    case 'tea': cup(g, x - 8, y, '#b8642a'); poly(g, [x + 4, y, x + 18, y, x + 16, y - 12, x + 6, y - 12], '#ffffff'); ell(g, x + 11, y - 12, 5, 2, '#e8e4dc'); px(g, x + 17, y - 9, 5, 2, '#ffffff'); break;
    case 'coffee': cup(g, x, y, '#6b3a1a'); ell(g, x, y - 8, 3, 1, '#d8b890'); break;
    case 'chai': poly(g, [x - 5, y - 10, x + 5, y - 10, x + 3, y, x - 3, y], '#b8582a'); ell(g, x, y - 10, 5, 1.6, '#c8844a'); px(g, x - 4, y - 8, 1, 6, '#d8784a'); break;
    case 'shake': case 'icedtea': case 'lime': case 'mocktail': glass(g, x, y, 22, { shake: '#c89a6a', icedtea: '#b8642a', lime: '#d8f0a0', mocktail: '#3ab8e8' }[kind], kind === 'shake' ? '#fff8e8' : null); if (kind === 'lime' || kind === 'mocktail') ell(g, x + 4, y - 20, 3, 3, '#7ac83a'); px(g, x + 1, y - 26, 1, 10, '#e05a5a'); break;
    case 'chelo': plate(g, x, y, 19, 9); ell(g, x - 5, y - 1, 9, 5, '#f8f4e8'); for (let k = 0; k < 12; k++) px(g, x - 12 + k * 1.5, y - 3 + (k % 3), 1, 1, '#f2e2b8'); rrect(g, x + 2, y - 4, 14, 4, 2, '#8a4a22'); ell(g, x - 3, y - 6, 2.5, 2, '#f2c830'); px(g, x + 4, y - 3, 10, 1, '#a85a2a'); ell(g, x + 10, y + 4, 3, 1.5, '#5ab84a'); break;
    case 'sizzler': ell(g, x, y + 2, 20, 9, '#2a2a30'); ell(g, x, y, 18, 8, '#4a3a2a'); rrect(g, x - 12, y - 4, 12, 7, 3, '#8a4a22'); for (let k = 0; k < 5; k++) ell(g, x + 4 + k * 3, y - 1 + (k % 2) * 3, 2, 2, ['#f2a030', '#3a8a3a', '#d42a2a'][k % 3]); for (let k = 0; k < 3; k++) px(g, x - 8 + k * 6, y - 14 - k, 1, 6, 'rgba(255,255,255,0.7)'); break;
    case 'kebab': case 'kiev': plate(g, x, y, 17, 8); if (kind === 'kiev') { ell(g, x, y - 2, 9, 5, '#c8802a'); ell(g, x - 2, y - 4, 4, 2, '#e8a850'); } else for (let k = 0; k < 4; k++) rrect(g, x - 12 + k * 6, y - 4, 5, 6, 2, '#c8502a'); ell(g, x + 10, y + 3, 4, 2, '#e8e0d0'); ell(g, x - 12, y + 3, 3, 1.5, '#5ab84a'); break;
    case 'cocktailprawn': glass(g, x, y, 14, '#f2c8a0'); for (let k = 0; k < 4; k++) ell(g, x - 4 + k * 3, y - 13, 2.5, 2, '#f28a5a'); ell(g, x + 6, y - 14, 2, 2, '#f2e05a'); break;
    case 'custard': case 'firni': plate(g, x, y, 11, 5); if (kind === 'custard') { poly(g, [x - 7, y, x + 7, y, x + 5, y - 9, x - 5, y - 9], '#f2d070'); ell(g, x, y - 9, 5, 2, '#8a4a1a'); } else { bowl(g, x, y - 5, 8, '#c8784a'); ell(g, x, y - 5, 7, 2.5, '#f8f0d8'); px(g, x - 2, y - 6, 2, 1, '#5ab84a'); } break;
    case 'crab': plate(g, x, y, 15, 7); ell(g, x, y - 2, 9, 5, '#c8602a'); for (let k = -1; k <= 1; k += 2) { px(g, x + k * 9, y - 4, k * 5, 2, '#c8602a'); ell(g, x + k * 14, y - 5, 2.5, 2, '#d8702a'); } break;
    case 'fishplate': case 'stroganoff': plate(g, x, y, 17, 8); if (kind === 'fishplate') { ell(g, x - 2, y - 2, 11, 4, '#f2e8c8'); poly(g, [x + 9, y - 2, x + 15, y - 6, x + 15, y + 2], '#e8d8a8'); ell(g, x, y - 3, 7, 2, '#f8f0d8'); } else { ell(g, x - 4, y - 1, 8, 4, '#f8f4e8'); ell(g, x + 5, y - 2, 8, 4, '#c8885a'); for (let k = 0; k < 4; k++) ell(g, x + 2 + k * 2, y - 3, 1.5, 1, '#8a4a22'); } break;
    case 'lobster': plate(g, x, y, 19, 8); ell(g, x, y - 2, 13, 4, '#d8402a'); ell(g, x, y - 3, 10, 2, '#f2d8a0'); for (let k = -1; k <= 1; k += 2) ell(g, x + k * 15, y - 4, 3, 2, '#d8402a'); break;
    case 'alaska': plate(g, x, y, 13, 6); ell(g, x, y - 4, 9, 7, '#f2e2c8'); for (let k = 0; k < 5; k++) ell(g, x - 6 + k * 3, y - 8 + (k % 2), 2, 2, '#d8b888'); break;
    case 'soup': bowl(g, x, y - 4, 13); ell(g, x, y - 4, 11, 3.5, '#d84a2a'); ell(g, x - 2, y - 5, 3, 1, '#f8e8d8'); break;
    case 'chilli': case 'curry': case 'rezala': bowl(g, x, y - 4, 13); ell(g, x, y - 4, 11, 3.5, { chilli: '#c8502a', curry: '#a8502a', rezala: '#f2e2c0' }[kind]); for (let k = 0; k < 4; k++) ell(g, x - 6 + k * 4, y - 5, 2, 1.3, kind === 'chilli' ? '#3a8a3a' : '#8a3a1a'); break;
    case 'friedrice': case 'noodles': case 'biryani': plate(g, x, y, 18, 8); ell(g, x, y - 2, 13, 6, kind === 'noodles' ? '#e8c070' : kind === 'biryani' ? '#f2d890' : '#f2e8c8');
      if (kind === 'noodles') for (let k = 0; k < 6; k++) px(g, x - 10 + k * 3, y - 6 + (k % 2), 4, 1, '#c89848');
      else for (let k = 0; k < 18; k++) px(g, x - 11 + ((k * 7) % 22), y - 6 + ((k * 3) % 8), 2, 1, kind === 'biryani' ? (k % 3 ? '#f8f0d0' : '#e8902a') : (k % 4 ? '#f8f4e8' : '#7ac83a'));
      if (kind === 'biryani') { ell(g, x + 5, y - 4, 4, 3, '#d8b070'); ell(g, x - 5, y - 4, 4, 3, '#8a4a2a'); ell(g, x, y - 1, 3, 2.5, '#ffffff'); } break; // with the famous potato & egg
    case 'roti': plate(g, x, y, 15, 7); ell(g, x, y - 2, 12, 5, '#f2dcae'); for (let k = 0; k < 6; k++) ell(g, x - 8 + k * 3, y - 2 + (k % 2) * 2, 1.5, 1, '#c8a060'); break;
    case 'roll': px(g, x - 14, y - 2, 28, 4, '#e8e0d0'); rrect(g, x - 13, y - 8, 22, 9, 4, '#e8b060'); ell(g, x + 9, y - 4, 4, 4.5, '#f2d8a0'); ell(g, x + 9, y - 4, 2.5, 3, '#c8502a'); px(g, x + 8, y - 6, 2, 2, '#5ab84a'); poly(g, [x - 13, y - 9, x - 4, y - 9, x - 4, y + 1, x - 13, y + 1], '#f4f0e0'); break;
    case 'rosogolla': case 'bakedroso': bowl(g, x, y - 3, 12, '#c8784a'); for (let k = -1; k <= 1; k += 2) { ell(g, x + k * 4, y - 5, 4.5, 4, kind === 'bakedroso' ? '#c8783a' : '#fbf8f0'); px(g, x + k * 4 - 2, y - 7, 2, 1, '#ffffff'); } if (kind === 'rosogolla') ell(g, x, y - 2, 9, 2, 'rgba(255,255,230,0.6)'); break;
    case 'sandesh': plate(g, x, y, 13, 6); for (let k = -1; k <= 1; k++) { ell(g, x + k * 7, y - 3, 4, 3, '#f2e2b8'); ell(g, x + k * 7, y - 4, 2.5, 1.5, '#d8a060'); } break;
    case 'doi': poly(g, [x - 10, y - 10, x + 10, y - 10, x + 7, y + 1, x - 7, y + 1], '#b8582a'); ell(g, x, y - 10, 10, 3, '#e8b878'); ell(g, x - 2, y - 11, 4, 1, '#f2d0a0'); break;
    case 'phuchka': plate(g, x, y, 18, 8); for (let k = 0; k < 6; k++) { const px_ = x - 12 + (k % 3) * 9, py = y - 4 + Math.floor(k / 3) * 5; ell(g, px_, py, 4, 3.5, '#d8a050'); ell(g, px_, py - 1, 1.5, 1, '#5a3a1a'); } cup(g, x + 22, y, '#5a8a3a', '#d8d0c0'); break;
    case 'jhalmuri': poly(g, [x - 8, y - 14, x + 8, y - 14, x, y + 2], '#f2ead8'); for (let k = 0; k < 12; k++) px(g, x - 6 + (k * 5) % 12, y - 14 + (k % 3), 2, 2, ['#f2e2b8', '#c8502a', '#3a8a3a', '#e8c070'][k % 4]); break;
    case 'momo': plate(g, x, y, 17, 7); for (let k = 0; k < 5; k++) { const mx = x - 10 + k * 5, my = y - 3 - (k % 2) * 2; ell(g, mx, my, 4, 3.5, '#f8f4ec'); px(g, mx - 1, my - 3, 2, 2, '#e8e0d0'); } ell(g, x + 14, y - 1, 3, 2, '#d8402a'); break;
    case 'pizza': plate(g, x, y, 16, 7); poly(g, [x - 12, y + 2, x + 12, y - 6, x + 12, y + 2], '#f2c050'); px(g, x - 12, y + 2, 24, 2, '#c8802a'); for (let k = 0; k < 4; k++) ell(g, x - 4 + k * 4, y - 1 - k, 1.6, 1.6, '#c8302a'); break;
    case 'burger': plate(g, x, y, 17, 7); ell(g, x - 3, y - 7, 8, 5, '#d8902a'); px(g, x - 11, y - 5, 16, 2, '#5ab84a'); px(g, x - 11, y - 3, 16, 3, '#6a3a1a'); ell(g, x - 3, y - 1, 8, 2, '#d8902a'); for (let k = 0; k < 5; k++) px(g, x + 7 + k * 2, y - 6 + (k % 2), 1, 6, '#f2c030'); break;
    case 'icecream': poly(g, [x - 4, y - 6, x + 4, y - 6, x, y + 4], '#d8a050'); ell(g, x, y - 8, 5, 4, '#f8e8b8'); ell(g, x, y - 12, 4, 3, '#f2a0b8'); break;
    default: plate(g, x, y, 14, 6); ell(g, x, y - 2, 8, 4, '#c8802a');
  }
  if (bites > 0) { g.globalCompositeOperation = 'destination-out'; for (let b = 0; b < bites; b++) ell(g, x + 12 - b * 9, y - 6 + (b % 2) * 3, 7, 6, '#000'); }
  g.restore();
}

/* ---------------------------- backgrounds ---------------------------- */
function sky(g, night, top = '#6ec0f0', bot = '#c8ecff') {
  const t = night ? ['#141a3a', '#2a2a5a', '#4a3a6a'] : [top, shade(top, 0.25), bot];
  for (let i = 0; i < 3; i++) px(g, 0, i * 40, SW, 40, t[i]);
  for (let y = 38; y < 120; y += 40) for (let x = 0; x < SW; x += 2) px(g, x + ((y / 40) % 2), y, 1, 2, t[Math.min(2, Math.floor(y / 40) + 1)]);
  const r = mulberry(5);
  if (night) { for (let k = 0; k < 60; k++) px(g, r() * SW, r() * 90, 1, 1, '#ffffff'); ell(g, 270, 30, 10, 10, '#f8f4d8'); ell(g, 266, 27, 9, 9, t[0]); }
  else for (let k = 0; k < 4; k++) { const cx = 30 + k * 80 + r() * 20, cy = 20 + r() * 30; ell(g, cx, cy, 20, 7, '#ffffff'); ell(g, cx + 10, cy - 5, 12, 7, '#ffffff'); ell(g, cx - 10, cy - 2, 10, 5, '#f2f8ff'); }
}
function skyline(g, y, night) {
  const r = mulberry(11);
  for (let x = 0; x < SW;) { const w = 14 + r() * 26, h = 20 + r() * 50; px(g, x, y - h, w, h, night ? '#2a2a44' : '#9aa8c0'); for (let wy = y - h + 4; wy < y - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() < 0.5) px(g, wx, wy, 2, 3, night ? '#ffe08a' : '#c8d8f0'); if (r() < 0.4) { px(g, x + 3, y - h - 5, 6, 5, '#26252a'); } x += w + 1; }
}
export function background(g, place, night) {
  switch (place) {
    case 'victoria':
      sky(g, night); px(g, 0, 130, SW, 70, night ? '#2a5a2a' : '#6ccc4e');
      { const cx = 160, b = 135; const M = night ? '#c8c8d8' : '#f6f3ec';
        px(g, 60, b - 40, 200, 40, M); for (let x = 66; x < 254; x += 12) px(g, x, b - 34, 5, 28, night ? '#8a8aa0' : '#d8d2c4');
        ell(g, cx, b - 60, 34, 28, M); px(g, cx - 34, b - 60, 68, 22, M); ell(g, cx - 8, b - 68, 12, 14, '#ffffff'); px(g, cx - 1, b - 100, 2, 14, '#5a4a2a'); poly(g, [cx - 6, b - 100, cx, b - 108, cx + 6, b - 100], '#4a3a22');
        for (const sx of [72, 236]) { px(g, sx, b - 64, 14, 26, M); ell(g, sx + 7, b - 66, 9, 9, M); }
        px(g, 0, b, SW, 10, night ? '#2a4a6a' : '#5aa8e0'); px(g, 0, b + 1, SW, 1, '#ffffff'); }
      break;
    case 'parkstreet':
      sky(g, true); skyline(g, 120, true);
      px(g, 0, 120, SW, 80, '#3a3a44'); px(g, 0, 150, SW, 4, '#e8c440');
      for (let k = 0; k < 6; k++) { const x = k * 56; px(g, x, 60, 50, 60, ['#8a2a30', '#2a2e48', '#5a4030', '#f4d6dc'][k % 4]); rrect(g, x + 6, 66, 38, 10, 2, ['#e3b341', '#e05a8a', '#d9a441', '#b5566a'][k % 4]); drawText(g, ['MOCAMBO', 'TRINCAS', 'PETER CAT', 'FLURYS', 'PARK ST', 'KUSUM'][k], x + 9, 69, '#1d1b20'); for (let w = 0; w < 3; w++) px(g, x + 6 + w * 14, 84, 10, 14, '#ffe08a'); }
      for (let x = 0; x < SW; x += 6) { ell(g, x, 54 + Math.sin(x / 20) * 4, 1.5, 1.5, ['#ffe08a', '#ff8ab0', '#8ad8ff'][(x / 6) % 3 | 0]); }
      { const car = carSprite('sports_red'); g.save(); g.scale(3, 3); g.drawImage(car, 70, 46); g.restore(); }
      break;
    case 'maidan':
      sky(g, night); px(g, 0, 120, SW, 80, night ? '#2a5a2a' : '#7ccf5a');
      px(g, 250, 30, 10, 92, '#f0e2c4'); px(g, 246, 26, 18, 6, '#e8d8b8'); ell(g, 255, 22, 5, 5, '#f0e2c4');
      for (let k = 0; k < 8; k++) { const x = k * 42 + 10; ell(g, x, 112, 16, 12, '#3f8f34'); ell(g, x - 5, 106, 8, 7, '#56ad44'); }
      for (let k = 0; k < 20; k++) px(g, (k * 37) % SW, 130 + (k * 13) % 60, 2, 3, '#4a9a3a');
      break;
    case 'lake':
      sky(g, night); for (let k = 0; k < 10; k++) { ell(g, k * 34, 108, 18, 14, '#2f7a34'); ell(g, k * 34 + 8, 102, 10, 8, '#449a4a'); }
      px(g, 0, 115, SW, 85, night ? '#1a3a5a' : '#4a9fd8'); for (let k = 0; k < 30; k++) px(g, (k * 53) % SW, 120 + (k * 17) % 70, 8, 1, '#8fd0f4');
      poly(g, [200, 150, 250, 150, 244, 158, 206, 158], '#c0283a'); px(g, 224, 136, 2, 15, '#6a4a2a');
      break;
    case 'zoo':
      sky(g, night); px(g, 0, 130, SW, 70, '#c9a46a'); for (let k = 0; k < 6; k++) ell(g, k * 60, 118, 26, 18, '#3f8f34');
      px(g, 230, 70, 6, 62, '#e8b04a'); ell(g, 230, 70, 7, 5, '#e8b04a'); ell(g, 246, 120, 18, 10, '#e8b04a'); for (let k = 0; k < 6; k++) px(g, 236 + k * 4, 116 + (k % 2) * 4, 3, 3, '#8a5a2a');
      for (let x = 0; x < SW; x += 8) px(g, x, 140, 2, 20, '#5a5a62'); px(g, 0, 140, SW, 2, '#5a5a62');
      break;
    case 'mall':
      px(g, 0, 0, SW, 200, '#f2f0f6'); for (let k = 0; k < 5; k++) { const x = k * 66; px(g, x + 4, 30, 58, 80, ['#2a3a5a', '#c0306a', '#b8862c', '#1d1b20', '#1f7a3a'][k]); px(g, x + 8, 50, 50, 56, '#cfe8f4'); for (let r = 0; r < 4; r++) px(g, x + 12 + r * 12, 60, 8, 30, ['#c0283a', '#2a6ac0', '#e3b341', '#f2f2f2'][r]); }
      px(g, 0, 120, SW, 80, '#e8e4ee'); for (let x = 0; x < SW; x += 40) px(g, x, 120, 1, 80, '#d8d4de'); for (let k = 0; k < 8; k++) ell(g, 20 + k * 40, 12, 6, 3, '#fff6c0');
      break;
    case 'home':
      px(g, 0, 0, SW, 130, '#f2e2c8'); px(g, 0, 124, SW, 6, '#c48a52'); px(g, 0, 130, SW, 70, '#c48a52'); for (let y = 136; y < 200; y += 8) px(g, 0, y, SW, 1, '#a8703f');
      px(g, 30, 20, 70, 60, '#f2f2f2'); px(g, 34, 24, 62, 52, night ? '#2a3a6a' : '#a8d8f4'); px(g, 64, 24, 2, 52, '#f2f2f2'); px(g, 200, 30, 60, 40, '#c9a24a'); px(g, 204, 34, 52, 32, '#5a8ac4');
      break;
    case 'cafe': default: {
      const th = place && place.theme ? place.theme : ['#efe4d2', '#6b4226', '#2a1a12'];
      px(g, 0, 0, SW, 152, th[0]); px(g, 0, 60, SW, 4, th[1]); for (let x = 0; x < SW; x += 16) px(g, x, 64, 1, 88, shade(th[0], -0.08));
      // window onto the city
      px(g, 196, 10, 98, 58, '#f2f2f2');
      g.save(); g.beginPath(); g.rect(200, 14, 90, 50); g.clip(); sky(g, night); skyline(g, 64, night); g.restore();
      px(g, 244, 14, 2, 50, '#f2f2f2'); px(g, 200, 38, 90, 2, '#f2f2f2');
      px(g, 20, 14, 60, 38, th[2]); px(g, 24, 18, 52, 30, '#1f2a24'); for (let k = 0; k < 5; k++) px(g, 28, 22 + k * 5, 20 + (k * 7) % 20, 2, '#f2f2f2');
      for (let k = 0; k < 3; k++) { px(g, 100 + k * 36, 0, 1, 18, '#3a3a3a'); ell(g, 100 + k * 36, 22, 8, 5, th[1]); ell(g, 100 + k * 36, 26, 4, 2, '#fff6c0'); }
      px(g, 0, 146, SW, 6, shade(th[0], -0.25));
      break;
    }
  }
}

/* ------------------------------ composers ------------------------------ */
// Cafe table close-up: both diners behind a table with the ordered food.
export function cafeScene(out, opt) {
  const g = out.getContext('2d'); g.imageSmoothingEnabled = false;
  background(g, { theme: opt.theme }, opt.night);
  const diners = opt.diners || [];
  const pos = diners.length === 2 ? [90, 230] : [160];
  diners.forEach((app, i) => {
    const p = portrait(app); const sc = 1.45;
    g.drawImage(p, 0, 0, PW, 112, pos[i] - (PW / 2) * sc, 150 - 92 * sc, PW * sc, 112 * sc);
  });
  // table
  px(g, 0, 150, SW, 50, opt.table || '#f8f6f0'); px(g, 0, 150, SW, 3, '#ffffff'); px(g, 0, 196, SW, 4, shade(opt.table || '#f8f6f0', -0.15));
  if (opt.cloth) { px(g, 0, 150, SW, 50, opt.cloth); for (let x = 0; x < SW; x += 10) px(g, x, 150, 5, 50, shade(opt.cloth, -0.03)); }
  const foods = opt.foods || [];
  const fc = canvas(80, 60), fg = fc.getContext('2d');
  foods.slice(0, 6).forEach((f, i) => {
    fg.clearRect(0, 0, 80, 60); drawFood(fg, f.kind, 40, 40, f.bites || 0); crisp(fc); outline(fc, '#3a3440');
    const x = 30 + (i % 3) * 95 + (i > 2 ? 40 : 0), y = i > 2 ? 152 : 128;
    g.drawImage(fc, x, y, 120, 90);
  });
  if (!foods.length) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(70, 166, 180, 18); drawText(g, 'YOUR ORDER IS ON ITS WAY', 112, 172, '#ffffff'); }
  return out;
}

// Selfie: phone-camera framing with both characters and a location backdrop.
export function selfieScene(out, opt) {
  const g = out.getContext('2d'); g.imageSmoothingEnabled = false;
  background(g, opt.place, opt.night);
  const people = opt.people || [];
  const n = people.length;
  people.forEach((app, i) => {
    const p = portrait(app);
    const cx = n === 1 ? 160 : i === 0 ? 112 : 208;
    const lean = n === 2 ? (i === 0 ? 8 : -8) : 0;
    g.drawImage(p, 0, 0, PW, 110, cx - PW + lean, 28, PW * 2, 220);
  });
  // phone UI chrome
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, SW, 14); g.fillRect(0, SH - 18, SW, 18);
  drawText(g, (opt.label || 'KOLKATA').toUpperCase().slice(0, 40), 6, 4, '#ffffff');
  drawText(g, opt.stamp || '', SW - 6 - (opt.stamp || '').length * 4, 4, '#ffd94a');
  ell(g, 160, SH - 9, 6, 6, '#ffffff'); ell(g, 160, SH - 9, 4, 4, '#e8e8e8');
  return out;
}

// Little animated shows for cinema / planetarium / TV. Returns a draw(t) function.
export function showRenderer(kind) {
  const r = mulberry(kind.length * 7);
  const stars = Array.from({ length: 140 }, () => [r() * SW, r() * SH, r()]);
  return (g, t) => {
    g.imageSmoothingEnabled = false;
    if (kind === 'planetarium') {
      px(g, 0, 0, SW, SH, '#05061a');
      g.save(); g.translate(160, 220); g.rotate(t * 0.03);
      for (const [x, y, b] of stars) px(g, x - 160, y - 220, b > 0.8 ? 2 : 1, b > 0.8 ? 2 : 1, b > 0.5 ? '#ffffff' : '#9ab8ff');
      g.restore();
      // constellation lines (Orion-ish)
      g.strokeStyle = 'rgba(160,200,255,0.5)'; g.beginPath(); const pts = [[120, 60], [140, 80], [160, 90], [180, 80], [200, 60], [160, 90], [150, 130], [170, 130]]; pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      drawText(g, 'BIRLA PLANETARIUM - THE NIGHT SKY OVER KOLKATA', 16, 186, '#9ab8ff');
    } else if (kind === 'theatre') {
      px(g, 0, 0, SW, SH, '#1a0a14'); px(g, 0, 120, SW, 80, '#3a2a4a');
      ell(g, 160, 120, 90, 20, 'rgba(255,240,200,0.25)');
      for (let k = 0; k < 3; k++) { const x = 100 + k * 60 + Math.sin(t * 2 + k) * 14; ell(g, x, 80, 6, 7, '#e8bb98'); poly(g, [x - 10, 120, x + 10, 120, x + 5, 88, x - 5, 88], ['#c0182a', '#e3b341', '#2741a8'][k]); px(g, x - 14 + Math.sin(t * 3 + k) * 4, 92, 28, 3, '#e8bb98'); }
      px(g, 0, 0, 40, SH, '#7a1020'); px(g, SW - 40, 0, 40, SH, '#7a1020');
      drawText(g, 'CHITRANGADA - A TAGORE DANCE DRAMA', 70, 186, '#ffd94a');
    } else if (kind === 'tv') {
      px(g, 0, 0, SW, SH, '#1a4a2a'); px(g, 0, 90, SW, 110, '#3a8a3a'); for (let x = 0; x < SW; x += 40) px(g, x, 90, 20, 110, '#358035');
      const bx = 160 + Math.sin(t * 1.5) * 120, by = 140 + Math.abs(Math.sin(t * 3)) * -40; ell(g, bx, by, 5, 5, '#ffffff');
      for (let k = 0; k < 4; k++) { const x = 60 + k * 70 + Math.sin(t + k) * 20; px(g, x, 120, 8, 20, k < 2 ? '#1f7a3a' : '#d42a2a'); ell(g, x + 4, 116, 4, 4, '#c48a63'); }
      px(g, 0, 0, SW, 16, '#1d1b20'); drawText(g, 'LIVE: KOLKATA DERBY - MB 1 : 1 EB', 8, 5, '#ffffff');
    } else { // movie: a little Kolkata film
      const scene = Math.floor(t / 6) % 3;
      if (scene === 0) { sky(g, false, '#f2a05a', '#ffd8a0'); px(g, 0, 130, SW, 70, '#4a6a8a'); // Howrah-bridge-like silhouette at sunset
        g.fillStyle = '#2a2a3a'; px(g, 40, 60, 10, 80, '#2a2a3a'); px(g, 270, 60, 10, 80, '#2a2a3a'); g.strokeStyle = '#2a2a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(45, 60); g.quadraticCurveTo(160, 140, 275, 60); g.stroke(); px(g, 0, 120, SW, 6, '#2a2a3a');
        for (let k = 0; k < 5; k++) { const x = ((t * 30 + k * 70) % (SW + 40)) - 40; px(g, x, 112, 16, 8, '#f2c230'); } }
      else if (scene === 1) { background(g, 'parkstreet', true); }
      else { background(g, 'victoria', false); }
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(0, 0, SW, 18); g.fillRect(0, SH - 18, SW, 18);
      drawText(g, ['"CITY OF JOY" - A LOVE STORY IN KOLKATA', 'NIGHTS ON PARK STREET...', 'THE END'][scene], 20, SH - 12, '#ffffff');
    }
  };
}
export { rgba };
