// Game data: wardrobe catalogue, cafe menus, shops, dialogue.
// Menus use each restaurant's well-known signature dishes; prices are approximate
// in-game prices — edit freely.

export const SKIN_TONES = ['#f6d7bf', '#f2cfb3', '#e8bb98', '#d9a47c', '#c48a63', '#a8704f', '#9a6446', '#7d4f36', '#5e3a28'];
export const HAIR_COLORS = ['#141010', '#2b1a12', '#4a2c1c', '#6b4226', '#8c5a32', '#b07a45', '#d9b26f', '#7a1f2b', '#3d2a5c', '#9aa0a8'];
export const EYE_COLORS = ['#3b2414', '#5a3a22', '#7a5230', '#4d5a3a', '#3a4f6b', '#222222'];
export const LIP_COLORS = ['none', '#c27a6e', '#b5565a', '#9c2f3c', '#d46a7e', '#7d3b46', '#e08a6b', '#5a2030'];
export const NAIL_COLORS = ['none', '#d9a1a0', '#c0283a', '#7a1f4a', '#f2b8c6', '#222222', '#e6c35c', '#4f7bd9'];
export const SHADOW_COLORS = ['none', '#a87a5a', '#6b4a7a', '#4a6b8a', '#b58a3a', '#7a3a3a'];

export const HAIR_STYLES = [
  ['swept', 'Swept-back volume'], ['short', 'Short crop'], ['buzz', 'Buzz cut'], ['curly', 'Curly top'],
  ['long', 'Long & straight'], ['ponytail', 'Ponytail'], ['bun', 'Top bun'], ['bob', 'Bob cut'],
  ['braid', 'Side braid'], ['wavy', 'Long wavy'],
];
export const BEARDS = [['none', 'Clean shaven'], ['stubble', 'Stubble'], ['short', 'Short beard'], ['full', 'Full beard'], ['goatee', 'Goatee'], ['mustache', 'Moustache']];

