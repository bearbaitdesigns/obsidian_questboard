'use strict';

/*
 * Quests of Tasklandia — a fantasy-themed, gamified chore & task list for Obsidian.
 * Plain CommonJS, no build step. Works on desktop and mobile (no Node APIs used).
 */

const OBSIDIAN = require('obsidian');
const { Plugin, ItemView, Modal, Notice, PluginSettingTab, Setting, setIcon } = OBSIDIAN;

const VIEW_TYPE = 'tasklandia-view';
const PLUGIN_NAME = 'Quests of Tasklandia';
const LEGACY_PLUGIN_ID = 'questboard';
const MAX_LEVEL = 100;

/* ------------------------------------------------------------------ */
/* Game tables                                                         */
/* ------------------------------------------------------------------ */

// dmg = base damage dealt to the boss before Strength is applied
const DIFFICULTIES = {
  1: { name: 'Trivial',   rank: 'T', xp: 10,  gold: 5,   sta: 1, dmg: 3,  foe: '🐀', blurb: 'Rats in the cellar' },
  2: { name: 'Easy',      rank: 'E', xp: 25,  gold: 12,  sta: 2, dmg: 6,  foe: '🐺', blurb: 'Wolves at the edge of the wood' },
  3: { name: 'Moderate',  rank: 'M', xp: 50,  gold: 25,  sta: 4, dmg: 12, foe: '👹', blurb: 'A goblin raiding party' },
  4: { name: 'Hard',      rank: 'H', xp: 100, gold: 50,  sta: 6, dmg: 22, foe: '🧌', blurb: 'A troll beneath the bridge' },
  5: { name: 'Legendary', rank: 'L', xp: 250, gold: 125, sta: 10, dmg: 45, foe: '🐉', blurb: 'A dragon atop the mountain' },
};

const GUILDS = {
  hearth:      { name: 'Hearth',           icon: '🏠', desc: 'Household chores' },
  market:      { name: 'Market',           icon: '🛒', desc: 'Errands & shopping' },
  scriptorium: { name: 'Scriptorium',      icon: '📜', desc: 'Work & study' },
  training:    { name: 'Training Grounds', icon: '⚔️', desc: 'Health & fitness' },
  garden:      { name: 'Garden',           icon: '🌿', desc: 'Yard, plants & pets' },
  treasury:    { name: 'Treasury',         icon: '💰', desc: 'Bills & finances' },
  tavern:      { name: 'Tavern',           icon: '🍺', desc: 'Friends & family' },
  misc:        { name: 'Wanderer',         icon: '🧭', desc: 'Everything else' },
};

const RECURRENCE = { none: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const TITLES = [
  [1, 'Wandering Peasant'], [3, 'Squire'], [5, 'Adventurer'], [8, 'Knight-Errant'],
  [12, 'Knight'], [16, 'Champion'], [20, 'Paladin'], [25, 'Battlemage'],
  [30, 'Archmage'], [40, 'Dragonslayer'], [50, 'Legend of the Realm'], [60, 'Warden of Tasklandia'],
  [70, 'Archon'], [80, 'Mythbreaker'], [90, 'Demigod'], [100, 'Eternal Sovereign of Tasklandia'],
];

const STATS = {
  str: { name: 'Strength',     short: 'STR', icon: '💪', desc: 'Increases the damage your quests deal to bosses.' },
  agi: { name: 'Agility',      short: 'AGI', icon: '🏹', desc: 'Chance to land critical hits and to dodge boss attacks.' },
  con: { name: 'Constitution', short: 'CON', icon: '🛡️', desc: 'Raises your maximum health.' },
  cha: { name: 'Charisma',     short: 'CHA', icon: '🎭', desc: 'Tames pets faster, makes them less likely to flee, and charms merchants into discounts.' },
};
const STAT_KEYS = ['str', 'agi', 'con', 'cha'];
const BASE_STAT = 5;

// Gender sets your portrait only; it never changes stats.
const GENDERS = {
  woman:       { name: 'Woman',             variant: 0 },
  man:         { name: 'Man',               variant: 1 },
  nonbinary:   { name: 'Nonbinary',         variant: 2 },
  unspecified: { name: 'Prefer not to say', variant: 2 },
};

const PORTRAITS = [
  [1,  ['👩‍🌾', '👨‍🌾', '🧑‍🌾']],
  [8,  ['💂‍♀️', '💂‍♂️', '💂']],
  [20, ['🧙‍♀️', '🧙‍♂️', '🧙']],
  [40, ['🦸‍♀️', '🦸‍♂️', '🦸']],
  [70, ['🧝‍♀️', '🧝‍♂️', '🧝']],
  [100, ['👸', '🤴', '🫅']],
];

const BACKGROUNDS = {
  blacksmith: { name: "Blacksmith's apprentice", desc: 'Raised at the forge, swinging hammers before you could read.', str: 3, agi: 0, con: 1 },
  soldier:    { name: 'Former soldier',          desc: 'Years in the shield wall left you strong and hard to kill.', str: 2, agi: 0, con: 2 },
  ranger:     { name: 'Forest ranger',           desc: 'You track deer through the Elderwood and rarely miss a shot.', str: 0, agi: 3, con: 1 },
  thief:      { name: 'Reformed thief',          desc: 'Quick hands, quicker feet. You have (mostly) left that life behind.', str: 1, agi: 3, con: 0 },
  farmhand:   { name: 'Farmhand',                desc: 'Long days in the fields gave you endless stamina.', str: 1, agi: 0, con: 3 },
  scholar:    { name: 'Wandering scholar',       desc: 'Years on the road made you nimble and hardy.', str: 0, agi: 2, con: 2 },
  bard:       { name: 'Travelling bard',         desc: 'You have talked your way into every tavern and out of most fights.', agi: 1, cha: 3 },
  merchant:   { name: "Merchant's heir",         desc: 'Raised haggling in the Kingsport markets. Everyone is a friend, and every friend a customer.', con: 1, cha: 3 },
  beastkeeper:{ name: 'Royal beastkeeper',       desc: 'You once tended the king’s menagerie. Animals trust you on sight.', str: 1, con: 1, cha: 2 },
};

const HOMELANDS = {
  plains:    { name: 'Golden Plains',      desc: 'Sturdy farming folk',    str: 1, agi: 0, con: 0 },
  forest:    { name: 'Elderwood',          desc: 'Nimble forest dwellers', str: 0, agi: 1, con: 0 },
  mountains: { name: 'Ironpeak Mountains', desc: 'Hardy mountain clans',   str: 0, agi: 0, con: 1 },
  kingsport: { name: 'Kingsport',          desc: 'Silver-tongued harbour city folk', cha: 1 },
};

const GOALS = {
  fitness:      { name: 'Get stronger and fitter', str: 2, agi: 0, con: 0 },
  productivity: { name: 'Get things done',         str: 0, agi: 2, con: 0 },
  habits:       { name: 'Build healthy habits',    str: 0, agi: 0, con: 2 },
  home:         { name: 'Keep a tidy home',        str: 1, agi: 0, con: 1 },
  balance:      { name: 'Find balance',            str: 0, agi: 1, con: 1 },
  social:       { name: 'Strengthen my relationships', cha: 2 },
  kindness:     { name: 'Be kinder to myself and others', con: 1, cha: 1 },
};

const BOSSES = [
  { name: 'The Rat King', icon: '🐀', type: 'Vermin', hp: 80, attack: 6,
    story: 'It began with a few missing apples. Then the grain sacks, then the cheese wheels, then the miller’s cat. A bloated rat king wearing a crown of bottle caps has led a swarm up from the old cellars beneath the village granary, and the winter stores are vanishing night by night. The village elder has pinned a plea to the quest board: drive the vermin back below before the first snow, or Tasklandia’s smallest village will go hungry.' },
  { name: 'Snaggletooth, Goblin Warchief', icon: '👺', type: 'Goblinoid', hp: 140, attack: 10,
    story: 'Smoke rises over the eastern farms. Goblin raiders under the one-eyed warchief Snaggletooth are torching hay barns and stealing every chicken they can carry, cackling as they ride off on half-starved boars. Snaggletooth fancies himself a king and sits on a throne carved from a stolen wagon wheel. The farmers have barricaded their doors, but barricades won’t hold forever. Someone has to march out and remind the warband who protects these fields.' },
  { name: 'The Bog Witch of Mirefen', icon: '🧙‍♀️', type: 'Hag', hp: 220, attack: 13,
    story: 'The village wells have run green. Deep in the Mirefen marsh, an ancient hag called Grandmother Silt has woken from a century-long sleep, furious to find a village built where her favourite toadstools once grew. Her curse sours the water, wilts the crops and steals the laughter from the children, who now sit silently by the hearth. Her hut walks on chicken legs and moves every night, so finding her is half the battle.' },
  { name: 'Shadowfang, the Dire Alpha', icon: '🐺', type: 'Beast', hp: 320, attack: 17,
    story: 'Travellers whisper of a wolf the size of a warhorse that prowls the King’s Road after dark, its eyes burning like coals. Shadowfang was once the guardian of the Elderwood, but something has turned him vicious. Merchant caravans no longer dare the crossing, the market stalls stand empty and prices have doubled. Only a hero brave enough to walk the road at midnight can end the hunt.' },
  { name: 'Grumthak the Bridge Troll', icon: '🧌', type: 'Giant-kin', hp: 450, attack: 22,
    story: 'Grumthak has claimed the old stone bridge over the Rushwater, the only crossing for twenty miles. At first he demanded a single copper; now he asks for gold, livestock and, lately, travellers. He sleeps beneath the arches by day and counts his hoard by moonlight, humming tunelessly to himself. Without the bridge, the village is cut off from the rest of Tasklandia.' },
  { name: 'Vexira, Wyvern of the Ashen Peaks', icon: '🐲', type: 'Wyvern', hp: 600, attack: 26,
    story: 'A shriek splits the sky, and the first roof bursts into flame. Vexira, a wyvern of the Ashen Peaks, has swooped down on the village and made the old watchtower her nest. Every night she returns to burn another row of thatched roofs, and her venomous tail has already felled the captain of the guard. The townsfolk sleep in their cellars now, waiting for someone brave enough to climb that tower.' },
  { name: 'Morthul the Lich', icon: '💀', type: 'Undead', hp: 800, attack: 32,
    story: 'The graveyard grows emptier every night. Beneath the sunken crypt, the lich Morthul, once the court’s most gifted healer, who sought to cheat death and succeeded far too well, is raising the restless dead into a shambling army. His phylactery hums somewhere in the dark, and the chapel bells toll on their own at midnight. If his legion grows any larger, it will march on the living.' },
  { name: 'Jarl Hrimgar, the Frost Giant', icon: '🏔️', type: 'Giant', hp: 1050, attack: 38,
    story: 'Frost creeps across the windows in midsummer. The frost giant Jarl Hrimgar has broken an ancient truce and marches south from the Ironpeak glaciers with an endless winter howling at his heels. Rivers freeze solid, the harvest dies in the fields and wolves come down from the mountains to hunt in the snow. Hrimgar boasts that he will make Tasklandia his new mead hall, and his laughter sets off avalanches.' },
  { name: 'The Kraken of the Grey Sea', icon: '🐙', type: 'Leviathan', hp: 1350, attack: 46,
    story: 'Three fishing fleets have vanished beneath the Grey Sea, dragged down by tentacles as thick as ship masts. The harbour bells ring a warning no one needs to hear twice, and the port city of Kingsport starves while its boats rot at anchor. Sailors say the Kraken was woken by a sunken bell rung far below the waves. Whatever woke it, it is hungry, and it is coming closer to shore.' },
  { name: 'Vyrmathrax the Elder Dragon', icon: '🐉', type: 'Dragon', hp: 1700, attack: 54,
    story: 'The mountain splits open and the sky turns to fire. The Elder Dragon Vyrmathrax has woken from a thousand-year slumber beneath the Ashen Peaks, his hoard heaped with the crowns of fallen kingdoms. He demands that Tasklandia kneel and send tribute: every coin, every jewel and one hero a year. Bards already call him the Devourer of Kingdoms. Only a true legend can stand against him.' },
  { name: 'Skarrix, Queen of the Dune Scorpions', icon: '🦂', type: 'Monstrous insect', hp: 2100, attack: 60,
    story: 'The desert crept north overnight, swallowing the southern farms in shifting dunes. With it came Skarrix, the Scorpion Queen, and her endless brood. They burrow beneath the fields and strike from the sand without warning, dragging livestock into the dark. The farmers say the ground itself hums with her children. Strike down the queen, and the brood will scatter.' },
  { name: 'Countess Velmora the Bloodless', icon: '🧛', type: 'Vampire', hp: 2550, attack: 66,
    story: 'A pale countess has bought the ruined manor above the village and restored it overnight, every window now glowing red. Countess Velmora the Bloodless hosts lavish balls to which everyone is invited, and from which some never return. Since she arrived the cattle are found drained, and the night watch has stopped coming home. She is charming, courteous and centuries old, and she has decided she likes it here.' },
  { name: 'The Thunderbird of Stormcrown', icon: '🦅', type: 'Storm beast', hp: 3050, attack: 72,
    story: 'A bird whose wingbeats are thunder has nested on Stormcrown Peak. Every afternoon the sky turns black and lightning hunts across the valley, splitting oaks, scorching harvests and setting haystacks ablaze. The Thunderbird is ancient and proud, and furious that the valley folk forgot the old offerings. No roof is safe, and no field can be planted until it is brought low.' },
  { name: 'The Iron Colossus', icon: '🗿', type: 'Construct', hp: 3600, attack: 79,
    story: 'Deep in the abandoned mines, something enormous has woken. The Iron Colossus, a war golem built by a forgotten empire, has clawed its way to the surface with one command still burning in its core: conquer. It marches on the capital, flattening every wall and gate in its path, and arrows bounce harmlessly off its riveted hide. Somewhere inside its chest, a single glowing rune keeps it moving.' },
  { name: 'Arachnae, the Web-Mother', icon: '🕷️', type: 'Aberration', hp: 4200, attack: 86,
    story: 'The Elderwood has fallen silent. A spider the size of a cathedral has spun the forest shut, stringing webs between the oldest trees thick enough to walk on. Arachnae, the Web-Mother, wraps travellers in silk and saves them for later, and her children now scuttle at the edge of every village. Lanterns along the treeline are all that keeps them back, and the lamp oil is running out.' },
  { name: 'Pyrrhax, Lord of Cinders', icon: '🔥', type: 'Fire elemental', hp: 4850, attack: 93,
    story: 'The volcano beneath the Ashen Peaks has erupted, and from the lava rose a lord of living flame. Pyrrhax, Lord of Cinders, walks wherever he pleases, and everything he touches burns. Rivers boil, forests become ash and the sky rains embers on the kingdom. He seeks the Heartfire said to burn at the centre of Tasklandia, and if he claims it, the whole realm will burn with him.' },
  { name: 'Zarathiel, Djinn of Broken Wishes', icon: '🧞', type: 'Spirit', hp: 5550, attack: 100,
    story: 'A child found an old brass lamp at the market and rubbed it clean. Out poured Zarathiel, the Djinn of Broken Wishes, who now grants every wish made anywhere in the realm and twists each one into a calamity. A farmer wished for rain and got a flood; a merchant wished for gold and turned his family to statues. The djinn cannot be bargained with, only defeated, and it is enjoying itself far too much.' },
  { name: 'The Eye Beyond the Stars', icon: '👁️', type: 'Eldritch horror', hp: 6300, attack: 108,
    story: 'One night, a vast eye opened in the sky where the moon should be. Those who meet its gaze forget their names, their homes and the people they love, then walk silently into the sea. Scholars say the Eye Beyond the Stars searches for minds strong enough to resist it, and that it has noticed you. Its gaze grows stronger every night. Don’t look up for too long.' },
  { name: 'Nyxara, the Devouring Night', icon: '🌑', type: 'Shadow', hp: 7100, attack: 116,
    story: 'Each day the sun rises a little later and sets a little sooner. Nyxara, the Devouring Night, is swallowing the daylight hour by hour, and growing larger with every meal. Crops wither, candles gutter and fear settles over Tasklandia like fog. Soon there will be no daylight left to swallow, and then she will turn her hunger to the stars.' },
  { name: 'The Hollow King', icon: '👑', type: 'Fallen god', hp: 8000, attack: 125,
    story: 'Beneath the oldest castle in Tasklandia, a tomb has cracked open. The realm’s first king, betrayed by his own court and buried alive a thousand years ago, has risen as a god of rot and ruin. His crown is hollow, his eyes are empty, and his voice whispers from every unfinished task. Every foe you have faced was a herald of his return. This is the final battle for Tasklandia.' },
];
const ASCENSION = ['Ascended', 'Mythic', 'Eternal'];

const STAT_KEYWORDS = {
  str: /\b(work ?out\w*|exercis\w*|gym|lift\w*|weights?|push-?ups?|pull-?ups?|squats?|strength|train\w*|spar\w*|chop\w* wood)\b/i,
  agi: /\b(run\w*|jog\w*|yoga|stretch\w*|danc\w*|bik\w*|cycl\w*|swim\w*|walk\w*|hik\w*|sprint\w*|skat\w*|climb\w*)\b/i,
  con: /\b(entire (house|home|apartment|flat|keep)|whole (house|home|apartment|flat)|deep[- ]clean\w*|meal[- ]prep\w*|cook\w*|sleep\w*|meditat\w*|spring[- ]clean\w*)\b/i,
  cha: /\b(call\w*|phone|text\w*|messag\w*|visit\w*|friends?|family|mom|dad|date|part(y|ies)|host\w*|meet\w*|network\w*|thank\w*|volunteer\w*|letters?|birthday|gifts?|social\w*|invit\w*|chat\w*|raven|feast|fellowship)\b/i,
};

/*
 * Random quest pool: real-life chores and tasks with fantasy names.
 * [title, description, guild, difficulty, stat]
 */
const RANDOM_QUESTS = [
  ['Banish the dust spirits', 'Dust shelves and surfaces.', 'hearth', 2, 'none'],
  ['Tame the laundry hydra', 'Wash, dry and fold a load of laundry.', 'hearth', 3, 'none'],
  ['Restore order to the armory closet', 'Declutter a closet or wardrobe.', 'hearth', 3, 'none'],
  ['Scour the cauldrons', 'Clean the stovetop and oven.', 'hearth', 3, 'none'],
  ['Sweep the great hall', 'Vacuum or sweep the floors.', 'hearth', 2, 'none'],
  ['Purge the cold larder', 'Clean out the fridge and toss anything expired.', 'hearth', 3, 'none'],
  ['Change the bedchamber linens', 'Change the bed sheets.', 'hearth', 2, 'none'],
  ['Polish the scrying glass', 'Clean the mirrors and windows.', 'hearth', 2, 'none'],
  ['Slay the junk-drawer mimic', 'Sort out the junk drawer.', 'hearth', 1, 'none'],
  ['Mop the flagstones', 'Mop the kitchen and bathroom floors.', 'hearth', 2, 'none'],
  ['Lay siege to the clutter of the whole castle', 'Clean the entire house.', 'hearth', 5, 'con'],
  ['Brave the merchants’ row', 'Run your errands in town.', 'market', 3, 'none'],
  ['Return the borrowed relics', 'Return library books or borrowed items.', 'market', 1, 'none'],
  ['Seek out the apothecary', 'Pick up a prescription or pharmacy items.', 'market', 2, 'none'],
  ['Dispatch a parcel by courier', 'Post a package or letter.', 'market', 1, 'none'],
  ['Refuel the trusty steed', 'Fill up or charge the car.', 'market', 1, 'none'],
  ['Commission the wheelwright', 'Book car maintenance or a repair.', 'market', 2, 'none'],
  ['Decipher the inbox runes', 'Get your email inbox to zero.', 'scriptorium', 3, 'none'],
  ['Study an ancient tome', 'Read for 30 minutes.', 'scriptorium', 2, 'none'],
  ['Draft the dreaded missive', 'Write the email you have been putting off.', 'scriptorium', 2, 'none'],
  ['Map the week ahead', 'Plan your week and check your calendar.', 'scriptorium', 2, 'none'],
  ['Learn a new incantation', 'Practise a new skill for 30 minutes.', 'scriptorium', 3, 'none'],
  ['Organize the scroll archive', 'Tidy the files and folders on your computer.', 'scriptorium', 3, 'none'],
  ['Complete a chapter of the great work', 'Hit a milestone on a big work or school project.', 'scriptorium', 5, 'none'],
  ['Run the gauntlet', 'Go for a 30-minute run.', 'training', 3, 'agi'],
  ['Lift the boulders of Ironpeak', 'Do a strength workout.', 'training', 3, 'str'],
  ['Walk the pilgrim’s path', 'Take a 30-minute walk.', 'training', 2, 'agi'],
  ['Practise the monk’s stances', 'Do a yoga or stretching session.', 'training', 2, 'agi'],
  ['Hold the shield wall', 'Do 20 push-ups and a one-minute plank.', 'training', 2, 'str'],
  ['Ride to the next village', 'Go for a bike ride.', 'training', 3, 'agi'],
  ['Rest at the healer’s tent', 'Go to bed on time tonight.', 'training', 2, 'con'],
  ['Prepare rations for the campaign', 'Meal-prep for the week.', 'training', 4, 'con'],
  ['Brew a restoring stew', 'Cook a healthy meal at home.', 'training', 3, 'con'],
  ['Meditate atop the mountain', 'Meditate for 10 minutes.', 'training', 1, 'con'],
  ['Water the enchanted grove', 'Water the plants.', 'garden', 1, 'none'],
  ['Weed the cursed garden', 'Pull weeds for 30 minutes.', 'garden', 3, 'str'],
  ['Groom the royal hound', 'Bathe or groom your pet.', 'garden', 2, 'none'],
  ['Muck out the beast’s den', 'Clean the litter box or pet area.', 'garden', 1, 'none'],
  ['Trim the hedge maze', 'Mow the lawn or trim the hedges.', 'garden', 3, 'str'],
  ['Rake the fallen leaves of autumn', 'Rake the leaves.', 'garden', 2, 'str'],
  ['Pay tribute to the crown', 'Pay the bills due this week.', 'treasury', 2, 'none'],
  ['Count the coffers', 'Review your budget and spending.', 'treasury', 3, 'none'],
  ['Seal the vault', 'Set up or top up your savings.', 'treasury', 3, 'none'],
  ['Hunt the forgotten subscriptions', 'Cancel subscriptions you don’t use.', 'treasury', 2, 'none'],
  ['Settle a debt with the guild', 'Make an extra payment on a loan or card.', 'treasury', 3, 'none'],
  ['Sort the tax scrolls', 'File receipts and paperwork.', 'treasury', 2, 'none'],
  ['Send word by carrier pigeon', 'Text someone you haven’t talked to in a while.', 'tavern', 1, 'cha'],
  ['Visit the elders of your clan', 'Call or visit a parent or grandparent.', 'tavern', 2, 'cha'],
  ['Thank a fellow adventurer', 'Send someone a thank-you note.', 'tavern', 1, 'cha'],
  ['Join the village festival', 'Go to a social event or meetup.', 'tavern', 3, 'cha'],
  ['Lend your sword to the common folk', 'Volunteer for an hour.', 'tavern', 4, 'cha'],
  ['Prepare a birthday tribute', 'Buy or make a birthday gift.', 'tavern', 2, 'cha'],
  ['Break bread with a companion', 'Share a meal with a friend.', 'tavern', 2, 'cha'],
  ['Consult the court physician', 'Book a doctor or dentist appointment.', 'misc', 3, 'none'],
  ['Mend the broken gear', 'Fix something that has been broken for a while.', 'misc', 3, 'none'],
  ['Open the sealed scroll', 'Deal with that piece of mail you have been avoiding.', 'misc', 2, 'none'],
  ['Chart an unknown land', 'Explore a new park, café or neighbourhood.', 'misc', 2, 'agi'],
  ['Kindle a forgotten craft', 'Spend an hour on a hobby.', 'misc', 2, 'none'],
  ['Silence the clamouring scrolls', 'Unsubscribe from newsletters and turn off needless notifications.', 'misc', 1, 'none'],
  ['Prepare the war chest for travel', 'Pack or unpack a bag that has been sitting around.', 'misc', 2, 'none'],
];
const FATE_BONUS = 0.15;

const POTION = { name: 'Healing draught', icon: '🧪', cost: 30, heal: 0.5 };
const STAMINA_TONIC = { name: 'Tonic of vigour', icon: '⚗️', restore: 0.5, perDay: 2 };

/*
 * Armory. Ten tiers unlock as the hero levels; every item is unique.
 * Weapons lean on Strength/Agility, armor on Constitution.
 */
const GEAR_TIERS = [
  { level: 1,  cost: 40 },  { level: 4,  cost: 90 },  { level: 8,  cost: 160 },
  { level: 12, cost: 250 }, { level: 16, cost: 360 }, { level: 20, cost: 500 },
  { level: 25, cost: 680 }, { level: 30, cost: 900 }, { level: 40, cost: 1150 },
  { level: 50, cost: 1450 }, { level: 60, cost: 1800 }, { level: 70, cost: 2200 },
  { level: 80, cost: 2700 }, { level: 90, cost: 3300 }, { level: 100, cost: 4000 },
];
const SLOTS = { weapon: { name: 'Weapon', icon: '⚔️' }, armor: { name: 'Armor', icon: '🛡️' } };

const GEAR = [
  // Tier 1 — level 1
  { id: 'hearthpoker-cudgel', tier: 0, slot: 'weapon', icon: '🏏', kind: 'Club', name: 'Hearthpoker Cudgel', bonus: { str: 2 },
    desc: 'A fire iron straightened by a stubborn grandmother. It has seen worse than goblins.' },
  { id: 'sparrowstring-shortbow', tier: 0, slot: 'weapon', icon: '🏹', kind: 'Shortbow', name: 'Sparrowstring Shortbow', bonus: { agi: 2 },
    desc: 'Strung with linen thread and good intentions. Surprisingly accurate.' },
  { id: 'patchwork-gambeson', tier: 0, slot: 'armor', icon: '🧥', kind: 'Padded coat', name: 'Patchwork Gambeson', bonus: { con: 2 },
    desc: 'Quilted from forty mismatched aprons. Every stitch is a little prayer.' },
  { id: 'cellar-rat-leathers', tier: 0, slot: 'armor', icon: '🦺', kind: 'Leather', name: 'Cellar-Rat Leathers', bonus: { agi: 1, con: 1 },
    desc: 'Tanned from the very vermin you once fled. Smells faintly of cheese.' },

  // Tier 2 — level 4
  { id: 'millstone-maul', tier: 1, slot: 'weapon', icon: '🔨', kind: 'Maul', name: 'Millstone Maul', bonus: { str: 4 },
    desc: 'Carved from a cracked millstone. Heavy enough to grind bone into flour.' },
  { id: 'whisperthorn-dagger', tier: 1, slot: 'weapon', icon: '🗡️', kind: 'Dagger', name: 'Whisperthorn Dagger', bonus: { str: 1, agi: 3 },
    desc: 'A briar-wood hilt that never creaks and a blade that never warns.' },
  { id: 'riverstone-brigandine', tier: 1, slot: 'armor', icon: '🪨', kind: 'Brigandine', name: 'Riverstone Brigandine', bonus: { con: 3, str: 1 },
    desc: 'Flat river stones riveted under canvas. Cool in summer, unyielding in winter.' },
  { id: 'foxglove-hunting-coat', tier: 1, slot: 'armor', icon: '🧥', kind: 'Hunting coat', name: 'Foxglove Hunting Coat', bonus: { agi: 3, con: 1 },
    desc: 'Dyed the purple of poisonous blossoms, so the forest mistakes you for one.' },

  // Tier 3 — level 8
  { id: 'bellringers-warhammer', tier: 2, slot: 'weapon', icon: '🔔', kind: 'Warhammer', name: "Bellringer's Warhammer", bonus: { str: 5, con: 1 },
    desc: 'Forged from the melted bell of a sacked chapel. Every blow tolls.' },
  { id: 'gale-feather-longbow', tier: 2, slot: 'weapon', icon: '🪶', kind: 'Longbow', name: 'Gale-Feather Longbow', bonus: { agi: 5, str: 1 },
    desc: 'Fletched with feathers shed by storm-hawks. Its arrows ride the wind home.' },
  { id: 'oxblood-ringmail', tier: 2, slot: 'armor', icon: '⛓️', kind: 'Ringmail', name: 'Oxblood Ringmail', bonus: { con: 5, str: 1 },
    desc: 'Rings dipped in ox blood for luck. The village smith swears it works.' },
  { id: 'moth-silk-mantle', tier: 2, slot: 'armor', icon: '🦋', kind: 'Silk mantle', name: 'Moth-Silk Mantle', bonus: { agi: 4, con: 2 },
    desc: 'Woven by giant Elderwood moths. Blades slide off it like moonlight.' },

  // Tier 4 — level 12
  { id: 'troll-tusk-cleaver', tier: 3, slot: 'weapon', icon: '🪓', kind: 'Cleaver', name: 'Troll-Tusk Cleaver', bonus: { str: 6, agi: 2 },
    desc: 'Ground from a bridge troll’s tusk. It still remembers the taste of travellers.' },
  { id: 'mirefen-hexblade', tier: 3, slot: 'weapon', icon: '🌙', kind: 'Hexblade', name: 'Mirefen Hexblade', bonus: { agi: 5, str: 3 },
    desc: 'Quenched in a bog witch’s cauldron. Its curse now works for you.' },
  { id: 'granite-warden-plate', tier: 3, slot: 'armor', icon: '🗻', kind: 'Stone plate', name: 'Granite Warden Plate', bonus: { con: 6, str: 2 },
    desc: 'Cut by mountain clans from a single slab of Ironpeak granite.' },
  { id: 'shadowfang-pelt', tier: 3, slot: 'armor', icon: '🐺', kind: 'Wolf pelt', name: 'Shadowfang Pelt', bonus: { agi: 5, con: 3 },
    desc: 'A dire wolf’s own coat. Lesser wolves bow their heads as you pass.' },

  // Tier 5 — level 16
  { id: 'emberwake-glaive', tier: 4, slot: 'weapon', icon: '🔥', kind: 'Glaive', name: 'Emberwake Glaive', bonus: { str: 7, agi: 3 },
    desc: 'Its edge glows like a banked hearth and leaves a trail of sparks behind every swing.' },
  { id: 'twinfang-sabres', tier: 4, slot: 'weapon', icon: '⚔️', kind: 'Paired sabres', name: 'Twinfang Sabres', bonus: { agi: 7, str: 3 },
    desc: 'A matched pair that bicker and duel each other whenever they share a sheath.' },
  { id: 'wyvernscale-hauberk', tier: 4, slot: 'armor', icon: '🐲', kind: 'Scale hauberk', name: 'Wyvernscale Hauberk', bonus: { con: 7, agi: 3 },
    desc: 'Hammered from shed wyvern scales. It shrugs off venom like rain.' },
  { id: 'bulwark-of-saint-odila', tier: 4, slot: 'armor', icon: '🛡️', kind: 'Tower shield & mail', name: 'Bulwark of Saint Odila', bonus: { con: 8, str: 2 },
    desc: 'Bears the dents of a hundred sieges and the blessing of a very stubborn saint.' },

  // Tier 6 — level 20
  { id: 'gravebinder-scythe', tier: 5, slot: 'weapon', icon: '🌾', kind: 'Scythe', name: 'Gravebinder Scythe', bonus: { str: 8, con: 4 },
    desc: 'Taken from a lich’s crypt. It reaps the restless dead and makes sure they stay down.' },
  { id: 'starfall-recurve', tier: 5, slot: 'weapon', icon: '🌠', kind: 'Recurve bow', name: 'Starfall Recurve', bonus: { agi: 9, str: 3 },
    desc: 'Its string was spun from a falling star caught in a fisherman’s net.' },
  { id: 'bonewright-carapace', tier: 5, slot: 'armor', icon: '🦴', kind: 'Bone armor', name: 'Bonewright Carapace', bonus: { con: 9, str: 3 },
    desc: 'Lacquered ribs of an ancient beast. Lighter than steel and twice as stubborn.' },
  { id: 'duskweaver-shroud', tier: 5, slot: 'armor', icon: '🌆', kind: 'Cloak', name: 'Duskweaver Shroud', bonus: { agi: 8, con: 4 },
    desc: 'Sewn from the last hour of twilight. Arrows lose track of you in its folds.' },

  // Tier 7 — level 25
  { id: 'rimefang-greataxe', tier: 6, slot: 'weapon', icon: '❄️', kind: 'Greataxe', name: 'Rimefang Greataxe', bonus: { str: 10, con: 4 },
    desc: 'Chipped from a frost giant’s throne. Frost blooms wherever it bites.' },
  { id: 'quicksilver-rapier', tier: 6, slot: 'weapon', icon: '🪞', kind: 'Rapier', name: 'Quicksilver Rapier', bonus: { agi: 10, str: 4 },
    desc: 'Liquid metal held in the shape of a blade by an alchemist’s oath.' },
  { id: 'glacier-heart-plate', tier: 6, slot: 'armor', icon: '🧊', kind: 'Ice plate', name: 'Glacier-Heart Plate', bonus: { con: 11, str: 3 },
    desc: 'Ice that never melts, plated in silver. It keeps your heart steady and cold.' },
  { id: 'windrunner-harness', tier: 6, slot: 'armor', icon: '🌬️', kind: 'Light harness', name: 'Windrunner Harness', bonus: { agi: 10, con: 4 },
    desc: 'Enchanted straps that make every step a little lighter than the last.' },

  // Tier 8 — level 30
  { id: 'leviathans-trident', tier: 7, slot: 'weapon', icon: '🔱', kind: 'Trident', name: "Leviathan's Trident", bonus: { str: 11, agi: 5 },
    desc: 'Pried from a kraken’s grip. The tides rise when it is raised.' },
  { id: 'stormcaller-javelins', tier: 7, slot: 'weapon', icon: '⚡', kind: 'Javelins', name: 'Stormcaller Javelins', bonus: { agi: 11, str: 5 },
    desc: 'A quiver of bottled lightning that always returns to your hand.' },
  { id: 'abyssal-coral-mail', tier: 7, slot: 'armor', icon: '🪸', kind: 'Coral mail', name: 'Abyssal Coral Mail', bonus: { con: 12, agi: 4 },
    desc: 'Grown, not forged, in the crushing deep. It mends itself overnight.' },
  { id: 'aegis-of-the-lighthouse', tier: 7, slot: 'armor', icon: '🗼', kind: 'Shield-plate', name: 'Aegis of the Lighthouse', bonus: { con: 12, str: 4 },
    desc: 'Polished as bright as the beacon it once guarded. Foes squint and stumble.' },

  // Tier 9 — level 40
  { id: 'kingsbane', tier: 8, slot: 'weapon', icon: '🦷', kind: 'Greatsword', name: 'Kingsbane, the Dragon’s Tooth', bonus: { str: 13, agi: 5 },
    desc: 'A single fang of an elder dragon, hilted in gold. It hums in the presence of crowns.' },
  { id: 'eclipse-longbow', tier: 8, slot: 'weapon', icon: '🌘', kind: 'Longbow', name: 'Eclipse Longbow', bonus: { agi: 13, con: 5 },
    desc: 'Carved from a tree that grew in the moon’s shadow. Its arrows are slivers of night.' },
  { id: 'dragonhide-regalia', tier: 8, slot: 'armor', icon: '🐉', kind: 'Dragonhide', name: 'Dragonhide Regalia', bonus: { con: 13, str: 5 },
    desc: 'Scales of an elder dragon. Fire feels like nothing more than a warm breeze.' },
  { id: 'veil-of-a-thousand-steps', tier: 8, slot: 'armor', icon: '👣', kind: 'Enchanted robe', name: 'Veil of a Thousand Steps', bonus: { agi: 13, con: 5 },
    desc: 'Every step you have ever taken, woven into a robe that dodges on your behalf.' },

  // Tier 10 — level 50
  { id: 'dawnbreaker', tier: 9, slot: 'weapon', icon: '🌅', kind: 'Holy blade', name: 'Dawnbreaker', bonus: { str: 14, agi: 6 },
    desc: 'Forged in the first sunrise. Creatures of the dark wither in its light.' },
  { id: 'worldroot-quarterstaff', tier: 9, slot: 'weapon', icon: '🌳', kind: 'Quarterstaff', name: 'Worldroot Quarterstaff', bonus: { agi: 14, str: 6 },
    desc: 'Cut from the root of the tree that holds up the sky. It bends but never breaks.' },
  { id: 'mantle-of-the-undying-legend', tier: 9, slot: 'armor', icon: '🎖️', kind: 'Battle mantle', name: 'Mantle of the Undying Legend', bonus: { con: 15, agi: 5 },
    desc: 'Stitched from the banners of every foe you have slain. It remembers your victories.' },
  { id: 'starforged-bastion', tier: 9, slot: 'armor', icon: '✨', kind: 'Celestial plate', name: 'Starforged Bastion', bonus: { con: 15, str: 5 },
    desc: 'Hammered on an anvil of fallen stars. It weighs nothing and fears nothing.' },

  // Tier 11 — level 60
  { id: 'thornqueens-lash', tier: 10, slot: 'weapon', icon: '🌹', kind: 'Briar whip', name: "Thornqueen's Lash", bonus: { agi: 15, str: 7 },
    desc: 'A living briar whip that coils around foes as if it holds a personal grudge.' },
  { id: 'colossus-breaker', tier: 10, slot: 'weapon', icon: '⚙️', kind: 'Siege maul', name: 'Colossus-Breaker', bonus: { str: 16, con: 6 },
    desc: 'Forged around the iron heart of a war golem. Walls step aside when it swings.' },
  { id: 'scorpion-queen-chitin', tier: 10, slot: 'armor', icon: '🦂', kind: 'Chitin plate', name: 'Scorpion-Queen Chitin', bonus: { con: 16, agi: 6 },
    desc: 'Lacquered desert chitin that turns spear points aside like glass.' },
  { id: 'velvet-nightguard', tier: 10, slot: 'armor', icon: '🦇', kind: 'Hunter’s coat', name: 'Velvet Nightguard', bonus: { agi: 15, con: 7 },
    desc: 'Silver-threaded velvet that never lets a fang find your throat.' },

  // Tier 12 — level 70
  { id: 'thunderbirds-talon', tier: 11, slot: 'weapon', icon: '🌩️', kind: 'Spear', name: "Thunderbird's Talon", bonus: { agi: 17, str: 7 },
    desc: 'It crackles a heartbeat before it strikes. It was always faster than the thunder.' },
  { id: 'cindercrown-flamberge', tier: 11, slot: 'weapon', icon: '🌋', kind: 'Flamberge', name: 'Cindercrown Flamberge', bonus: { str: 18, agi: 6 },
    desc: 'Its wavy blade drinks flame and spits it back out twice as hot.' },
  { id: 'pyrrhax-ashplate', tier: 11, slot: 'armor', icon: '🧯', kind: 'Ash plate', name: 'Pyrrhax Ashplate', bonus: { con: 18, str: 6 },
    desc: 'Cooled lava, hammered thin. It is still warm and always will be.' },
  { id: 'silkwarden-cuirass', tier: 11, slot: 'armor', icon: '🕸️', kind: 'Spider-silk cuirass', name: 'Silkwarden Cuirass', bonus: { con: 16, agi: 8 },
    desc: 'Woven from the Web-Mother’s strongest strands. Arrows simply stick.' },

  // Tier 13 — level 80
  { id: 'wishbreaker', tier: 12, slot: 'weapon', icon: '🪔', kind: 'Scimitar', name: 'Wishbreaker', bonus: { str: 19, agi: 9 },
    desc: 'Cuts through illusions, curses and fine print alike.' },
  { id: 'voidglass-warbow', tier: 12, slot: 'weapon', icon: '🔮', kind: 'Warbow', name: 'Voidglass Warbow', bonus: { agi: 20, con: 8 },
    desc: 'Its arrows travel through the dark spaces between the stars.' },
  { id: 'lamp-bound-panoply', tier: 12, slot: 'armor', icon: '🏺', kind: 'Brass panoply', name: 'Lamp-Bound Panoply', bonus: { con: 20, str: 8 },
    desc: 'Djinn-forged brass that grants exactly one wish: that you stay alive.' },
  { id: 'eyeless-watchers-robe', tier: 12, slot: 'armor', icon: '🙈', kind: 'Warded robe', name: "Eyeless Watcher's Robe", bonus: { agi: 18, con: 10 },
    desc: 'Embroidered with a hundred closed eyes. No gaze can find you.' },

  // Tier 14 — level 90
  { id: 'sunspear-of-the-last-dawn', tier: 13, slot: 'weapon', icon: '☀️', kind: 'Sunspear', name: 'Sunspear of the Last Dawn', bonus: { str: 21, agi: 11 },
    desc: 'Holds the final ray of a stolen sunrise and refuses to let it set.' },
  { id: 'nightpiercer-crossbow', tier: 13, slot: 'weapon', icon: '🎯', kind: 'Crossbow', name: 'Nightpiercer Crossbow', bonus: { agi: 22, str: 10 },
    desc: 'Fires bolts of condensed starlight that light the way home.' },
  { id: 'daybound-bulwark', tier: 13, slot: 'armor', icon: '🌞', kind: 'Sun-bronze plate', name: 'Daybound Bulwark', bonus: { con: 22, str: 10 },
    desc: 'It shines brightest when the world is darkest.' },
  { id: 'duskstrider-raiment', tier: 13, slot: 'armor', icon: '🌌', kind: 'Shadow raiment', name: 'Duskstrider Raiment', bonus: { agi: 20, con: 12 },
    desc: 'Stitched from a stolen shadow that now answers only to you.' },

  // Tier 15 — level 100
  { id: 'crownsplitter', tier: 14, slot: 'weapon', icon: '👑', kind: 'Kingblade', name: 'Crownsplitter, Blade of Tasklandia', bonus: { str: 24, agi: 12 },
    desc: 'Forged from the Hollow King’s broken crown. Every unfinished task in the realm fears it.' },
  { id: 'everbloom-greatbow', tier: 14, slot: 'weapon', icon: '🌸', kind: 'Greatbow', name: 'Everbloom Greatbow', bonus: { agi: 24, con: 12 },
    desc: 'A new blossom opens along its limbs each time it saves a life.' },
  { id: 'regalia-of-the-unbroken-oath', tier: 14, slot: 'armor', icon: '📜', kind: 'Royal plate', name: 'Regalia of the Unbroken Oath', bonus: { con: 26, str: 10 },
    desc: 'Inscribed with every promise you kept. It has no seams and no weakness.' },
  { id: 'cloak-of-ten-thousand-quests', tier: 14, slot: 'armor', icon: '🧶', kind: 'Legendary cloak', name: 'Cloak of Ten Thousand Quests', bonus: { agi: 22, con: 14 },
    desc: 'Each thread is a quest you finished. It is impossibly long, and somehow weighs nothing.' },
].map((g) => Object.assign(g, { level: GEAR_TIERS[g.tier].level, cost: GEAR_TIERS[g.tier].cost }));
const GEAR_BY_ID = Object.fromEntries(GEAR.map((g) => [g.id, g]));
const SHOP_SIZE = 5;

/*
 * Pets. Companions only: they never affect quests or bosses.
 * trust = trust needed to tame; flee = chance it runs off each time a quest goes overdue (before Charisma).
 */
const PET_UNLOCK_LEVEL = 5;
const TRUST_PER_DIFFICULTY = { 1: 2, 2: 4, 3: 7, 4: 11, 5: 18 };
const PET_RARITY = {
  common:    { name: 'Common',    level: 5 },
  uncommon:  { name: 'Uncommon',  level: 15 },
  rare:      { name: 'Rare',      level: 30 },
  epic:      { name: 'Epic',      level: 50 },
  legendary: { name: 'Legendary', level: 75 },
  mythic:    { name: 'Mythic',    level: 90 },
};
const PETS = [
  { id: 'hearth-cat', icon: '🐈‍⬛', name: 'Hearth Cat', rarity: 'common', trust: 30, flee: 0.30,
    desc: 'A sooty mouser that has decided your hearth is now its hearth.' },
  { id: 'village-hound', icon: '🐕', name: 'Village Hound', rarity: 'common', trust: 30, flee: 0.25,
    desc: 'Loyal, muddy and convinced every visitor is a long-lost friend.' },
  { id: 'barn-owl', icon: '🦉', name: 'Barn Owl', rarity: 'common', trust: 35, flee: 0.30,
    desc: 'Watches your chores from the rafters and judges them silently.' },
  { id: 'meadow-hare', icon: '🐇', name: 'Meadow Hare', rarity: 'common', trust: 30, flee: 0.40,
    desc: 'Startles at everything. Earn its trust and it will nap in your boots.' },
  { id: 'ember-fox', icon: '🦊', name: 'Ember Fox', rarity: 'uncommon', trust: 60, flee: 0.35,
    desc: 'Its tail glows faintly at dusk, like a lantern that has opinions.' },
  { id: 'lantern-raccoon', icon: '🦝', name: 'Lantern Raccoon', rarity: 'uncommon', trust: 60, flee: 0.30,
    desc: 'Collects shiny things. Your spoons are no longer safe.' },
  { id: 'crag-goat', icon: '🐐', name: 'Crag Goat', rarity: 'uncommon', trust: 65, flee: 0.25,
    desc: 'Climbs anything, eats anything and fears absolutely nothing.' },
  { id: 'duskwing-bat', icon: '🦇', name: 'Duskwing Bat', rarity: 'uncommon', trust: 60, flee: 0.35,
    desc: 'Hangs upside down from your bookshelf and screeches at untidy rooms.' },
  { id: 'bramble-hedgehog', icon: '🦔', name: 'Bramble Hedgehog', rarity: 'uncommon', trust: 60, flee: 0.30,
    desc: 'Curls into a prickly ball at loud noises, then snores.' },
  { id: 'moonwolf-pup', icon: '🐺', name: 'Moonwolf Pup', rarity: 'rare', trust: 100, flee: 0.35,
    desc: 'Howls at the moon, then at you, until you howl back.' },
  { id: 'sky-falcon', icon: '🦅', name: 'Sky Falcon', rarity: 'rare', trust: 100, flee: 0.40,
    desc: 'Sees every unfinished chore from a mile up, and reports back.' },
  { id: 'honeybear-cub', icon: '🐻', name: 'Honeybear Cub', rarity: 'rare', trust: 110, flee: 0.30,
    desc: 'Smells of clover and sticky paws. Hugs a little too hard.' },
  { id: 'silver-stag', icon: '🦌', name: 'Silver Stag', rarity: 'rare', trust: 120, flee: 0.40,
    desc: 'Antlers like frost on a window. Appears only to the patient.' },
  { id: 'starlight-unicorn', icon: '🦄', name: 'Starlight Unicorn', rarity: 'epic', trust: 180, flee: 0.45,
    desc: 'Trusts only those whose quest log is honest.' },
  { id: 'hatchling-drake', icon: '🦎', name: 'Hatchling Drake', rarity: 'epic', trust: 190, flee: 0.40,
    desc: 'Sneezes sparks, hoards buttons and believes it is enormous.' },
  { id: 'sunmane-lion-cub', icon: '🦁', name: 'Sunmane Lion Cub', rarity: 'epic', trust: 180, flee: 0.35,
    desc: 'Its mane glows gold at noon. Purrs like a distant thunderstorm.' },
  { id: 'phoenix-hatchling', icon: '🐣', name: 'Phoenix Hatchling', rarity: 'legendary', trust: 280, flee: 0.40,
    desc: 'Warm to hold. Occasionally bursts into flame, then into giggles.' },
  { id: 'world-turtle', icon: '🐢', name: 'Ancient World-Turtle', rarity: 'legendary', trust: 300, flee: 0.25,
    desc: 'Small enough to hold, old enough to remember the first sunrise.' },
  { id: 'skywhale-calf', icon: '🐋', name: 'Skywhale Calf', rarity: 'legendary', trust: 300, flee: 0.35,
    desc: 'Swims through clouds and sings lullabies only you can hear.' },
  { id: 'celestial-wyrmling', icon: '🐲', name: 'Celestial Wyrmling', rarity: 'mythic', trust: 420, flee: 0.45,
    desc: 'A dragon born from a falling star. It chooses you, if it chooses anyone.' },
].map((pet) => Object.assign(pet, { level: PET_RARITY[pet.rarity].level }));
const PET_BY_ID = Object.fromEntries(PETS.map((pet) => [pet.id, pet]));

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/* ---------- Custom art ---------- */

const ART_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const ART_MAX_SIZE = 512;

function artSafeName(name) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : 'png';
  return { base, ext };
}

