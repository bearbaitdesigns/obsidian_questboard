# ⚔️ Quests of Tasklandia — a fantasy chore & task board for Obsidian

Turn chores and tasks into quests. Create a hero, pick quests off the board, keep up your daily habits, train your stats, tame pets, arm yourself at the blacksmith, and defeat a growing line of twenty bosses threatening Tasklandia on the long road to level 100. Spend your gold on gear, potions and real-life rewards.

Works on **desktop and mobile** (no build step, no Node APIs).

## Install

1. In your vault, open the hidden folder `.obsidian/plugins/` (create `plugins` if it doesn't exist).
2. Create a folder named `quests-of-tasklandia` and put `main.js`, `manifest.json` and `styles.css` inside it. If you're upgrading Quests of Tasklandia, replace the old files and keep `data.json`.
3. In Obsidian: **Settings → Community plugins** → turn off Restricted mode if needed → reload the list → enable **Quests of Tasklandia**.
4. Click the ⚔️ swords icon in the ribbon, or run the command **Quests of Tasklandia: Open quest board**.

**On mobile:** the plugin folder must be inside your vault's `.obsidian/plugins/` on the phone too. If you sync your vault with Obsidian Sync (with "Installed community plugins" sync turned on), iCloud, or Syncthing, install it on desktop and it will follow. Progress is stored in `data.json` in the plugin folder, so it syncs between devices as well.

**Coming from Questboard (the plugin's old name):** install Quests of Tasklandia alongside it and enable it. On first launch it copies your hero, quests, dailies, gear and progress from the old `questboard` folder automatically, then tells you so. After that you can disable and delete the old Questboard plugin.

**Upgrading from Questboard v1:** you'll be asked to create your hero. Your level, gold, quests and rewards are kept, and you get one stat point to spend for every level you had already earned.

## Create your hero

| Choice | Effect |
|---|---|
| **Name & motto** | Shown on your hero card. |
| **Gender** | Sets your portrait, which evolves at levels 8, 20, 40, 70 and 100. It does not affect stats. |
| **Background** | Blacksmith's apprentice (+3 STR +1 CON) · Former soldier (+2 STR +2 CON) · Forest ranger (+3 AGI +1 CON) · Reformed thief (+1 STR +3 AGI) · Farmhand (+1 STR +3 CON) · Wandering scholar (+2 AGI +2 CON) · Travelling bard (+1 AGI +3 CHA) · Merchant's heir (+1 CON +3 CHA) · Royal beastkeeper (+1 STR +1 CON +2 CHA) |
| **Homeland** | Golden Plains (+1 STR) · Elderwood (+1 AGI) · Ironpeak Mountains (+1 CON) · Kingsport (+1 CHA) |
| **Goal** | Get stronger and fitter (+2 STR) · Get things done (+2 AGI) · Build healthy habits (+2 CON) · Keep a tidy home (+1 STR +1 CON) · Find balance (+1 AGI +1 CON) · Strengthen my relationships (+2 CHA) · Be kinder to myself and others (+1 CON +1 CHA) |

Every stat starts at 5 before these bonuses. You can edit your hero later on the Hero tab; changing your origins re-rolls only the starting stats.

## Stats & health

| Stat | What it does |
|---|---|
| 💪 **Strength** | Boss damage multiplier: 1 + 8% per point. |
| 🏹 **Agility** | Critical-hit chance (crits deal 1.5×) and dodge chance against boss attacks. Both use diminishing returns so Agility stays useful up to level 100: crit = 35% × AGI ÷ (AGI + 40), dodge = 50% × AGI ÷ (AGI + 40). |
| 🛡️ **Constitution** | Max health +5 per point. |
| 🎭 **Charisma** | Tames pets faster (+4% trust per point), lowers the chance a pet flees, and earns a merchant discount on gear and potions (up to 25%). |

**Max health** = 50 + 10 × level + 5 × CON, so your health bar grows as you level up.

**Raising stats**
- **Level-ups:** each level grants 1 stat point to spend on the Hero tab. Leveling up also fully heals you.
- **Gear:** weapons and armor from the Treasury add stat bonuses while equipped (see Armory below).
- **Training quests:** some quests grant +1 to a stat when completed, e.g. a 30-minute workout gives +1 Strength, cleaning the entire house gives +1 Constitution, and calling a friend gives +1 Charisma. The quest form suggests a stat from the quest name (workout/gym → STR; run/walk/yoga → AGI; entire house/deep clean/meal prep/sleep → CON; call/visit/friend/family/host/party/volunteer/thank → CHA), and you can change it.

**Healing:** completing quests restores 4–12 HP depending on difficulty. Each daily check restores 2 HP. A 🧪 Healing draught in the Treasury restores 50% of your health; it costs 25 + 3 × level gold, less your Charisma discount.

## Levels (1–100)

- **Max level is 100.** XP needed for the next level is 50 × level^1.25 + 50: 100 XP at level 1, about 940 at level 10, 5,080 at level 40 and 15,660 at level 99. Reaching 100 takes roughly 700,000 XP in total, a long-term goal.
- **Rewards grow with you:** quest and daily XP and gold are multiplied by 1 + 2% per level above 1 (about 3× at level 100).
- **Titles:** Wandering Peasant (1) → Squire (3) → Adventurer (5) → Knight-Errant (8) → Knight (12) → Champion (16) → Paladin (20) → Battlemage (25) → Archmage (30) → Dragonslayer (40) → Legend of the Realm (50) → Warden of Tasklandia (60) → Archon (70) → Mythbreaker (80) → Demigod (90) → Eternal Sovereign of Tasklandia (100).
- Each level-up gives a stat point, a full heal and a gold purse of 10 × your new level. Pets unlock at level 5, and new armory tiers and pet rarities unlock along the way.

## Stamina

Stamina ⚡ is your daily energy, shown as the green bar under your health. Like health and XP, it isn't a stat.

- **Every quest costs stamina**, and harder quests cost more: T 1 · E 2 · M 4 · H 6 · L 10. The cost is shown on each quest card.
- **Too tired?** If a quest costs more than you have left, its Complete button reads *Too tired* until tomorrow. Easier quests may still fit.
- **Dailies are free:** they never use stamina.
- **Refills every day** at midnight.
- **Grows with you:** 20 at level 1 (exactly two Legendary quests), plus 2 per level (218 at level 100). Levelling up adds the new capacity right away, but doesn't refill the bar.
- **⚗️ Tonic of vigour:** sold in the Treasury, restores half your stamina. Up to **2 per day** (the count resets at midnight), and the price rises with your level (Charisma discount applies).

Stamina keeps the climb to level 100 a long journey: even doing nothing but Legendary quests and drinking two tonics every day, it takes at least seven weeks.

## Bosses

A boss is always threatening Tasklandia. When a new boss appears (your first foe, and each one after a victory), a pop-up tells its tale, with its health, attack and bounty. It's shown under your hero card, and the full tale stays on the Hero tab. Every completed quest strikes it:

| Rank | Difficulty | XP | Gold | Base boss damage |
|---|---|---|---|---|
| T | Trivial | 10 | 5 | 3 |
| E | Easy | 25 | 12 | 6 |
| M | Moderate | 50 | 25 | 12 |
| H | Hard | 100 | 50 | 22 |
| L | Legendary | 250 | 125 | 45 |

**Damage** = base damage × Strength multiplier, with an Agility-based chance to crit. Each daily check also deals a small hit (base 2). Defeating a boss pays a bounty of XP and gold, and the next, harder boss appears.

### The progression

| # | Boss | HP | Attack | The threat |
|---|---|---|---|---|
| 1 | 🐀 The Rat King | 80 | 6 | Rats swarm the village granary. |
| 2 | 👺 Snaggletooth, Goblin Warchief | 140 | 10 | Goblins torch the eastern farms. |
| 3 | 🧙‍♀️ The Bog Witch of Mirefen | 220 | 13 | A hag curses the village wells. |
| 4 | 🐺 Shadowfang, the Dire Alpha | 320 | 17 | A giant wolf stalks the King's Road. |
| 5 | 🧌 Grumthak the Bridge Troll | 450 | 22 | A troll seizes the Rushwater bridge. |
| 6 | 🐲 Vexira, Wyvern of the Ashen Peaks | 600 | 26 | A wyvern is attacking the village. |
| 7 | 💀 Morthul the Lich | 800 | 32 | The dead rise from the sunken crypt. |
| 8 | 🏔️ Jarl Hrimgar, the Frost Giant | 1050 | 38 | An endless winter marches south. |
| 9 | 🐙 The Kraken of the Grey Sea | 1350 | 46 | Fishing fleets vanish beneath the waves. |
| 10 | 🐉 Vyrmathrax the Elder Dragon | 1700 | 54 | The Devourer of Kingdoms awakens. |
| 11 | 🦂 Skarrix, Queen of the Dune Scorpions | 2100 | 60 | Her brood strikes from beneath the southern fields. |
| 12 | 🧛 Countess Velmora the Bloodless | 2550 | 66 | A vampire drains the valley's cattle and night watch. |
| 13 | 🦅 The Thunderbird of Stormcrown | 3050 | 72 | Lightning hunts every harvest in the valley. |
| 14 | 🗿 The Iron Colossus | 3600 | 79 | An ancient war golem marches on the capital. |
| 15 | 🕷️ Arachnae, the Web-Mother | 4200 | 86 | A cathedral-sized spider spins the Elderwood shut. |
| 16 | 🔥 Pyrrhax, Lord of Cinders | 4850 | 93 | A lord of living flame boils the rivers. |
| 17 | 🧞 Zarathiel, Djinn of Broken Wishes | 5550 | 100 | Every wish in the realm is twisted into calamity. |
| 18 | 👁️ The Eye Beyond the Stars | 6300 | 108 | Those who meet its gaze forget their names. |
| 19 | 🌑 Nyxara, the Devouring Night | 7100 | 116 | The daylight is being swallowed hour by hour. |
| 20 | 👑 The Hollow King | 8000 | 125 | The betrayed first king returns as a god of ruin. |

After the Hollow King, the cycle repeats as **Ascended**, then **Mythic**, then **Eternal** versions with more health (+75% per cycle) and harder attacks (+50% per cycle).

**Overdue quests:** each day a quest stays past its due date, the boss attacks you once for it (you may dodge with Agility). If your health hits 0, you **lose a level** (and that level's stat point) and wake up fully healed. At level 1 you lose half your gold instead. After felling you, the boss stops attacking for the rest of that day. You can turn boss attacks off in settings.

**Boss attack pop-up:** when the boss strikes, a pop-up shows the boss, how much damage you took, your health before and after, and which overdue quest caused each hit. Several hits at once are added up in one pop-up. It also tells you when you dodged, when your health is low, and when you've been struck down.

## Armory

The Treasury's blacksmith sells **weapons** and **armor**, with one slot for each. Equipping an item adds its stat bonuses; unequipping it (or swapping to another piece) removes them. Bought items stay in your pack, so you can switch back any time.

- **Weapons** lean on Strength and Agility (hammers and axes for STR, bows and daggers for AGI).
- **Armor** leans on Constitution, with Agility for light gear and Strength for heavy plate.
- **Scaling:** 60 unique items across 15 tiers. A new tier unlocks at levels 1, 4, 8, 12, 16, 20, 25, 30, 40, 50, 60, 70, 80, 90 and 100, with bonuses rising from +2 to +36 total stat points.
- **Charisma discount:** prices shown already include your discount.
- **The shop** shows 3–5 of the newest unlocked pieces you don't own yet. Buying an item equips it right away, and each shop row compares it with what you're wearing.

| Tier | Unlocks at | Cost | Weapons | Armor |
|---|---|---|---|---|
| 1 | Level 1 | 40 | Hearthpoker Cudgel · Sparrowstring Shortbow | Patchwork Gambeson · Cellar-Rat Leathers |
| 2 | Level 4 | 90 | Millstone Maul · Whisperthorn Dagger | Riverstone Brigandine · Foxglove Hunting Coat |
| 3 | Level 8 | 160 | Bellringer's Warhammer · Gale-Feather Longbow | Oxblood Ringmail · Moth-Silk Mantle |
| 4 | Level 12 | 250 | Troll-Tusk Cleaver · Mirefen Hexblade | Granite Warden Plate · Shadowfang Pelt |
| 5 | Level 16 | 360 | Emberwake Glaive · Twinfang Sabres | Wyvernscale Hauberk · Bulwark of Saint Odila |
| 6 | Level 20 | 500 | Gravebinder Scythe · Starfall Recurve | Bonewright Carapace · Duskweaver Shroud |
| 7 | Level 25 | 680 | Rimefang Greataxe · Quicksilver Rapier | Glacier-Heart Plate · Windrunner Harness |
| 8 | Level 30 | 900 | Leviathan's Trident · Stormcaller Javelins | Abyssal Coral Mail · Aegis of the Lighthouse |
| 9 | Level 40 | 1150 | Kingsbane, the Dragon's Tooth · Eclipse Longbow | Dragonhide Regalia · Veil of a Thousand Steps |
| 10 | Level 50 | 1450 | Dawnbreaker · Worldroot Quarterstaff | Mantle of the Undying Legend · Starforged Bastion |
| 11 | Level 60 | 1800 | Thornqueen's Lash · Colossus-Breaker | Scorpion-Queen Chitin · Velvet Nightguard |
| 12 | Level 70 | 2200 | Thunderbird's Talon · Cindercrown Flamberge | Pyrrhax Ashplate · Silkwarden Cuirass |
| 13 | Level 80 | 2700 | Wishbreaker · Voidglass Warbow | Lamp-Bound Panoply · Eyeless Watcher's Robe |
| 14 | Level 90 | 3300 | Sunspear of the Last Dawn · Nightpiercer Crossbow | Daybound Bulwark · Duskstrider Raiment |
| 15 | Level 100 | 4000 | Crownsplitter, Blade of Tasklandia · Everbloom Greatbow | Regalia of the Unbroken Oath · Cloak of Ten Thousand Quests |

## Random quests

Can't decide what to do? Tap **🎲 Random quest** on the Board (or run **Roll a random quest**). The Oracle of the Guildhall draws a real-life chore or task with a fantasy name, such as *Tame the laundry hydra* (wash, dry and fold a load of laundry) or *Visit the elders of your clan* (call or visit a parent or grandparent).

- **60 quests** across every guild and difficulty, many of them training a stat.
- **Filter** by guild and/or difficulty, and **reroll** as often as you like. Quests already on your board are skipped.
- **Fate's favour:** post a quest exactly as rolled and it's marked 🎲 Fated, earning **+15% XP and gold**. Choose **Edit first** to tweak it (due date, repeats, difficulty) and it becomes a normal quest without the bonus.

## Your own pictures

Every boss, pet, weapon, armor piece and your hero can show **your own image** instead of its emoji.

- **🖼️ buttons:** use *Hero picture* on the Hero tab, *Boss picture* under the boss's tale (or tap any boss you've met in the bestiary), *Change picture* on the creature you're taming, the 🖼️ button on each pet in your menagerie, and the 🖼️ button on every weapon and armor row in the armory.
- **The picker** shows your image library. Tap an image to use it, upload a new one, or choose **Use emoji** to go back. Each thumbnail shows where it's used, and 🗑 deletes it (anything using it returns to its emoji).
- **Uploading:** PNG, JPG, GIF, WebP or SVG, from your computer or your phone's photos. Big images are shrunk to 512 px so the plugin stays light; square images look best. GIFs keep their animation.
- **Storage:** images are saved inside the plugin's own folder (`.obsidian/plugins/quests-of-tasklandia/art/`), so they're part of the plugin and don't appear among your notes.
- **Settings → Pictures:** *Manage pictures* opens the library to upload or tidy images in bulk; *Clear picture choices* puts every emoji back (images stay in the library).
- **Syncing:** iCloud, Syncthing, Dropbox and similar tools copy the art folder along with everything else. Obsidian Sync may only sync a plugin's main files; if a picture doesn't appear on another device, it simply shows the emoji there, and you can upload it on that device too.

## Pets

From **level 5** you can tame creatures on the 🐾 Pets tab. Pets are companions only: they give **no bonuses** against quests or bosses.

- **One at a time:** choose a wild creature to befriend. You can't start another until it's tamed or you let it go.
- **Trust:** every completed quest earns trust (Trivial 2 · Easy 4 · Moderate 7 · Hard 11 · Legendary 18), multiplied by 1 + 4% per Charisma point. Higher Charisma means faster taming.
- **Missed quests:** each time a quest goes overdue (once per quest per day), the creature may flee and all its trust is lost. If it stays, it loses 10% of its trust. Charisma lowers the flee chance. This applies even if boss attacks are turned off.
- **Menagerie:** tamed pets live here. Name them, rename them, and pick one as your companion to show on your hero card.

| Rarity | Appears at | Creatures | Trust needed |
|---|---|---|---|
| Common | Level 5 | 🐈‍⬛ Hearth Cat · 🐕 Village Hound · 🦉 Barn Owl · 🐇 Meadow Hare | 30–35 |
| Uncommon | Level 15 | 🦊 Ember Fox · 🦝 Lantern Raccoon · 🐐 Crag Goat · 🦇 Duskwing Bat · 🦔 Bramble Hedgehog | 60–65 |
| Rare | Level 30 | 🐺 Moonwolf Pup · 🦅 Sky Falcon · 🐻 Honeybear Cub · 🦌 Silver Stag | 100–120 |
| Epic | Level 50 | 🦄 Starlight Unicorn · 🦎 Hatchling Drake · 🦁 Sunmane Lion Cub | 180–190 |
| Legendary | Level 75 | 🐣 Phoenix Hatchling · 🐢 Ancient World-Turtle · 🐋 Skywhale Calf | 280–300 |
| Mythic | Level 90 | 🐲 Celestial Wyrmling | 420 |

Each creature's base flee chance (25–45%) is shown before you begin, already reduced by your Charisma.

## Background and glass panels

The dashboard sits in front of a stormy mountain pass: jagged snowy peaks, lightning, and a rope bridge over a chasm. The hero card, boss bar, tabs and the panels on each page are frosted glass, and the quest board keeps its cork-and-parchment look.

In **Settings → Quests of Tasklandia** you can:
- Turn **Fantasy background** off to go back to the plain theme.
- Use **Background dimming** (0–80%, default 25%) to make text easier to read.
- **Choose picture…** to use your own background image. Wide landscape images work best; large ones are shrunk to 1920 px.

## Tabs

| Tab | What it does |
|---|---|
| 📋 **Board** | Available quests, pinned like parchment notices, with XP, gold, boss damage and any stat reward. Filter by guild, sort by reward or due date, or roll a 🎲 random quest. **Accept** a quest to take it on. Every accepted quest needs a **due date**: if it doesn't have one, a window asks you to pick one (Today, Tomorrow, In 3 days, In a week, or any date) before it moves to your log. |
| ☀️ **Dailies** | Small daily habits, like brushing your teeth twice a day. Tap to check off; each check earns 5 XP, 2 gold and 2 HP and hits the boss (XP and gold rewards scale with your level). Reaching a daily's target gives +10 XP and +5 gold and builds its streak. Finish every daily for a **Daily discipline** bonus of +25 XP and +10 gold. Dailies reset at midnight. |
| 🗡️ **Active** | Your quest log (3 slots by default). **Complete** to claim rewards, or **Abandon** to return it to the board. |
| 🐾 **Pets** | Tame one creature at a time, watch its trust grow, and keep tamed pets in your menagerie. Unlocks at level 5. |
| 🧑 **Hero** | Your profile, attributes and stat points to spend, equipped gear, the current boss and its tale, and the bestiary. |
| 💰 **Treasury** | The armory (equipped gear, the blacksmith's wares, your pack), healing draughts, tonics of vigour, and real-life rewards you define and buy with gold. |
| 📖 **Chronicle** | Your history of quests, boss victories, attacks, falls and purchases, plus lifetime stats. |

**Quest bonuses**
- 🔥 **Streak:** +5% per consecutive day you finish at least one quest (max +50%).
- ⏳ **On time:** +10% for finishing on or before a quest's due date.
- 🎲 **Fate's favour:** +15% for random quests posted as rolled.
- 🎉 **Level-up purse:** bonus gold each time you level up (10 × new level).

**Recurring quests** (daily / weekly / monthly) rest after completion and return to the board automatically. Their due date rolls forward too.

**Guilds** group quests by type: 🏠 Hearth, 🛒 Market, 📜 Scriptorium, ⚔️ Training Grounds, 🌿 Garden, 💰 Treasury, 🍺 Tavern, 🧭 Wanderer.

**Titles** grow with your level, up to Eternal Sovereign of Tasklandia at level 100 (see Levels above).

## Link to the quest board from a note

Put a clickable link in any note that opens the quest board in a new tab. Run **Insert quest board link in this note** from the command palette, or paste:

````
```tasklandia-link
label: Quests of Tasklandia
```
````

Optional lines (each one overrides the default from settings):

| Option | Example | What it does |
|---|---|---|
| `label` | `label: My quests` | Text on the link |
| `tab` | `tab: dailies` | Page to open: `board`, `dailies`, `active`, `hero`, `pets`, `treasury` or `chronicle` |
| `size` | `size: large` | `tiny`, `small`, `medium`, `large`, `xl`, `xxl`, a multiplier (`1.5`), a percent (`150%`) or pixels (`22px`). The whole link scales together |
| `style` | `style: button` | `card` (picture, title, subtitle), `button` (compact pill) or `icon` (picture only) |
| `align` | `align: center` | `left`, `center` or `right` on its line |
| `float` | `float: right` | Sit beside the following text, which wraps around it (`left` or `right`) |
| `width` | `width: full` | Stretch the card across the note |
| `icon` | `icon: crown` | Any [Lucide](https://lucide.dev) icon name |
| `image` | `image: [[Attachments/quest.png]]` | A picture from your vault (path or wikilink), an image URL, or `art:file.png` from the plugin's art library |
| `subtitle` | `subtitle: Spend my stat points` | Second line on the card style |

### Inline links (anywhere in a sentence)

To put the link *inside* text (a sentence, list item, callout or table cell), use inline code. Run **Insert inline quest board link (inside a sentence)** from the command palette, or type:

```
Before bed, tick off my `tasklandia-link: label=dailies; tab=dailies` for today.
```

Options use `key=value` separated by `;` (or `|`), and are the same as above. Inline links default to the compact button that matches the surrounding text. Plain `` `tasklandia-link` `` uses your defaults, and `` `tasklandia-link: My quests` `` sets just the label.

Inline links render in Reading view and in Live Preview. In Live Preview, put your cursor on the link's text to edit its code.

**Default icon and picture.** The default is a swords icon. To change it for every link, go to **Settings → Quests of Tasklandia → Note link**. There you can:
- Set a different icon name and the default size and style.
- **Choose…** a picture already in your vault.
- **Upload…** one from your computer (saved to the plugin's art library).
- Paste a path or URL.

The preview at the top updates as you go, and links already in your notes update too. If a picture can't be found, the link falls back to the icon.

**New tab behavior.** Clicking opens the quest board in a new tab. If it's already open, the link switches to that tab instead; turn on **Always open a new tab** if you'd rather get a fresh tab every time.

**Plain Markdown links.** These also work: `[My quests](obsidian://tasklandia)` or `[Dailies](obsidian://tasklandia?tab=dailies)`.

## Commands
- Open quest board
- Post a new quest
- Roll a random quest
- Open dailies
- Open hero sheet
- Open treasury
- Open pets
- Insert quest board link in this note
- Insert inline quest board link (inside a sentence)

## Settings
Quest log capacity (1–10) · reward multiplier (0.5×–2×) · streak bonus on/off · require accepting quests (turn off to complete straight from the board) · overdue quests trigger boss attacks on/off (overdue quests can still scare off a pet you're taming) · fantasy background on/off, background dimming and your own background picture · reset hero / reset everything.