// Every wearable item. style drives how it's drawn; c = colours.
export const ITEMS = [
  // ---- tops ----
  { id: 'top_waistcoat', slot: 'top', style: 'waistcoat', name: 'Pinstripe shirt + satin waistcoat', price: 4200, shop: 'men', c: ['#f4f1ea', '#1c1a1f', '#111014'] },
  { id: 'top_kurta_mustard', slot: 'top', style: 'kurta', name: 'Mustard kurta with gold zari', price: 3800, shop: 'ethnic', c: ['#d9a441', '#b8862c', '#f0d488'] },
  { id: 'top_kurta_rose', slot: 'top', style: 'kurta', name: 'Rose chikankari kurta', price: 3200, shop: 'ethnic', c: ['#e3a1a8', '#c47a84', '#fbe3e6'] },
  { id: 'top_kurta_teal', slot: 'top', style: 'kurta', name: 'Teal silk kurta', price: 3600, shop: 'ethnic', c: ['#2f8a8a', '#1f6363', '#e8c76a'] },
  { id: 'top_punjabi', slot: 'top', style: 'punjabi', name: 'White Bengali punjabi', price: 2200, shop: 'ethnic', c: ['#f6f3ea', '#d8d2c2', '#c9a24a'] },
  { id: 'top_saree_red', slot: 'top', style: 'saree', name: 'Red-white Durga Puja saree', price: 6500, shop: 'ethnic', c: ['#f4efe4', '#c0182a', '#e3b341'] },
  { id: 'top_saree_blue', slot: 'top', style: 'saree', name: 'Banarasi silk saree (royal blue)', price: 9800, shop: 'ethnic', c: ['#2741a8', '#16246b', '#e3b341'] },
  { id: 'top_tee_white', slot: 'top', style: 'tee', name: 'Plain white tee', price: 600, shop: 'men', c: ['#f2f2f2', '#d6d6d6', '#f2f2f2'] },
  { id: 'top_tee_black', slot: 'top', style: 'tee', name: 'Black graphic tee', price: 900, shop: 'men', c: ['#26232b', '#17151a', '#e0b050'] },
  { id: 'top_tee_yellow', slot: 'top', style: 'tee', name: 'Taxi-yellow tee', price: 900, shop: 'women', c: ['#f2c230', '#c99a1a', '#26232b'] },
  { id: 'top_shirt_blue', slot: 'top', style: 'shirt', name: 'Sky-blue linen shirt', price: 1800, shop: 'men', c: ['#8fb8e0', '#6a93bd', '#ffffff'] },
  { id: 'top_shirt_floral', slot: 'top', style: 'shirt', name: 'Floral beach shirt', price: 1600, shop: 'men', c: ['#e8603c', '#b8442a', '#f7d24a'] },
  { id: 'top_hoodie', slot: 'top', style: 'hoodie', name: 'Grey hoodie', price: 2400, shop: 'men', c: ['#8a8d96', '#6a6d75', '#b0b3bb'] },
  { id: 'top_jacket', slot: 'top', style: 'jacket', name: 'Black leather jacket', price: 7500, shop: 'men', c: ['#1d1b20', '#0e0d10', '#e9e9e9'] },
  { id: 'top_blazer', slot: 'top', style: 'blazer', name: 'Navy blazer', price: 8200, shop: 'men', c: ['#1f2a4a', '#141c33', '#f4f1ea'] },
  { id: 'top_crop_pink', slot: 'top', style: 'crop', name: 'Pink crop top', price: 1100, shop: 'women', c: ['#f08fb0', '#c96a8c', '#f08fb0'] },
  { id: 'top_crop_black', slot: 'top', style: 'crop', name: 'Black crop top', price: 1100, shop: 'women', c: ['#26232b', '#17151a', '#26232b'] },
  { id: 'top_dress_red', slot: 'top', style: 'dress', name: 'Red evening dress', price: 5600, shop: 'women', c: ['#b8162c', '#7d0f1f', '#e05a6a'] },
  { id: 'top_dress_floral', slot: 'top', style: 'dress', name: 'Sunflower sundress', price: 3400, shop: 'women', c: ['#f2d05a', '#c9a636', '#ffffff'] },
  { id: 'top_jersey_mb', slot: 'top', style: 'jersey', name: 'Mohun Bagan jersey', price: 1500, shop: 'sports', c: ['#1f7a3a', '#8a1b2e', '#ffffff'] },
  { id: 'top_jersey_eb', slot: 'top', style: 'jersey', name: 'East Bengal jersey', price: 1500, shop: 'sports', c: ['#d42a2a', '#f2c230', '#ffffff'] },
  { id: 'top_jersey_md', slot: 'top', style: 'jersey', name: 'Mohammedan SC jersey', price: 1500, shop: 'sports', c: ['#1a1a1a', '#f2f2f2', '#2e8b3a'] },
  { id: 'top_swim', slot: 'top', style: 'swim', name: 'Swimwear', price: 1200, shop: 'sports', c: ['#2aa3d4', '#1a7aa3', '#f2f2f2'] },
  // ---- bottoms ----
  { id: 'bot_trousers_black', slot: 'bottom', style: 'trousers', name: 'Black formal trousers', price: 2200, shop: 'men', c: ['#1f1d22', '#121114'] },
  { id: 'bot_trousers_beige', slot: 'bottom', style: 'trousers', name: 'Beige chinos', price: 1900, shop: 'men', c: ['#c9b38a', '#a8936c'] },
  { id: 'bot_jeans', slot: 'bottom', style: 'jeans', name: 'Blue denim jeans', price: 2400, shop: 'men', c: ['#3b5a8f', '#2a4270'] },
  { id: 'bot_jeans_black', slot: 'bottom', style: 'jeans', name: 'Black skinny jeans', price: 2600, shop: 'women', c: ['#2a2830', '#1a181e'] },
  { id: 'bot_shorts', slot: 'bottom', style: 'shorts', name: 'Khaki shorts', price: 1100, shop: 'men', c: ['#b09a6a', '#8c784e'] },
  { id: 'bot_palazzo_gold', slot: 'bottom', style: 'palazzo', name: 'Gold palazzo', price: 1800, shop: 'ethnic', c: ['#e0b35a', '#b88a35'] },
  { id: 'bot_palazzo_white', slot: 'bottom', style: 'palazzo', name: 'White palazzo', price: 1600, shop: 'ethnic', c: ['#f2efe6', '#cfc9b9'] },
  { id: 'bot_skirt_denim', slot: 'bottom', style: 'skirt', name: 'Denim skirt', price: 1700, shop: 'women', c: ['#4a6aa3', '#33507f'] },
  { id: 'bot_skirt_pleat', slot: 'bottom', style: 'skirt', name: 'Pleated black skirt', price: 1900, shop: 'women', c: ['#26232b', '#17151a'] },
  { id: 'bot_dhoti', slot: 'bottom', style: 'dhoti', name: 'Bengali dhoti', price: 1400, shop: 'ethnic', c: ['#f6f3ea', '#d8cfb8'] },
  { id: 'bot_track', slot: 'bottom', style: 'trousers', name: 'Track pants', price: 1300, shop: 'sports', c: ['#22304f', '#141d33'] },
  // ---- shoes ----
  { id: 'sho_formal', slot: 'shoes', style: 'formal', name: 'Black oxford shoes', price: 3500, shop: 'shoes', c: ['#141216'] },
  { id: 'sho_sneaker_w', slot: 'shoes', style: 'sneaker', name: 'White sneakers', price: 4200, shop: 'shoes', c: ['#f4f4f4'] },
  { id: 'sho_sneaker_r', slot: 'shoes', style: 'sneaker', name: 'Red high-tops', price: 4800, shop: 'shoes', c: ['#c0283a'] },
  { id: 'sho_heels', slot: 'shoes', style: 'heels', name: 'Gold block heels', price: 3900, shop: 'shoes', c: ['#d4a64a'] },
  { id: 'sho_heels_blk', slot: 'shoes', style: 'heels', name: 'Black stilettos', price: 4400, shop: 'shoes', c: ['#141216'] },
  { id: 'sho_jutti', slot: 'shoes', style: 'jutti', name: 'Embroidered juttis', price: 1600, shop: 'shoes', c: ['#b8862c'] },
  { id: 'sho_kolhapuri', slot: 'shoes', style: 'sandal', name: 'Kolhapuri chappals', price: 1200, shop: 'shoes', c: ['#8a5a32'] },
  { id: 'sho_boots', slot: 'shoes', style: 'boots', name: 'Chelsea boots', price: 5200, shop: 'shoes', c: ['#5a3a24'] },
  // ---- eyewear ----
  { id: 'eye_none', slot: 'glasses', style: 'none', name: 'No glasses', price: 0, shop: 'eyewear', c: [] },
  { id: 'eye_rect', slot: 'glasses', style: 'rect', name: 'Black rectangular specs', price: 2500, shop: 'eyewear', c: ['#1a1a1a', 'clear'] },
  { id: 'eye_round', slot: 'glasses', style: 'round', name: 'Gold round specs', price: 2900, shop: 'eyewear', c: ['#c9a24a', 'clear'] },
  { id: 'eye_aviator', slot: 'glasses', style: 'aviator', name: 'Aviator sunglasses', price: 5500, shop: 'eyewear', c: ['#c9a24a', '#3a3a2a'] },
  { id: 'eye_wayfarer', slot: 'glasses', style: 'rect', name: 'Black wayfarer shades', price: 4800, shop: 'eyewear', c: ['#111111', '#1c1c24'] },
  { id: 'eye_cateye', slot: 'glasses', style: 'cateye', name: 'Cat-eye sunglasses', price: 5200, shop: 'eyewear', c: ['#7a1f3a', '#2a1a20'] },
  { id: 'eye_pink', slot: 'glasses', style: 'round', name: 'Pink tinted round shades', price: 3600, shop: 'eyewear', c: ['#e090b0', '#d47a9a'] },
  // ---- hats ----
  { id: 'hat_none', slot: 'hat', style: 'none', name: 'No hat', price: 0, shop: 'jewel', c: [] },
  { id: 'hat_cap', slot: 'hat', style: 'cap', name: 'Black baseball cap', price: 800, shop: 'sports', c: ['#1d1b20'] },
  { id: 'hat_cap_r', slot: 'hat', style: 'cap', name: 'Red cap', price: 800, shop: 'sports', c: ['#c0283a'] },
  { id: 'hat_beanie', slot: 'hat', style: 'beanie', name: 'Mustard beanie', price: 700, shop: 'men', c: ['#d9a441'] },
  { id: 'hat_fedora', slot: 'hat', style: 'fedora', name: 'Brown fedora', price: 2600, shop: 'men', c: ['#6b4a2a'] },
  { id: 'hat_sun', slot: 'hat', style: 'sunhat', name: 'Straw sun hat', price: 1500, shop: 'women', c: ['#e6cf8a'] },
  // ---- earrings ----
  { id: 'ear_none', slot: 'earrings', style: 'none', name: 'No earrings', price: 0, shop: 'jewel', c: [] },
  { id: 'ear_jhumka', slot: 'earrings', style: 'jhumka', name: 'Antique gold jhumkas', price: 4500, shop: 'jewel', c: ['#c9a24a'] },
  { id: 'ear_studs', slot: 'earrings', style: 'studs', name: 'Diamond studs', price: 12000, shop: 'jewel', c: ['#e8f4ff'] },
  { id: 'ear_hoops', slot: 'earrings', style: 'hoops', name: 'Gold hoops', price: 3800, shop: 'jewel', c: ['#d4a64a'] },
  { id: 'ear_silver', slot: 'earrings', style: 'jhumka', name: 'Oxidised silver jhumkas', price: 1600, shop: 'jewel', c: ['#9aa0a8'] },
];
export const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Character presets made from the reference photos.
export const PRESETS = {
  him: {
    gender: 'm', skin: '#9a6446', hair: 'swept', hairColor: '#141010', eyes: '#3b2414',
    beard: 'short', lip: 'none', liner: false, blush: false, shadow: 'none', nails: 'none',
    top: 'top_waistcoat', bottom: 'bot_trousers_black', shoes: 'sho_formal',
    glasses: 'eye_rect', hat: 'hat_none', earrings: 'ear_none', pin: true,
  },
  her: {
    gender: 'f', skin: '#f2cfb3', hair: 'long', hairColor: '#2b1a12', eyes: '#5a3a22',
    beard: 'none', lip: '#c27a6e', liner: true, blush: true, shadow: '#a87a5a', nails: '#d9a1a0',
    top: 'top_kurta_mustard', bottom: 'bot_palazzo_gold', shoes: 'sho_jutti',
    glasses: 'eye_none', hat: 'hat_none', earrings: 'ear_jhumka', pin: false,
  },
};
export const STARTER_ITEMS = ['top_waistcoat', 'bot_trousers_black', 'sho_formal', 'eye_rect', 'eye_none', 'hat_none', 'ear_none',
  'top_kurta_mustard', 'bot_palazzo_gold', 'sho_jutti', 'ear_jhumka', 'top_tee_white', 'bot_jeans', 'sho_sneaker_w', 'top_swim'];