// Shrink big photos so the plugin stays light (GIF and SVG are kept as-is).
async function artPrepare(file, maxSize = ART_MAX_SIZE) {
  const original = await file.arrayBuffer();
  const { ext } = artSafeName(file.name);
  if (/gif|svg/.test(file.type) || /^(gif|svg)$/.test(ext) || typeof document === 'undefined') return { buf: original, ext };
  const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  try {
    let source;
    let w;
    let h;
    if (typeof createImageBitmap === 'function') {
      source = await withTimeout(createImageBitmap(file), 5000);
      w = source.width; h = source.height;
    } else {
      const url = URL.createObjectURL(file);
      source = new Image();
      await withTimeout(new Promise((res, rej) => { source.onload = res; source.onerror = rej; source.src = url; }), 5000);
      URL.revokeObjectURL(url);
      w = source.naturalWidth; h = source.naturalHeight;
    }
    const scale = Math.min(1, maxSize / Math.max(w, h));
    if (scale >= 1) return { buf: original, ext };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
    const jpeg = /jpe?g/.test(file.type) || /^jpe?g$/.test(ext);
    const blob = await withTimeout(new Promise((res) => canvas.toBlob(res, jpeg ? 'image/jpeg' : 'image/png', 0.9)), 5000);
    if (!blob) return { buf: original, ext };
    return { buf: await blob.arrayBuffer(), ext: jpeg ? 'jpg' : 'png' };
  } catch (e) {
    return { buf: original, ext };
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function addInterval(date, rec) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (rec === 'daily') d.setDate(d.getDate() + 1);
  else if (rec === 'weekly') d.setDate(d.getDate() + 7);
  else if (rec === 'monthly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, dim));
  }
  return d;
}

// Tuned so level 100 is a multi-year goal while early levels come quickly.
function xpToNext(level) {
  return Math.round(50 * Math.pow(level, 1.25) + 50);
}

function titleFor(level) {
  let t = TITLES[0][1];
  for (const [lvl, name] of TITLES) if (level >= lvl) t = name;
  return t;
}

function suggestStat(title) {
  for (const k of STAT_KEYS) if (STAT_KEYWORDS[k].test(title || '')) return k;
  return 'none';
}

function friendlyDay(key) {
  const today = dayKey();
  if (key === today) return 'today';
  if (key === yesterdayKey()) return 'yesterday';
  const t = new Date(); t.setDate(t.getDate() + 1);
  if (key === dayKey(t)) return 'tomorrow';
  return parseDay(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function bonusText(src) {
  return STAT_KEYS.filter((k) => src[k]).map((k) => `+${src[k]} ${STATS[k].short}`).join(' ');
}

function sampleQuests() {
  const now = Date.now();
  const q = (title, guild, difficulty, recurrence, description = '', statReward = 'none') => ({
    id: uid(), title, description, guild, difficulty, recurrence, statReward,
    due: '', status: 'available', created: now, timesCompleted: 0,
  });
  return [
    q('Vanquish the dirty dishes', 'hearth', 2, 'daily', 'The sink-hoard grows restless.'),
    q('Haul the refuse to the town gate', 'hearth', 1, 'weekly', 'Take out the trash and recycling.'),
    q('Purify the Bathroom of Despair', 'hearth', 3, 'weekly', 'Scrub tub, toilet, sink and floor.'),
    q('Cleanse the entire keep', 'hearth', 4, 'monthly', 'Clean the entire house, top to bottom.', 'con'),
    q('Provision the larder', 'market', 3, 'weekly', 'Weekly grocery run.'),
    q('Train with the castle guard', 'training', 3, 'daily', '30-minute workout.', 'str'),
    q('Patrol the village walls', 'training', 2, 'daily', '20-minute walk or jog.', 'agi'),
    q('Face the Tax Wyrm', 'treasury', 5, 'none', 'Gather receipts and file taxes.'),
    q('Send a raven to an old friend', 'tavern', 1, 'weekly', 'Call or message a friend or family member.', 'cha'),
    q('Host a feast for the fellowship', 'tavern', 4, 'monthly', 'Have friends or family over for a meal.', 'cha'),
  ];
}

function sampleDailies() {
  const d = (title, icon, target) => ({
    id: uid(), title, icon, target, count: 0, peak: 0, day: dayKey(),
    streak: 0, best: 0, lastDone: null, created: Date.now(),
  });
  return [
    d('Brush teeth', '🪥', 2),
    d('Drink a glass of water', '💧', 4),
    d('Make the bed', '🛏️', 1),
    d('Take vitamins or medication', '💊', 1),
    d('Read for 10 minutes', '📖', 1),
  ];
}

const DEFAULT_HERO = () => ({
  level: 1, xp: 0, totalXp: 0, gold: 0, completed: 0,
  streak: 0, bestStreak: 0, lastDay: null, goldSpent: 0,
  hp: null, unspent: 0,
  allocated: { str: 0, agi: 0, con: 0, cha: 0 },
  earned: { str: 0, agi: 0, con: 0, cha: 0 },
  deaths: 0, bossesSlain: 0, dailyBonusDay: null,
  stamina: null, staminaDay: null, tonicsToday: 0,
  equipment: { weapon: null, armor: null },
  inventory: [],
});

const DEFAULT_PROFILE = () => ({
  created: false, name: 'Hero', gender: 'unspecified',
  background: 'soldier', homeland: 'plains', goal: 'balance', motto: '',
});

/* ---------------- dashboard backdrop: a treacherous mountain pass in a storm, drawn once as SVG ---------------- */

let TL_SCENE_URL = null;
function tlScene() {
  if (TL_SCENE_URL) return TL_SCENE_URL;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const W = 1600, H = 1000;
  const f = (n) => n.toFixed(0);
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`);
  out.push(`<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f1c"/><stop offset=".3" stop-color="#1c2540"/><stop offset=".55" stop-color="#3a4867"/><stop offset=".72" stop-color="#6b7790"/><stop offset=".85" stop-color="#a39a95"/><stop offset="1" stop-color="#c79a74"/></linearGradient>
<radialGradient id="rift" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1180 330) scale(420 200)"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".55"/><stop offset=".4" stop-color="#f0b47a" stop-opacity=".18"/><stop offset="1" stop-color="#f0b47a" stop-opacity="0"/></radialGradient>
<radialGradient id="flash" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(800 160) scale(380 260)"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".5"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
<linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1222"/><stop offset="1" stop-color="#2b3550"/></linearGradient>
<linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8d2e6" stop-opacity="0"/><stop offset=".5" stop-color="#d6deee" stop-opacity=".28"/><stop offset="1" stop-color="#c8d2e6" stop-opacity="0"/></linearGradient>
<linearGradient id="chasm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3349"/><stop offset="1" stop-color="#05070d"/></linearGradient>
<radialGradient id="fire" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffcf6a" stop-opacity=".85"/><stop offset=".4" stop-color="#ff8a3a" stop-opacity=".35"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
</defs>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#rift)"/>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#flash)"/>`);

  // A jagged range: sharp summits joined by broken, rocky ridgelines, with snow on the tops.
  const range = (peaks, base, rock, shade, snow, snowDepth) => {
    let d = `M-20 ${H}L-20 ${base}`;
    const tops = [];
    let px = -20, py = base;
    for (const [x, y] of peaks) {
      // broken climb from the last saddle to this summit
      const steps = 4 + Math.floor(rnd() * 3);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        d += `L${f(px + (x - px) * t + (rnd() - 0.5) * 18)} ${f(py + (y - py) * t + (rnd() - 0.3) * 26)}`;
      }
      d += `L${f(x)} ${f(y)}`;
      tops.push([x, y, px, py]);
      // drop to the next saddle
      const sx = x + 40 + rnd() * 60, sy = Math.min(base, y + 120 + rnd() * 140);
      d += `L${f(x + (sx - x) * 0.4)} ${f(y + (sy - y) * 0.3 + rnd() * 20)}L${f(sx)} ${f(sy)}`;
      px = sx; py = sy;
    }
    d += `L${W + 20} ${base}L${W + 20} ${H}Z`;
    out.push(`<path d="${d}" fill="${rock}"/>`);
    // shaded faces: a darker wedge down the right flank of each summit
    for (const [x, y] of tops) {
      out.push(`<path d="M${f(x)} ${f(y)}L${f(x + 30 + rnd() * 40)} ${f(y + 150)}L${f(x + 8)} ${f(y + 260)}L${f(x - 6)} ${f(y + 90)}Z" fill="${shade}" opacity=".75"/>`);
    }
    // snow caps with ragged lower edges
    for (const [x, y] of tops) {
      const dep = snowDepth * (0.7 + rnd() * 0.5);
      const lw = dep * (0.55 + rnd() * 0.3), rw = dep * (0.5 + rnd() * 0.3);
      let c = `M${f(x)} ${f(y)}L${f(x + rw)} ${f(y + dep)}`;
      const n = 6;
      for (let k = 1; k < n; k++) {
        const xx = x + rw - ((rw + lw) * k) / n;
        c += `L${f(xx)} ${f(y + dep * (k % 2 ? 0.55 + rnd() * 0.3 : 0.95 + rnd() * 0.25))}`;
      }
      c += `L${f(x - lw)} ${f(y + dep * 0.9)}Z`;
      out.push(`<path d="${c}" fill="${snow}"/>`);
    }
  };

  range([[90, 330], [300, 250], [470, 150], [640, 290], [820, 210], [1010, 120], [1200, 260], [1380, 190], [1560, 300]], 640, '#3d4864', '#2c3550', '#dfe7f4', 95);
  out.push(`<rect x="0" y="470" width="${W}" height="200" fill="url(#mist)"/>`);
  range([[-10, 470], [190, 380], [380, 460], [560, 430], [740, 470], [930, 400], [1120, 330], [1330, 430], [1520, 360]], 760, '#232b40', '#181e2f', '#c9d3e6', 70);
  out.push(`<rect x="0" y="620" width="${W}" height="170" fill="url(#mist)"/>`);

  // storm clouds rolling over the summits
  for (let i = 0; i < 26; i++) {
    const cx = rnd() * W, cy = 30 + rnd() * 150, rx = 120 + rnd() * 220, ry = 30 + rnd() * 45;
    out.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#cloud)" opacity="${(0.55 + rnd() * 0.35).toFixed(2)}"/>`);
  }
  // lightning striking the high peak
  const bolt = (x0, y0, x1, y1) => {
    let d = `M${x0} ${y0}`;
    const n = 9;
    for (let k = 1; k <= n; k++) d += `L${f(x0 + ((x1 - x0) * k) / n + (k < n ? (rnd() - 0.5) * 50 : 0))} ${f(y0 + ((y1 - y0) * k) / n)}`;
    return d;
  };
  const main = bolt(770, 70, 820, 214);
  const branch = bolt(790, 120, 870, 190);
  out.push(`<path d="${main}" stroke="#9fc0ff" stroke-width="14" fill="none" opacity=".22" stroke-linejoin="round"/>`);
  out.push(`<path d="${main}" stroke="#eef4ff" stroke-width="3" fill="none" stroke-linejoin="round"/>`);
  out.push(`<path d="${branch}" stroke="#dce8ff" stroke-width="1.5" fill="none" opacity=".75" stroke-linejoin="round"/>`);
  out.push(`<circle cx="820" cy="214" r="40" fill="#dfe9ff" opacity=".22"/>`);

  // the chasm and its two cliffs
  out.push(`<path d="M520 760 L560 1000 L880 1000 L900 760 Z" fill="url(#chasm)"/>`);
  out.push(`<rect x="500" y="800" width="420" height="120" fill="url(#mist)"/>`);
  const cliff = (pts, col) => out.push(`<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z" fill="${col}"/>`);
  cliff([[-20, 1000], [-20, 700], [80, 690], [160, 712], [250, 690], [330, 705], [420, 700], [520, 728], [548, 760], [530, 800], [560, 850], [540, 905], [575, 1000]], '#121726');
  cliff([[1620, 1000], [1620, 690], [1500, 676], [1400, 700], [1300, 684], [1180, 702], [1040, 696], [930, 720], [880, 744], [900, 790], [870, 845], [895, 910], [860, 1000]], '#121726');
  // rock texture on the cliff faces
  for (let i = 0; i < 40; i++) {
    const left = rnd() < 0.5;
    const x = left ? 40 + rnd() * 480 : 900 + rnd() * 660, y = 740 + rnd() * 250;
    out.push(`<path d="M${f(x)} ${f(y)}l${f(10 + rnd() * 30)} ${f(-6 - rnd() * 10)}l${f(6 + rnd() * 14)} ${f(10 + rnd() * 10)}" stroke="#1d2436" stroke-width="2" fill="none"/>`);
  }
  // a sagging rope bridge over the abyss
  const bx0 = 548, by0 = 748, bx1 = 892, by1 = 738, sag = 52;
  const yAt = (t) => by0 + (by1 - by0) * t + sag * 4 * t * (1 - t);
  out.push(`<path d="M${bx0} ${by0 - 26} Q${(bx0 + bx1) / 2} ${by0 - 26 + sag * 2} ${bx1} ${by1 - 26}" stroke="#6b5235" stroke-width="2" fill="none"/>`);
  for (let k = 0; k <= 30; k++) {
    const t = k / 30, x = bx0 + (bx1 - bx0) * t, y = yAt(t);
    if (k % 7 === 4) continue; // missing planks
    out.push(`<rect x="${f(x - 4)}" y="${f(y - 2)}" width="8" height="5" fill="#5a4026" transform="rotate(${((rnd() - 0.5) * 18).toFixed(0)} ${f(x)} ${f(y)})"/>`);
  }
  out.push(`<path d="M${bx0} ${by0} Q${(bx0 + bx1) / 2} ${by0 + sag * 2} ${bx1} ${by1}" stroke="#4a3520" stroke-width="2" fill="none"/>`);
  for (let k = 1; k < 12; k++) { const t = k / 12, x = bx0 + (bx1 - bx0) * t; out.push(`<line x1="${f(x)}" y1="${f(yAt(t) - 26 + 0)}" x2="${f(x)}" y2="${f(yAt(t))}" stroke="#6b5235" stroke-width="1"/>`); }
  for (const x of [bx0, bx1]) out.push(`<rect x="${x - 4}" y="${(x === bx0 ? by0 : by1) - 34}" width="7" height="40" fill="#3a2a18"/>`);
  // a lone traveller with a lantern, halfway across
  const tx = 760, ty = yAt((760 - bx0) / (bx1 - bx0));
  out.push(`<path d="M${tx - 6} ${f(ty - 2)}L${tx - 3} ${f(ty - 22)}Q${tx} ${f(ty - 30)} ${tx + 4} ${f(ty - 22)}L${tx + 7} ${f(ty - 2)}Z" fill="#0b0e18"/><circle cx="${tx}" cy="${f(ty - 27)}" r="4" fill="#0b0e18"/>`);
  out.push(`<circle cx="${tx + 11}" cy="${f(ty - 14)}" r="16" fill="url(#fire)"/><circle cx="${tx + 11}" cy="${f(ty - 14)}" r="2.2" fill="#ffe3a0"/>`);
  // campfire glow on the far ledge
  out.push(`<circle cx="1250" cy="684" r="60" fill="url(#fire)"/><path d="M1243 690 Q1250 668 1257 690 Z" fill="#ffb347"/>`);
  // dead trees clinging to the cliffs
  const snag = (x, y, h, lean) => {
    out.push(`<path d="M${x} ${y}L${x + lean} ${y - h}M${x + lean * 0.5} ${y - h * 0.5}l${-14} ${-12}M${x + lean * 0.7} ${y - h * 0.7}l16 -10M${x + lean * 0.85} ${y - h * 0.85}l-9 -9" stroke="#0e121e" stroke-width="3.5" stroke-linecap="round" fill="none"/>`);
  };
  snag(150, 712, 70, -10); snag(420, 702, 58, 12); snag(1050, 698, 64, 8); snag(1480, 680, 80, -14);
  // circling crows
  for (const [x, y, k] of [[880, 240, 9], [930, 270, 7], [835, 285, 6], [1300, 120, 8]]) {
    out.push(`<path d="M${x - k} ${y - k * 0.3}Q${x - k * 0.4} ${y - k * 0.6} ${x} ${y}Q${x + k * 0.4} ${y - k * 0.6} ${x + k} ${y - k * 0.3}" stroke="#0b0e18" stroke-width="2" fill="none"/>`);
  }
  // wind-blown snow
  for (let i = 0; i < 160; i++) {
    const x = rnd() * W, y = rnd() * H, l = 3 + rnd() * 9;
    out.push(`<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + l)}" y2="${f(y + l * 0.35)}" stroke="#eef3ff" stroke-width="${(0.8 + rnd() * 1.2).toFixed(1)}" stroke-linecap="round" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`);
  }
  out.push('</svg>');
  TL_SCENE_URL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out.join(''));
  return TL_SCENE_URL;
}

