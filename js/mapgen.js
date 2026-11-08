// Builds the central-Kolkata world map: terrain, roads (left-hand traffic graph), buildings, props, zones.
import { T, mulberry } from './util.js';
import { TL, ROADS, buildingSprite, prop } from './art.js';

export const MW = 240, MH = 212;

export function buildWorld() {
  const W = MW, H = MH;
  const ground = new Uint8Array(W * H).fill(TL.GRASS);
  const solid = new Uint8Array(W * H); // 1 = blocks everything, 2 = blocks cars only
  const objects = []; // y-sorted sprites {x,y (base px), img, ox, oy}
  const buildings = [];
  const interact = []; // {x,y,w,h (px), kind, data, label}
  const zones = [];
  const rnd = mulberry(1912);
  const roadsH = [], roadsV = [];
  const isRoadMask = new Uint8Array(W * H); // 1=h road, 2=v road, 3=both

  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) ground[y * W + x] = t; };
  const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? ground[y * W + x] : TL.VOID);
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t); };
  const zone = (name, x0, y0, x1, y1) => zones.push({ name, x0, y0, x1, y1, area: (x1 - x0) * (y1 - y0) });
  const addProp = (kind, tx, ty, variant = 0, block = true, dx = 8, dy = 14) => {
    const p = prop(kind, variant);
    objects.push({ x: tx * T + dx, y: ty * T + dy, img: p.img, ox: p.ox, oy: p.oy, kind });
    if (block && tx >= 0 && ty >= 0 && tx < W && ty < H) solid[ty * W + tx] = 1;
  };
  const free = (x, y) => x > 0 && y > 0 && x < W && y < H && !solid[y * W + x] && !ROADS.has(get(x, y)) && get(x, y) !== TL.SIDEWALK && get(x, y) !== TL.WATER;

  /* ---------------- terrain ---------------- */
  fill(0, 0, 12, H - 1, TL.WATER); // Hooghly river
  for (let y = 0; y < H; y++) set(12, y, TL.SHALLOW);
  fill(13, 176, 86, 179, TL.WATER); // Tolly's Nullah
  zone('Hooghly Riverside', 0, 0, 19, 175);

  // Maidan
  zone('Maidan', 19, 9, 86, 97);
  for (let i = 0; i < 40; i++) { const x = 20 + ((rnd() * 64) | 0), y = 10 + ((rnd() * 86) | 0); fill(x, y, x + 2 + ((rnd() * 3) | 0), y + 1 + ((rnd() * 2) | 0), TL.TALLGRASS); }
  zone('Brigade Parade Ground', 59, 55, 85, 96);
  // dirt paths across the Maidan
  fill(19, 50, 50, 50, TL.PATH); fill(58, 50, 86, 50, TL.PATH); fill(35, 66, 35, 97, TL.PATH);

  /* ---------------- roads ---------------- */
  const road = (name, horiz, c, a, b, w) => {
    const h = (w - 1) / 2;
    if (horiz) {
      roadsH.push({ name, y: c, x1: a, x2: b, w });
      for (let x = a; x <= b; x++) for (let k = -h; k <= h; k++) { set(x, c + k, k === 0 ? (w >= 7 ? TL.LANE_H : (x % 2 ? TL.DASH_H : TL.ROAD)) : TL.ROAD); isRoadMask[(c + k) * W + x] |= 1; }
    } else {
      roadsV.push({ name, x: c, y1: a, y2: b, w });
      for (let y = a; y <= b; y++) for (let k = -h; k <= h; k++) { set(c + k, y, k === 0 ? (w >= 7 ? TL.LANE_V : (y % 2 ? TL.DASH_V : TL.ROAD)) : TL.ROAD); isRoadMask[y * W + c + k] |= 2; }
    }
  };
  road('Lenin Sarani (Esplanade)', true, 5, 14, 239, 7);
  road('Sudder Street', true, 36, 90, 124, 5);
  road('Park Street', true, 70, 88, 221, 7);
  road("Queen's Way / Shakespeare Sarani", true, 100, 14, 221, 5);
  road('AJC Bose Road', true, 144, 14, 239, 7);
  road('Elgin Road', true, 170, 88, 221, 5);
  road('Southern Avenue', true, 184, 88, 239, 5);
  road('Strand Road', false, 16, 0, 144, 5);
  road('Red Road', false, 54, 5, 100, 7);
  road('Chowringhee Road', false, 90, 0, 144, 7);
  road('Ashutosh Mukherjee Road', false, 90, 144, 211, 5);
  road('Mirza Ghalib Street', false, 124, 5, 70, 5);
  road('Camac Street', false, 150, 70, 144, 5);
  road('Sarat Bose Road', false, 150, 144, 211, 5);
  road('Alipore Road', false, 64, 144, 211, 5);
  road('Gariahat Road', false, 200, 5, 211, 5);
  road('EM Bypass', false, 218, 5, 211, 7);
  // bridge over the nullah, Vidyasagar Setu approach
  for (let y = 176; y <= 179; y++) for (let x = 62; x <= 66; x++) set(x, y, TL.BRIDGE);
  fill(0, 142, 13, 146, TL.BRIDGE); for (let x = 0; x <= 13; x++) isRoadMask[144 * W + x] |= 1;

  // intersections: clear centre markings, add zebra crossings
  const inters = [];
  for (const hR of roadsH) for (const vR of roadsV) {
    if (vR.x >= hR.x1 && vR.x <= hR.x2 && hR.y >= vR.y1 && hR.y <= vR.y2) inters.push({ x: vR.x, y: hR.y, hw: hR.w, vw: vR.w });
  }
  for (const n of inters) {
    const hh = (n.hw - 1) / 2, vh = (n.vw - 1) / 2;
    fill(n.x - vh, n.y - hh, n.x + vh, n.y + hh, TL.ROAD);
    for (let k = -vh; k <= vh; k++) { if (isRoadMask[(n.y - hh - 1) * W + n.x + k] & 2) set(n.x + k, n.y - hh - 1, TL.ZEBRA_H); if (isRoadMask[(n.y + hh + 1) * W + n.x + k] & 2) set(n.x + k, n.y + hh + 1, TL.ZEBRA_H); }
    for (let k = -hh; k <= hh; k++) { if (isRoadMask[(n.y + k) * W + n.x - vh - 1] & 1) set(n.x - vh - 1, n.y + k, TL.ZEBRA_V); if (isRoadMask[(n.y + k) * W + n.x + vh + 1] & 1) set(n.x + vh + 1, n.y + k, TL.ZEBRA_V); }
  }
  // sidewalks around roads
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isRoadMask[y * W + x]) continue;
    const t = get(x, y); if (t === TL.WATER || t === TL.SHALLOW || t === TL.BRIDGE) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && isRoadMask[(y + dy) * W + x + dx]) { near = true; break; }
    if (near) set(x, y, TL.SIDEWALK);
  }
  // cars can't leave the asphalt
  for (let i = 0; i < W * H; i++) if (!ROADS.has(ground[i]) && ground[i] !== TL.PARK) solid[i] = solid[i] || 2;

  /* ---------------- traffic graph ---------------- */
  const nodes = [];
  const nodeAt = new Map();
  const addNode = (x, y, hw, vw) => { const k = x + ',' + y; if (nodeAt.has(k)) { const n = nodeAt.get(k); n.hw = n.hw || hw; n.vw = n.vw || vw; return n; } const n = { id: nodes.length, x, y, hw, vw, links: {} }; nodes.push(n); nodeAt.set(k, n); return n; };
  inters.forEach((n) => addNode(n.x, n.y, n.hw, n.vw));
  roadsH.forEach((r) => { addNode(r.x1, r.y, r.w, 0); addNode(r.x2, r.y, r.w, 0); });
  roadsV.forEach((r) => { addNode(r.x, r.y1, 0, r.w); addNode(r.x, r.y2, 0, r.w); });
  for (const r of roadsH) {
    const ns = nodes.filter((n) => n.y === r.y && n.x >= r.x1 && n.x <= r.x2).sort((a, b) => a.x - b.x);
    for (let i = 0; i < ns.length - 1; i++) { ns[i].links.E = ns[i + 1].id; ns[i + 1].links.W = ns[i].id; ns[i].hw = ns[i].hw || r.w; ns[i + 1].hw = ns[i + 1].hw || r.w; }
  }
  for (const r of roadsV) {
    const ns = nodes.filter((n) => n.x === r.x && n.y >= r.y1 && n.y <= r.y2).sort((a, b) => a.y - b.y);
    for (let i = 0; i < ns.length - 1; i++) { ns[i].links.S = ns[i + 1].id; ns[i + 1].links.N = ns[i].id; ns[i].vw = ns[i].vw || r.w; ns[i + 1].vw = ns[i + 1].vw || r.w; }
  }

  /* ---------------- buildings ---------------- */
  const B = (x, y, w, h, o = {}) => {
    const b = { x, y, w, h, seed: (x * 73 + y * 151) | 0, ...o };
    const spr = buildingSprite(b);
    b.img = spr.img; b.rise = spr.rise;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (xx < W && yy < H) solid[yy * W + xx] = 1;
    b.door = { x: x + Math.floor(w / 2) + (o.doorOff || 0), y: y + h - 1 };
    objects.push({ x: x * T, y: (y + h) * T, img: b.img, ox: 0, oy: b.img.height, kind: 'building', b });
    buildings.push(b);
    if (o.interior) {
      // path from the door to the nearest sidewalk/road
      let yy = y + h;
      while (yy < H && (get(b.door.x, yy) === TL.GRASS || get(b.door.x, yy) === TL.TALLGRASS || get(b.door.x, yy) === TL.FLOWERS)) { set(b.door.x, yy, TL.PLAZA); yy++; }
    }
    return b;
  };

  // --- Maidan & landmarks ---
  B(23, 11, 22, 14, { style: 'stadium', name: 'Eden Gardens', interior: 'stadium' });
  B(22, 40, 26, 24, { style: 'fort', name: 'Fort William' });
  B(60, 24, 8, 5, { style: 'tent', name: 'Mohun Bagan Club', sign: 'MOHUN BAGAN', colors: ['#1f7a3a', '#8a1b2e'], interior: 'club:mb' });
  B(70, 24, 8, 5, { style: 'tent', name: 'East Bengal Club', sign: 'EAST BENGAL', colors: ['#d42a2a', '#f2c230'], interior: 'club:eb' });
  B(22, 70, 9, 5, { style: 'tent', name: 'Mohammedan Sporting', sign: 'MOHAMMEDAN', colors: ['#1a1a1a', '#f2f2f2'], interior: 'club:md' });
  B(76, 12, 3, 2, { style: 'minar', name: 'Shaheed Minar' });
  // football pitches in front of the club tents
  const pitch = (x0, y0, x1, y1) => { fill(x0, y0, x1, y1, TL.PITCH); fill(x0, y0, x1, y0, TL.PITCH_LINE); fill(x0, y1, x1, y1, TL.PITCH_LINE); const mx = (x0 + x1) >> 1; for (let y = y0; y <= y1; y++) set(mx, y, TL.PITCH_LINE); };
  pitch(60, 32, 84, 46); addProp('goal', 60, 39, 0, false, 0, 6); addProp('goal', 84, 39, 1, false, 12, 6);
  pitch(22, 78, 46, 92); addProp('goal', 22, 85, 0, false, 0, 6); addProp('goal', 46, 85, 1, false, 12, 6);
  interact.push({ x: 60 * T, y: 32 * T, w: 25 * T, h: 15 * T, kind: 'pitch', label: 'Football pitch', silent: true });
  interact.push({ x: 22 * T, y: 78 * T, w: 25 * T, h: 15 * T, kind: 'pitch', label: 'Football pitch', silent: true });
  zone('Eden Gardens', 22, 10, 46, 26); zone('Fort William', 21, 39, 49, 64);
  zone('Mohun Bagan & East Bengal grounds', 59, 23, 85, 47);

  // --- Victoria Memorial grounds ---
  zone('Victoria Memorial', 19, 104, 70, 139);
  fill(19, 104, 70, 139, TL.GRASS);
  for (let x = 19; x <= 70; x++) { if (Math.abs(x - 54) > 2) { addProp('rail', x, 104, 0, true, 0, 4); } if (Math.abs(x - 54) > 2) addProp('rail', x, 139, 0, true, 0, 12); }
  for (let y = 105; y < 139; y++) { addProp('rail', 19, y, 0, true, 0, 12); addProp('rail', 70, y, 0, true, 0, 12); }
  fill(52, 104, 56, 109, TL.PLAZA); fill(52, 122, 56, 127, TL.PLAZA); fill(24, 107, 66, 108, TL.PATH); fill(24, 107, 25, 136, TL.PATH); fill(65, 107, 66, 136, TL.PATH); fill(24, 135, 66, 136, TL.PATH); fill(52, 135, 56, 139, TL.PLAZA);
  fill(40, 109, 68, 123, TL.MARBLE);
  B(42, 110, 24, 12, { style: 'victoria', name: 'Victoria Memorial', interior: 'museum:victoria' });
  fill(36, 128, 72 - 4, 133, TL.WATER); fill(36, 127, 68, 127, TL.SHALLOW);
  addProp('statue', 54, 106, 0); addProp('fountain', 30, 116, 0); addProp('fountain', 30, 130 - 0, 1);
  for (let x = 26; x < 64; x += 4) { addProp('flowerbed', x, 125, x, false); }
  for (let x = 22; x < 70; x += 5) { if (Math.abs(x - 54) > 4) addProp('tree', x, 106, x % 7, true); }
  for (let y = 112; y < 134; y += 5) { addProp('tree', 21, y, y % 5); addProp('tree', 68, y, (y + 2) % 5); }
  interact.push({ x: 49 * T, y: 101 * T, w: 10 * T, h: 2 * T, kind: 'carriage', label: 'Horse carriage ride (₹300)' });
  // cultural strip: St Paul's, Academy of Fine Arts, Nandan, Rabindra Sadan
  B(72, 105, 12, 12, { style: 'cathedral', name: "St Paul's Cathedral", interior: 'cathedral' });
  B(72, 119, 13, 5, { name: 'Academy of Fine Arts', sign: 'FINE ARTS', wall: '#d8c8a8', style: 'colonial', floors: 2, interior: 'gallery' });
  B(72, 126, 6, 6, { style: 'nandan', name: 'Nandan', sign: 'NANDAN', interior: 'cinema:nandan', floors: 2 });
  B(79, 126, 7, 6, { style: 'nandan', name: 'Rabindra Sadan', sign: 'R. SADAN', interior: 'theatre', floors: 2 });
  zone('Nandan & Rabindra Sadan', 71, 118, 86, 139);

  // --- Race course & Turf Club ---
  zone('Royal Calcutta Turf Club (Race Course)', 19, 149, 60, 175);
  for (let y = 149; y <= 175; y++) for (let x = 19; x <= 60; x++) {
    const dx = (x - 39.5) / 20.5, dy = (y - 162) / 13.5, d = dx * dx + dy * dy;
    if (d <= 1 && d > 0.62) set(x, y, TL.TRACK);
  }
  B(20, 149, 10, 4, { name: 'Turf Club Grandstand', sign: 'TURF CLUB', wall: '#f2ead8', floors: 1, shutters: false });
  for (let i = 0; i < 6; i++) addProp('fence', 30 + i * 3, 156, 0, false);

  // --- SSKM, police, Exide ---
  B(68, 150, 18, 12, { style: 'hospital', name: 'SSKM Hospital', sign: 'SSKM HOSPITAL', wall: '#f2efe8', floors: 4, interior: 'hospital' });
  B(70, 166, 9, 6, { name: 'Bhowanipore Police Station', sign: 'POLICE', wall: '#c8302a', floors: 2, shutters: false, awning: '#2a4a8a', interior: 'police' });
  zone('SSKM Hospital', 67, 149, 86, 162);
  zone('Exide Crossing', 84, 138, 97, 150);
  zone('Bhowanipore', 87, 149, 146, 211);

  // --- North: Esplanade, New Market, Indian Museum ---
  zone('Esplanade (Dharmatala)', 86, 0, 146, 32);
  B(98, 12, 18, 10, { style: 'newmarket', name: 'New Market', sign: 'NEW MARKET', wall: '#b84a32', floors: 2, interior: 'market' });
  B(96, 40, 22, 9, { style: 'colonial', name: 'Indian Museum', sign: 'INDIAN MUSEUM', wall: '#d86a4a', floors: 2, interior: 'museum:indian' });
  B(130, 11, 14, 8, { name: 'Kolkata Police HQ', sign: 'POLICE HQ', wall: '#c8302a', floors: 3, shutters: false, interior: 'police' });
  B(147, 11, 12, 8, { name: 'Metro Cinema', sign: 'METRO', wall: '#e8d4a8', floors: 3, signBg: '#7a1f2b', interior: 'cinema:metro' });
  for (let x = 162; x < 196; x += 11) B(x, 12, 10, 8, { style: 'house', wall: ['#e8b4a0', '#a8c8e0', '#e8d890', '#b8e0b0'][(x / 11) % 4 | 0], floors: 3, name: 'Residence' });
  for (let x = 128; x < 196; x += 11) B(x, 40, 10, 9, { style: 'house', wall: ['#f0c8a0', '#c8d8f0', '#f0e0a0', '#d0e8c8', '#e8c0d0'][(x / 11) % 5 | 0], floors: 3, name: 'Residence' });
  B(98, 26, 16, 6, { name: 'Esplanade Bus Depot', sign: 'BUS DEPOT', wall: '#c9c4b8', floors: 1, shutters: false });
  zone('Free School Street', 120, 9, 130, 66);

  // --- Park Street (north side) ---
  zone('Park Street', 86, 52, 214, 96);
  B(95, 60, 8, 6, { name: 'Flurys', sign: 'FLURYS', wall: '#f4d6dc', signBg: '#b5566a', signFg: '#ffffff', awning: '#b5566a', interior: 'cafe:flurys', shutter: '#b5566a' });
  B(104, 60, 8, 6, { name: 'Oxford Bookstore', sign: 'OXFORD', wall: '#efe4d2', signBg: '#1f3a5a', awning: '#1f3a5a', interior: 'bookstore' });
  B(113, 60, 8, 6, { name: 'Trincas', sign: 'TRINCAS', wall: '#2a2e48', signBg: '#e05a8a', signFg: '#ffffff', awning: '#e05a8a', interior: 'cafe:trincas', shutter: '#141a2e' });
  B(128, 60, 8, 6, { name: 'Mocambo', sign: 'MOCAMBO', wall: '#8a2a30', signBg: '#e3b341', signFg: '#3a1218', awning: '#3a1218', interior: 'cafe:mocambo' });
  B(137, 60, 8, 6, { name: 'Peter Cat', sign: 'PETER CAT', wall: '#5a4030', signBg: '#d9a441', signFg: '#2a2018', awning: '#2a2018', interior: 'cafe:petercat' });
  B(146, 63, 3, 3, { style: 'stall', name: 'Kusum Rolls', color: '#f2c230' });
  interact.push({ x: 146 * T, y: 66 * T, w: 3 * T, h: T, kind: 'menu', data: 'kusum', label: 'Kusum Rolls' });
  B(151, 59, 11, 7, { style: 'colonial', name: 'Bank of Bengal', sign: 'BANK OF BENGAL', wall: '#e8dcc0', floors: 3, interior: 'bank:bengal', shutters: false });
  addProp('atm', 162, 65, 0); interact.push({ x: 162 * T, y: 65 * T, w: T, h: 2 * T, kind: 'atm', label: 'ATM' });
  B(164, 54, 14, 12, { style: 'tower', name: 'The Park Hotel', sign: 'THE PARK', wall: '#d8dce4', floors: 6, interior: 'club:park' });
  B(180, 56, 12, 10, { style: 'tower', name: 'Apeejay House', sign: 'APEEJAY', wall: '#c8ccd4', floors: 5 });
  B(204, 60, 9, 6, { name: 'Arsalan', sign: 'ARSALAN', wall: '#2a5a34', signBg: '#e3b341', signFg: '#1e3a24', awning: '#1e3a24', interior: 'cafe:arsalan', shutter: '#1e3a24' });
  zone('Park Circus', 196, 52, 214, 96);
  // supercars of Park Street get parked along the kerb (spawned by entities)

  // --- Park Street (south side) block ---
  B(96, 88, 10, 9, { style: 'house', name: 'Our Flat (Park Mansions)', sign: 'PARK MANSIONS', wall: '#f0d8b0', floors: 4, interior: 'home', shutter: '#3f8a52' });
  B(108, 90, 8, 7, { name: 'Bean & Brew Café', sign: 'BEAN & BREW', wall: '#efe4d2', signBg: '#6b4226', awning: '#6b4226', interior: 'cafe:coffeehouse' });
  B(128, 90, 9, 7, { name: 'Maidan Armoury', sign: 'ARMOURY', wall: '#5a5a52', signBg: '#1d1b20', signFg: '#d42a2a', awning: '#3a3a32', interior: 'armoury', shutter: '#2a2a2a' });
  B(138, 89, 8, 8, { name: 'Glam Salon', sign: 'GLAM SALON', wall: '#f2c8d8', signBg: '#c0306a', signFg: '#ffffff', awning: '#c0306a', interior: 'salon' });
  B(117, 78, 8, 6, { name: 'Park Street Motors', sign: 'MOTORS', wall: '#2a2a30', signBg: '#d42a2a', signFg: '#ffffff', awning: '#1d1b20', interior: 'dealer', shutters: false });
  B(154, 85, 16, 12, { style: 'colonial', name: "St. Xavier's College", sign: "ST XAVIER'S", wall: '#e8d8b8', floors: 3, interior: 'college' });
  zone('Park Street Cemetery', 172, 76, 196, 96);
  for (let y = 77; y < 95; y += 3) for (let x = 174; x < 195; x += 3) if (rnd() < 0.85) addProp('grave', x, y, (x + y) | 0);
  for (let x = 172; x <= 196; x++) { addProp('rail', x, 75, 0, true, 0, 12); }
  for (let y = 76; y <= 96; y += 1) { addProp('rail', 172, y, 0, true, 0, 12); addProp('rail', 196, y, 0, true, 0, 12); }
  for (let k = 0; k < 6; k++) addProp('banyan', 176 + k * 4, 80 + (k % 2) * 8, k);

  // --- Shakespeare Sarani → AJC Bose block (Camac St business district) ---
  zone('Camac Street', 140, 97, 160, 144);
  zone('Shakespeare Sarani', 86, 97, 214, 112);
  B(96, 104, 12, 8, { style: 'tower', name: 'Office Tower', wall: '#b8c4d4', floors: 5 });
  B(110, 104, 12, 8, { style: 'tower', name: 'Office Tower', wall: '#c4ccd8', floors: 6 });
  B(126, 104, 10, 8, { name: 'Hooghly National Bank', sign: 'HN BANK', wall: '#f2ead8', style: 'colonial', floors: 3, interior: 'bank:hooghly', shutters: false });
  B(96, 129, 10, 10, { style: 'planetarium', name: 'Birla Planetarium', interior: 'planetarium' });
  B(110, 127, 10, 12, { style: 'tower', name: 'Chatterjee International', sign: 'CHATTERJEE', wall: '#9aa8b8', floors: 8 });
  B(124, 128, 9, 11, { style: 'tower', name: 'Everest House', wall: '#d0c8b8', floors: 7 });
  B(135, 130, 10, 9, { name: 'Iron Paradise Gym', sign: 'GYM', wall: '#3a3a42', signBg: '#f2c230', signFg: '#1d1b20', interior: 'gym', floors: 2 });
  B(156, 104, 12, 9, { style: 'house', wall: '#e8c8a8', floors: 4, name: 'Residence' });
  B(170, 104, 12, 9, { style: 'house', wall: '#c8d8e8', floors: 4, name: 'Residence' });
  B(156, 127, 14, 12, { style: 'tower', name: 'Kolkata Corporate Park', sign: 'CORPORATE PARK', wall: '#b0bcc8', floors: 7 });
  B(174, 128, 10, 11, { style: 'house', wall: '#f0d0a0', floors: 4, name: 'Residence' });
  B(186, 128, 10, 11, { style: 'house', wall: '#d8b8d8', floors: 4, name: 'Residence' });
  B(184, 104, 12, 9, { name: 'Cab Stand & Garage', sign: 'JATRI CABS', wall: '#f2c230', signBg: '#1d1b20', floors: 2, shutters: false });

  // --- South of AJC Bose: malls & sweets ---
  zone('Elgin Road', 94, 149, 146, 172);
  B(96, 155, 16, 12, { style: 'mall', name: 'Forum Mall', sign: 'FORUM', wall: '#e8e4f0', signBg: '#5a2a8a', floors: 4, interior: 'mall:forum' });
  B(115, 160, 9, 7, { name: 'Balaram Mullick', sign: 'BALARAM', wall: '#fbf1d8', signBg: '#b8162c', signFg: '#ffffff', awning: '#b8162c', interior: 'cafe:balaram' });
  B(127, 158, 10, 9, { style: 'house', wall: '#e8d0b0', floors: 3, name: 'Residence' });
  zone('Ballygunge', 153, 145, 214, 181);
  B(158, 153, 22, 14, { style: 'mall', name: 'Quest Mall', sign: 'QUEST', wall: '#f2f2f2', signBg: '#1d1b20', floors: 5, interior: 'mall:quest' });
  B(184, 156, 10, 10, { style: 'house', wall: '#c8e0d0', floors: 4, name: 'Residence' });
  B(223, 150, 16, 14, { style: 'mall', name: 'Acropolis Mall', sign: 'ACROPOLIS', wall: '#e8eef4', signBg: '#1f5a8a', floors: 5, interior: 'mall:acropolis' });
  zone('Kasba', 222, 145, 239, 181);
  // narrow strip of houses between Elgin and Southern Avenue
  for (let x = 95; x < 146; x += 9) if (x + 8 < 147) B(x, 175, 8, 6, { style: 'house', wall: ['#f0c8a0', '#c8d8f0', '#f0e0a0', '#d0e8c8', '#e8c0d0'][(x / 9) % 5 | 0], floors: 3, name: 'Residence' });
  for (let x = 154; x < 196; x += 9) B(x, 175, 8, 6, { style: 'house', wall: ['#e8b4a0', '#a8c8e0', '#e8d890', '#b8e0b0'][(x / 9) % 4 | 0], floors: 3, name: 'Residence' });

  // --- Far south: zoo, playground, golf, Rabindra Sarovar, South City ---
  zone('Alipore Zoo', 13, 180, 60, 211);
  fill(13, 180, 60, 211, TL.GRASS);
  for (let x = 13; x <= 60; x++) addProp('rail', x, 180, 0, true, 0, 12);
  for (let y = 181; y <= 211; y++) if (Math.abs(y - 195) > 1) addProp('rail', 60, y, 0, true, 0, 12);
  fill(20, 194, 59, 196, TL.PATH); fill(36, 182, 38, 210, TL.PATH);
  B(57, 192, 4, 2, { style: 'gate', sign: 'ZOO', name: 'Alipore Zoo Gate' });
  for (let y = 192; y < 194; y++) for (let x = 57; x < 61; x++) solid[y * W + x] = 0; // gate is walk-through
  objects.pop(); objects.push({ x: 57 * T, y: 194 * T, img: buildings[buildings.length - 1].img, ox: 0, oy: buildings[buildings.length - 1].img.height, kind: 'gate' });
  const enclosure = (x0, y0, x1, y1, animal, water) => {
    for (let x = x0; x <= x1; x++) { addProp('cage', x, y0, 0, true, 0, 14); addProp('cage', x, y1, 0, true, 0, 14); }
    for (let y = y0; y <= y1; y++) { addProp('cage', x0, y, 0, true, 0, 14); addProp('cage', x1, y, 0, true, 0, 14); }
    fill(x0 + 1, y0 + 1, x1 - 1, y1 - 1, animal === 'hippo' ? TL.SHALLOW : TL.DIRT);
    if (water) fill(x0 + 1, y1 - 2, x0 + 3, y1 - 1, TL.WATER);
    return { x0, y0, x1, y1, animal };
  };
  const pens = [
    enclosure(15, 182, 24, 192, 'tiger', true), enclosure(26, 182, 35, 192, 'lion'), enclosure(40, 182, 50, 192, 'giraffe'),
    enclosure(15, 198, 24, 209, 'elephant', true), enclosure(26, 198, 35, 209, 'zebra'), enclosure(40, 198, 49, 209, 'rhino', true),
    enclosure(51, 198, 58, 209, 'hippo'),
  ];
  for (const p of pens) interact.push({ x: p.x0 * T, y: (p.y1 + 1) * T, w: (p.x1 - p.x0 + 1) * T, h: T, kind: 'zoo', data: p.animal, label: 'Look at the ' + p.animal });
  for (let k = 0; k < 6; k++) addProp('tree', 52 + (k % 2) * 4, 183 + k * 2, k);

  zone("Children's Park", 67, 181, 86, 211);
  fill(68, 189, 85, 210, TL.SAND);
  addProp('slide', 74, 196, 0); interact.push({ x: 71 * T, y: 196 * T, w: 6 * T, h: 2 * T, kind: 'slide', label: 'Go down the slide!' });
  for (let k = 0; k < 3; k++) { addProp('bench', 70 + k * 6, 206, 0); }
  interact.push({ x: 78 * T, y: 190 * T, w: 6 * T, h: 4 * T, kind: 'swing', label: 'Swing' });
  for (let k = 0; k < 2; k++) addProp('fence', 79 + k * 2, 190, 0, false);
  for (let k = 0; k < 8; k++) addProp('tree', 68 + k * 2.3, 183, k, true);

  zone('Royal Calcutta Golf Club', 94, 188, 146, 211);
  fill(94, 188, 146, 211, TL.TALLGRASS);
  fill(98, 192, 142, 196, TL.FAIRWAY); fill(98, 202, 142, 206, TL.FAIRWAY);
  const holes = [[140, 194], [100, 204], [122, 204]];
  for (const [hx, hy] of holes) { fill(hx - 2, hy - 2, hx + 2, hy + 2, TL.GREEN); addProp('flag', hx, hy, 0, false); }
  fill(118, 191, 121, 192, TL.BUNKER); fill(108, 207, 111, 208, TL.BUNKER); fill(128, 198, 134, 200, TL.WATER);
  B(95, 188, 9, 4, { name: 'Golf Clubhouse', sign: 'RCGC', wall: '#f2ead8', floors: 1, interior: 'clubhouse' });
  interact.push({ x: 98 * T, y: 193 * T, w: 3 * T, h: 3 * T, kind: 'golf', label: 'Tee off — Golf' });

  zone('Rabindra Sarovar', 153, 188, 197, 211);
  fill(158, 192, 193, 208, TL.WATER); fill(158, 191, 193, 191, TL.SHALLOW); fill(170, 198, 178, 202, TL.GRASS);
  for (let x = 155; x < 197; x += 4) addProp('tree', x, 189, x % 5); for (let x = 155; x < 197; x += 5) addProp('tree', x, 210, (x + 1) % 5);
  addProp('banyan', 174, 200, 1);
  fill(176, 189, 180, 191, TL.DECK); addProp('boat', 178, 192, 0, false, 8, 8); addProp('boat', 184, 193, 1, false, 8, 8);
  interact.push({ x: 175 * T, y: 189 * T, w: 7 * T, h: 3 * T, kind: 'boat', label: 'Rent a rowing boat (₹100)' });
  B(154, 188, 0 + 8, 3, { name: 'Lake Club', sign: 'LAKE CLUB', wall: '#e8f0f2', floors: 1, shutters: false });

  zone('South City', 222, 182, 239, 211);
  B(223, 190, 16, 14, { style: 'mall', name: 'South City Mall', sign: 'SOUTH CITY', wall: '#f2ece2', signBg: '#8a1b2e', floors: 5, interior: 'mall:southcity' });
  for (let x = 204; x < 213; x += 9) B(x, 190, 8, 8, { style: 'house', wall: '#e8c8b8', floors: 4, name: 'Residence' });

  // --- Water park east of the Bypass ---
  zone('Aqua Splash Water Park', 222, 96, 239, 141);
  fill(223, 100, 239, 139, TL.PLAZA);
  fill(225, 104, 237, 114, TL.POOL); fill(226, 120, 236, 128, TL.POOL); fill(228, 132, 234, 137, TL.POOL);
  addProp('slide', 231, 118, 1); interact.push({ x: 228 * T, y: 117 * T, w: 6 * T, h: 2 * T, kind: 'waterslide', label: 'Ride the water slide!' });
  for (let k = 0; k < 6; k++) addProp('umbrella', 224 + (k % 3) * 5, 116 + Math.floor(k / 3) * 14, k, true);
  for (let k = 0; k < 4; k++) addProp('palm', 223 + k * 5, 101, k);
  zone('Gariahat Market', 203, 97, 214, 145);
  for (let k = 0; k < 6; k++) { B(205, 106 + k * 5, 3, 3, { style: 'stall', name: 'Gariahat stall', color: ['#d42a2a', '#2a6ac0', '#f2c230'][k % 3] }); }
  interact.push({ x: 204 * T, y: 104 * T, w: 7 * T, h: 32 * T, kind: 'shopstall', data: 'ethnic', label: 'Gariahat street shopping', silent: true });

  // --- street-food stalls & tea near Victoria / Maidan ---
  B(46, 96, 3, 2, { style: 'stall', name: 'Phuchka stall', color: '#d42a2a' }); interact.push({ x: 46 * T, y: 97 * T, w: 3 * T, h: 2 * T, kind: 'menu', data: 'street', label: 'Phuchka & jhalmuri stall' });
  B(60, 96, 3, 2, { style: 'stall', name: 'Chai stall', color: '#2a8a5a' }); interact.push({ x: 60 * T, y: 97 * T, w: 3 * T, h: 2 * T, kind: 'menu', data: 'street', label: 'Bhaar cha stall' });
  addProp('teestall', 88 - 4, 34, 0); interact.push({ x: 83 * T, y: 33 * T, w: 3 * T, h: 3 * T, kind: 'menu', data: 'street', label: 'Tea stall' });

  /* ---------------- trees, lamps, benches ---------------- */
  // Maidan trees along the edges & along Red Road
  for (let y = 12; y < 96; y += 4) { if (free(49, y)) addProp('tree', 49, y, y % 5); if (free(59, y)) addProp('tree', 59, y, (y + 1) % 5); if (free(20, y) && (y < 40 || y > 64)) addProp('tree', 20, y, (y + 3) % 5); if (free(85, y)) addProp('tree', 85, y, (y + 2) % 5); }
  for (let i = 0; i < 70; i++) { const x = 21 + ((rnd() * 63) | 0), y = 11 + ((rnd() * 84) | 0); if (free(x, y) && get(x, y) !== TL.PITCH && get(x, y) !== TL.PITCH_LINE && get(x, y) !== TL.PATH) addProp(rnd() < 0.12 ? 'banyan' : 'tree', x, y, i); }
  // Brigade parade ground flag
  addProp('flag', 72, 75, 0);
  // lamps along major sidewalks
  for (const r of roadsH) { const sy1 = r.y - (r.w + 1) / 2, sy2 = r.y + (r.w + 1) / 2; for (let x = r.x1 + 3; x < r.x2; x += 9) { if (get(x, sy1) === TL.SIDEWALK && !solid[sy1 * W + x] && rnd() < 0.8) addProp('lamp', x, sy1, 0, true, 8, 10); if (get(x, sy2) === TL.SIDEWALK && !solid[sy2 * W + x] && rnd() < 0.5) addProp('lamp', x, sy2, 0, true, 8, 14); } }
  for (const r of roadsV) { const sx1 = r.x - (r.w + 1) / 2, sx2 = r.x + (r.w + 1) / 2; for (let y = r.y1 + 4; y < r.y2; y += 10) { if (get(sx1, y) === TL.SIDEWALK && !solid[y * W + sx1] && rnd() < 0.6) addProp('lamp', sx1, y, 0); if (get(sx2, y) === TL.SIDEWALK && !solid[y * W + sx2] && rnd() < 0.6) addProp('lamp', sx2, y, 0); } }
  // bus stops, hydrants, benches on the Maidan side of Chowringhee
  for (const [x, y] of [[86, 20], [86, 60], [94, 120], [86, 160], [123, 74], [149, 140], [199, 120]]) if (get(x, y) === TL.SIDEWALK && !solid[y * W + x]) { addProp('busstop', x, y, 0, true); interact.push({ x: (x - 1) * T, y: (y - 1) * T, w: 3 * T, h: 3 * T, kind: 'bus', label: 'Bus stop — quick travel', silent: false }); }
  for (let y = 14; y < 96; y += 12) if (free(83, y)) addProp('bench', 83, y, 0);
  // fill empty city blocks with greenery
  for (let i = 0; i < 900; i++) {
    const x = 20 + ((rnd() * 219) | 0), y = 1 + ((rnd() * 210) | 0);
    if (x > 19 && x < 87 && y < 98) continue; // Maidan handled
    if (get(x, y) === TL.GRASS && free(x, y) && free(x, y + 1) && free(x + 1, y)) {
      const rr = rnd(); addProp(rr < 0.08 ? 'palm' : rr < 0.6 ? 'tree' : 'bush', x, y, i, true);
    }
  }
  // occasional flowers
  for (let i = 0; i < 400; i++) { const x = (rnd() * W) | 0, y = (rnd() * H) | 0; if (get(x, y) === TL.GRASS && !solid[y * W + x]) set(x, y, TL.FLOWERS); }

  // map edges are solid
  for (let x = 0; x < W; x++) { solid[x] = 1; solid[(H - 1) * W + x] = 1; }
  for (let y = 0; y < H; y++) { solid[y * W] = 1; solid[y * W + W - 1] = 1; }

  zones.sort((a, b) => a.area - b.area);
  return { kind: 'world', W, H, ground, solid, objects, buildings, interact, zones, nodes, roadsH, roadsV, pens, spawn: { x: 101 * T + 8, y: 98 * T + 8 } };
}

