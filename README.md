# Kolkata Together

A private two-player open-city game set in central Kolkata. It runs in any modern browser, on laptops and phones.

Walk, drive and hang out around Park Street, the Maidan, Victoria Memorial, Exide Crossing, SSKM, Nandan, the malls, the zoo, Rabindra Sarovar and more. Eat at Flurys, Peter Cat, Mocambo, Trincas, Arsalan and Balaram Mullick. Shop and try on clothes, get a makeover, take selfies together, and text or voice-call each other in-game. GTA-style trouble is also in: stolen cars, mugging and bank heists, with the police coming after you.

## Play it

1. Open the game URL (see **Hosting** below).
2. Type your name and pick your character ("He" or "She").
3. Both players type the **same secret game code** and press **Play online together**.
   - The first person to arrive hosts and the second joins. A third person with the same code is refused, so the game stays just the two of you.
   - Keep the code private. Use something unguessable, such as `adda-flurys-8271`.
4. **Explore solo** works without a partner.

### Controls

| Key | Action |
|---|---|
| WASD / arrows | Move (hold **Shift** to run). Phones get an on-screen stick |
| **E** / Enter | Talk, enter buildings, sit, use things, stand up |
| **F** | Get in/out of cars (steal or jack them) · threaten someone while holding a weapon |
| **Space** | Attack / shoot / kick the football · horn while driving |
| **Q** | Cycle weapons |
| **P** | Phone: cabs, table reservations, map, banking, garage, tag game, music |
| **T** | Text chat · **V** voice call · **C** selfie · **M** map · **H** help · **Esc** close |

### What's in the city

- **Map**: the Hooghly riverside, Strand Road, the Maidan (Eden Gardens, Fort William, the Mohun Bagan, East Bengal and Mohammedan Sporting tents with football pitches, Shaheed Minar, Brigade Parade Ground) and Red Road. Also Victoria Memorial with its lake, gardens and horse carriages, St Paul's Cathedral, Academy of Fine Arts, Nandan and Rabindra Sadan.
- **Central streets**: Chowringhee, Esplanade, New Market, the Indian Museum, Park Street (Flurys, Oxford Bookstore, Trincas, Mocambo, Peter Cat, Kusum Rolls, The Park, St Xavier's, Park Street Cemetery) and Camac Street.
- **South and east**: Birla Planetarium, Exide Crossing, SSKM Hospital, the Race Course, Forum, Quest, Acropolis and South City malls, Balaram Mullick, Alipore Zoo, a children's park, the Royal Calcutta Golf Club, Rabindra Sarovar (rowing boats), Gariahat market and a water park.
- **Interiors**: 37 enterable buildings, each with its own room, staff and things to do.
- **Cafes**: sit at a table, order from the real signature dishes, and the waiter brings your food to the table. Eat bite by bite in a close-up dining scene, and dine together if you share a table.
- **Malls**: menswear, womenswear, ethnic wear, shoes, eyewear and sunglasses, jewellery, sports, a food court and a cinema. There's a trial room with a large live preview.
- **Salon**: hairstyle and colour, beard, lipstick, eyeliner, blush, eyeshadow, nail paint and coloured lenses.
- **Money**: wallet, bank account, ATMs, a linked credit card (just a nickname, never real details), loans, and sending money to your partner.
- **Crime**: weapons from the Maidan Armoury, mugging, car theft, a vault-cracking minigame, wanted stars and police chases. You can get "CAUGHT!" (fined) or "KNOCKED OUT" (wake up at SSKM).
- **Activities**: football on the Maidan, golf, cricket nets at Eden Gardens, movies, a planetarium show, a Tagore dance-drama, a nightclub, a gym, rowing, the zoo, slides and swings, the water park, buses and Jatri cabs (a taxi actually drives you there), a day and night cycle, and a two-player tag game.
- **Life in the streets**: pedestrians, yellow Ambassador taxis, buses, supercars on Park Street and left-hand traffic. There are also cows on the road (the traffic waits!), stray dogs, horses, goats, crows, monkeys and zoo animals.

## Hosting (recommended: GitHub Pages, free)

The game is plain static files with no build step and no server code. Multiplayer is **peer-to-peer over WebRTC** using [PeerJS](https://peerjs.com). The free public PeerJS service only introduces the two browsers to each other. After that, game data and voice flow directly between you, falling back to the PeerJS relay (TURN) servers when a direct link isn't possible.

1. Push this folder to a GitHub repository (the repo root should contain `index.html`).
2. Go to the repo's **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then select the branch you pushed and `/ (root)`.
3. After about a minute your game is at `https://<your-username>.github.io/<repo-name>/`. Send that link and your secret code to your partner.

Other free static hosts (Netlify drop, Cloudflare Pages, Vercel) work the same way: upload the folder.

**HTTPS is required** for voice calls, because browsers only allow the microphone on secure pages. GitHub Pages is HTTPS by default.

### Optional: your own signalling server

If the public PeerJS server is ever down or blocked on a network, run your own (`npx peer --port 9000`) and open the game with:

```
?peerhost=your-server.example.com&peerport=443&peersecure=1
```

### Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Saving

Progress (money, clothes, cars, weapons, photos) is saved in each player's browser (`localStorage`). Playing on a different device or browser starts a fresh save.

## About the art

All graphics are original pixel art drawn in code: tiles, buildings, characters, food, cars and animals. The style is inspired by the DS-era top-down RPG look and classic top-down crime games, but **no artwork, sprites, music or maps are copied from Pokémon, GTA or any other game**. That keeps the project safe to host publicly.

The two playable characters are based on the reference photos. He has brown skin, black swept-back hair, rectangular glasses, a trimmed beard, a pinstripe shirt with satin waistcoat, tie and lapel pin. She has fair skin, long dark-brown hair, kohl eyeliner, jhumkas and a mustard kurta with gold zari and a dupatta, and is drawn slightly shorter.

## Code map

| File | What it does |
|---|---|
| `js/main.js` | Engine: loop, input, camera, rendering, lighting, gameplay, crime, cabs, multiplayer sync |
| `js/mapgen.js` | The Kolkata map: roads and traffic graph, buildings, landmarks, zones |
| `js/interiors.js` | All 37 interiors and their furniture art |
| `js/art.js` | Tiles, buildings, landmarks, props, vehicles, animals |
| `js/chars.js` | Character sprites and large portraits (clothes, hair, makeup, glasses…) |
| `js/scenes.js` | Close-up scenes: cafe table and food, selfies, cinema / planetarium / TV shows |
| `js/ui.js` | Lobby, HUD, phone, shops, salon, bank, menus, minigames |
| `js/entities.js` | Pedestrians, police, animals, cars, football, bullets |
| `js/net.js` | Two-player PeerJS link, chat and voice calls |
| `js/data.js` | Wardrobe catalogue, cafe menus (edit prices and items here), dialogue |