const DEFAULT_DATA = () => ({
  settings: {
    maxActive: 3,
    rewardMultiplier: 1,
    streakBonus: true,
    requireAccept: true,
    bossAttacks: true,
    scenery: true,
    sceneryDim: 25,
    link: { label: 'Quests of Tasklandia', icon: 'swords', image: '', style: 'card', size: 'medium', reuseTab: true },
  },
  profile: DEFAULT_PROFILE(),
  hero: DEFAULT_HERO(),
  boss: { index: 0, hp: null },
  pets: { taming: null, tamed: [], companion: null },
  art: {},
  quests: sampleQuests(),
  dailies: sampleDailies(),
  rewards: [
    { id: uid(), icon: '📺', name: 'Watch an episode of a show', cost: 40 },
    { id: uid(), icon: '☕', name: 'Fancy coffee or treat', cost: 60 },
    { id: uid(), icon: '🎮', name: 'An hour of gaming', cost: 80 },
    { id: uid(), icon: '🍜', name: 'Order takeout', cost: 200 },
  ],
  chronicle: [],
});

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

class QuestboardPlugin extends Plugin {
  async onload() {
    await this.loadPluginData();
    if (this.importedLegacy) {
      await this.saveData(this.data);
      new Notice(`⚔️ ${PLUGIN_NAME}: your Questboard progress was carried over. You can now remove the old Questboard plugin.`, 10000);
    }

    this.registerView(VIEW_TYPE, (leaf) => new QuestboardView(leaf, this));

    this.addRibbonIcon('swords', `Open ${PLUGIN_NAME}`, () => this.activateView());

    this.addCommand({ id: 'open-quest-board', name: 'Open quest board', callback: () => this.activateView() });
    this.addCommand({ id: 'post-quest', name: 'Post a new quest', callback: () => new QuestModal(this.app, this, null).open() });
    this.addCommand({ id: 'random-quest', name: 'Roll a random quest', callback: () => new RandomQuestModal(this.app, this).open() });
    this.addCommand({ id: 'open-dailies', name: 'Open dailies', callback: () => this.activateView('dailies') });
    this.addCommand({ id: 'open-hero', name: 'Open hero sheet', callback: () => this.activateView('hero') });
    this.addCommand({ id: 'open-treasury', name: 'Open treasury', callback: () => this.activateView('treasury') });
    this.addCommand({ id: 'open-pets', name: 'Open pets', callback: () => this.activateView('pets') });

    this.addSettingTab(new QuestboardSettingTab(this.app, this));

    // Status bar exists on desktop only; harmless on mobile.
    this.statusEl = this.addStatusBarItem();
    this.statusEl.addClass('qb-status');
    this.statusEl.addEventListener('click', () => this.activateView());
    this.updateStatus();

    // Links to the quest board from any note.
    // Block form:   ```tasklandia-link\nlabel: My quests\ntab: dailies\nsize: large\n```
    // Inline form:  `tasklandia-link: label=my quests; tab=dailies`  (anywhere in a sentence, list, callout or table)
    this.linkEmbeds = new Set();
    this.registerMarkdownCodeBlockProcessor('tasklandia-link', (src, el) => {
      this.mountLink(el.createDiv(), tlParseOptions(src), false);
    });
    this.registerMarkdownPostProcessor((el) => {
      el.querySelectorAll('code').forEach((code) => {
        if (code.parentElement && code.parentElement.tagName === 'PRE') return;
        const txt = code.textContent.trim();
        if (!TL_INLINE_RE_ONE.test(txt)) return;
        const holder = document.createElement('span');
        holder.className = 'qb-link-inline-holder';
        code.replaceWith(holder);
        this.mountLink(holder, tlParseInline(txt), true);
      });
    });
    // Live Preview support is optional: if it can't load, inline links still render in Reading view.
    try { const ext = tlBuildLivePreviewLinks(this); if (ext) this.registerEditorExtension(ext); }
    catch (e) { console.warn(`${PLUGIN_NAME}: inline links in Live Preview unavailable`, e); }
    // Also works as a plain Markdown link: [My quests](obsidian://tasklandia?tab=dailies)
    this.registerObsidianProtocolHandler('tasklandia', (params) => this.activateView(TL_LINK_TABS.some((t) => t.id === params.tab) ? params.tab : null, { fromLink: true }));
    this.addCommand({ id: 'insert-link', name: 'Insert quest board link in this note', editorCallback: (editor) => editor.replaceSelection(TL_LINK_SNIPPET()) });
    this.addCommand({ id: 'insert-inline-link', name: 'Insert inline quest board link (inside a sentence)', editorCallback: (editor) => editor.replaceSelection(TL_INLINE_SNIPPET()) });

    this.app.workspace.onLayoutReady(() => this.runTick());
    this.registerInterval(window.setInterval(() => this.runTick(), 60 * 1000));
  }

  onunload() { /* Obsidian cleans up registered views and intervals. */ }

  // Carry progress over from the plugin's old name (Questboard) on first launch.
  async importLegacyData() {
    try {
      const adapter = this.app.vault.adapter;
      const path = `${this.app.vault.configDir}/plugins/${LEGACY_PLUGIN_ID}/data.json`;
      if (!(await adapter.exists(path))) return null;
      const raw = JSON.parse(await adapter.read(path));
      this.importedLegacy = true;
      return raw;
    } catch (e) {
      return null;
    }
  }

  async loadPluginData() {
    let raw = await this.loadData();
    if (!raw && !this.triedLegacy) {
      this.triedLegacy = true;
      raw = await this.importLegacyData();
    }
    const def = DEFAULT_DATA();
    if (!raw) { this.data = def; this.ensureHp(); return; }

    const hero = Object.assign({}, def.hero, raw.hero);
    hero.allocated = Object.assign({ str: 0, agi: 0, con: 0, cha: 0 }, hero.allocated);
    hero.earned = Object.assign({ str: 0, agi: 0, con: 0, cha: 0 }, hero.earned);
    hero.level = Math.min(MAX_LEVEL, hero.level || 1);
    hero.equipment = Object.assign({ weapon: null, armor: null }, hero.equipment);
    hero.inventory = Array.isArray(hero.inventory) ? hero.inventory.filter((id) => GEAR_BY_ID[id]) : [];
    // Upgrading from v1: grant the stat points earned by past level-ups.
    if (raw.hero && !raw.hero.allocated) hero.unspent = Math.max(0, (hero.level || 1) - 1);

    const profile = Object.assign({}, def.profile, raw.profile);
    if (!raw.profile && raw.settings && raw.settings.heroName) profile.name = raw.settings.heroName;

    this.data = {
      settings: Object.assign({}, def.settings, raw.settings),
      profile,
      hero,
      boss: Object.assign({}, def.boss, raw.boss),
      pets: Object.assign({}, def.pets, raw.pets),
      art: Object.assign({}, raw.art),
      quests: Array.isArray(raw.quests) ? raw.quests : def.quests,
      dailies: Array.isArray(raw.dailies) ? raw.dailies : def.dailies,
      rewards: Array.isArray(raw.rewards) ? raw.rewards : def.rewards,
      chronicle: Array.isArray(raw.chronicle) ? raw.chronicle : [],
    };
    delete this.data.settings.heroName;
    this.data.settings.link = Object.assign({}, def.settings.link, raw.settings && raw.settings.link);
    const pets = this.data.pets;
    pets.tamed = Array.isArray(pets.tamed) ? pets.tamed.filter((x) => PET_BY_ID[x.species]) : [];
    if (pets.taming && !PET_BY_ID[pets.taming.species]) pets.taming = null;
    this.ensureHp();
  }

  ensureHp() {
    const h = this.data.hero;
    this.refreshStamina();
    if (typeof h.hp !== 'number' || isNaN(h.hp)) h.hp = this.maxHp();
    h.hp = Math.min(h.hp, this.maxHp());
    const b = this.data.boss;
    if (typeof b.hp !== 'number' || isNaN(b.hp)) b.hp = this.bossInfo().maxHp;
  }

  // Called by Obsidian when data.json changes on disk (e.g. Obsidian Sync from your phone).
  async onExternalSettingsChange() {
    await this.loadPluginData();
    this.refresh();
  }

  async save() {
    await this.saveData(this.data);
    this.refresh();
  }