// food kinds are drawn procedurally in scenes.js
export const MENUS = {
  flurys: {
    name: 'Flurys', tag: 'Tea room & confectioners on Park Street, since 1927', theme: ['#f6dfe4', '#b5566a', '#5a2a34'],
    items: [
      ['English Breakfast', 495, 'breakfast'], ['Rum Ball', 90, 'rumball'], ['Chocolate Truffle Pastry', 180, 'pastry'],
      ['Chicken Ham & Cheese Sandwich', 295, 'sandwich'], ['Masala Cheese Omelette', 265, 'omelette'], ['Lemon Tart', 170, 'tart'],
      ['Pot of Darjeeling Tea', 220, 'tea'], ['Hot Chocolate', 260, 'coffee'], ['Cold Coffee with Ice Cream', 240, 'shake'],
    ],
  },
  petercat: {
    name: 'Peter Cat', tag: 'Park Street classic — famous for Chelo Kebab', theme: ['#2a2018', '#d9a441', '#f4e8cc'],
    items: [
      ['Chelo Kebab', 520, 'chelo'], ['Chicken Sizzler', 560, 'sizzler'], ['Fish Tikka', 450, 'kebab'],
      ['Prawn Cocktail', 420, 'cocktailprawn'], ['Chicken à la Kiev', 480, 'kiev'], ['Caramel Custard', 160, 'custard'],
      ['Iced Tea', 180, 'icedtea'], ['Fresh Lime Soda', 140, 'lime'],
    ],
  },
  mocambo: {
    name: 'Mocambo', tag: 'Old-world continental on Mirza Ghalib Street', theme: ['#3a1218', '#e3b341', '#f7ecd6'],
    items: [
      ['Devilled Crab', 480, 'crab'], ['Fish à la Diana', 560, 'fishplate'], ['Chicken Stroganoff', 520, 'stroganoff'],
      ['Lobster Thermidor', 1250, 'lobster'], ['Mixed Grill', 640, 'sizzler'], ['Baked Alaska', 350, 'alaska'],
      ['Cold Coffee', 220, 'shake'], ['Cream of Tomato Soup', 210, 'soup'],
    ],
  },
  trincas: {
    name: 'Trincas', tag: 'Live music every evening on Park Street', theme: ['#141a2e', '#e05a8a', '#f2f2f2'],
    items: [
      ['Chilli Fish', 460, 'chilli'], ['Chicken Kiev', 540, 'kiev'], ['Prawn Mayonnaise', 480, 'cocktailprawn'],
      ['Mixed Fried Rice', 380, 'friedrice'], ['Hakka Noodles', 360, 'noodles'], ['Blue Lagoon Mocktail', 280, 'mocktail'],
      ['Virgin Mojito', 260, 'lime'], ['Chocolate Brownie with Ice Cream', 300, 'brownie'],
    ],
  },
  arsalan: {
    name: 'Arsalan', tag: 'Kolkata biryani — with the potato!', theme: ['#1e3a24', '#e3b341', '#f7ecd6'],
    items: [
      ['Mutton Biryani', 390, 'biryani'], ['Chicken Biryani', 330, 'biryani'], ['Chicken Chaap', 280, 'curry'],
      ['Mutton Rezala', 360, 'rezala'], ['Chicken Tikka Kebab', 320, 'kebab'], ['Rumali Roti', 30, 'roti'],
      ['Firni', 110, 'firni'], ['Shahi Tukda', 140, 'custard'],
    ],
  },
  kusum: {
    name: 'Kusum Rolls', tag: 'Park Street kathi roll counter', theme: ['#f2c230', '#b8162c', '#1d1b20'],
    items: [
      ['Egg Roll', 70, 'roll'], ['Egg Chicken Roll', 120, 'roll'], ['Double Egg Double Chicken Roll', 180, 'roll'],
      ['Mutton Roll', 150, 'roll'], ['Paneer Roll', 110, 'roll'], ['Lime Soda', 60, 'lime'],
    ],
  },
  balaram: {
    name: 'Balaram Mullick & Radharaman Mullick', tag: 'Bhowanipore sweets since 1885', theme: ['#fbf1d8', '#b8162c', '#5a2a1a'],
    items: [
      ['Rosogolla (2 pcs)', 50, 'rosogolla'], ['Baked Rosogolla', 45, 'bakedroso'], ['Nolen Gur Sandesh', 40, 'sandesh'],
      ['Jolbhora Sandesh', 50, 'sandesh'], ['Mishti Doi (bhar)', 80, 'doi'], ['Abar Khabo', 40, 'sandesh'],
      ['Chocolate Sandesh', 45, 'sandesh'],
    ],
  },
  coffeehouse: {
    name: 'Bean & Brew Café', tag: 'Cosy third-wave coffee & bakes', theme: ['#efe4d2', '#6b4226', '#2a1a12'],
    items: [
      ['Cappuccino', 220, 'coffee'], ['Hazelnut Cold Brew', 260, 'shake'], ['Avocado Toast', 340, 'sandwich'],
      ['Blueberry Cheesecake', 290, 'pastry'], ['Croissant', 160, 'croissant'], ['Masala Chai', 120, 'tea'],
    ],
  },
  foodcourt: {
    name: 'Food Court', tag: 'Something for everyone', theme: ['#fff4e0', '#e8603c', '#2a2018'],
    items: [
      ['Phuchka (6 pcs)', 60, 'phuchka'], ['Jhalmuri', 40, 'jhalmuri'], ['Chicken Momo', 160, 'momo'],
      ['Pizza Slice', 220, 'pizza'], ['Burger & Fries', 249, 'burger'], ['Kolkata Biryani', 300, 'biryani'],
      ['Mango Lassi', 120, 'shake'], ['Kulfi', 80, 'icecream'],
    ],
  },
  street: {
    name: 'Street Stall', tag: 'Maidan-side snacks', theme: ['#f2e2b8', '#8a3a1a', '#2a1a12'],
    items: [
      ['Phuchka (6 pcs)', 40, 'phuchka'], ['Jhalmuri', 30, 'jhalmuri'], ['Ghugni', 40, 'curry'],
      ['Bhaar Cha (clay-cup tea)', 15, 'chai'], ['Egg Roll', 60, 'roll'],
    ],
  },
};