export function zoneAt(world, px, py) {
  const tx = px / T, ty = py / T;
  for (const z of world.zones) if (tx >= z.x0 && tx <= z.x1 + 1 && ty >= z.y0 && ty <= z.y1 + 1) return z.name;
  for (const r of world.roadsH) if (tx >= r.x1 && tx <= r.x2 && Math.abs(ty - r.y - 0.5) <= (r.w + 2) / 2) return r.name;
  for (const r of world.roadsV) if (ty >= r.y1 && ty <= r.y2 && Math.abs(tx - r.x - 0.5) <= (r.w + 2) / 2) return r.name;
  return 'Kolkata';
}

// Named destinations for the phone's cab app / map
export const DESTINATIONS = [
  ['Our Flat (Park Mansions)', 101, 98], ['Flurys, Park Street', 99, 67], ['Peter Cat', 141, 67], ['Mocambo', 132, 67], ['Trincas', 117, 67],
  ['Arsalan, Park Circus', 208, 67], ['Victoria Memorial', 54, 103], ['Maidan (Brigade Ground)', 70, 62], ['Eden Gardens', 34, 28],
  ['Mohun Bagan / East Bengal tents', 70, 31], ['Indian Museum', 107, 50], ['New Market', 107, 24], ['Nandan', 75, 140],
  ['SSKM Hospital', 77, 163], ['Exide Crossing', 95, 139], ['Birla Planetarium', 101, 140], ['Forum Mall', 104, 168],
  ['Balaram Mullick', 119, 168], ['Quest Mall', 169, 168], ['Acropolis Mall', 231, 165], ['South City Mall', 231, 205],
  ['Alipore Zoo', 62, 195], ["Children's Park", 76, 186], ['Royal Calcutta Golf Club', 99, 192], ['Rabindra Sarovar', 178, 188],
  ['Aqua Splash Water Park', 223, 102], ['Bank of Bengal', 156, 67], ['Maidan Armoury', 132, 98], ['Glam Salon', 142, 98],
  ['Park Street Motors', 121, 85], ['Race Course', 40, 148], ["St Paul's Cathedral", 78, 118],
];