  refresh() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof QuestboardView) leaf.view.render();
    }
    for (const l of [...(this.linkEmbeds || [])]) {
      if (!l.el.isConnected) { this.linkEmbeds.delete(l); continue; }
      this.renderLink(l.el, l.opts, l.inline);
    }
    this.updateStatus();
  }

  /* ---------------- note links ---------------- */

  /** Turn a vault path, [[wikilink]], art-library picture (art:file) or URL into something an <img> can load. */
  resolveImage(src) {
    if (!src) return null;
    src = String(src).trim();
    if (/^(https?:|data:|app:|capacitor:)/i.test(src)) return src;
    if (src.startsWith('art:')) return this.artUrl(src.slice(4));
    const clean = src.replace(/^!?\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
    const norm = OBSIDIAN.normalizePath ? OBSIDIAN.normalizePath(clean) : clean;
    const file = this.app.vault.getAbstractFileByPath(norm)
      || (this.app.metadataCache.getFirstLinkpathDest && this.app.metadataCache.getFirstLinkpathDest(clean, ''));
    return file && file.extension ? this.app.vault.getResourcePath(file) : null;
  }

  /** Render a link into a holder element and keep it updated when link settings change. */
  mountLink(holder, opts, inline) {
    this.linkEmbeds.add({ el: holder, opts, inline });
    this.renderLink(holder, opts, inline);
  }

  /**
   * Render a quest board link. Options (block: one per line; inline: key=value separated by ; or |), all optional:
   * label, tab (board|dailies|active|hero|pets|treasury|chronicle), icon (Lucide name), image (vault path, [[wikilink]] or URL),
   * style (card|button|icon), size (tiny|small|medium|large|xl|xxl, a multiplier like 1.5, a percent like 150%, or px like 22px),
   * subtitle, and for blocks: align (left|center|right), float (left|right), width (auto|full).
   */
  renderLink(el, o, inline) {
    o = o || {};
    const L = this.data.settings.link;
    const label = o.label || o.title || L.label || PLUGIN_NAME;
    const tabDef = TL_LINK_TABS.find((t) => t.id === o.tab) || TL_LINK_TABS[0];
    const tab = tabDef.id;
    const styles = ['card', 'button', 'icon'];
    // Inline links default to the compact button so they sit naturally in a line of text.
    const style = styles.includes(o.style) ? o.style : inline ? 'button' : (styles.includes(L.style) ? L.style : 'card');
    const imgSrc = o.image != null ? o.image : (o.icon ? '' : L.image);
    const iconName = o.icon || L.icon || 'swords';
    const size = tlLinkSize(o.size != null ? o.size : inline ? 'medium' : L.size);

    el.empty();
    if (!inline) {
      el.className = 'qb-link-block';
      const align = ['left', 'center', 'right'].includes(o.align) ? o.align : 'left';
      el.addClass(`is-align-${align}`);
      if (o.float === 'left' || o.float === 'right') el.addClass(`is-float-${o.float}`);
    }
    const a = el.createEl(inline ? 'span' : 'div', { cls: `qb-link-embed is-${style}` + (inline ? ' is-inline' : '') + (!inline && o.width === 'full' && style !== 'icon' ? ' is-full' : ''),
      attr: { role: 'link', tabindex: '0', 'aria-label': `Open ${label} (${tabDef.label}) in a new tab` } });
    if (size.px) a.style.fontSize = size.px; else a.style.setProperty('--qb-link-scale', String(size.scale));
    const media = a.createEl('span', { cls: 'qb-link-media' });
    const drawIcon = () => { media.empty(); media.addClass('is-icon'); setIcon(media, iconName); if (!media.querySelector('svg')) setIcon(media, 'swords'); };
    const url = this.resolveImage(imgSrc);
    if (url) {
      media.removeClass('is-icon');
      const img = media.createEl('img', { attr: { src: url, alt: '' } });
      img.addEventListener('error', drawIcon);   // broken picture → fall back to the icon
    } else drawIcon();
    if (style !== 'icon') {
      const tx = a.createEl('span', { cls: 'qb-link-text' });
      tx.createEl('span', { cls: 'qb-link-title', text: label });
      if (style === 'card') tx.createEl('span', { cls: 'qb-link-sub', text: o.subtitle || `Open ${tabDef.label}` });
      setIcon(a.createSpan({ cls: 'qb-link-arrow' }), 'external-link');
    } else a.setAttr('title', label);
    const go = (e) => { e.preventDefault(); e.stopPropagation(); this.activateView(tab, { fromLink: true }); };
    a.addEventListener('click', go);
    // Keep the editor from moving the cursor into the link's source when it's clicked.
    a.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); });
    a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(e); });
  }

  updateStatus() {
    if (!this.statusEl) return;
    const h = this.data.hero;
    this.statusEl.setText(`⚔️ Lv ${h.level} · ❤️ ${Math.max(0, h.hp)}/${this.maxHp()} · ⚡ ${h.stamina}/${this.maxStamina()} · 🪙 ${h.gold}`);
  }

  async activateView(tab, opts = {}) {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    // Links open a new tab; if the board is already open they switch to it (unless "Always open a new tab" is on).
    if (opts.fromLink && this.data.settings.link && this.data.settings.link.reuseTab === false) leaf = null;
    if (!leaf) {
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf(leaf);
    if (tab && leaf.view instanceof QuestboardView) {
      leaf.view.tab = tab;
      leaf.view.render();
    }
  }

  /* ---------------- notices ---------------- */

  newLog() { return { msgs: [], big: [], attacks: [], death: null }; }

  flush(log) {
    if (log.msgs.length) new Notice(log.msgs.join('\n'), 6000);
    for (const m of log.big) new Notice(m, 9000);
    if (log.attacks && log.attacks.length) {
      try { new BossAttackModal(this.app, this, log.attacks, log.death).open(); }
      catch (e) { new Notice(log.attacks.map((a) => (a.dodged ? `🏹 Dodged: ${a.reason}` : `💥 −${a.dmg} HP: ${a.reason}`)).join('\n'), 9000); }
    }
  }

  chronicle(entry) {
    const e = Object.assign({ id: uid(), at: Date.now() }, entry);
    this.data.chronicle.unshift(e);
    this.data.chronicle = this.data.chronicle.slice(0, 250);
    return e;
  }

  /* ---------------- hero & stats ---------------- */

  baseStats(profile = this.data.profile) {
    const bg = BACKGROUNDS[profile.background] || {};
    const hl = HOMELANDS[profile.homeland] || {};
    const gl = GOALS[profile.goal] || {};
    const out = {};
    for (const k of STAT_KEYS) out[k] = BASE_STAT + (bg[k] || 0) + (hl[k] || 0) + (gl[k] || 0);
    return out;
  }

  gearBonus() {
    const out = { str: 0, agi: 0, con: 0, cha: 0 };
    const eq = this.data.hero.equipment || {};
    for (const slot of Object.keys(SLOTS)) {
      const g = GEAR_BY_ID[eq[slot]];
      if (g) for (const k of STAT_KEYS) out[k] += g.bonus[k] || 0;
    }
    return out;
  }

  stats() {
    const base = this.baseStats();
    const gear = this.gearBonus();
    const h = this.data.hero;
    const out = {};
    for (const k of STAT_KEYS) out[k] = base[k] + (h.allocated[k] || 0) + (h.earned[k] || 0) + gear[k];
    return out;
  }

  /* ---------------- armory ---------------- */

  ownsGear(id) {
    const h = this.data.hero;
    return h.inventory.includes(id) || Object.values(h.equipment).includes(id);
  }

  // The blacksmith stocks the newest unlocked pieces you don't own yet (up to 5).
  shopItems() {
    const lvl = this.data.hero.level;
    return GEAR
      .filter((g) => g.level <= lvl && !this.ownsGear(g.id))
      .sort((a, b) => b.tier - a.tier || GEAR.indexOf(a) - GEAR.indexOf(b))
      .slice(0, SHOP_SIZE);
  }

  nextGearTier() {
    const lvl = this.data.hero.level;
    return GEAR_TIERS.find((t) => t.level > lvl) || null;
  }

  async buyGear(id) {
    const g = GEAR_BY_ID[id];
    const h = this.data.hero;
    if (!g || this.ownsGear(id)) return;
    if (h.level < g.level) { new Notice(`🔒 ${g.name} unlocks at level ${g.level}.`); return; }
    const cost = this.price(g.cost);
    if (h.gold < cost) { new Notice(`🪙 You need ${cost - h.gold} more gold for ${g.name}.`); return; }
    h.gold -= cost;
    h.goldSpent = (h.goldSpent || 0) + cost;
    h.inventory.push(g.id);
    this.chronicle({ type: 'gear', name: g.name, icon: g.icon, cost });
    this.equipInternal(g.id);
    new Notice(`${g.icon} You bought and equipped ${g.name} (${bonusText(g.bonus)}).`, 6000);
    await this.save();
  }

  equipInternal(id) {
    const g = GEAR_BY_ID[id];
    const h = this.data.hero;
    if (!g || !h.inventory.includes(id)) return;
    this.withMaxHpChange(() => {
      const current = h.equipment[g.slot];
      h.inventory = h.inventory.filter((x) => x !== id);
      if (current) h.inventory.push(current);
      h.equipment[g.slot] = id;
    });
  }

  async equipGear(id) {
    const g = GEAR_BY_ID[id];
    if (!g) return;
    this.equipInternal(id);
    new Notice(`${g.icon} Equipped ${g.name} (${bonusText(g.bonus)}).`);
    await this.save();
  }

  async unequipGear(slot) {
    const h = this.data.hero;
    const id = h.equipment[slot];
    const g = GEAR_BY_ID[id];
    if (!g) return;
    this.withMaxHpChange(() => {
      h.equipment[slot] = null;
      h.inventory.push(id);
    });
    new Notice(`${g.icon} Unequipped ${g.name}. Its bonus (${bonusText(g.bonus)}) is gone until you equip it again.`);
    await this.save();
  }

  // Stamina: a daily energy budget that grows with level. Quests spend it; dailies don't.
  maxStamina(level = this.data.hero.level) {
    return 20 + 2 * (level - 1); // level 1: exactly two Legendary quests
  }

  questStamina(q) {
    return (DIFFICULTIES[q.difficulty] || DIFFICULTIES[1]).sta;
  }

  refreshStamina() {
    const h = this.data.hero;
    const today = dayKey();
    if (h.staminaDay !== today || typeof h.stamina !== 'number' || isNaN(h.stamina)) {
      h.stamina = this.maxStamina();
      h.staminaDay = today;
      h.tonicsToday = 0;
      return true;
    }
    h.stamina = Math.min(h.stamina, this.maxStamina());
    return false;
  }

  maxHp(level = this.data.hero.level, con = this.stats().con) {
    return 50 + level * 10 + con * 5;
  }

  strMultiplier() { return 1 + this.stats().str * 0.08; }
  // Diminishing returns keep Agility useful all the way to level 100.
  critChance() { const a = this.stats().agi; return 0.35 * a / (a + 40); }
  dodgeChance() { const a = this.stats().agi; return 0.5 * a / (a + 40); }

  // Charisma
  tameMultiplier() { return 1 + this.stats().cha * 0.04; }
  fleeMultiplier() { const c = this.stats().cha; return 1 - c / (c + 60); }
  discount() { const c = this.stats().cha; return 0.25 * c / (c + 60); }
  price(base) { return Math.max(1, Math.round(base * (1 - this.discount()))); }
  potionCost() { return this.price(25 + 3 * this.data.hero.level); }

  // Quest and daily rewards grow with level so the climb to 100 stays rewarding.
  levelMult() { return 1 + (this.data.hero.level - 1) * 0.02; }

  portrait() {
    const variant = (GENDERS[this.data.profile.gender] || GENDERS.unspecified).variant;
    let p = PORTRAITS[0][1][variant];
    for (const [lvl, set] of PORTRAITS) if (this.data.hero.level >= lvl) p = set[variant];
    return p;
  }

  // Run a change that might alter max HP; any increase is added to current HP too.
  withMaxHpChange(fn) {
    const before = this.maxHp();
    fn();
    const after = this.maxHp();
    const h = this.data.hero;
    if (after > before) h.hp += after - before;
    h.hp = Math.min(h.hp, after);
  }

  heal(amount) {
    const h = this.data.hero;
    const before = h.hp;
    h.hp = Math.min(this.maxHp(), h.hp + amount);
    return h.hp - before;
  }

  gainXp(amount, log) {
    const h = this.data.hero;
    const oldTitle = titleFor(h.level);
    h.xp += amount;
    h.totalXp += amount;
    let gained = 0;
    while (h.level < MAX_LEVEL && h.xp >= xpToNext(h.level)) {
      h.xp -= xpToNext(h.level);
      h.level += 1;
      h.unspent += 1;
      h.gold += h.level * 10;
      h.stamina = (h.stamina || 0) + 2;
      gained += 1;
    }
    if (h.level >= MAX_LEVEL) h.xp = 0;
    if (gained) {
      h.hp = this.maxHp(); // full heal on level-up
      if (h.level >= MAX_LEVEL) log.big.push(`👑 You have reached the maximum level, ${MAX_LEVEL}. All of Tasklandia sings your name.`);
      const newTitle = titleFor(h.level);
      const titleMsg = newTitle !== oldTitle ? ` You are now known as ${newTitle}!` : '';
      log.big.push(`🎉 LEVEL UP! You reached level ${h.level}. Health restored, +${gained} stat point${gained > 1 ? 's' : ''} to spend.${titleMsg}`);
      this.celebrate = 'level';
    }
    return gained;
  }

  async allocateStat(stat) {
    const h = this.data.hero;
    if (h.unspent <= 0 || !STATS[stat]) return;
    this.withMaxHpChange(() => {
      h.unspent -= 1;
      h.allocated[stat] += 1;
    });
    new Notice(`${STATS[stat].icon} ${STATS[stat].name} increased!`);
    await this.save();
  }

  heroDies(log) {
    const h = this.data.hero;
    const boss = this.bossInfo();
    h.deaths = (h.deaths || 0) + 1;
    if (h.level > 1) {
      h.level -= 1;
      h.xp = 0;
      // Give back the stat point from the lost level: unspent first, then the highest trained stat.
      if (h.unspent > 0) h.unspent -= 1;
      else {
        const k = STAT_KEYS.slice().sort((a, b) => h.allocated[b] - h.allocated[a])[0];
        if (h.allocated[k] > 0) h.allocated[k] -= 1;
      }
      log.death = { level: h.level, lostLevel: true };
      this.chronicle({ type: 'death', boss: boss.name, level: h.level });
    } else {
      const lost = Math.floor(h.gold / 2);
      h.gold -= lost;
      h.xp = 0;
      log.death = { level: 1, lostLevel: false, gold: lost };
      this.chronicle({ type: 'death', boss: boss.name, level: 1, gold: lost });
    }
    h.hp = this.maxHp();
    h.stamina = Math.min(h.stamina, this.maxStamina());
    this.celebrate = 'death';
  }

  /* ---------------- bosses ---------------- */

  bossInfo(index = this.data.boss.index) {
    const tier = Math.floor(index / BOSSES.length);
    const base = BOSSES[index % BOSSES.length];
    const prefix = tier ? (ASCENSION[tier - 1] || `Eternal ${tier - ASCENSION.length + 1}×`) : '';
    return {
      number: index + 1,
      tier,
      name: prefix ? `${prefix} ${base.name.replace(/^The /, '')}` : base.name,
      icon: base.icon,
      type: base.type,
      story: base.story,
      maxHp: Math.round(base.hp * (1 + tier * 0.75)),
      attack: Math.round(base.attack * (1 + tier * 0.5)),
      xp: 100 + 75 * index,
      gold: 50 + 40 * index,
    };
  }

  estimateDamage(baseDmg) {
    return Math.max(1, Math.round(baseDmg * this.strMultiplier()));
  }

  questDamage(q) {
    return this.estimateDamage((DIFFICULTIES[q.difficulty] || DIFFICULTIES[1]).dmg);
  }

  dealBossDamage(baseDmg, log) {
    const b = this.data.boss;
    const info = this.bossInfo();
    let dmg = this.estimateDamage(baseDmg);
    const crit = Math.random() < this.critChance();
    if (crit) dmg = Math.round(dmg * 1.5);
    b.hp = Math.max(0, b.hp - dmg);
    log.msgs.push(`${crit ? '💥 Critical hit! ' : '🗡️ '}You strike ${info.name} for ${dmg} damage (${b.hp}/${info.maxHp} HP left).`);
    if (b.hp <= 0) this.defeatBoss(log);
    return dmg;
  }

  defeatBoss(log) {
    const b = this.data.boss;
    const h = this.data.hero;
    const info = this.bossInfo();
    h.gold += info.gold;
    h.bossesSlain = (h.bossesSlain || 0) + 1;
    this.chronicle({ type: 'boss', boss: info.name, icon: info.icon, xp: info.xp, gold: info.gold });
    log.big.push(`🏆 VICTORY! ${info.icon} ${info.name} is defeated! The realm rejoices.\n+${info.xp} XP · +${info.gold} gold`);
    b.index += 1;
    const next = this.bossInfo();
    b.hp = next.maxHp;
    this.gainXp(info.xp, log);
    log.big.push(`⚠️ A new threat rises: ${next.icon} ${next.name}!`);
    this.celebrate = 'boss';
  }

  // Returns true if the hero died.
  bossAttack(reason, log) {
    const h = this.data.hero;
    const info = this.bossInfo();
    const maxHp = this.maxHp();
    if (Math.random() < this.dodgeChance()) {
      log.attacks.push({ reason, dmg: 0, dodged: true, before: h.hp, after: h.hp, max: maxHp });
      this.chronicle({ type: 'attack', boss: info.name, reason, dmg: 0 });
      return false;
    }
    const dmg = Math.max(1, Math.round(info.attack * (0.8 + Math.random() * 0.4)));
    const before = h.hp;
    h.hp -= dmg;
    log.attacks.push({ reason, dmg, dodged: false, before, after: Math.max(0, h.hp), max: maxHp });
    this.chronicle({ type: 'attack', boss: info.name, reason, dmg });
    if (h.hp <= 0) { this.heroDies(log); return true; }
    return false;
  }

  /* ---------------- periodic tick ---------------- */

  async runTick() {
    const log = this.newLog();
    if (this.tick(log)) {
      await this.save();
      this.flush(log);
    }
    await this.showBossIntroIfNeeded();
  }

  // Pop up the tale of a boss the hero hasn't been introduced to yet (also catches bosses defeated on another device).
  async showBossIntroIfNeeded() {
    const b = this.data.boss;
    if (!this.data.profile.created || this.introOpen || b.seen === b.index) return;
    this.introOpen = true;
    const first = b.index === 0 && !this.data.hero.bossesSlain;
    b.seen = b.index;
    await this.saveData(this.data);
    try {
      new BossIntroModal(this.app, this, first).open();
    } catch (e) {
      this.introOpen = false;
    }
  }

  tick(log) {
    let changed = false;
    if (this.refreshStamina()) changed = true;
    if (this.wakeRestingQuests()) changed = true;
    if (this.rollDailies()) changed = true;
    if (this.checkOverdue(log)) changed = true;
    return changed;
  }

  checkOverdue(log) {
    if (!this.data.profile.created) return false;
    const attacks = this.data.settings.bossAttacks;
    const today = dayKey();
    let changed = false;
    let died = false;
    for (const q of this.data.quests) {
      if (q.status !== 'available' && q.status !== 'active') continue;
      if (!q.due || q.due >= today || q.lastPenaltyDay === today) continue;
      q.lastPenaltyDay = today;
      changed = true;
      // After felling the hero, the boss retreats for the day.
      if (attacks && !died) died = this.bossAttack(`“${q.title}” is overdue`, log);
      this.spookPet(q, log);
    }
    return changed;
  }

  wakeRestingQuests() {
    const now = Date.now();
    let changed = false;
    for (const q of this.data.quests) {
      if (q.status === 'resting' && (!q.availableAt || q.availableAt <= now)) {
        q.status = 'available';
        delete q.availableAt;
        changed = true;
      }
    }
    return changed;
  }

  /* ---------------- quests ---------------- */

  effectiveStreak() {
    const h = this.data.hero;
    if (h.lastDay === dayKey() || h.lastDay === yesterdayKey()) return h.streak;
    return 0;
  }

  projectedStreak() {
    const h = this.data.hero;
    if (h.lastDay === dayKey()) return h.streak;
    if (h.lastDay === yesterdayKey()) return h.streak + 1;
    return 1;
  }

  computeReward(quest, streak) {
    const s = this.data.settings;
    const d = DIFFICULTIES[quest.difficulty] || DIFFICULTIES[1];
    const notes = [];
    let bonus = 0;
    if (s.streakBonus && streak > 1) {
      const sb = Math.min((streak - 1) * 0.05, 0.5);
      bonus += sb;
      notes.push(`🔥 streak +${Math.round(sb * 100)}%`);
    }
    if (quest.fated) {
      bonus += FATE_BONUS;
      notes.push(`🎲 fate's favour +${Math.round(FATE_BONUS * 100)}%`);
    }
    if (quest.due && dayKey() <= quest.due) {
      bonus += 0.1;
      notes.push('⏳ on time +10%');
    }
    const m = (Number(s.rewardMultiplier) || 1) * this.levelMult();
    return {
      xp: Math.round(d.xp * m * (1 + bonus)),
      gold: Math.round(d.gold * m * (1 + bonus)),
      notes,
    };
  }

  previewReward(quest) {
    return this.computeReward(quest, this.projectedStreak());
  }

  activeCount() {
    return this.data.quests.filter((q) => q.status === 'active').length;
  }

  async acceptQuest(id, due) {
    const q = this.data.quests.find((x) => x.id === id);
    if (!q) return;
    if (this.activeCount() >= this.data.settings.maxActive) {
      new Notice(`🎒 Your quest log is full (${this.data.settings.maxActive}). Finish or abandon a quest first.`);
      return;
    }
    // Every accepted quest needs a deadline.
    if (due) { q.due = due; delete q.lastPenaltyDay; }
    if (!q.due) { new AcceptQuestModal(this.app, this, q).open(); return; }
    q.status = 'active';
    q.acceptedAt = Date.now();
    new Notice(`🗡️ Quest accepted: ${q.title} (due ${friendlyDay(q.due)})`);
    await this.save();
  }

  async abandonQuest(id) {
    const q = this.data.quests.find((x) => x.id === id);
    if (!q) return;
    q.status = 'available';
    delete q.acceptedAt;
    await this.save();
  }

  async completeQuest(id) {
    const q = this.data.quests.find((x) => x.id === id);
    if (!q) return;
    const h = this.data.hero;
    const d = DIFFICULTIES[q.difficulty] || DIFFICULTIES[1];
    this.refreshStamina();
    if (h.stamina < d.sta) {
      new Notice(`⚡ You're too tired for “${q.title}” (needs ${d.sta} stamina, you have ${h.stamina}). Rest and try again tomorrow, or pick an easier quest. Dailies don't need stamina.`, 7000);
      return;
    }
    h.stamina -= d.sta;
    const log = this.newLog();
    log.msgs.push(`⚡ −${d.sta} stamina (${h.stamina}/${this.maxStamina()} left)`);

    // Streak
    h.streak = this.projectedStreak();
    h.lastDay = dayKey();
    h.bestStreak = Math.max(h.bestStreak || 0, h.streak);

    // Rewards
    const reward = this.computeReward(q, h.streak);
    const extra = reward.notes.length ? ` (${reward.notes.join(' · ')})` : '';
    log.msgs.push(`⚔️ Quest complete: ${q.title}\n+${reward.xp} XP · +${reward.gold} gold${extra}`);
    h.gold += reward.gold;
    h.completed += 1;

    // Stat training
    const stat = STATS[q.statReward] ? q.statReward : null;
    if (stat) {
      this.withMaxHpChange(() => { h.earned[stat] += 1; });
      log.msgs.push(`${STATS[stat].icon} +1 ${STATS[stat].name} from your training!`);
    }

    // A little rest after a job well done
    const healed = this.heal(2 + q.difficulty * 2);
    if (healed > 0) log.msgs.push(`❤️ +${healed} HP`);

    // Strike the boss
    const dmg = this.dealBossDamage(d.dmg, log);

    // Win the trust of the creature you are taming
    const tamedId = this.gainTrust(q.difficulty, log);

    const entry = this.chronicle({
      type: 'quest', title: q.title, difficulty: q.difficulty, guild: q.guild,
      xp: reward.xp, gold: reward.gold, dmg, stat,
    });

    if (this.gainXp(reward.xp, log)) entry.levelUp = h.level;
    if (!this.celebrate) this.celebrate = 'quest';

    // Recurring quests rest, one-time quests leave the board.
    q.timesCompleted = (q.timesCompleted || 0) + 1;
    if (q.recurrence && q.recurrence !== 'none') {
      const next = addInterval(new Date(), q.recurrence);
      q.status = 'resting';
      q.availableAt = next.getTime();
      delete q.acceptedAt;
      delete q.lastPenaltyDay;
      if (q.due) {
        let nd = addInterval(parseDay(q.due), q.recurrence);
        while (nd < next) nd = addInterval(nd, q.recurrence);
        q.due = dayKey(nd);
      }
    } else {
      this.data.quests = this.data.quests.filter((x) => x.id !== q.id);
    }

    await this.save();
    this.flush(log);
    if (tamedId) this.promptPetName(tamedId);
    await this.showBossIntroIfNeeded();
  }

  // Pick a random quest from the pool, skipping ones already on the board.
  randomQuest(guild = 'any', difficulty = 'any', exclude = null) {
    const onBoard = new Set(this.data.quests.map((q) => q.title));
    let pool = RANDOM_QUESTS.filter(([title, , g, d]) =>
      (guild === 'any' || g === guild) && (difficulty === 'any' || d === Number(difficulty)) && !onBoard.has(title));
    if (exclude && pool.length > 1) pool = pool.filter(([title]) => title !== exclude);
    if (!pool.length) return null;
    const [title, description, g, d, stat] = pool[Math.floor(Math.random() * pool.length)];
    return {
      id: uid(), title, description, guild: g, difficulty: d, statReward: stat,
      recurrence: 'none', due: '', status: 'available', created: Date.now(), timesCompleted: 0, fated: true,
    };
  }

  async upsertQuest(quest) {
    const i = this.data.quests.findIndex((x) => x.id === quest.id);
    if (i >= 0) this.data.quests[i] = quest;
    else this.data.quests.push(quest);
    await this.save();
  }

  async deleteQuest(id) {
    this.data.quests = this.data.quests.filter((x) => x.id !== id);
    await this.save();
  }

  /* ---------------- dailies ---------------- */

  rollDailies() {
    const today = dayKey();
    const yesterday = yesterdayKey();
    let changed = false;
    for (const d of this.data.dailies) {
      if (d.day === today) continue;
      d.day = today;
      d.count = 0;
      d.peak = 0;
      if (d.lastDone !== yesterday && d.lastDone !== today) d.streak = 0;
      changed = true;
    }
    return changed;
  }

  async checkDaily(id) {
    this.rollDailies();
    const d = this.data.dailies.find((x) => x.id === id);
    if (!d) return;
    if (d.count >= d.target) { new Notice(`✅ ${d.title} is already done for today.`); return; }
    const h = this.data.hero;
    const log = this.newLog();
    d.count += 1;

    // Rewards are only paid the first time each check is reached today (undo can't be farmed).
    if (d.count > d.peak) {
      d.peak = d.count;
      const L = this.levelMult();
      let xp = Math.round(5 * L);
      let gold = Math.round(2 * L);
      this.heal(2);
      const parts = [`${d.icon || '✔️'} ${d.title} (${d.count}/${d.target})`];

      if (d.count === d.target) {
        const today = dayKey();
        d.streak = d.lastDone === yesterdayKey() ? d.streak + 1 : (d.lastDone === today ? d.streak : 1);
        d.lastDone = today;
        d.best = Math.max(d.best || 0, d.streak);
        xp += Math.round(10 * L);
        gold += Math.round(5 * L);
        parts.push(`Done for today! 🔥 ${d.streak}-day streak`);

        const allDone = this.data.dailies.every((x) => x.count >= x.target);
        if (allDone && h.dailyBonusDay !== today) {
          h.dailyBonusDay = today;
          const bx = Math.round(25 * L);
          const bg = Math.round(10 * L);
          xp += bx;
          gold += bg;
          log.big.push(`🌟 Daily discipline! Every daily is done today: +${bx} XP · +${bg} gold`);
          this.chronicle({ type: 'discipline', xp: bx, gold: bg });
        }
      }
      parts.push(`+${xp} XP · +${gold} gold`);
      log.msgs.push(parts.join('\n'));
      h.gold += gold;
      this.dealBossDamage(2, log);
      this.gainXp(xp, log);
    }

    await this.save();
    this.flush(log);
    await this.showBossIntroIfNeeded();
  }

  async undoDaily(id) {
    const d = this.data.dailies.find((x) => x.id === id);
    if (!d || d.count <= 0) return;
    d.count -= 1;
    await this.save();
  }

  async upsertDaily(daily) {
    const i = this.data.dailies.findIndex((x) => x.id === daily.id);
    if (i >= 0) this.data.dailies[i] = daily;
    else this.data.dailies.push(daily);
    await this.save();
  }

  async deleteDaily(id) {
    this.data.dailies = this.data.dailies.filter((x) => x.id !== id);
    await this.save();
  }

  /* ---------------- treasury ---------------- */

  staminaTonicCost() { return this.price(40 + 4 * this.data.hero.level); }

  async buyStaminaTonic() {
    const h = this.data.hero;
    this.refreshStamina();
    const max = this.maxStamina();
    if ((h.tonicsToday || 0) >= STAMINA_TONIC.perDay) { new Notice(`⚗️ You've had ${STAMINA_TONIC.perDay} tonics today. Any more and you'd never sleep. Stamina refills at midnight.`); return; }
    if (h.stamina >= max) { new Notice('⚡ Your stamina is already full.'); return; }
    const cost = this.staminaTonicCost();
    if (h.gold < cost) { new Notice(`🪙 You need ${cost - h.gold} more gold.`); return; }
    h.gold -= cost;
    h.goldSpent = (h.goldSpent || 0) + cost;
    h.tonicsToday = (h.tonicsToday || 0) + 1;
    const before = h.stamina;
    h.stamina = Math.min(max, h.stamina + Math.round(max * STAMINA_TONIC.restore));
    new Notice(`⚗️ You drink a ${STAMINA_TONIC.name.toLowerCase()}: +${h.stamina - before} stamina (${STAMINA_TONIC.perDay - h.tonicsToday} left today).`);
    await this.save();
  }

  async buyPotion() {
    const h = this.data.hero;
    if (h.hp >= this.maxHp()) { new Notice('❤️ You are already at full health.'); return; }
    const cost = this.potionCost();
    if (h.gold < cost) { new Notice(`🪙 You need ${cost - h.gold} more gold.`); return; }
    h.gold -= cost;
    h.goldSpent = (h.goldSpent || 0) + cost;
    const healed = this.heal(Math.round(this.maxHp() * POTION.heal));
    new Notice(`🧪 You drink a healing draught: +${healed} HP.`);
    await this.save();
  }

  async buyReward(id) {
    const r = this.data.rewards.find((x) => x.id === id);
    if (!r) return;
    const h = this.data.hero;
    if (h.gold < r.cost) {
      new Notice(`🪙 You need ${r.cost - h.gold} more gold for that.`);
      return;
    }
    h.gold -= r.cost;
    h.goldSpent = (h.goldSpent || 0) + r.cost;
    this.chronicle({ type: 'purchase', name: r.name, icon: r.icon, cost: r.cost });
    new Notice(`🎁 Claimed: ${r.icon || ''} ${r.name}. Enjoy it, you earned it!`, 5000);
    await this.save();
  }

  async upsertReward(reward) {
    const i = this.data.rewards.findIndex((x) => x.id === reward.id);
    if (i >= 0) this.data.rewards[i] = reward;
    else this.data.rewards.push(reward);
    await this.save();
  }

  async deleteReward(id) {
    this.data.rewards = this.data.rewards.filter((x) => x.id !== id);
    await this.save();
  }

  /* ---------------- custom art ---------------- */

  // Images live inside the plugin's own folder, so they travel with the plugin.
  artDir() {
    const dir = (this.manifest && this.manifest.dir) || `${this.app.vault.configDir}/plugins/quests-of-tasklandia`;
    return `${dir}/art`;
  }

  async listArt() {
    const adapter = this.app.vault.adapter;
    const dir = this.artDir();
    try {
      if (!(await adapter.exists(dir))) return [];
      const res = await adapter.list(dir);
      return res.files.map((f) => f.split('/').pop()).filter((f) => ART_EXT.test(f)).sort((a, b) => a.localeCompare(b));
    } catch (e) {
      return [];
    }
  }

  artUrl(file) {
    if (!file) return null;
    try { return this.app.vault.adapter.getResourcePath(`${this.artDir()}/${file}`); } catch (e) { return null; }
  }

  artFor(key) {
    return this.artUrl(this.data.art && this.data.art[key]);
  }

  async setArt(key, file) {
    if (!this.data.art) this.data.art = {};
    if (file) this.data.art[key] = file;
    else delete this.data.art[key];
    await this.save();
  }

  // Returns the stored file name.
  async uploadArt(file, maxSize) {
    const adapter = this.app.vault.adapter;
    const dir = this.artDir();
    if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
    const { buf, ext } = await artPrepare(file, maxSize);
    const { base } = artSafeName(file.name);
    let name = `${base}.${ext}`;
    let n = 2;
    while (await adapter.exists(`${dir}/${name}`)) name = `${base}-${n++}.${ext}`;
    await adapter.writeBinary(`${dir}/${name}`, buf);
    return name;
  }

  async deleteArt(file) {
    const adapter = this.app.vault.adapter;
    const path = `${this.artDir()}/${file}`;
    if (await adapter.exists(path)) await adapter.remove(path);
    for (const k of Object.keys(this.data.art || {})) if (this.data.art[k] === file) delete this.data.art[k];
    await this.save();
  }

  artUses(file) {
    return Object.keys(this.data.art || {}).filter((k) => this.data.art[k] === file).map((k) => this.artLabel(k));
  }

  artLabel(key) {
    const [kind, id] = key.split(':');
    if (kind === 'hero') return 'Your hero';
    if (kind === 'scene') return 'Dashboard background';
    if (kind === 'boss') return BOSSES[Number(id)] ? BOSSES[Number(id)].name : 'Boss';
    if (kind === 'pet') return PET_BY_ID[id] ? PET_BY_ID[id].name : 'Pet';
    if (kind === 'gear') return GEAR_BY_ID[id] ? GEAR_BY_ID[id].name : 'Gear';
    return key;
  }

  // The dashboard backdrop: your own picture (art key 'scene') or the built-in mountain pass.
  applyScenery(root) {
    const s = this.data.settings;
    root.toggleClass('qb-scenic', !!s.scenery);
    if (!s.scenery) { root.style.removeProperty('--qb-scene'); return; }
    const url = this.artFor('scene') || tlScene();
    root.style.setProperty('--qb-scene', `url("${url.replace(/"/g, '%22')}")`);
    root.style.setProperty('--qb-scene-dim', String(Math.max(0, Math.min(80, Number(s.sceneryDim) || 0)) / 100));
  }

  openArtPicker(key, emoji) {
    new ArtPickerModal(this.app, this, key, key ? this.artLabel(key) : null, emoji).open();
  }

  /* ---------------- pets ---------------- */

  petsUnlocked() { return this.data.hero.level >= PET_UNLOCK_LEVEL; }

  isTamed(speciesId) { return this.data.pets.tamed.some((x) => x.species === speciesId); }

  petFleeChance(pet) { return pet.flee * this.fleeMultiplier(); }

  trustPerQuest(difficulty) {
    return Math.max(1, Math.round((TRUST_PER_DIFFICULTY[difficulty] || 2) * this.tameMultiplier()));
  }

  async startTaming(speciesId) {
    const pet = PET_BY_ID[speciesId];
    const pets = this.data.pets;
    if (!pet || !this.petsUnlocked() || this.isTamed(speciesId)) return;
    if (pets.taming) { new Notice('🐾 You can only tame one creature at a time.'); return; }
    if (this.data.hero.level < pet.level) { new Notice(`🔒 ${pet.name} can be tamed from level ${pet.level}.`); return; }
    pets.taming = { species: speciesId, trust: 0, started: Date.now() };
    new Notice(`🐾 You begin earning the trust of a ${pet.name}. Complete quests to win it over, and don't let quests go overdue!`, 6000);
    await this.save();
  }

  async releaseTaming() {
    const pets = this.data.pets;
    if (!pets.taming) return;
    const pet = PET_BY_ID[pets.taming.species];
    pets.taming = null;
    new Notice(`🍃 You let the ${pet ? pet.name : 'creature'} return to the wild.`);
    await this.save();
  }

  // Returns the new pet's id if taming finished.
  gainTrust(difficulty, log) {
    const pets = this.data.pets;
    if (!pets.taming || !this.petsUnlocked()) return null;
    const pet = PET_BY_ID[pets.taming.species];
    if (!pet) { pets.taming = null; return null; }
    const gain = this.trustPerQuest(difficulty);
    pets.taming.trust = Math.min(pet.trust, pets.taming.trust + gain);
    if (pets.taming.trust < pet.trust) {
      log.msgs.push(`🐾 The ${pet.name} trusts you a little more (+${gain}, ${pets.taming.trust}/${pet.trust}).`);
      return null;
    }
    const tamed = { id: uid(), species: pet.id, name: pet.name, tamedAt: Date.now() };
    pets.tamed.push(tamed);
    pets.taming = null;
    if (!pets.companion) pets.companion = tamed.id;
    this.chronicle({ type: 'tamed', name: pet.name, icon: pet.icon });
    log.big.push(`${pet.icon} You tamed a ${pet.name}! It joins your menagerie. Give it a name on the Pets tab.`);
    return tamed.id;
  }

  spookPet(q, log) {
    const pets = this.data.pets;
    if (!pets.taming) return;
    const pet = PET_BY_ID[pets.taming.species];
    if (!pet) return;
    if (Math.random() < this.petFleeChance(pet)) {
      pets.taming = null;
      this.chronicle({ type: 'fled', name: pet.name, icon: pet.icon, reason: q.title });
      log.big.push(`💨 “${q.title}” went unfinished and the ${pet.name} lost faith in you. It fled into the wild, and all its trust is gone.`);
    } else {
      const lost = Math.ceil(pets.taming.trust * 0.1);
      pets.taming.trust -= lost;
      log.msgs.push(`🐾 The ${pet.name} grows wary because “${q.title}” is overdue${lost ? ` (−${lost} trust)` : ''}. It nearly ran!`);
    }
  }

  promptPetName(id) {
    try { new PetNameModal(this.app, this, id).open(); } catch (e) { /* naming can wait */ }
  }

  async renamePet(id, name) {
    const pet = this.data.pets.tamed.find((x) => x.id === id);
    if (!pet) return;
    pet.name = (name || '').trim() || PET_BY_ID[pet.species].name;
    await this.save();
  }

  async setCompanion(id) {
    this.data.pets.companion = this.data.pets.companion === id ? null : id;
    await this.save();
  }

  async releasePet(id) {
    const pets = this.data.pets;
    pets.tamed = pets.tamed.filter((x) => x.id !== id);
    if (pets.companion === id) pets.companion = null;
    await this.save();
  }

  companion() {
    const c = this.data.pets.tamed.find((x) => x.id === this.data.pets.companion);
    return c ? Object.assign({}, PET_BY_ID[c.species], { petName: c.name }) : null;
  }

  /* ---------------- profile ---------------- */

  async saveProfile(profile) {
    const first = !this.data.profile.created;
    this.withMaxHpChange(() => {
      this.data.profile = Object.assign({}, profile, { created: true });
    });
    if (first) {
      this.data.hero.hp = this.maxHp();
      new Notice(`⚔️ ${profile.name}, your legend begins!`, 5000);
    }
    await this.save();
    if (first) await this.showBossIntroIfNeeded();
  }
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

class QuestboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = 'board';
    this.guildFilter = 'all';
    this.sort = 'reward';
    this.editingProfile = false;
  }

  // Show the player's picture for this key if they set one, otherwise the emoji.
  art(parent, tag, cls, key, emoji, label) {
    const el = parent.createEl(tag, { cls });
    const url = this.plugin.artFor(key);
    if (url) {
      el.addClass('qb-has-art');
      const img = el.createEl('img', { cls: 'qb-custom-art', attr: { src: url, alt: label || '', draggable: 'false' } });
      img.addEventListener('error', () => { img.remove(); el.removeClass('qb-has-art'); el.prepend(document.createTextNode(emoji)); });
    } else {
      el.setText(emoji);
    }
    return el;
  }

  pictureButton(parent, key, emoji, text) {
    const b = parent.createEl('button', { cls: 'qb-btn qb-picture-btn', text: text || '🖼️ Change picture' });
    b.addEventListener('click', () => this.plugin.openArtPicker(key, emoji));
    return b;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Tasklandia'; }
  getIcon() { return 'swords'; }

  async onOpen() {
    this.render();
    this.plugin.runTick();
  }

  async onClose() { this.contentEl.empty(); }

  render() {
    const root = this.contentEl;
    const scroll = root.scrollTop;
    root.empty();
    root.addClass('qb-root');
    this.plugin.applyScenery(root);

    if (!this.plugin.data.profile.created) {
      this.renderCreation(root, true);
      return;
    }

    this.renderHero(root);
    this.renderBossBar(root);
    this.renderTabs(root);
    const body = root.createDiv({ cls: 'qb-body' });

    if (this.tab === 'board') this.renderBoard(body);
    else if (this.tab === 'dailies') this.renderDailies(body);
    else if (this.tab === 'active') this.renderActive(body);
    else if (this.tab === 'hero') this.renderHeroSheet(body);
    else if (this.tab === 'treasury') this.renderTreasury(body);
    else if (this.tab === 'pets') this.renderPets(body);
    else this.renderChronicle(body);

    root.scrollTop = scroll;
  }

  /* ---------- Character creation ---------- */

  renderCreation(root, first) {
    const p = this.plugin;
    if (!this.draft) this.draft = Object.assign({}, p.data.profile);
    const draft = this.draft;

    const panel = root.createDiv({ cls: 'qb-create' });
    panel.createEl('h2', { cls: 'qb-create-title', text: first ? '⚔️ Create your hero' : '✏️ Edit your hero' });
    panel.createDiv({
      cls: 'qb-section-note',
      text: first
        ? 'Every legend starts somewhere. Your background, homeland and goal shape your starting stats.'
        : 'Changing your origins re-rolls your starting stats. Points from levels and training are kept.',
    });

    const field = (label, hint) => {
      const f = panel.createDiv({ cls: 'qb-field' });
      f.createEl('label', { cls: 'qb-field-label', text: label });
      if (hint) f.createDiv({ cls: 'qb-field-hint', text: hint });
      return f;
    };
    const select = (parent, options, value, onChange, fmt) => {
      const sel = parent.createEl('select', { cls: 'dropdown qb-select' });
      for (const [k, o] of Object.entries(options)) sel.createEl('option', { value: k, text: fmt(o) });
      sel.value = value;
      sel.addEventListener('change', () => { onChange(sel.value); });
      return sel;
    };

    let preview;
    const updatePreview = () => {
      preview.empty();
      const base = p.baseStats(draft);
      const h = p.data.hero;
      for (const k of STAT_KEYS) {
        const extra = first ? 0 : (h.allocated[k] || 0) + (h.earned[k] || 0);
        const box = preview.createDiv({ cls: 'qb-stat-box' });
        box.createDiv({ cls: 'qb-stat-value', text: `${STATS[k].icon} ${base[k] + extra}` });
        box.createDiv({ cls: 'qb-stat-label', text: STATS[k].name });
      }
      const con = base.con + (first ? 0 : (h.allocated.con || 0) + (h.earned.con || 0));
      const box = preview.createDiv({ cls: 'qb-stat-box' });
      box.createDiv({ cls: 'qb-stat-value', text: `❤️ ${p.maxHp(h.level, con)}` });
      box.createDiv({ cls: 'qb-stat-label', text: 'Max health' });
    };

    const nameField = field('Name');
    const nameInput = nameField.createEl('input', { type: 'text', cls: 'qb-input', attr: { placeholder: 'Your hero’s name', maxlength: '40' } });
    nameInput.value = draft.name === 'Hero' && first ? '' : draft.name;
    nameInput.addEventListener('input', () => { draft.name = nameInput.value; });

    const genderField = field('Gender', 'Sets your portrait. It does not affect stats.');
    const portrait = genderField.createDiv({ cls: 'qb-portrait-row' });
    const showPortraits = () => {
      portrait.empty();
      const v = (GENDERS[draft.gender] || GENDERS.unspecified).variant;
      for (const [lvl, set] of PORTRAITS) portrait.createSpan({ cls: 'qb-portrait', text: set[v], attr: { 'aria-label': `Level ${lvl}+` } });
    };
    select(genderField, GENDERS, draft.gender, (v) => { draft.gender = v; showPortraits(); }, (o) => o.name);
    showPortraits();

    const bgField = field('Background');
    const bgDesc = bgField.createDiv({ cls: 'qb-field-hint' });
    const showBg = () => { const b = BACKGROUNDS[draft.background]; bgDesc.setText(`${b.desc} (${bonusText(b)})`); };
    select(bgField, BACKGROUNDS, draft.background, (v) => { draft.background = v; showBg(); updatePreview(); }, (o) => o.name);
    showBg();

    const hlField = field('Homeland');
    select(hlField, HOMELANDS, draft.homeland, (v) => { draft.homeland = v; updatePreview(); }, (o) => `${o.name} — ${o.desc} (${bonusText(o)})`);

    const goalField = field('Goal', 'What do you hope to achieve on this journey?');
    select(goalField, GOALS, draft.goal, (v) => { draft.goal = v; updatePreview(); }, (o) => `${o.name} (${bonusText(o)})`);

    const mottoField = field('Motto', 'Optional. A few words to live by.');
    const motto = mottoField.createEl('input', { type: 'text', cls: 'qb-input', attr: { placeholder: 'e.g. No dish left behind', maxlength: '80' } });
    motto.value = draft.motto || '';
    motto.addEventListener('input', () => { draft.motto = motto.value; });

    panel.createDiv({ cls: 'qb-field-label', text: first ? 'Starting stats' : 'Your stats' });
    preview = panel.createDiv({ cls: 'qb-stats-grid' });
    updatePreview();

    const actions = panel.createDiv({ cls: 'qb-create-actions' });
    if (!first) {
      const cancel = actions.createEl('button', { cls: 'qb-btn', text: 'Cancel' });
      cancel.addEventListener('click', () => { this.draft = null; this.editingProfile = false; this.render(); });
    }
    const go = actions.createEl('button', { cls: 'qb-btn mod-cta', text: first ? 'Begin your legend' : 'Save hero' });
    go.addEventListener('click', async () => {
      draft.name = (draft.name || '').trim();
      if (!draft.name) { new Notice('Every hero needs a name.'); nameInput.focus(); return; }
      const profile = Object.assign({}, draft);
      this.draft = null;
      this.editingProfile = false;
      if (first) this.tab = 'board';
      await p.saveProfile(profile);
    });
  }

  /* ---------- Hero card ---------- */

  renderHero(root) {
    const p = this.plugin;
    const { hero: h, profile } = p.data;
    const card = root.createDiv({ cls: 'qb-hero' });
    if (p.celebrate) {
      card.addClass({ level: 'qb-celebrate-level', boss: 'qb-celebrate-level', death: 'qb-celebrate-death' }[p.celebrate] || 'qb-celebrate');
      p.celebrate = null;
    }

    const top = card.createDiv({ cls: 'qb-hero-top' });
    const avatar = this.art(top, 'div', 'qb-hero-avatar', 'hero', p.portrait(), profile.name);
    avatar.addEventListener('click', () => { this.tab = 'hero'; this.render(); });
    const pal = p.companion();
    if (pal) {
      const badge = this.art(avatar, 'span', 'qb-companion-badge', 'pet:' + pal.id, pal.icon, pal.petName);
      badge.setAttr('aria-label', `Companion: ${pal.petName}`);
      badge.addEventListener('click', (e) => { e.stopPropagation(); this.tab = 'pets'; this.render(); });
    }
    const info = top.createDiv({ cls: 'qb-hero-info' });
    info.createDiv({ cls: 'qb-hero-name', text: profile.name || 'Hero' });
    info.createDiv({ cls: 'qb-hero-title', text: `Level ${h.level} · ${titleFor(h.level)}` });

    const stats = top.createDiv({ cls: 'qb-hero-stats' });
    stats.createDiv({ cls: 'qb-stat qb-stat-gold', text: `🪙 ${h.gold}`, attr: { 'aria-label': 'Gold' } });
    const streak = p.effectiveStreak();
    stats.createDiv({ cls: 'qb-stat', text: `🔥 ${streak}`, attr: { 'aria-label': `${streak}-day quest streak` } });

    const max = p.maxHp();
    const hpPct = Math.max(0, Math.min(100, (h.hp / max) * 100));
    const hpRow = card.createDiv({ cls: 'qb-bar-row' });
    hpRow.createSpan({ cls: 'qb-bar-icon', text: '❤️' });
    const hpBar = hpRow.createDiv({ cls: 'qb-bar qb-hp' + (hpPct <= 25 ? ' is-low' : '') });
    hpBar.createDiv({ cls: 'qb-bar-fill' }).style.width = `${hpPct.toFixed(1)}%`;
    hpRow.createSpan({ cls: 'qb-bar-label', text: `${Math.max(0, h.hp)} / ${max}` });

    const maxSta = p.maxStamina();
    const staRow = card.createDiv({ cls: 'qb-bar-row' });
    staRow.createSpan({ cls: 'qb-bar-icon', text: '⚡' });
    const staBar = staRow.createDiv({ cls: 'qb-bar qb-stamina' + (h.stamina <= 0 ? ' is-empty' : '') });
    staBar.createDiv({ cls: 'qb-bar-fill' }).style.width = `${Math.max(0, Math.min(100, (h.stamina / maxSta) * 100)).toFixed(1)}%`;
    staRow.createSpan({ cls: 'qb-bar-label', text: `${h.stamina} / ${maxSta}`, attr: { 'aria-label': 'Stamina (refills at midnight)' } });

    const maxed = h.level >= MAX_LEVEL;
    const need = maxed ? 1 : xpToNext(h.level);
    const xpRow = card.createDiv({ cls: 'qb-bar-row' });
    xpRow.createSpan({ cls: 'qb-bar-icon', text: '⭐' });
    const xpBar = xpRow.createDiv({ cls: 'qb-bar qb-xp' });
    xpBar.createDiv({ cls: 'qb-bar-fill' }).style.width = maxed ? '100%' : `${Math.min(100, (h.xp / need) * 100).toFixed(1)}%`;
    xpRow.createSpan({ cls: 'qb-bar-label', text: maxed ? 'MAX' : `${h.xp} / ${need}` });

    const st = p.stats();
    const chips = card.createDiv({ cls: 'qb-chips' });
    for (const k of STAT_KEYS) chips.createSpan({ cls: 'qb-chip', text: `${STATS[k].icon} ${STATS[k].short} ${st[k]}` });
    if (h.unspent > 0) {
      const up = chips.createEl('button', { cls: 'qb-chip qb-chip-points', text: `⬆️ ${h.unspent} point${h.unspent > 1 ? 's' : ''} to spend` });
      up.addEventListener('click', () => { this.tab = 'hero'; this.render(); });
    }
  }

  renderBossBar(root) {
    const p = this.plugin;
    const info = p.bossInfo();
    const b = p.data.boss;
    const bar = root.createDiv({ cls: 'qb-boss-bar' });
    bar.addEventListener('click', () => { this.tab = 'hero'; this.render(); });
    this.art(bar, 'div', 'qb-boss-icon', 'boss:' + (b.index % BOSSES.length), info.icon, info.name);
    const mid = bar.createDiv({ cls: 'qb-boss-mid' });
    const name = mid.createDiv({ cls: 'qb-boss-name' });
    name.createSpan({ text: info.name });
    name.createSpan({ cls: 'qb-boss-num', text: ` · Boss ${info.number}` });
    const hb = mid.createDiv({ cls: 'qb-bar qb-boss-hp' });
    hb.createDiv({ cls: 'qb-bar-fill' }).style.width = `${Math.max(0, (b.hp / info.maxHp) * 100).toFixed(1)}%`;
    mid.createDiv({ cls: 'qb-boss-sub', text: `${b.hp} / ${info.maxHp} HP · hits you for ~${info.attack} when a quest is overdue` });
  }

  renderTabs(root) {
    const p = this.plugin;
    const quests = p.data.quests;
    const dailiesLeft = p.data.dailies.filter((d) => d.count < d.target).length;
    const tabs = [
      ['board', '📋', 'Board', quests.filter((q) => q.status === 'available').length],
      ['dailies', '☀️', 'Dailies', dailiesLeft ? `${dailiesLeft} left` : '✓'],
      ['active', '🗡️', 'Active', `${p.activeCount()}/${p.data.settings.maxActive}`],
      ['hero', p.portrait(), 'Hero', p.data.hero.unspent ? `⬆️ ${p.data.hero.unspent}` : null],
      ['pets', '🐾', 'Pets', p.petsUnlocked()
        ? (p.data.pets.taming ? `${Math.floor((p.data.pets.taming.trust / PET_BY_ID[p.data.pets.taming.species].trust) * 100)}%` : null)
        : '🔒'],
      ['treasury', '💰', 'Treasury', null],
      ['chronicle', '📖', 'Chronicle', null],
    ];
    const bar = root.createDiv({ cls: 'qb-tabs' });
    for (const [id, icon, label, count] of tabs) {
      const b = bar.createEl('button', { cls: 'qb-tab' + (this.tab === id ? ' is-active' : '') });
      b.createSpan({ cls: 'qb-tab-icon', text: icon });
      b.createSpan({ cls: 'qb-tab-label', text: label });
      if (count !== null && count !== undefined) b.createSpan({ cls: 'qb-tab-count', text: String(count) });
      b.addEventListener('click', () => { this.tab = id; this.editingProfile = false; this.render(); });
    }
  }

  /* ---------- Board ---------- */

  renderBoard(body) {
    const p = this.plugin;
    const toolbar = body.createDiv({ cls: 'qb-toolbar' });

    const post = toolbar.createEl('button', { cls: 'mod-cta qb-btn', text: '＋ Post quest' });
    post.addEventListener('click', () => new QuestModal(this.app, p, null).open());
    const roll = toolbar.createEl('button', { cls: 'qb-btn', text: '🎲 Random quest' });
    roll.addEventListener('click', () => new RandomQuestModal(this.app, p).open());

    const guildSel = toolbar.createEl('select', { cls: 'dropdown qb-select' });
    guildSel.createEl('option', { value: 'all', text: 'All guilds' });
    for (const [k, g] of Object.entries(GUILDS)) guildSel.createEl('option', { value: k, text: `${g.icon} ${g.name}` });
    guildSel.value = this.guildFilter;
    guildSel.addEventListener('change', () => { this.guildFilter = guildSel.value; this.render(); });

    const sortSel = toolbar.createEl('select', { cls: 'dropdown qb-select' });
    for (const [k, t] of [['reward', 'Highest reward'], ['due', 'Due soonest'], ['newest', 'Newest'], ['name', 'Name']]) {
      sortSel.createEl('option', { value: k, text: t });
    }
    sortSel.value = this.sort;
    sortSel.addEventListener('change', () => { this.sort = sortSel.value; this.render(); });

    const filtered = (q) => this.guildFilter === 'all' || q.guild === this.guildFilter;
    const available = this.sortQuests(p.data.quests.filter((q) => q.status === 'available' && filtered(q)));

    if (!available.length) {
      const empty = body.createDiv({ cls: 'qb-empty' });
      empty.createDiv({ cls: 'qb-empty-icon', text: '🪧' });
      empty.createDiv({ text: 'The quest board is bare. Post a new quest, roll a random one, or rest until your recurring quests return.' });
      const roll2 = empty.createEl('button', { cls: 'mod-cta qb-btn', text: '🎲 Let fate choose a quest' });
      roll2.addEventListener('click', () => new RandomQuestModal(this.app, p).open());
    } else {
      const grid = body.createDiv({ cls: 'qb-grid' });
      for (const q of available) this.renderQuestCard(grid, q, 'board');
    }

    const resting = p.data.quests
      .filter((q) => q.status === 'resting' && filtered(q))
      .sort((a, b) => (a.availableAt || 0) - (b.availableAt || 0));
    if (resting.length) {
      const det = body.createEl('details', { cls: 'qb-resting' });
      det.createEl('summary', { text: `💤 Resting quests (${resting.length})` });
      const grid = det.createDiv({ cls: 'qb-grid' });
      for (const q of resting) this.renderQuestCard(grid, q, 'resting');
    }
  }

  sortQuests(list) {
    const today = dayKey();
    const urgent = (q) => (q.due && q.due <= today ? 0 : 1);
    const by = {
      reward: (a, b) => b.difficulty - a.difficulty || a.title.localeCompare(b.title),
      due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || b.difficulty - a.difficulty,
      newest: (a, b) => (b.created || 0) - (a.created || 0),
      name: (a, b) => a.title.localeCompare(b.title),
    }[this.sort];
    return list.sort((a, b) => urgent(a) - urgent(b) || by(a, b));
  }

  /* ---------- Active ---------- */

  renderActive(body) {
    const p = this.plugin;
    const active = p.data.quests.filter((q) => q.status === 'active')
      .sort((a, b) => (a.acceptedAt || 0) - (b.acceptedAt || 0));
    body.createDiv({ cls: 'qb-section-note', text: `Quest log: ${active.length} of ${p.data.settings.maxActive} slots used` });
    if (!active.length) {
      const empty = body.createDiv({ cls: 'qb-empty' });
      empty.createDiv({ cls: 'qb-empty-icon', text: '🎒' });
      empty.createDiv({ text: 'No quests accepted. Visit the board and choose your next adventure.' });
      const go = empty.createEl('button', { cls: 'mod-cta qb-btn', text: 'To the quest board' });
      go.addEventListener('click', () => { this.tab = 'board'; this.render(); });
      return;
    }
    const grid = body.createDiv({ cls: 'qb-grid' });
    for (const q of active) this.renderQuestCard(grid, q, 'active');
  }

  /* ---------- Quest card ---------- */

  renderQuestCard(parent, q, mode) {
    const p = this.plugin;
    const d = DIFFICULTIES[q.difficulty] || DIFFICULTIES[1];
    const g = GUILDS[q.guild] || GUILDS.misc;
    const card = parent.createDiv({ cls: `qb-card qb-diff-${q.difficulty}` + (mode === 'resting' ? ' is-resting' : '') });

    const head = card.createDiv({ cls: 'qb-card-head' });
    head.createDiv({ cls: 'qb-seal', text: d.rank, attr: { 'aria-label': `${d.name} (rank ${d.rank})` } });
    const titles = head.createDiv({ cls: 'qb-card-titles' });
    titles.createDiv({ cls: 'qb-card-title', text: q.title });
    let meta = `${g.icon} ${g.name} · ${d.foe} ${d.name}`;
    if (q.recurrence && q.recurrence !== 'none') meta += ` · 🔁 ${RECURRENCE[q.recurrence]}`;
    titles.createDiv({ cls: 'qb-card-meta', text: meta });

    if (q.description) card.createDiv({ cls: 'qb-card-desc', text: q.description });

    if (mode === 'resting' && q.availableAt) {
      card.createDiv({ cls: 'qb-due', text: `💤 Returns ${friendlyDay(dayKey(new Date(q.availableAt)))}` });
    } else if (q.due) {
      const today = dayKey();
      const cls = q.due < today ? 'is-overdue' : q.due === today ? 'is-today' : '';
      const label = q.due < today
        ? `⚠️ Overdue since ${friendlyDay(q.due)}. The boss strikes each day it waits!`
        : `⏳ Due ${friendlyDay(q.due)}`;
      card.createDiv({ cls: `qb-due ${cls}`, text: label });
    }

    const foot = card.createDiv({ cls: 'qb-card-foot' });
    const r = p.previewReward(q);
    const rew = foot.createDiv({ cls: 'qb-reward' });
    rew.createSpan({ text: `⭐ ${r.xp}` , attr: { 'aria-label': 'XP' } });
    rew.createSpan({ text: `🪙 ${r.gold}`, attr: { 'aria-label': 'Gold' } });
    rew.createSpan({ text: `🗡️ ${p.questDamage(q)}`, attr: { 'aria-label': 'Damage to boss' } });
    const cost = p.questStamina(q);
    const tired = p.data.hero.stamina < cost;
    rew.createSpan({ cls: 'qb-sta-cost' + (tired ? ' is-short' : ''), text: `⚡ ${cost}`, attr: { 'aria-label': `Costs ${cost} stamina` } });
    if (STATS[q.statReward]) rew.createSpan({ cls: 'qb-stat-badge', text: `${STATS[q.statReward].icon} +1 ${STATS[q.statReward].short}` });
    if (q.fated) rew.createSpan({ cls: 'qb-stat-badge', text: '🎲 Fated', attr: { 'aria-label': `Fate's favour: +${Math.round(FATE_BONUS * 100)}% rewards` } });

    const actions = foot.createDiv({ cls: 'qb-actions' });
    const btn = (text, cls, fn) => {
      const b = actions.createEl('button', { cls: `qb-btn ${cls}`, text });
      b.addEventListener('click', fn);
      return b;
    };
    const iconBtn = (icon, label, fn) => {
      const b = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': label } });
      setIcon(b, icon);
      b.addEventListener('click', fn);
    };

    if (mode === 'board') {
      btn('Accept', 'mod-cta', () => p.acceptQuest(q.id));
      if (!p.data.settings.requireAccept) {
        const cb = btn(tired ? '⚡ Too tired' : 'Complete', '', () => p.completeQuest(q.id));
        if (tired) cb.setAttr('disabled', 'true');
      }
    } else if (mode === 'active') {
      const cb = btn(tired ? '⚡ Too tired' : '⚔️ Complete', 'mod-cta', () => p.completeQuest(q.id));
      if (tired) cb.setAttr('disabled', 'true');
      btn('Abandon', '', () => p.abandonQuest(q.id));
    }
    iconBtn('pencil', 'Edit quest', () => new QuestModal(this.app, p, q).open());
    iconBtn('trash-2', 'Remove quest', () => new ConfirmModal(
      this.app, 'Tear down this quest?', `“${q.title}” will be removed from the board.`, 'Remove',
      () => p.deleteQuest(q.id),
    ).open());
  }

  /* ---------- Dailies ---------- */

  renderDailies(body) {
    const p = this.plugin;
    const list = p.data.dailies;
    const done = list.filter((d) => d.count >= d.target).length;

    const head = body.createDiv({ cls: 'qb-treasury-head' });
    head.createDiv({ cls: 'qb-purse', text: `☀️ ${done} / ${list.length} dailies done` });
    const add = head.createEl('button', { cls: 'mod-cta qb-btn', text: '＋ Add daily' });
    add.addEventListener('click', () => new DailyModal(this.app, p, null).open());
    body.createDiv({
      cls: 'qb-section-note',
      text: 'Small habits, every day. Each check earns XP, gold and a little health, and chips at the boss. Finish them all for a Daily discipline bonus. Dailies reset at midnight.',
    });

    if (!list.length) {
      const empty = body.createDiv({ cls: 'qb-empty' });
      empty.createDiv({ cls: 'qb-empty-icon', text: '🌅' });
      empty.createDiv({ text: 'No dailies yet. Add a habit like brushing your teeth twice a day.' });
      return;
    }

    const wrap = body.createDiv({ cls: 'qb-dailies' });
    for (const d of list) {
      const complete = d.count >= d.target;
      const row = wrap.createDiv({ cls: 'qb-daily' + (complete ? ' is-done' : '') });

      const check = row.createEl('button', {
        cls: 'qb-daily-check',
        text: complete ? '✓' : (d.icon || '☐'),
        attr: { 'aria-label': complete ? 'Done for today' : `Check off ${d.title}` },
      });
      check.addEventListener('click', () => p.checkDaily(d.id));

      const info = row.createDiv({ cls: 'qb-daily-info' });
      info.createDiv({ cls: 'qb-daily-title', text: d.title });
      const meta = info.createDiv({ cls: 'qb-daily-meta' });
      const pips = meta.createSpan({ cls: 'qb-pips' });
      for (let i = 0; i < d.target; i++) pips.createSpan({ cls: 'qb-pip' + (i < d.count ? ' is-on' : '') });
      meta.createSpan({ text: `${d.count}/${d.target} today` });
      if (d.streak) meta.createSpan({ text: `🔥 ${d.streak}` });

      const actions = row.createDiv({ cls: 'qb-actions' });
      if (d.count > 0) {
        const undo = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Undo one check' } });
        setIcon(undo, 'undo-2');
        undo.addEventListener('click', () => p.undoDaily(d.id));
      }
      const edit = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Edit daily' } });
      setIcon(edit, 'pencil');
      edit.addEventListener('click', () => new DailyModal(this.app, p, d).open());
      const del = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Remove daily' } });
      setIcon(del, 'trash-2');
      del.addEventListener('click', () => new ConfirmModal(
        this.app, 'Remove daily?', `“${d.title}” and its streak will be removed.`, 'Remove',
        () => p.deleteDaily(d.id),
      ).open());
    }
  }

  /* ---------- Hero sheet ---------- */

  renderHeroSheet(body) {
    const p = this.plugin;
    if (this.editingProfile) { this.renderCreation(body, false); return; }

    const { hero: h, profile } = p.data;
    const st = p.stats();
    const base = p.baseStats();
    const gear = p.gearBonus();

    // Identity
    const id = body.createDiv({ cls: 'qb-panel' });
    const idTop = id.createDiv({ cls: 'qb-hero-top' });
    this.art(idTop, 'div', 'qb-hero-avatar', 'hero', p.portrait(), profile.name);
    const idInfo = idTop.createDiv({ cls: 'qb-hero-info' });
    idInfo.createDiv({ cls: 'qb-hero-name', text: profile.name });
    const bg = BACKGROUNDS[profile.background];
    const hl = HOMELANDS[profile.homeland];
    const gl = GOALS[profile.goal];
    idInfo.createDiv({ cls: 'qb-hero-title', text: `${bg ? bg.name : ''} from the ${hl ? hl.name : ''}` });
    if (gl) idInfo.createDiv({ cls: 'qb-field-hint', text: `Goal: ${gl.name}` });
    if (profile.motto) id.createDiv({ cls: 'qb-motto', text: `“${profile.motto}”` });
    const idActions = id.createDiv({ cls: 'qb-actions qb-panel-actions' });
    const edit = idActions.createEl('button', { cls: 'qb-btn', text: '✏️ Edit hero' });
    this.pictureButton(idActions, 'hero', p.portrait(), '🖼️ Hero picture');
    edit.addEventListener('click', () => { this.editingProfile = true; this.draft = null; this.render(); });

    // Stats
    const sp = body.createDiv({ cls: 'qb-panel' });
    sp.createEl('h3', { cls: 'qb-panel-title', text: 'Attributes' });
    if (h.unspent > 0) {
      sp.createDiv({ cls: 'qb-points-banner', text: `⬆️ You have ${h.unspent} stat point${h.unspent > 1 ? 's' : ''} to spend. Choose wisely.` });
    }
    const effect = {
      str: `Boss damage ×${p.strMultiplier().toFixed(2)}`,
      agi: `Crit ${Math.round(p.critChance() * 100)}% · Dodge ${Math.round(p.dodgeChance() * 100)}%`,
      con: `Max health ${p.maxHp()}`,
      cha: `Taming ×${p.tameMultiplier().toFixed(2)} · Flee chance −${Math.round((1 - p.fleeMultiplier()) * 100)}% · Discount ${Math.round(p.discount() * 100)}%`,
    };
    for (const k of STAT_KEYS) {
      const row = sp.createDiv({ cls: 'qb-attr' });
      row.createDiv({ cls: 'qb-attr-icon', text: STATS[k].icon });
      const info = row.createDiv({ cls: 'qb-attr-info' });
      const top = info.createDiv({ cls: 'qb-attr-top' });
      top.createSpan({ cls: 'qb-attr-name', text: STATS[k].name });
      top.createSpan({ cls: 'qb-attr-value', text: String(st[k]) });
      info.createDiv({ cls: 'qb-attr-effect', text: `${effect[k]}. ${STATS[k].desc}` });
      info.createDiv({ cls: 'qb-attr-break', text: `Origins ${base[k]} · Level-ups ${h.allocated[k]} · Training ${h.earned[k]} · Gear ${gear[k]}` });
      if (h.unspent > 0) {
        const plus = row.createEl('button', { cls: 'qb-btn mod-cta qb-plus', text: '+1', attr: { 'aria-label': `Add a point to ${STATS[k].name}` } });
        plus.addEventListener('click', () => p.allocateStat(k));
      }
    }

    // Equipment
    const eqp = body.createDiv({ cls: 'qb-panel' });
    eqp.createEl('h3', { cls: 'qb-panel-title', text: 'Equipment' });
    for (const [slot, sd] of Object.entries(SLOTS)) {
      const g = GEAR_BY_ID[h.equipment[slot]];
      const row = eqp.createDiv({ cls: 'qb-equip-row' });
      if (g) this.art(row, 'span', 'qb-equip-icon', 'gear:' + g.id, g.icon, g.name);
      else row.createSpan({ cls: 'qb-equip-icon', text: sd.icon });
      row.createSpan({ cls: 'qb-equip-name', text: g ? `${g.name} (${bonusText(g.bonus)})` : `No ${sd.name.toLowerCase()} equipped` });
    }
    const shop = eqp.createEl('button', { cls: 'qb-btn', text: '💰 Visit the armory' });
    shop.addEventListener('click', () => { this.tab = 'treasury'; this.render(); });

    // Current boss
    const info = p.bossInfo();
    const b = p.data.boss;
    const bp = body.createDiv({ cls: 'qb-panel qb-boss-panel' });
    bp.createEl('h3', { cls: 'qb-panel-title', text: `Boss ${info.number}: ${info.name}` });
    const bTop = bp.createDiv({ cls: 'qb-boss-top' });
    this.art(bTop, 'div', 'qb-boss-portrait', 'boss:' + (b.index % BOSSES.length), info.icon, info.name);
    const bInfo = bTop.createDiv({ cls: 'qb-boss-info' });
    bInfo.createDiv({ cls: 'qb-field-hint', text: `${info.type}${info.tier ? ` · Ascension ${info.tier}` : ''}` });
    const hb = bInfo.createDiv({ cls: 'qb-bar qb-boss-hp' });
    hb.createDiv({ cls: 'qb-bar-fill' }).style.width = `${Math.max(0, (b.hp / info.maxHp) * 100).toFixed(1)}%`;
    bInfo.createDiv({ cls: 'qb-boss-sub', text: `${b.hp} / ${info.maxHp} HP · attacks for ~${info.attack}` });
    bp.createDiv({ cls: 'qb-boss-story', text: info.story });
    this.pictureButton(bp, 'boss:' + (b.index % BOSSES.length), info.icon, '🖼️ Boss picture');
    const tips = bp.createDiv({ cls: 'qb-boss-tips' });
    const dmgs = Object.values(DIFFICULTIES).map((d) => `${d.rank} ${p.estimateDamage(d.dmg)}`).join(' · ');
    tips.createDiv({ text: `🗡️ Your quests hit for: ${dmgs}` });
    tips.createDiv({ text: `🏆 Bounty: +${info.xp} XP · +${info.gold} gold` });
    tips.createDiv({ text: '⚠️ Each day a quest sits past its due date, the boss attacks you. Fall to 0 health and you lose a level.' });

    // Bestiary
    const best = body.createDiv({ cls: 'qb-panel' });
    best.createEl('h3', { cls: 'qb-panel-title', text: `Bestiary · ${h.bossesSlain || 0} slain` });
    const list = best.createDiv({ cls: 'qb-bestiary' });
    const start = Math.floor(b.index / BOSSES.length) * BOSSES.length;
    for (let i = start; i < start + BOSSES.length; i++) {
      const bi = p.bossInfo(i);
      const state = i < b.index ? 'is-slain' : i === b.index ? 'is-current' : 'is-locked';
      const row = list.createDiv({ cls: `qb-beast ${state}` });
      if (i > b.index) row.createSpan({ cls: 'qb-beast-icon', text: '❔' });
      else {
        this.art(row, 'span', 'qb-beast-icon', 'boss:' + (i % BOSSES.length), bi.icon, bi.name);
        row.addClass('is-clickable');
        row.setAttr('aria-label', 'Change picture');
        row.addEventListener('click', () => p.openArtPicker('boss:' + (i % BOSSES.length), bi.icon));
      }
      row.createSpan({ cls: 'qb-beast-name', text: i > b.index ? `Boss ${bi.number}: ???` : `Boss ${bi.number}: ${bi.name}` });
      row.createSpan({ cls: 'qb-beast-state', text: i < b.index ? '✓ Slain' : i === b.index ? '⚔️ Now' : `${bi.maxHp} HP` });
    }
  }

  /* ---------- Pets ---------- */

  renderPets(body) {
    const p = this.plugin;
    const h = p.data.hero;
    const pets = p.data.pets;

    if (!p.petsUnlocked()) {
      const empty = body.createDiv({ cls: 'qb-empty' });
      empty.createDiv({ cls: 'qb-empty-icon', text: '🐾' });
      empty.createDiv({ text: `The creatures of Tasklandia are wary of newcomers. Reach level ${PET_UNLOCK_LEVEL} to begin taming pets (you are level ${h.level}).` });
      return;
    }

    body.createDiv({
      cls: 'qb-section-note',
      text: 'Earn a creature’s trust by completing quests; harder quests earn more, and Charisma speeds it up. Each time a quest goes overdue it may flee, taking all its trust with it. You can tame one creature at a time. Pets are companions only and give no bonuses.',
    });

    // Current taming
    if (pets.taming) {
      const pet = PET_BY_ID[pets.taming.species];
      const panel = body.createDiv({ cls: 'qb-panel qb-taming' });
      panel.createEl('h3', { cls: 'qb-panel-title', text: `Taming: ${pet.name}` });
      const top = panel.createDiv({ cls: 'qb-boss-top' });
      this.art(top, 'div', 'qb-pet-portrait', 'pet:' + pet.id, pet.icon, pet.name);
      const info = top.createDiv({ cls: 'qb-boss-info' });
      info.createDiv({ cls: 'qb-field-hint', text: `${PET_RARITY[pet.rarity].name} · ${pet.desc}` });
      const bar = info.createDiv({ cls: 'qb-bar qb-trust' });
      bar.createDiv({ cls: 'qb-bar-fill' }).style.width = `${Math.min(100, (pets.taming.trust / pet.trust) * 100).toFixed(1)}%`;
      const left = pet.trust - pets.taming.trust;
      const perMod = p.trustPerQuest(3);
      info.createDiv({ cls: 'qb-boss-sub', text: `💗 ${pets.taming.trust} / ${pet.trust} trust · about ${Math.ceil(left / perMod)} more Moderate quest${Math.ceil(left / perMod) === 1 ? '' : 's'}` });
      const tips = panel.createDiv({ cls: 'qb-boss-tips' });
      tips.createDiv({ text: `🎭 Trust per quest: ${Object.values(DIFFICULTIES).map((d, i) => `${d.rank} ${p.trustPerQuest(i + 1)}`).join(' · ')}` });
      tips.createDiv({ text: `💨 ${Math.round(p.petFleeChance(pet) * 100)}% chance it flees each time a quest goes overdue (otherwise it loses 10% trust).` });
      const tameActions = panel.createDiv({ cls: 'qb-actions qb-panel-actions' });
      const release = tameActions.createEl('button', { cls: 'qb-btn', text: '🍃 Let it go' });
      this.pictureButton(tameActions, 'pet:' + pet.id, pet.icon);
      release.addEventListener('click', () => new ConfirmModal(
        this.app, `Release the ${pet.name}?`, 'It returns to the wild and all trust is lost. You can then choose another creature.', 'Let it go',
        () => p.releaseTaming(),
      ).open());
    }

    // Wild creatures
    body.createEl('h3', { cls: 'qb-shop-title', text: pets.taming ? '🌲 Other wild creatures' : '🌲 Choose a creature to befriend' });
    const wild = body.createDiv({ cls: 'qb-gear-list' });
    for (const pet of PETS) {
      if (p.isTamed(pet.id)) continue;
      if (pets.taming && pets.taming.species === pet.id) continue;
      const locked = h.level < pet.level;
      const row = wild.createDiv({ cls: `qb-gear qb-pet qb-pet-${pet.rarity}` + (locked ? ' is-locked' : '') });
      if (locked) row.createDiv({ cls: 'qb-gear-icon', text: '❔' });
      else this.art(row, 'div', 'qb-gear-icon', 'pet:' + pet.id, pet.icon, pet.name);
      const info = row.createDiv({ cls: 'qb-gear-info' });
      const top = info.createDiv({ cls: 'qb-gear-top' });
      top.createSpan({ cls: 'qb-gear-name', text: locked ? `${PET_RARITY[pet.rarity].name} creature` : pet.name });
      top.createSpan({ cls: 'qb-gear-tier', text: PET_RARITY[pet.rarity].name });
      if (locked) {
        info.createDiv({ cls: 'qb-gear-kind', text: `Appears at level ${pet.level}` });
        continue;
      }
      info.createDiv({ cls: 'qb-gear-desc', text: pet.desc });
      info.createDiv({ cls: 'qb-gear-kind', text: `💗 ${pet.trust} trust needed · 💨 ${Math.round(p.petFleeChance(pet) * 100)}% flee chance` });
      const actions = row.createDiv({ cls: 'qb-actions' });
      const b = actions.createEl('button', { cls: 'qb-btn mod-cta', text: 'Tame' });
      if (pets.taming) b.setAttr('disabled', 'true');
      b.addEventListener('click', () => p.startTaming(pet.id));
    }

    // Menagerie
    body.createEl('h3', { cls: 'qb-shop-title', text: `🏡 Menagerie (${pets.tamed.length}/${PETS.length})` });
    if (!pets.tamed.length) {
      body.createDiv({ cls: 'qb-empty qb-empty-small', text: 'No pets yet. Tamed creatures will live here.' });
      return;
    }
    const home = body.createDiv({ cls: 'qb-menagerie' });
    for (const t of pets.tamed) {
      const pet = PET_BY_ID[t.species];
      const isCompanion = pets.companion === t.id;
      const card = home.createDiv({ cls: 'qb-pet-card' + (isCompanion ? ' is-companion' : '') });
      this.art(card, 'div', 'qb-pet-card-icon', 'pet:' + pet.id, pet.icon, t.name);
      card.createDiv({ cls: 'qb-pet-card-name', text: t.name });
      card.createDiv({ cls: 'qb-field-hint', text: t.name !== pet.name ? `${pet.name} · ${PET_RARITY[pet.rarity].name}` : PET_RARITY[pet.rarity].name });
      const actions = card.createDiv({ cls: 'qb-actions' });
      const comp = actions.createEl('button', { cls: 'qb-btn' + (isCompanion ? ' mod-cta' : ''), text: isCompanion ? '★ Companion' : 'Make companion' });
      comp.addEventListener('click', () => p.setCompanion(t.id));
      const pic = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', text: '🖼️', attr: { 'aria-label': 'Change picture' } });
      pic.addEventListener('click', () => p.openArtPicker('pet:' + pet.id, pet.icon));
      const ren = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Rename pet' } });
      setIcon(ren, 'pencil');
      ren.addEventListener('click', () => new PetNameModal(this.app, p, t.id).open());
    }
  }

  /* ---------- Treasury ---------- */

  renderTreasury(body) {
    const p = this.plugin;
    const h = p.data.hero;
    const head = body.createDiv({ cls: 'qb-treasury-head' });
    head.createDiv({ cls: 'qb-purse', text: `🪙 ${h.gold} gold in your purse` });
    const add = head.createEl('button', { cls: 'mod-cta qb-btn', text: '＋ Add reward' });
    add.addEventListener('click', () => new RewardModal(this.app, p, null).open());

    body.createDiv({ cls: 'qb-section-note', text: 'Spend your hard-won gold on arms and armor, potions, or real-life treats you define.' });

    this.renderArmory(body);

    body.createEl('h3', { cls: 'qb-shop-title', text: '🧺 Provisions & rewards' });
    const list = body.createDiv({ cls: 'qb-rewards' });

    // Built-in potion
    const full = h.hp >= p.maxHp();
    const potCost = p.potionCost();
    const pot = list.createDiv({ cls: 'qb-reward-row qb-potion' + (h.gold < potCost || full ? ' is-locked' : '') });
    pot.createDiv({ cls: 'qb-reward-icon', text: POTION.icon });
    const pInfo = pot.createDiv({ cls: 'qb-reward-info' });
    pInfo.createDiv({ cls: 'qb-reward-name', text: `${POTION.name} (restores ${POTION.heal * 100}% health)` });
    pInfo.createDiv({ cls: 'qb-reward-cost', text: `🪙 ${potCost} · ❤️ ${Math.max(0, h.hp)}/${p.maxHp()}` });
    const pBuy = pot.createDiv({ cls: 'qb-actions' }).createEl('button', { cls: 'qb-btn mod-cta', text: full ? 'Full' : 'Drink' });
    if (h.gold < potCost || full) pBuy.setAttr('disabled', 'true');
    pBuy.addEventListener('click', () => p.buyPotion());

    // Stamina tonic
    const tCost = p.staminaTonicCost();
    const maxSta = p.maxStamina();
    const used = h.tonicsToday || 0;
    const staFull = h.stamina >= maxSta;
    const outOfTonics = used >= STAMINA_TONIC.perDay;
    const tRow = list.createDiv({ cls: 'qb-reward-row qb-potion' + (h.gold < tCost || staFull || outOfTonics ? ' is-locked' : '') });
    tRow.createDiv({ cls: 'qb-reward-icon', text: STAMINA_TONIC.icon });
    const tInfo = tRow.createDiv({ cls: 'qb-reward-info' });
    tInfo.createDiv({ cls: 'qb-reward-name', text: `${STAMINA_TONIC.name} (restores ${STAMINA_TONIC.restore * 100}% stamina)` });
    tInfo.createDiv({ cls: 'qb-reward-cost', text: `🪙 ${tCost} · ⚡ ${h.stamina}/${maxSta} · ${STAMINA_TONIC.perDay - used} of ${STAMINA_TONIC.perDay} left today` });
    const tBuy = tRow.createDiv({ cls: 'qb-actions' }).createEl('button', { cls: 'qb-btn mod-cta', text: outOfTonics ? 'Tomorrow' : staFull ? 'Full' : 'Drink' });
    if (h.gold < tCost || staFull || outOfTonics) tBuy.setAttr('disabled', 'true');
    tBuy.addEventListener('click', () => p.buyStaminaTonic());

    for (const r of [...p.data.rewards].sort((a, b) => a.cost - b.cost)) {
      const row = list.createDiv({ cls: 'qb-reward-row' + (h.gold < r.cost ? ' is-locked' : '') });
      row.createDiv({ cls: 'qb-reward-icon', text: r.icon || '🎁' });
      const info = row.createDiv({ cls: 'qb-reward-info' });
      info.createDiv({ cls: 'qb-reward-name', text: r.name });
      info.createDiv({ cls: 'qb-reward-cost', text: `🪙 ${r.cost}` });
      const actions = row.createDiv({ cls: 'qb-actions' });
      const buy = actions.createEl('button', { cls: 'qb-btn mod-cta', text: 'Buy' });
      if (h.gold < r.cost) buy.setAttr('disabled', 'true');
      buy.addEventListener('click', () => p.buyReward(r.id));
      const edit = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Edit reward' } });
      setIcon(edit, 'pencil');
      edit.addEventListener('click', () => new RewardModal(this.app, p, r).open());
      const del = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', attr: { 'aria-label': 'Remove reward' } });
      setIcon(del, 'trash-2');
      del.addEventListener('click', () => new ConfirmModal(
        this.app, 'Remove reward?', `“${r.name}” will be removed from the Treasury.`, 'Remove',
        () => p.deleteReward(r.id),
      ).open());
    }
  }

  renderArmory(body) {
    const p = this.plugin;
    const h = p.data.hero;

    // Equipped
    body.createEl('h3', { cls: 'qb-shop-title', text: '🛡️ Equipped' });
    const eq = body.createDiv({ cls: 'qb-gear-list' });
    for (const [slot, sd] of Object.entries(SLOTS)) {
      const g = GEAR_BY_ID[h.equipment[slot]];
      if (!g) {
        const row = eq.createDiv({ cls: 'qb-gear qb-gear-empty' });
        row.createDiv({ cls: 'qb-gear-icon', text: sd.icon });
        row.createDiv({ cls: 'qb-gear-info', text: `${sd.name} slot is empty` });
        continue;
      }
      this.renderGearRow(eq, g, 'equipped', () => p.unequipGear(slot));
    }

    // Shop
    const stock = p.shopItems();
    body.createEl('h3', { cls: 'qb-shop-title', text: '⚒️ The Blacksmith’s wares' });
    const next = p.nextGearTier();
    body.createDiv({
      cls: 'qb-section-note',
      text: next
        ? `Better steel arrives as you grow. The next shipment unlocks at level ${next.level}.`
        : 'You have unlocked the finest gear in the realm.',
    });
    if (!stock.length) {
      body.createDiv({ cls: 'qb-empty qb-empty-small', text: 'You own everything the blacksmith has forged for your level. Come back after your next shipment.' });
    } else {
      const shop = body.createDiv({ cls: 'qb-gear-list' });
      for (const g of stock) this.renderGearRow(shop, g, 'shop', () => p.buyGear(g.id));
    }

    // Pack
    const pack = h.inventory.map((id) => GEAR_BY_ID[id]).filter(Boolean)
      .sort((a, b) => b.tier - a.tier);
    if (pack.length) {
      const det = body.createEl('details', { cls: 'qb-pack' });
      det.createEl('summary', { text: `🎒 Your pack (${pack.length})` });
      const list = det.createDiv({ cls: 'qb-gear-list' });
      for (const g of pack) this.renderGearRow(list, g, 'pack', () => p.equipGear(g.id));
    }
  }

  renderGearRow(parent, g, mode, action) {
    const p = this.plugin;
    const h = p.data.hero;
    const row = parent.createDiv({ cls: `qb-gear qb-gear-${g.slot}` + (mode === 'equipped' ? ' is-equipped' : '') });
    this.art(row, 'div', 'qb-gear-icon', 'gear:' + g.id, g.icon, g.name);
    const info = row.createDiv({ cls: 'qb-gear-info' });
    const top = info.createDiv({ cls: 'qb-gear-top' });
    top.createSpan({ cls: 'qb-gear-name', text: g.name });
    top.createSpan({ cls: 'qb-gear-tier', text: `Tier ${g.tier + 1}` });
    info.createDiv({ cls: 'qb-gear-kind', text: `${SLOTS[g.slot].name} · ${g.kind}` });
    info.createDiv({ cls: 'qb-gear-desc', text: g.desc });
    const bonus = info.createDiv({ cls: 'qb-gear-bonus' });
    for (const k of STAT_KEYS) {
      if (g.bonus[k]) bonus.createSpan({ cls: 'qb-chip', text: `${STATS[k].icon} +${g.bonus[k]} ${STATS[k].short}` });
    }
    if (mode !== 'equipped') {
      const cur = GEAR_BY_ID[h.equipment[g.slot]];
      if (cur) {
        const diff = STAT_KEYS.map((k) => (g.bonus[k] || 0) - (cur.bonus[k] || 0));
        const txt = STAT_KEYS.map((k, i) => (diff[i] ? `${diff[i] > 0 ? '+' : ''}${diff[i]} ${STATS[k].short}` : null)).filter(Boolean).join(' ');
        if (txt) bonus.createSpan({ cls: 'qb-gear-diff', text: `vs ${cur.name}: ${txt}` });
      }
    }

    const actions = row.createDiv({ cls: 'qb-actions' });
    let label;
    const cost = p.price(g.cost);
    if (mode === 'shop') label = `Buy · 🪙 ${cost}`;
    else if (mode === 'pack') label = 'Equip';
    else label = 'Unequip';
    const b = actions.createEl('button', { cls: 'qb-btn' + (mode === 'equipped' ? '' : ' mod-cta'), text: label });
    if (mode === 'shop' && h.gold < cost) b.setAttr('disabled', 'true');
    if (mode === 'shop' && cost < g.cost) info.createDiv({ cls: 'qb-gear-kind', text: `🎭 Charisma discount: ${g.cost - cost} gold off` });
    b.addEventListener('click', action);
    const pic = actions.createEl('button', { cls: 'qb-icon-btn clickable-icon', text: '🖼️', attr: { 'aria-label': 'Change picture' } });
    pic.addEventListener('click', () => p.openArtPicker('gear:' + g.id, g.icon));
  }

  /* ---------- Chronicle ---------- */

  renderChronicle(body) {
    const p = this.plugin;
    const h = p.data.hero;
    const stats = body.createDiv({ cls: 'qb-stats-grid' });
    const stat = (label, value) => {
      const s = stats.createDiv({ cls: 'qb-stat-box' });
      s.createDiv({ cls: 'qb-stat-value', text: String(value) });
      s.createDiv({ cls: 'qb-stat-label', text: label });
    };
    stat('Quests done', h.completed);
    stat('Bosses slain', h.bossesSlain || 0);
    stat('Best streak', h.bestStreak || 0);
    stat('Times fallen', h.deaths || 0);

    if (!p.data.chronicle.length) {
      const empty = body.createDiv({ cls: 'qb-empty' });
      empty.createDiv({ cls: 'qb-empty-icon', text: '🪶' });
      empty.createDiv({ text: 'Your legend is yet unwritten. Complete a quest to begin your chronicle.' });
      return;
    }

    const list = body.createDiv({ cls: 'qb-chronicle' });
    for (const e of p.data.chronicle) {
      const row = list.createDiv({ cls: `qb-chron-row qb-chron-${e.type || 'quest'}` });
      row.createDiv({
        cls: 'qb-chron-date',
        text: new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
      const main = row.createDiv({ cls: 'qb-chron-main' });
      const delta = (text, cls = '') => row.createDiv({ cls: `qb-chron-delta ${cls}`, text });

      if (e.type === 'purchase') {
        main.createDiv({ text: `${e.icon || '🎁'} Claimed ${e.name}` });
        delta(`−${e.cost} 🪙`, 'is-spend');
      } else if (e.type === 'gear') {
        main.createDiv({ text: `${e.icon || '⚔️'} Bought ${e.name}` });
        delta(`−${e.cost} 🪙`, 'is-spend');
      } else if (e.type === 'boss') {
        main.createDiv({ text: `🏆 Defeated ${e.icon || ''} ${e.boss}` });
        delta(`+${e.xp} XP · +${e.gold} 🪙`);
      } else if (e.type === 'attack') {
        main.createDiv({ text: e.dmg ? `🩸 ${e.boss} struck: ${e.reason}` : `🏹 Dodged ${e.boss}: ${e.reason}` });
        delta(e.dmg ? `−${e.dmg} HP` : 'dodged', 'is-spend');
      } else if (e.type === 'death') {
        main.createDiv({ text: `💀 Fell to ${e.boss}` });
        delta(e.gold ? `−${e.gold} 🪙` : `→ Lv ${e.level}`, 'is-spend');
      } else if (e.type === 'discipline') {
        main.createDiv({ text: '🌟 Completed every daily' });
        delta(`+${e.xp || 25} XP · +${e.gold || 10} 🪙`);
      } else if (e.type === 'tamed') {
        main.createDiv({ text: `${e.icon} Tamed a ${e.name}` });
        delta('🐾 new pet');
      } else if (e.type === 'fled') {
        main.createDiv({ text: `💨 The ${e.name} fled: “${e.reason}” was overdue` });
        delta('lost', 'is-spend');
      } else {
        const d = DIFFICULTIES[e.difficulty] || DIFFICULTIES[1];
        main.createDiv({ text: `${d.foe} ${e.title}` });
        const sub = [];
        if (e.dmg) sub.push(`🗡️ ${e.dmg} dmg`);
        if (e.stat && STATS[e.stat]) sub.push(`${STATS[e.stat].icon} +1 ${STATS[e.stat].short}`);
        if (e.levelUp) sub.push(`🎉 Level ${e.levelUp}`);
        if (sub.length) main.createDiv({ cls: 'qb-chron-sub', text: sub.join(' · ') });
        delta(`+${e.xp} XP · +${e.gold} 🪙`);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

class QuestModal extends Modal {
  constructor(app, plugin, quest, forceNew = false) {
    super(app);
    this.plugin = plugin;
    this.isNew = !quest || forceNew;
    this.statTouched = !!quest;
    this.q = quest ? Object.assign({ statReward: 'none' }, quest) : {
      id: uid(), title: '', description: '', difficulty: 2, guild: 'hearth', statReward: 'none',
      recurrence: 'none', due: '', status: 'available', created: Date.now(), timesCompleted: 0,
    };
  }

  onOpen() {
    const { contentEl } = this;
    const p = this.plugin;
    contentEl.empty();
    contentEl.addClass('qb-modal');
    this.titleEl.setText(this.isNew ? '📜 Post a new quest' : '📜 Amend quest');

    new Setting(contentEl).setName('Quest').addText((t) => {
      t.setPlaceholder('e.g. Vanquish the dirty dishes').setValue(this.q.title).onChange((v) => {
        this.q.title = v;
        if (!this.statTouched && this.statDd) {
          this.q.statReward = suggestStat(v);
          this.statDd.setValue(this.q.statReward);
        }
      });
      t.inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.submit(); } });
      window.setTimeout(() => t.inputEl.focus(), 50);
    });

    new Setting(contentEl).setName('Details').setDesc('Optional notes for the adventurer.').addTextArea((t) => {
      t.setPlaceholder('What must be done?').setValue(this.q.description || '').onChange((v) => { this.q.description = v; });
      t.inputEl.rows = 3;
    });

    const diff = new Setting(contentEl).setName('Difficulty');
    const updateDesc = () => {
      const d = DIFFICULTIES[this.q.difficulty];
      const m = Number(p.data.settings.rewardMultiplier) || 1;
      diff.setDesc(`${d.foe} ${d.blurb}. Base reward: ⭐ ${Math.round(d.xp * m)} XP · 🪙 ${Math.round(d.gold * m)} gold · 🗡️ ~${p.estimateDamage(d.dmg)} boss damage · ⚡ ${d.sta} stamina`);
    };
    diff.addDropdown((dd) => {
      for (const [k, d] of Object.entries(DIFFICULTIES)) dd.addOption(k, `${d.rank} · ${d.name}`);
      dd.setValue(String(this.q.difficulty)).onChange((v) => { this.q.difficulty = Number(v); updateDesc(); });
    });
    updateDesc();

    new Setting(contentEl).setName('Guild').setDesc('What kind of quest is this?').addDropdown((dd) => {
      for (const [k, g] of Object.entries(GUILDS)) dd.addOption(k, `${g.icon} ${g.name} — ${g.desc}`);
      dd.setValue(this.q.guild || 'misc').onChange((v) => { this.q.guild = v; });
    });

    new Setting(contentEl).setName('Trains a stat')
      .setDesc('Optional. Completing it grants +1 permanently, e.g. a workout trains Strength. Suggested from the quest name.')
      .addDropdown((dd) => {
        this.statDd = dd;
        dd.addOption('none', 'No stat');
        for (const k of STAT_KEYS) dd.addOption(k, `${STATS[k].icon} +1 ${STATS[k].name}`);
        dd.setValue(this.q.statReward || 'none').onChange((v) => { this.q.statReward = v; this.statTouched = true; });
      });

    new Setting(contentEl).setName('Repeats').setDesc('Recurring quests rest after completion, then return to the board.')
      .addDropdown((dd) => {
        for (const [k, t] of Object.entries(RECURRENCE)) dd.addOption(k, t);
        dd.setValue(this.q.recurrence || 'none').onChange((v) => { this.q.recurrence = v; });
      });

    new Setting(contentEl).setName('Due date').setDesc(this.q.status === 'active' ? 'Required for accepted quests. On time earns +10%. Overdue quests let the boss attack you.' : 'Optional now, but you must set one when you accept the quest. On time earns +10%. Overdue quests let the boss attack you.').addText((t) => {
      t.inputEl.type = 'date';
      t.setValue(this.q.due || '').onChange((v) => { this.q.due = v; delete this.q.lastPenaltyDay; });
    });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((b) => b.setButtonText(this.isNew ? 'Post to board' : 'Save').setCta().onClick(() => this.submit()));
  }

  async submit() {
    this.q.title = (this.q.title || '').trim();
    if (!this.q.title) { new Notice('Every quest needs a name, adventurer.'); return; }
    if (this.q.status === 'active' && !this.q.due) { new Notice('Accepted quests need a due date.'); return; }
    await this.plugin.upsertQuest(this.q);
    if (this.isNew) new Notice(`📌 Quest posted: ${this.q.title}`);
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

class RandomQuestModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.guild = 'any';
    this.difficulty = 'any';
    this.q = null;
  }

  roll() {
    this.q = this.plugin.randomQuest(this.guild, this.difficulty, this.q ? this.q.title : null);
    this.renderPreview();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('qb-modal');
    this.titleEl.setText('🎲 Let fate choose a quest');
    contentEl.createDiv({
      cls: 'qb-field-hint',
      text: `The Oracle of the Guildhall draws a quest from the fates. Post it as rolled to earn fate's favour: +${Math.round(FATE_BONUS * 100)}% XP and gold.`,
    });

    new Setting(contentEl).setName('Guild').addDropdown((dd) => {
      dd.addOption('any', '🎲 Any guild');
      for (const [k, g] of Object.entries(GUILDS)) dd.addOption(k, `${g.icon} ${g.name}`);
      dd.setValue(this.guild).onChange((v) => { this.guild = v; this.q = null; this.roll(); });
    });
    new Setting(contentEl).setName('Difficulty').addDropdown((dd) => {
      dd.addOption('any', '🎲 Any difficulty');
      for (const [k, d] of Object.entries(DIFFICULTIES)) dd.addOption(k, `${d.rank} · ${d.name}`);
      dd.setValue(this.difficulty).onChange((v) => { this.difficulty = v; this.q = null; this.roll(); });
    });

    this.previewEl = contentEl.createDiv({ cls: 'qb-random-preview' });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText('🎲 Reroll').onClick(() => this.roll()))
      .addButton((b) => b.setButtonText('✏️ Edit first').onClick(() => {
        if (!this.q) return;
        const q = Object.assign({}, this.q, { fated: false });
        this.close();
        new QuestModal(this.app, this.plugin, q, true).open();
      }))
      .addButton((b) => b.setButtonText('Post to board').setCta().onClick(async () => {
        if (!this.q) return;
        const q = this.q;
        await this.plugin.upsertQuest(q);
        new Notice(`📌 Fate has spoken: ${q.title}`);
        this.close();
      }));

    this.roll();
  }

  renderPreview() {
    const el = this.previewEl;
    if (!el) return;
    el.empty();
    const p = this.plugin;
    if (!this.q) {
      el.createDiv({ cls: 'qb-empty qb-empty-small', text: 'The fates are silent: every quest like that is already on your board. Try another guild or difficulty.' });
      return;
    }
    const q = this.q;
    const d = DIFFICULTIES[q.difficulty];
    const g = GUILDS[q.guild] || GUILDS.misc;
    const card = el.createDiv({ cls: `qb-card qb-diff-${q.difficulty} qb-random-card` });
    const head = card.createDiv({ cls: 'qb-card-head' });
    head.createDiv({ cls: 'qb-seal', text: d.rank });
    const titles = head.createDiv({ cls: 'qb-card-titles' });
    titles.createDiv({ cls: 'qb-card-title', text: q.title });
    titles.createDiv({ cls: 'qb-card-meta', text: `${g.icon} ${g.name} · ${d.foe} ${d.name}` });
    card.createDiv({ cls: 'qb-card-desc', text: q.description });
    const r = p.previewReward(q);
    const rew = card.createDiv({ cls: 'qb-reward' });
    rew.createSpan({ text: `⭐ ${r.xp}` });
    rew.createSpan({ text: `🪙 ${r.gold}` });
    rew.createSpan({ text: `🗡️ ${p.questDamage(q)}` });
    rew.createSpan({ cls: 'qb-sta-cost', text: `⚡ ${p.questStamina(q)}` });
    if (STATS[q.statReward]) rew.createSpan({ cls: 'qb-stat-badge', text: `${STATS[q.statReward].icon} +1 ${STATS[q.statReward].short}` });
    rew.createSpan({ cls: 'qb-stat-badge', text: '🎲 Fated' });
  }

  onClose() { this.contentEl.empty(); }
}

class DailyModal extends Modal {
  constructor(app, plugin, daily) {
    super(app);
    this.plugin = plugin;
    this.isNew = !daily;
    this.d = daily ? Object.assign({}, daily) : {
      id: uid(), title: '', icon: '✨', target: 1, count: 0, peak: 0, day: dayKey(),
      streak: 0, best: 0, lastDone: null, created: Date.now(),
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('qb-modal');
    this.titleEl.setText(this.isNew ? '☀️ New daily' : '☀️ Edit daily');

    new Setting(contentEl).setName('Habit').addText((t) => {
      t.setPlaceholder('e.g. Brush teeth').setValue(this.d.title).onChange((v) => { this.d.title = v; });
      window.setTimeout(() => t.inputEl.focus(), 50);
    });
    new Setting(contentEl).setName('Icon').setDesc('Any emoji.').addText((t) => {
      t.setValue(this.d.icon || '').onChange((v) => { this.d.icon = v; });
      t.inputEl.addClass('qb-emoji-input');
    });
    new Setting(contentEl).setName('Times per day').setDesc('e.g. 2 for brushing teeth morning and night.').addSlider((s) =>
      s.setLimits(1, 12, 1).setValue(this.d.target).setDynamicTooltip().onChange((v) => { this.d.target = v; }));

    new Setting(contentEl)
      .addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((b) => b.setButtonText('Save').setCta().onClick(async () => {
        this.d.title = (this.d.title || '').trim();
        if (!this.d.title) { new Notice('Name your daily first.'); return; }
        this.d.count = Math.min(this.d.count, this.d.target);
        await this.plugin.upsertDaily(this.d);
        this.close();
      }));
  }

  onClose() { this.contentEl.empty(); }
}

class RewardModal extends Modal {
  constructor(app, plugin, reward) {
    super(app);
    this.plugin = plugin;
    this.isNew = !reward;
    this.r = reward ? Object.assign({}, reward) : { id: uid(), icon: '🎁', name: '', cost: 50 };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('qb-modal');
    this.titleEl.setText(this.isNew ? '💰 New reward' : '💰 Edit reward');

    new Setting(contentEl).setName('Reward').addText((t) => {
      t.setPlaceholder('e.g. A slice of cake').setValue(this.r.name).onChange((v) => { this.r.name = v; });
      window.setTimeout(() => t.inputEl.focus(), 50);
    });
    new Setting(contentEl).setName('Icon').setDesc('Any emoji.').addText((t) => {
      t.setValue(this.r.icon || '').onChange((v) => { this.r.icon = v; });
      t.inputEl.addClass('qb-emoji-input');
    });
    new Setting(contentEl).setName('Cost in gold').setDesc('A Moderate quest pays about 25 gold.').addText((t) => {
      t.inputEl.type = 'number';
      t.inputEl.min = '1';
      t.setValue(String(this.r.cost)).onChange((v) => { this.r.cost = Math.max(1, parseInt(v, 10) || 1); });
    });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((b) => b.setButtonText('Save').setCta().onClick(async () => {
        this.r.name = (this.r.name || '').trim();
        if (!this.r.name) { new Notice('Name your reward first.'); return; }
        await this.plugin.upsertReward(this.r);
        this.close();
      }));
  }

  onClose() { this.contentEl.empty(); }
}

class ArtPickerModal extends Modal {
  // key = 'hero' | 'boss:N' | 'pet:id' | 'gear:id', or null to just manage the library
  constructor(app, plugin, key, label, emoji) {
    super(app);
    this.plugin = plugin;
    this.key = key;
    this.label = label;
    this.emoji = emoji;
  }

  onOpen() {
    if (this.modalEl) this.modalEl.addClass('qb-art-modal');
    this.contentEl.addClass('qb-modal');
    this.titleEl.setText(this.key ? `🖼️ Picture for ${this.label}` : '🖼️ Art library');
    this.render();
  }

  async render() {
    const { contentEl } = this;
    const p = this.plugin;
    contentEl.empty();

    if (this.key) {
      const cur = contentEl.createDiv({ cls: 'qb-art-current' });
      const prev = cur.createDiv({ cls: 'qb-art-preview' });
      const url = p.artFor(this.key);
      if (url) prev.createEl('img', { cls: 'qb-custom-art', attr: { src: url } });
      else prev.setText(this.emoji || '❔');
      const info = cur.createDiv({ cls: 'qb-art-current-info' });
      info.createDiv({ cls: 'qb-field-label', text: url ? 'Custom picture' : 'Using the emoji' });
      info.createDiv({ cls: 'qb-field-hint', text: 'Pick an image below, upload a new one, or go back to the emoji.' });
      if (url) {
        const reset = info.createEl('button', { cls: 'qb-btn', text: `Use emoji ${this.emoji || ''}` });
        reset.addEventListener('click', async () => { await p.setArt(this.key, null); this.close(); });
      }
    }

    // Upload
    const up = contentEl.createDiv({ cls: 'qb-art-upload' });
    const input = up.createEl('input', { type: 'file', attr: { accept: 'image/*', multiple: this.key ? null : 'true' } });
    input.style.display = 'none';
    const upBtn = up.createEl('button', { cls: 'qb-btn mod-cta', text: this.key ? '⬆️ Upload a new image' : '⬆️ Upload images' });
    upBtn.addEventListener('click', () => input.click());
    up.createDiv({ cls: 'qb-field-hint', text: this.key === 'scene' ? 'PNG, JPG, WebP or SVG. Large images are shrunk to 1920 px. Wide landscape images look best.' : 'PNG, JPG, GIF, WebP or SVG. Large images are shrunk to 512 px. Square images look best.' });
    input.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      upBtn.setText('Uploading…');
      upBtn.setAttr('disabled', 'true');
      try {
        let last = null;
        for (const f of files) last = await p.uploadArt(f, this.key === 'scene' ? 1920 : undefined);
        if (this.key && last) {
          await p.setArt(this.key, last);
          new Notice(`🖼️ New picture set for ${this.label}.`);
          this.close();
          return;
        }
        new Notice(`🖼️ Added ${files.length} image${files.length > 1 ? 's' : ''} to the library.`);
      } catch (e) {
        new Notice(`Couldn't save that image: ${e.message || e}`);
      }
      this.render();
    });

    // Library
    const files = await p.listArt();
    contentEl.createDiv({ cls: 'qb-field-label', text: `Your images (${files.length})` });
    if (!files.length) {
      contentEl.createDiv({ cls: 'qb-empty qb-empty-small', text: 'No images yet. Upload one to get started.' });
      return;
    }
    const grid = contentEl.createDiv({ cls: 'qb-art-grid' });
    const current = this.key ? p.data.art[this.key] : null;
    for (const f of files) {
      const cell = grid.createDiv({ cls: 'qb-art-cell' + (f === current ? ' is-selected' : '') });
      const thumb = cell.createDiv({ cls: 'qb-art-thumb' });
      thumb.createEl('img', { cls: 'qb-custom-art', attr: { src: p.artUrl(f), alt: f, loading: 'lazy' } });
      cell.createDiv({ cls: 'qb-art-name', text: f });
      const uses = p.artUses(f);
      if (uses.length) cell.createDiv({ cls: 'qb-art-uses', text: uses.join(', ') });
      if (this.key) {
        thumb.addEventListener('click', async () => {
          await p.setArt(this.key, f);
          new Notice(`🖼️ Picture set for ${this.label}.`);
          this.close();
        });
      }
      const del = cell.createEl('button', { cls: 'qb-icon-btn clickable-icon qb-art-del', text: '🗑', attr: { 'aria-label': 'Delete image' } });
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        new ConfirmModal(this.app, 'Delete this image?', uses.length ? `It is used for: ${uses.join(', ')}. Those will go back to their emoji.` : 'It will be removed from the library.', 'Delete', async () => {
          await p.deleteArt(f);
          this.render();
        }).open();
      });
    }
  }

  onClose() { this.contentEl.empty(); }
}