export const SHOP_NAMES = {
  men: 'Urban Threads — Menswear', women: 'Bloom — Womenswear', ethnic: 'Tant & Zari — Ethnic Wear',
  shoes: 'Sole Street', eyewear: 'Specs & Shades', jewel: 'Gold Leaf Jewellers', sports: 'Maidan Sports',
};

export const NPC_LINES = [
  'Ki khobor? Lovely weather for a walk on the Maidan!',
  'Have you tried the phuchka near Victoria? Best in the city.',
  'Park Street at Christmas is magic — all those lights!',
  'Traffic at Exide crossing… don\'t even ask.',
  'Mohun Bagan will win the derby this year, mark my words.',
  'East Bengal forever! Joy East Bengal!',
  'My cousin works at SSKM. Those doctors never sleep.',
  'Flurys rum balls — buy two, you\'ll want the second one.',
  'A movie at Nandan, then coffee? Perfect evening.',
  'The yellow taxis are slowly disappearing, you know. Ride one while you can.',
  'Rabindra Sarovar in the morning — joggers, rowers, everyone.',
  'Careful, the monkeys near the zoo steal sunglasses!',
  'Quest Mall has a new sale on. My wallet is crying.',
  'Adda over bhaar cha — that\'s the Kolkata way.',
  'Durga Puja is coming. Pandal hopping all night!',
  'Someone parked a Lamborghini on Park Street again. Show-offs.',
];

export const PLACE_TIPS = {
  Maidan: 'The lungs of Kolkata — football, horses and endless green.',
  'Victoria Memorial': 'White marble memorial (1921). Gardens, a lake and horse carriages.',
  'Park Street': 'Food Street of Kolkata — Flurys, Peter Cat, Mocambo, Trincas.',
  'Exide Crossing': 'The busiest crossing in central Kolkata.',
  Esplanade: 'Dharmatala — buses, trams and shopping.',
};