class AcceptQuestModal extends Modal {
  constructor(app, plugin, quest) {
    super(app);
    this.plugin = plugin;
    this.q = quest;
    this.due = '';
  }

  onOpen() {
    const { contentEl } = this;
    const q = this.q;
    const d = DIFFICULTIES[q.difficulty] || DIFFICULTIES[1];
    if (this.modalEl) this.modalEl.addClass('qb-accept-modal');
    contentEl.addClass('qb-modal');
    this.titleEl.setText('🗡️ Accept quest');

    const sum = contentEl.createDiv({ cls: `qb-accept-quest qb-diff-${q.difficulty}` });
    sum.createDiv({ cls: 'qb-seal', text: d.rank });
    const t = sum.createDiv({ cls: 'qb-card-titles' });
    t.createDiv({ cls: 'qb-card-title', text: q.title });
    t.createDiv({ cls: 'qb-card-meta', text: `${d.foe} ${d.name} · ⚡ ${d.sta} stamina` });

    contentEl.createDiv({ cls: 'qb-field-label', text: 'When will you finish it?' });
    contentEl.createDiv({ cls: 'qb-field-hint', text: 'A due date is required. Finish on time for +10% rewards, but if it goes overdue the boss attacks you each day it waits.' });

    const today = dayKey();
    const plus = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return dayKey(x); };
    const chips = contentEl.createDiv({ cls: 'qb-due-chips' });
    const input = contentEl.createEl('input', { type: 'date', cls: 'qb-input qb-due-input', attr: { min: today } });
    const warn = contentEl.createDiv({ cls: 'qb-due-warn' });
    const chipEls = [];
    const setDue = (v) => {
      this.due = v;
      input.value = v;
      const ok = !!v && v >= today;
      warn.setText(v && v < today ? 'Pick today or a later day.' : '');
      chipEls.forEach(([el, val]) => el.toggleClass('is-selected', val === v));
      if (this.acceptBtn) {
        if (ok) this.acceptBtn.removeAttribute('disabled'); else this.acceptBtn.setAttr('disabled', 'true');
        this.acceptBtn.setText(ok ? `Accept · due ${friendlyDay(v)}` : 'Choose a due date');
      }
    };
    for (const [label, val] of [['Today', today], ['Tomorrow', plus(1)], ['In 3 days', plus(3)], ['In a week', plus(7)]]) {
      const c = chips.createEl('button', { cls: 'qb-btn qb-due-chip', text: label });
      c.addEventListener('click', () => setDue(val));
      chipEls.push([c, val]);
    }
    input.addEventListener('change', () => setDue(input.value));
    input.addEventListener('input', () => setDue(input.value));

    const actions = contentEl.createDiv({ cls: 'qb-create-actions' });
    const cancel = actions.createEl('button', { cls: 'qb-btn', text: 'Cancel' });
    cancel.addEventListener('click', () => this.close());
    this.acceptBtn = actions.createEl('button', { cls: 'qb-btn mod-cta', text: 'Choose a due date' });
    this.acceptBtn.setAttr('disabled', 'true');
    this.acceptBtn.addEventListener('click', async () => {
      if (!this.due || this.due < today) { new Notice('Choose a due date first.'); return; }
      const due = this.due;
      this.close();
      await this.plugin.acceptQuest(q.id, due);
    });
    setDue('');
  }

  onClose() { this.contentEl.empty(); }
}

class BossAttackModal extends Modal {
  constructor(app, plugin, attacks, death) {
    super(app);
    this.plugin = plugin;
    this.attacks = attacks;
    this.death = death;
  }

  onOpen() {
    const p = this.plugin;
    const info = p.bossInfo();
    const { contentEl } = this;
    const hits = this.attacks.filter((a) => !a.dodged);
    const total = hits.reduce((n, a) => n + a.dmg, 0);
    const first = this.attacks[0];
    const last = this.attacks[this.attacks.length - 1];
    if (this.modalEl) this.modalEl.addClass('qb-attack-modal');
    contentEl.addClass('qb-attack');
    this.titleEl.setText(this.death ? '💀 You have fallen!' : hits.length ? '💥 The boss strikes!' : '🏹 Close call!');

    const top = contentEl.createDiv({ cls: 'qb-attack-hero' + (hits.length ? ' is-hit' : '') });
    const icon = top.createDiv({ cls: 'qb-attack-icon' });
    const url = p.artFor('boss:' + (p.data.boss.index % BOSSES.length));
    if (url) { icon.addClass('qb-has-art'); icon.createEl('img', { cls: 'qb-custom-art', attr: { src: url, alt: info.name } }); }
    else icon.setText(info.icon);
    top.createDiv({ cls: 'qb-attack-name', text: hits.length ? `${info.name} hits you!` : `${info.name} lunges at you…` });
    if (hits.length) {
      top.createDiv({ cls: 'qb-attack-dmg', text: `−${total}` });
      top.createDiv({ cls: 'qb-attack-dmg-label', text: `damage${hits.length > 1 ? ` from ${hits.length} hits` : ''}` });
    } else {
      top.createDiv({ cls: 'qb-attack-dodge', text: 'Dodged!' });
      top.createDiv({ cls: 'qb-attack-dmg-label', text: 'Your Agility saved you this time.' });
    }

    // Health bar: what's left, plus a ghost of what was lost.
    const max = first.max;
    const before = first.before;
    const after = this.death ? 0 : last.after;
    const hpRow = contentEl.createDiv({ cls: 'qb-bar-row' });
    hpRow.createSpan({ cls: 'qb-bar-icon', text: '❤️' });
    const bar = hpRow.createDiv({ cls: 'qb-bar qb-hp qb-attack-bar' + (after / max <= 0.25 ? ' is-low' : '') });
    const lost = bar.createDiv({ cls: 'qb-bar-lost' });
    lost.style.width = `${Math.max(0, Math.min(100, (before / max) * 100)).toFixed(1)}%`;
    const fill = bar.createDiv({ cls: 'qb-bar-fill' });
    fill.style.width = `${Math.max(0, Math.min(100, (after / max) * 100)).toFixed(1)}%`;
    hpRow.createSpan({ cls: 'qb-bar-label', text: hits.length ? `${Math.max(0, before)} → ${after} / ${max}` : `${after} / ${max}` });

    // Each strike
    const list = contentEl.createDiv({ cls: 'qb-attack-list' });
    for (const a of this.attacks) {
      const row = list.createDiv({ cls: 'qb-attack-row' + (a.dodged ? ' is-dodged' : '') });
      row.createSpan({ cls: 'qb-attack-row-reason', text: a.reason.charAt(0).toUpperCase() + a.reason.slice(1) });
      row.createSpan({ cls: 'qb-attack-row-dmg', text: a.dodged ? '🏹 dodged' : `−${a.dmg} ❤️` });
    }

    if (this.death) {
      const d = contentEl.createDiv({ cls: 'qb-attack-death' });
      d.setText(this.death.lostLevel
        ? `💀 You were struck down and lose a level. You awaken at level ${this.death.level}, fully healed.`
        : `💀 You were struck down. At level 1 you can't fall further, but you lose ${this.death.gold} gold and your XP. You awaken fully healed.`);
    } else if (hits.length && after / max <= 0.25) {
      contentEl.createDiv({ cls: 'qb-attack-tip is-warn', text: '⚠️ Your health is low. Drink a healing draught in the Treasury, or finish quests to recover.' });
    }
    contentEl.createDiv({ cls: 'qb-attack-tip', text: 'The boss strikes once a day for each overdue quest. Finish them (or give them a new due date) to stop the attacks.' });

    const actions = contentEl.createDiv({ cls: 'qb-create-actions' });
    const show = actions.createEl('button', { cls: 'qb-btn', text: '📜 Show my quests' });
    show.addEventListener('click', () => { this.close(); p.activateView('board'); });
    const ok = actions.createEl('button', { cls: 'qb-btn mod-cta', text: this.death ? 'Rise again' : '⚔️ Back to the fight' });
    ok.addEventListener('click', () => this.close());
  }

  onClose() { this.contentEl.empty(); }
}

class BossIntroModal extends Modal {
  constructor(app, plugin, first) {
    super(app);
    this.plugin = plugin;
    this.first = first;
  }

  onOpen() {
    const p = this.plugin;
    const info = p.bossInfo();
    const { contentEl, modalEl } = this;
    if (modalEl) modalEl.addClass('qb-boss-modal');
    contentEl.addClass('qb-boss-intro');
    this.titleEl.setText(this.first ? '📯 Your first foe appears' : '📯 A new threat rises');

    const hero = contentEl.createDiv({ cls: 'qb-intro-hero' });
    const introIcon = hero.createDiv({ cls: 'qb-intro-icon' });
    const introUrl = p.artFor('boss:' + ((info.number - 1) % BOSSES.length));
    if (introUrl) { introIcon.addClass('qb-has-art'); introIcon.createEl('img', { cls: 'qb-custom-art', attr: { src: introUrl, alt: info.name } }); }
    else introIcon.setText(info.icon);
    hero.createDiv({ cls: 'qb-intro-num', text: `Boss ${info.number}${info.tier ? ` · Ascension ${info.tier}` : ''} · ${info.type}` });
    hero.createEl('h2', { cls: 'qb-intro-name', text: info.name });

    if (!this.first) {
      const prev = p.data.chronicle.find((e) => e.type === 'boss');
      if (prev) contentEl.createDiv({ cls: 'qb-intro-prev', text: `🏆 ${prev.icon || ''} ${prev.boss} has fallen, but there is no rest for heroes…` });
    }
    if (info.tier) {
      contentEl.createDiv({ cls: 'qb-intro-prev', text: '⚠️ Defeated once before, it has clawed its way back from oblivion, stronger and angrier than ever.' });
    }

    contentEl.createDiv({ cls: 'qb-intro-story', text: info.story });

    const stats = contentEl.createDiv({ cls: 'qb-intro-stats' });
    const stat = (value, label) => {
      const box = stats.createDiv({ cls: 'qb-stat-box' });
      box.createDiv({ cls: 'qb-stat-value', text: value });
      box.createDiv({ cls: 'qb-stat-label', text: label });
    };
    stat(`❤️ ${info.maxHp}`, 'Health');
    stat(`⚔️ ~${info.attack}`, 'Attack');
    stat(`⭐ ${info.xp}`, 'XP bounty');
    stat(`🪙 ${info.gold}`, 'Gold bounty');

    const tips = contentEl.createDiv({ cls: 'qb-boss-tips' });
    const dmgs = Object.values(DIFFICULTIES).map((d) => `${d.rank} ${p.estimateDamage(d.dmg)}`).join(' · ');
    tips.createDiv({ text: `🗡️ Every quest you complete strikes it. Your quests hit for: ${dmgs}.` });
    tips.createDiv({ text: '⚠️ Each day a quest is overdue, it strikes back.' });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText('⚔️ Take up arms').setCta().onClick(() => this.close()));
  }

  onClose() {
    this.plugin.introOpen = false;
    this.contentEl.empty();
  }
}

class PetNameModal extends Modal {
  constructor(app, plugin, petId) {
    super(app);
    this.plugin = plugin;
    this.petId = petId;
    const t = plugin.data.pets.tamed.find((x) => x.id === petId);
    this.name = t ? t.name : '';
  }

  onOpen() {
    const { contentEl } = this;
    const t = this.plugin.data.pets.tamed.find((x) => x.id === this.petId);
    if (!t) { this.close(); return; }
    const pet = PET_BY_ID[t.species];
    contentEl.addClass('qb-modal');
    this.titleEl.setText(`${pet.icon} Name your ${pet.name}`);
    new Setting(contentEl).setName('Name').addText((txt) => {
      txt.setPlaceholder(pet.name).setValue(this.name).onChange((v) => { this.name = v; });
      txt.inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.submit(); } });
      window.setTimeout(() => { txt.inputEl.focus(); txt.inputEl.select(); }, 50);
    });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText('Later').onClick(() => this.close()))
      .addButton((b) => b.setButtonText('Save').setCta().onClick(() => this.submit()));
  }

  async submit() {
    await this.plugin.renamePet(this.petId, this.name);
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}

class ConfirmModal extends Modal {
  constructor(app, title, message, confirmText, onConfirm) {
    super(app);
    this.t = title; this.m = message; this.c = confirmText; this.onConfirm = onConfirm;
  }

  onOpen() {
    this.titleEl.setText(this.t);
    this.contentEl.createEl('p', { text: this.m });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((b) => b.setButtonText(this.c).setWarning().onClick(async () => {
        this.close();
        await this.onConfirm();
      }));
  }

  onClose() { this.contentEl.empty(); }
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

class QuestboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  displayLinkSettings(containerEl) {
    const p = this.plugin;
    const L = p.data.settings.link;
    const save = async () => { await p.save(); drawPreview(); };
    new Setting(containerEl).setName('Note link').setHeading();
    containerEl.createEl('p', { cls: 'setting-item-description', text: 'Add a clickable link to any note that opens the quest board in a new tab. Run “Insert quest board link in this note” from the command palette, or paste the code below.' });
    const preview = containerEl.createDiv({ cls: 'qb-link-preview' });
    const block = preview.createDiv();
    const sentence = preview.createEl('p', { cls: 'qb-link-preview-inline' });
    sentence.appendText('Inline: before bed, tick off my ');
    const inl = sentence.createSpan({ cls: 'qb-link-inline-holder' });
    sentence.appendText(' for today.');
    const drawPreview = () => { p.renderLink(block, {}, false); p.renderLink(inl, { label: 'dailies', tab: 'dailies' }, true); };
    drawPreview();

    new Setting(containerEl).setName('Link text').setDesc('Default label. A link can override it with “label: …”.')
      .addText((t) => t.setValue(L.label).onChange(async (v) => { L.label = v.trim() || PLUGIN_NAME; await save(); }));
    new Setting(containerEl).setName('Size').setDesc('Default size for block links. Any link can use “size: …” (tiny, small, large, xl, xxl, 1.5, 150%, 22px). Inline links follow the size of the surrounding text.')
      .addDropdown((d) => { for (const [v, l] of [['tiny', 'Tiny'], ['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['xl', 'Extra large'], ['xxl', 'Huge']]) d.addOption(v, l);
        d.setValue(L.size || 'medium').onChange(async (v) => { L.size = v; await save(); }); });
    new Setting(containerEl).setName('Style')
      .addDropdown((d) => d.addOption('card', 'Card (picture, title, subtitle)').addOption('button', 'Compact button').addOption('icon', 'Picture only')
        .setValue(L.style || 'card').onChange(async (v) => { L.style = v; await save(); }));
    const iconSetting = new Setting(containerEl).setName('Icon').setDesc('Any Lucide icon name (lucide.dev), e.g. swords, shield, scroll, castle, crown. Used when no picture is set.');
    const iconPrev = iconSetting.controlEl.createSpan({ cls: 'qb-icon-preview' });
    const drawIconPrev = () => { iconPrev.empty(); setIcon(iconPrev, L.icon || 'swords'); };
    iconSetting.addText((t) => t.setPlaceholder('swords').setValue(L.icon).onChange(async (v) => { L.icon = v.trim() || 'swords'; drawIconPrev(); await save(); }));
    drawIconPrev();

    const pic = new Setting(containerEl).setName('Picture').setDesc(L.image ? `Using: ${L.image.startsWith('art:') ? `${L.image.slice(4)} (art library)` : L.image}` : 'Replace the icon with your own picture: choose one from your vault, upload one, or paste a vault path or image URL.');
    pic.addText((t) => t.setPlaceholder('e.g. Attachments/quest.png or https://…').setValue(L.image).onChange(async (v) => { L.image = v.trim(); await save(); }));
    pic.addButton((b) => b.setButtonText('Choose…').setTooltip('Pick an image already in your vault').onClick(() => new TlImagePickModal(this.app, async (path) => { L.image = path; await save(); this.display(); }).open()));
    pic.addButton((b) => b.setButtonText('Upload…').setTooltip('Upload a picture into the plugin’s art library').onClick(() => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        try {
          const name = await p.uploadArt(file);
          L.image = `art:${name}`; await save(); this.display();
          new Notice(`Saved ${name} to the art library.`);
        } catch (e) { new Notice(`Couldn’t save the picture: ${e.message || e}`); }
      });
      input.click();
    }));
    if (L.image) pic.addExtraButton((b) => b.setIcon('x').setTooltip('Remove picture (use the icon)').onClick(async () => { L.image = ''; await save(); this.display(); }));

    new Setting(containerEl).setName('Always open a new tab').setDesc('Off: if the quest board is already open, the link switches to it. On: every click opens another tab.')
      .addToggle((t) => t.setValue(L.reuseTab === false).onChange(async (v) => { L.reuseTab = !v; await p.save(); }));
    const copy = async (text, what) => {
      try { await navigator.clipboard.writeText(text); new Notice(`${what} copied — paste it into a note.`); }
      catch (e) { new Notice('Couldn’t copy. Use the “Insert quest board link” commands instead.'); }
    };
    new Setting(containerEl).setName('Link code').setDesc('Block link: its own line, can be sized, aligned (align: center) or floated beside text (float: right). Inline link: goes anywhere inside a sentence, list item, callout or table.')
      .addButton((b) => b.setButtonText('Copy block link').onClick(() => copy(TL_LINK_SNIPPET(), 'Block link')))
      .addButton((b) => b.setButtonText('Copy inline link').onClick(() => copy(TL_INLINE_SNIPPET(), 'Inline link')));
  }

  display() {
    const { containerEl } = this;
    const p = this.plugin;
    const s = p.data.settings;
    containerEl.empty();

    new Setting(containerEl).setName('Hero')
      .setDesc('Name, gender, background, homeland, goal and motto are edited on the Hero tab.')
      .addButton((b) => b.setButtonText('Open hero sheet').onClick(() => p.activateView('hero')));

    new Setting(containerEl).setName('Quest log capacity')
      .setDesc('How many quests you can have accepted at once. Fewer slots means more focus.')
      .addSlider((sl) => sl.setLimits(1, 10, 1).setValue(s.maxActive).setDynamicTooltip()
        .onChange(async (v) => { s.maxActive = v; await p.save(); }));

    new Setting(containerEl).setName('Reward multiplier')
      .setDesc('Scales all quest XP and gold rewards.')
      .addDropdown((dd) => {
        for (const v of ['0.5', '1', '1.5', '2']) dd.addOption(v, `${v}×`);
        dd.setValue(String(s.rewardMultiplier)).onChange(async (v) => { s.rewardMultiplier = Number(v); await p.save(); });
      });

    new Setting(containerEl).setName('Streak bonus')
      .setDesc('Each consecutive day you complete a quest adds +5% rewards (max +50%).')
      .addToggle((t) => t.setValue(s.streakBonus).onChange(async (v) => { s.streakBonus = v; await p.save(); }));

    new Setting(containerEl).setName('Require accepting quests')
      .setDesc('When on, quests must be accepted into your quest log before completing. When off, you can complete straight from the board.')
      .addToggle((t) => t.setValue(s.requireAccept).onChange(async (v) => { s.requireAccept = v; await p.save(); }));

    new Setting(containerEl).setName('Fantasy background')
      .setDesc('Show a stormy mountain pass behind the dashboard, with frosted-glass panels on top.')
      .addToggle((t) => t.setValue(s.scenery).onChange(async (v) => { s.scenery = v; await p.save(); }));

    new Setting(containerEl).setName('Background dimming')
      .setDesc('Darken the background so text stays easy to read (0–80%).')
      .addSlider((sl) => sl.setLimits(0, 80, 5).setValue(s.sceneryDim).setDynamicTooltip().onChange(async (v) => { s.sceneryDim = v; await p.save(); }));

    new Setting(containerEl).setName('Background picture')
      .setDesc('Use your own image instead of the built-in mountains. Wide landscape images look best.')
      .addButton((b) => b.setButtonText('Choose picture…').onClick(() => p.openArtPicker('scene', '🏰')));

    new Setting(containerEl).setName('Overdue quests trigger boss attacks')
      .setDesc('The boss strikes once for each overdue quest, every day it stays overdue. If your health hits 0 you lose a level. (Overdue quests can still scare off a pet you are taming.)')
      .addToggle((t) => t.setValue(s.bossAttacks).onChange(async (v) => { s.bossAttacks = v; await p.save(); }));

    this.displayLinkSettings(containerEl);

    new Setting(containerEl).setName('Pictures').setHeading();
    new Setting(containerEl).setName('Art library')
      .setDesc('Upload your own images for your hero, bosses, pets and gear. They are stored inside the plugin’s folder. Anything without a picture keeps its emoji. You can also use the 🖼️ buttons on each tab.')
      .addButton((b) => b.setButtonText('Manage pictures').setCta().onClick(() => p.openArtPicker(null, null)));
    new Setting(containerEl).setName('Clear picture choices')
      .setDesc('Go back to emoji everywhere. Uploaded images stay in the library.')
      .addButton((b) => b.setButtonText('Clear').onClick(async () => { p.data.art = {}; await p.save(); new Notice('All pictures reset to emoji.'); }));

    new Setting(containerEl).setName('Danger zone').setHeading();

    new Setting(containerEl).setName('Reset hero progress')
      .setDesc('Create a new hero and start again from the first boss. Your quests, dailies and rewards stay.')
      .addButton((b) => b.setButtonText('Reset hero').setWarning().onClick(() => new ConfirmModal(
        this.app, 'Reset hero?', 'Your hero, level, stats, gold, boss progress and chronicle will be erased.', 'Reset',
        async () => {
          p.data.hero = DEFAULT_HERO();
          p.data.profile = DEFAULT_PROFILE();
          p.data.boss = { index: 0, hp: null };
          p.data.pets = { taming: null, tamed: [], companion: null };
          p.data.chronicle = [];
          p.ensureHp();
          await p.save();
          new Notice('A new legend begins…');
        },
      ).open()));

    new Setting(containerEl).setName('Reset everything')
      .setDesc('Restore the board, dailies, treasury and hero to their starting state.')
      .addButton((b) => b.setButtonText('Reset all').setWarning().onClick(() => new ConfirmModal(
        this.app, 'Reset everything?', 'All quests, dailies, rewards and progress will be erased.', 'Reset all',
        async () => {
          p.data = DEFAULT_DATA();
          p.ensureHp();
          await p.save();
          this.display();
        },
      ).open()));
  }
}

/* ------------------------------------------------------------------ */
/* Note-link helpers                                                   */
/* ------------------------------------------------------------------ */

const TL_LINK_TABS = [
  { id: 'board', label: 'quest board' }, { id: 'dailies', label: 'dailies' }, { id: 'active', label: 'active quests' },
  { id: 'hero', label: 'hero sheet' }, { id: 'pets', label: 'pets' }, { id: 'treasury', label: 'treasury' }, { id: 'chronicle', label: 'chronicle' },
];

function tlParseOptions(src) {
  const o = {};
  for (const line of String(src || '').split('\n')) {
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.*?)\s*$/);
    if (m) o[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '');
  }
  return o;
}
const TL_LINK_SIZES = { tiny: 0.7, xs: 0.7, small: 0.85, sm: 0.85, medium: 1, normal: 1, md: 1, large: 1.3, lg: 1.3, xl: 1.7, 'x-large': 1.7, xxl: 2.2, huge: 2.2 };
const tlClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** size: preset name, multiplier (1.5), percent (150%) or pixels (22px). Returns {scale} or {px}. */
function tlLinkSize(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return { scale: 1 };
  if (TL_LINK_SIZES[s]) return { scale: TL_LINK_SIZES[s] };
  let m = s.match(/^(\d+(?:\.\d+)?)\s*px$/);
  if (m) return { px: `${tlClamp(Number(m[1]), 8, 96)}px` };
  m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (m) return { scale: tlClamp(Number(m[1]) / 100, 0.5, 4) };
  m = s.match(/^(\d+(?:\.\d+)?)x?$/);
  if (m) return { scale: tlClamp(Number(m[1]), 0.5, 4) };
  return { scale: 1 };
}
const TL_INLINE_RE_ONE = /^tasklandia-link(?:\s*[:\s].*)?$/;
const TL_INLINE_RE = /`(tasklandia-link(?:[:\s][^`\n]*)?)`/g;
/** Inline options: `tasklandia-link: label=My quests; tab=dailies; size=small` (separators ; or |, key=value or key: value). */
function tlParseInline(src) {
  const o = {};
  const body = String(src).trim().replace(/^tasklandia-link\s*:?\s*/, '');
  for (const part of body.split(/[;|]/)) {
    const m = part.match(/^\s*([a-zA-Z]+)\s*[=:]\s*(.*?)\s*$/);
    if (m) o[m[1].toLowerCase()] = m[2].replace(/^["']|["']$/g, '');
    else if (part.trim() && !o.label) o.label = part.trim();   // bare text is the label
  }
  return o;
}
const TL_INLINE_SNIPPET = () => '`tasklandia-link: label=quest board`';
const TL_LINK_SNIPPET = (tab) => '```tasklandia-link\nlabel: Quests of Tasklandia\n' + (tab && tab !== 'board' ? `tab: ${tab}\n` : '') + '```\n';
const TL_IMAGE_EXT = /^(png|jpe?g|gif|svg|webp|avif|bmp|ico)$/i;

/**
 * Live Preview: show inline `tasklandia-link …` code as the clickable link (raw text comes back when the cursor is on it).
 * Uses the CodeMirror modules Obsidian ships; if they aren't available, inline links still render in Reading view.
 */
function tlBuildLivePreviewLinks(plugin) {
  let view, state, language;
  try { view = require('@codemirror/view'); state = require('@codemirror/state'); } catch (e) { return null; }
  try { language = require('@codemirror/language'); } catch (e) { language = null; }
  const { ViewPlugin, Decoration, WidgetType } = view || {};
  const { RangeSetBuilder } = state || {};
  if (!ViewPlugin || !Decoration || !WidgetType || !RangeSetBuilder) return null;
  class LinkWidget extends WidgetType {
    constructor(src) { super(); this.src = src; }
    eq(other) { return other.src === this.src; }
    toDOM() {
      const holder = document.createElement('span');
      holder.className = 'qb-link-inline-holder';
      plugin.mountLink(holder, tlParseInline(this.src), true);
      return holder;
    }
    ignoreEvent() { return true; }
  }
  const isLivePreview = (v) => {
    try { return OBSIDIAN.editorLivePreviewField ? v.state.field(OBSIDIAN.editorLivePreviewField) : true; } catch (e) { return true; }
  };
  const inCodeBlock = (st, pos) => {
    if (!language || !language.syntaxTree) return false;
    try { const n = language.syntaxTree(st).resolveInner(pos, 1); return /codeblock|code-block|hmd-codeblock/i.test(n.name); } catch (e) { return false; }
  };
  const build = (v) => {
    const b = new RangeSetBuilder();
    if (!isLivePreview(v)) return b.finish();
    const ranges = v.state.selection.ranges;
    for (const { from, to } of v.visibleRanges) {
      const text = v.state.doc.sliceString(from, to);
      TL_INLINE_RE.lastIndex = 0;
      let m;
      while ((m = TL_INLINE_RE.exec(text))) {
        const start = from + m.index, end = start + m[0].length;
        if (ranges.some((r) => r.from <= end && r.to >= start)) continue;   // editing it → show the source
        if (inCodeBlock(v.state, start)) continue;
        b.add(start, end, Decoration.replace({ widget: new LinkWidget(m[1]) }));
      }
    }
    return b.finish();
  };
  return ViewPlugin.fromClass(class {
    constructor(v) { this.decorations = build(v); }
    update(u) { this.decorations = build(u.view); }
  }, { decorations: (pl) => pl.decorations });
}

// Pick an image from the vault (falls back to a plain modal base if FuzzySuggestModal isn't available).
const TlFuzzyBase = OBSIDIAN.FuzzySuggestModal || Modal;
class TlImagePickModal extends TlFuzzyBase {
  constructor(app, onPick) { super(app); this.onPick = onPick; if (this.setPlaceholder) this.setPlaceholder('Pick an image from your vault…'); }
  getItems() { return this.app.vault.getFiles().filter((f) => TL_IMAGE_EXT.test(f.extension)); }
  getItemText(f) { return f.path; }
  onChooseItem(f) { this.onPick(f.path); }
}

module.exports = QuestboardPlugin;
