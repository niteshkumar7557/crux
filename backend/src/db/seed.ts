import pool from "./index.js";
import bcrypt from "bcrypt";
import { listPresets } from "../lib/avatars.js";

// Dev/demo seeder. Wipes and refills users, arguments, and comments with
// dummy data (every account logs in with the password "secret").
// Refresh tokens are NOT seeded — they're created on login/register.

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)]!;

// ============================================================
// USERS — logic scores spread across every tier (B → M)
// ============================================================
const USERS = [
  { name: "Nitesh Kumar", username: "nitesh_dev", role: "admin", logicScore: 245, description: "Founder of the arena. Argues with receipts." },
  { name: "Vector Shift", username: "vector_shift", logicScore: 182, description: "Systems thinker. Allergic to unfalsifiable claims." },
  { name: "Logic Lord", username: "logic_lord", logicScore: 158, description: "If it doesn't follow, I will say so." },
  { name: "Debater X", username: "debater_x", logicScore: 141, description: "Steelman first, strike second." },
  { name: "Alex Carter", username: "alex_prime", logicScore: 126, description: "Economist by day, contrarian by night." },
  { name: "Nova Singh", username: "nova_thinker", logicScore: 112, description: "Here for the ideas, not the applause." },
  { name: "Iron Wallace", username: "iron_clause", logicScore: 97, description: "Reads the footnotes so you don't have to." },
  { name: "Pete Paradox", username: "paradox_pete", logicScore: 84, description: "Both sides are wrong. Ask me how." },
  { name: "Zara Khan", username: "zara_argues", logicScore: 71, description: "Policy nerd with a soft spot for hard data." },
  { name: "Baron Byte", username: "byte_baron", logicScore: 58, description: "Ships code, breaks arguments." },
  { name: "Maya Ortiz", username: "maya_reasons", logicScore: 52, description: "Slow to post, hard to refute." },
  { name: "Felix Grant", username: "felix_counter", logicScore: 44, description: "Professional devil's advocate." },
  { name: "Priya Anand", username: "priya_logic", logicScore: 39, description: "Biologist. Citations or it didn't happen." },
  { name: "Omar Farouk", username: "omar_debates", logicScore: 31, description: "Debating since the group chat era." },
  { name: "Lena Weiss", username: "lena_w", logicScore: 26, description: "Asks the question everyone was avoiding." },
  { name: "Kai Tanaka", username: "kai_rebuts", logicScore: 19, description: "Short arguments. Sharp edges." },
  { name: "Sofia Marino", username: "sofia_says", logicScore: 14, description: "New here. Unimpressed by credentials." },
  { name: "David Osei", username: "osei_thinks", logicScore: 9, description: "Testing ideas in public, on purpose." },
  { name: "Emma Lind", username: "emma_lind", logicScore: 5, description: "Reads everything. Posts when it matters." },
  { name: "Ravi Menon", username: "ravi_menon", logicScore: 0, description: "Post some Statements to get to know about you." },
];

// ============================================================
// STATEMENTS — author is an index into USERS; affirmative and
// negative always sum to 100; 2 for + 2 against comments each
// ============================================================
interface SeedComment {
  side: "for" | "against";
  text: string;
}
interface SeedStatement {
  author: number;
  content: string;
  keyword: string;
  domain: string;
  affirmative: number;
  forAnalysis: string;
  againstAnalysis: string;
  comments: SeedComment[];
}

const STATEMENTS: SeedStatement[] = [
  {
    author: 0,
    content: "AI should be granted legal personhood.",
    keyword: "legal personhood",
    domain: "Technology & AI",
    affirmative: 54,
    forAnalysis:
      "Autonomous systems need legal standing to function as independent agents in society.\n\n### Key Points\n- Enables AI to enter contracts and own intellectual property\n- Creates clear accountability as AI grows more capable and independent\n- Establishes liability frameworks before systems become uncontrollable",
    againstAnalysis:
      "AI lacks the consciousness and moral agency that legal personhood was designed to protect.\n\n### Key Points\n- Dilutes rights meant exclusively for humans and living beings\n- Corporations could exploit AI personhood to evade liability\n- No ethical basis for rights without genuine autonomy or suffering",
    comments: [
      { side: "for", text: "Corporations are legal persons without consciousness — the precedent already exists." },
      { side: "for", text: "Without personhood, harm caused by autonomous agents lands in a liability vacuum." },
      { side: "against", text: "Personhood without the capacity to bear punishment is legally meaningless." },
      { side: "against", text: "This just gives owners a shield — sue the robot, protect the shareholder." },
    ],
  },
  {
    author: 1,
    content: "Social media does more harm than good to society.",
    keyword: "more harm",
    domain: "Society & Culture",
    affirmative: 62,
    forAnalysis:
      "Decades of research consistently link social media to measurable psychological and civic damage.\n\n### Key Points\n- Drives rising anxiety and depression, especially among teenagers\n- Algorithmic design engineers addiction at the cost of mental health\n- Erodes shared civic discourse by amplifying outrage over truth",
    againstAnalysis:
      "Social media has fundamentally expanded human connection and access to information at scale.\n\n### Key Points\n- Democratized information for billions who lacked mainstream media access\n- Enabled grassroots activism and gave voice to marginalized communities\n- Created entirely new economic opportunities and global markets",
    comments: [
      { side: "for", text: "Teen mental health metrics collapsed exactly when smartphone adoption crossed 50%." },
      { side: "for", text: "Engagement algorithms reward outrage — the harm is a design choice, not a side effect." },
      { side: "against", text: "The Arab Spring, MeToo, and open-source communities all ran on these platforms." },
      { side: "against", text: "Blaming the medium repeats the same moral panic we had about TV and radio." },
    ],
  },
  {
    author: 2,
    content: "Universal basic income is necessary for the future of work.",
    keyword: "basic income",
    domain: "Economics & Business",
    affirmative: 48,
    forAnalysis:
      "Accelerating automation demands a systemic safety net that no targeted program can provide.\n\n### Key Points\n- Ensures no worker is left behind as jobs are structurally displaced\n- Empowers retraining, entrepreneurship, and caregiving without financial ruin\n- Decouples survival from employment in an era of machine labor",
    againstAnalysis:
      "UBI is fiscally unsustainable and misdiagnoses the actual threat automation poses.\n\n### Key Points\n- At scale, costs would be inflationary and crowd out targeted welfare\n- Disincentivizes work and productive contribution to society\n- Automation historically creates more jobs than it destroys — UBI assumes the worst",
    comments: [
      { side: "for", text: "Pilot programs in Kenya and Finland showed better health outcomes with no drop in employment." },
      { side: "for", text: "When trucking automates, no retraining program moves three million drivers fast enough." },
      { side: "against", text: "Cash floors become price floors — landlords capture the transfer within a decade." },
      { side: "against", text: "Targeted welfare does more per dollar; universality wastes it on the wealthy." },
    ],
  },
  {
    author: 3,
    content: "Space exploration is a waste of resources.",
    keyword: "Space exploration",
    domain: "Science",
    affirmative: 33,
    forAnalysis:
      "Trillions spent on space while billions lack basic needs reflects a profound failure of priorities.\n\n### Key Points\n- Funds could directly address poverty, disease, and climate disasters on Earth\n- Benefits of space investment are abstract and long-term; suffering is immediate\n- Private space ventures primarily serve billionaire vanity, not humanity",
    againstAnalysis:
      "Space exploration is humanity's highest-return long-term investment, not a luxury.\n\n### Key Points\n- Has produced GPS, medical imaging, water filtration, and countless spinoff technologies\n- Secures humanity's survival by developing off-world contingency options\n- Inspires scientific literacy and yields compounding returns across generations",
    comments: [
      { side: "for", text: "Every dollar in orbit is a dollar not spent on the 700 million people in extreme poverty." },
      { side: "for", text: "Billionaire joyrides now define the sector's public image and output." },
      { side: "against", text: "GPS, weather satellites, and disaster response all came from 'wasted' space budgets." },
      { side: "against", text: "The asteroid that ends us won't wait for Earth's problems to be solved first." },
    ],
  },
  {
    author: 4,
    content: "Cryptocurrency will replace traditional banking systems.",
    keyword: "Cryptocurrency",
    domain: "Economics & Business",
    affirmative: 41,
    forAnalysis:
      "Crypto offers the first genuinely decentralized alternative to rent-seeking financial infrastructure.\n\n### Key Points\n- Banks the unbanked — 1.4 billion adults globally without financial access\n- Eliminates middlemen and slashes remittance costs for migrant workers\n- Permissionless and borderless by design — no institution can revoke access",
    againstAnalysis:
      "Crypto remains too volatile, energy-intensive, and unregulated to displace mature banking systems.\n\n### Key Points\n- Lacks consumer protections that traditional banking guarantees by law\n- Price volatility makes it structurally unsuitable as a medium of exchange\n- Most institutional crypto adoption still depends entirely on fiat on-ramps",
    comments: [
      { side: "for", text: "Remittance fees eat 6% of the income of the world's poorest workers — crypto cuts it to cents." },
      { side: "for", text: "A billion people have phones but no bank. The math resolves itself." },
      { side: "against", text: "A currency that swings 20% a week cannot price a loaf of bread." },
      { side: "against", text: "Every major crypto crisis so far has ended in a fiat bailout or an exchange collapse." },
    ],
  },
  {
    author: 5,
    content: "Climate change action should be prioritized over economic growth.",
    keyword: "prioritized",
    domain: "Environment & Energy",
    affirmative: 68,
    forAnalysis:
      "The cost of climate inaction already exceeds the cost of transition — the math is settled.\n\n### Key Points\n- Floods, droughts, and crop failures impose economic costs dwarfing clean energy investment\n- Sustainable growth is only possible on a climatically stable planet\n- Delaying action compounds costs exponentially — early investment is rational",
    againstAnalysis:
      "Aggressive climate policy without economic safeguards punishes the world's poorest nations most.\n\n### Key Points\n- Developing nations still industrializing cannot afford a forced energy transition\n- Economic growth funds the very innovation needed to solve climate change\n- Technological progress — not austerity — is the most viable decarbonization path",
    comments: [
      { side: "for", text: "Pakistan's floods cost 10% of GDP in one summer — inaction is the expensive option." },
      { side: "for", text: "There is no economy on a planet with failed harvests." },
      { side: "against", text: "Forcing solar on nations still burning kerosene locks in poverty." },
      { side: "against", text: "Rich countries industrialized on coal, then pulled the ladder up behind them." },
    ],
  },
  {
    author: 6,
    content: "Artificial intelligence will cause more unemployment than it creates.",
    keyword: "unemployment",
    domain: "Technology & AI",
    affirmative: 57,
    forAnalysis:
      "AI threatens cognitive and creative jobs simultaneously — unlike any automation wave before it.\n\n### Key Points\n- White-collar, legal, medical, and creative roles are all vulnerable at once\n- Speed of displacement will outpace any realistic retraining infrastructure\n- Structural unemployment will concentrate in communities with no alternative industries",
    againstAnalysis:
      "Every technological revolution has ultimately created more jobs than it eliminated.\n\n### Key Points\n- AI eliminates repetitive tasks while generating demand for oversight, ethics, and new roles\n- Adjacent industries we cannot yet predict will absorb displaced workers\n- Historical pattern: automation raises productivity, which expands the overall job market",
    comments: [
      { side: "for", text: "This wave hits lawyers and radiologists at the same time as truckers — that's new." },
      { side: "for", text: "Retraining takes years; model releases take months." },
      { side: "against", text: "ATMs were supposed to end bank tellers; teller employment doubled instead." },
      { side: "against", text: "Every productivity jump in history has expanded the labor market eventually." },
    ],
  },
  {
    author: 7,
    content: "Social media platforms should be held liable for misinformation.",
    keyword: "misinformation",
    domain: "Law & Justice",
    affirmative: 52,
    forAnalysis:
      "Platforms profit from misinformation-driven engagement while bearing zero consequence for the harm.\n\n### Key Points\n- Legal liability creates direct financial incentive for serious content moderation\n- Platforms already curate content algorithmically — liability should follow editorial control\n- Victims of misinformation currently have no legal recourse against the amplifier",
    againstAnalysis:
      "Platform liability for user content would trigger mass censorship and destroy open discourse.\n\n### Key Points\n- Conflates platforms with publishers — a legally and functionally false equivalence\n- Governments could weaponize liability laws to suppress legitimate dissent\n- Moderation at scale is technically impossible without catastrophic collateral censorship",
    comments: [
      { side: "for", text: "Platforms already editorialize with ranking algorithms — liability should follow control." },
      { side: "for", text: "A lie reaching ten million people has an amplifier, and the amplifier profits." },
      { side: "against", text: "The threat of lawsuits means moderation bots delete first and ask never." },
      { side: "against", text: "Safe-harbor protection is the only reason small forums can exist at all." },
    ],
  },
  {
    author: 8,
    content: "Nuclear energy is the cleanest solution to the global energy crisis.",
    keyword: "cleanest solution",
    domain: "Environment & Energy",
    affirmative: 71,
    forAnalysis:
      "Nuclear produces near-zero carbon emissions and operates independently of weather or daylight.\n\n### Key Points\n- Smallest land footprint of any major energy source at equivalent output\n- Modern reactor designs have dramatically reduced safety and waste risks\n- Only proven baseload power source fully compatible with complete decarbonization",
    againstAnalysis:
      "Nuclear is too expensive and too slow to build to meet the urgency of the climate crisis.\n\n### Key Points\n- Average construction time exceeds 10 years — utility-scale renewables deploy in months\n- Waste storage remains an unsolved problem spanning geological timescales\n- Rare failures like Fukushima carry consequences no other energy source can match",
    comments: [
      { side: "for", text: "France decarbonized its grid in fifteen years on nuclear alone. It's a solved problem." },
      { side: "for", text: "Per terawatt-hour, nuclear kills fewer people than wind power does." },
      { side: "against", text: "Vogtle came in seven years late and $17B over — solar got 80% cheaper meanwhile." },
      { side: "against", text: "We still don't have a single operating permanent waste repository anywhere on Earth." },
    ],
  },
  {
    author: 9,
    content: "Governments should regulate big tech companies like public utilities.",
    keyword: "big tech companies",
    domain: "Politics & Governance",
    affirmative: 46,
    forAnalysis:
      "A handful of corporations control digital infrastructure billions depend on — that is a utility.\n\n### Key Points\n- Utility status ensures fair access and prevents anti-competitive gatekeeping\n- Protects users from algorithmic exploitation of attention and personal data\n- Accountability frameworks would force transparency currently absent from platform governance",
    againstAnalysis:
      "Utility regulation would strangle the innovation engine that made big tech valuable in the first place.\n\n### Key Points\n- Competitive incentives drove every major platform breakthrough — regulation kills that pressure\n- Heavy-handed rules risk entrenching incumbents and blocking new challengers\n- Shifts power to politically motivated regulators with no technical expertise",
    comments: [
      { side: "for", text: "When three companies control discourse, commerce, and cloud, that's infrastructure." },
      { side: "for", text: "Utilities didn't stop innovating — they stopped extorting." },
      { side: "against", text: "Regulated utilities are why your power company still runs on fax machines." },
      { side: "against", text: "Compliance costs entrench the giants; startups can't afford the lawyers." },
    ],
  },
  {
    author: 10,
    content: "Standardized exams fail to measure real intelligence.",
    keyword: "real intelligence",
    domain: "Education",
    affirmative: 61,
    forAnalysis:
      "Standardized testing measures recall under pressure, not the creative and social capacities that define real-world intelligence.\n\n### Key Points\n- Rewards memorization and test-taking strategy over original thinking\n- Ignores creativity, collaboration, and emotional intelligence entirely\n- High-stakes pressure distorts results for capable students with anxiety",
    againstAnalysis:
      "Exams remain the fairest scalable instrument we have for comparing ability across huge populations.\n\n### Key Points\n- Same questions, same clock — the most objective comparison available at scale\n- Test scores correlate strongly with later academic and professional performance\n- Alternatives like portfolios and interviews introduce far more bias",
    comments: [
      { side: "for", text: "I've hired brilliant engineers who failed every standardized test they ever took." },
      { side: "for", text: "The test-prep industry proves the score measures wealth as much as intellect." },
      { side: "against", text: "Remove the exam and admissions become a contest of connections and polish." },
      { side: "against", text: "Blind grading is the only bias shield we've ever made work at scale." },
    ],
  },
  {
    author: 11,
    content: "Junk food should be taxed like tobacco.",
    keyword: "taxed",
    domain: "Health & Medicine",
    affirmative: 54,
    forAnalysis:
      "Diet-related disease now outkills tobacco, and taxation is the one lever proven to shift consumption at scale.\n\n### Key Points\n- Sugar taxes in Mexico and the UK measurably cut consumption\n- Healthcare systems absorb the cost of cheap calories — the price is just hidden\n- Revenue can subsidize healthy food access in low-income areas",
    againstAnalysis:
      "Food taxes are regressive levies that punish the poor for the failures of food policy.\n\n### Key Points\n- Lowest-income households spend the largest share of income on food\n- 'Junk' has no clean legal definition — enforcement becomes arbitrary\n- Education and reformulation incentives outperform punitive taxes",
    comments: [
      { side: "for", text: "The UK sugar levy reformulated half the soft-drink market before it even took effect." },
      { side: "for", text: "We ran this exact experiment with tobacco. It worked." },
      { side: "against", text: "A parent buying dollar calories isn't making a choice — they're surviving a budget." },
      { side: "against", text: "Define 'junk' in law and watch granola bars with 30g of sugar walk right through." },
    ],
  },
  {
    author: 1,
    content: "Mass surveillance is never justified, even for national security.",
    keyword: "Mass surveillance",
    domain: "Law & Justice",
    affirmative: 57,
    forAnalysis:
      "Dragnet surveillance inverts the presumption of innocence for entire populations.\n\n### Key Points\n- Chills journalism, activism, and dissent long before any abuse occurs\n- Databases outlive the governments that promise restraint\n- No documented case of mass collection stopping what targeted warrants could not",
    againstAnalysis:
      "Modern threats move at network speed, and intelligence gaps cost lives.\n\n### Key Points\n- Encrypted, decentralized threats cannot be met with paper warrants\n- Strong oversight regimes can make bulk collection accountable\n- Most citizens accept the trade in exchange for demonstrable security",
    comments: [
      { side: "for", text: "The Stasi archive is what a 'trust us' database becomes after one election." },
      { side: "for", text: "Chilling effects are invisible until you notice nobody protests anymore." },
      { side: "against", text: "Known attackers were flagged by bulk data — the failure was follow-up, not collection." },
      { side: "against", text: "You already trade this exact data to advertisers for coupons." },
    ],
  },
  {
    author: 12,
    content: "Streaming has made music worse.",
    keyword: "Streaming",
    domain: "Society & Culture",
    affirmative: 44,
    forAnalysis:
      "Streaming's economics compress songs into interchangeable background content.\n\n### Key Points\n- Per-stream payouts collapse mid-tier artist income\n- Skip-rate optimization pushes hooks to second five and shortens everything\n- Playlist culture rewards mood conformity over albums and ambition",
    againstAnalysis:
      "More people hear more music from more artists than at any point in history.\n\n### Key Points\n- Zero-cost global distribution for unsigned artists\n- Niche genres thrive that radio would never have touched\n- Live revenue and direct-fan platforms now reward the same artists",
    comments: [
      { side: "for", text: "Song intros dropped from twenty seconds to five — that's the algorithm composing." },
      { side: "for", text: "A million streams buys groceries for a month. That's the whole story." },
      { side: "against", text: "A kid in Lagos can chart globally without a label. That was impossible in 1995." },
      { side: "against", text: "The vinyl-era gatekeepers rejected most artists outright. The old filter was worse." },
    ],
  },
  {
    author: 13,
    content: "University degrees are becoming obsolete.",
    keyword: "University degrees",
    domain: "Education",
    affirmative: 39,
    forAnalysis:
      "The signal value of a degree is collapsing while its price quadruples.\n\n### Key Points\n- Major tech employers dropped degree requirements for most roles\n- Bootcamps and certifications reach competence in months, not years\n- Student debt delays homes, families, and entrepreneurship by a decade",
    againstAnalysis:
      "Degrees still gate the professions society depends on, and the wage premium persists.\n\n### Key Points\n- Graduates out-earn non-graduates by roughly 70% over a lifetime\n- Medicine, law, and engineering cannot be bootcamped safely\n- University builds networks and breadth no six-week course replicates",
    comments: [
      { side: "for", text: "Google and IBM dropped the requirement years ago. The market already voted." },
      { side: "for", text: "$200k of debt to prove you can sit still for four years." },
      { side: "against", text: "The wage premium has survived every 'end of college' prediction since 1976." },
      { side: "against", text: "Would you cross a bridge designed by someone with a YouTube certificate?" },
    ],
  },
  {
    author: 14,
    content: "Esports deserve the same recognition as traditional sports.",
    keyword: "Esports",
    domain: "Sports & Gaming",
    affirmative: 47,
    forAnalysis:
      "Esports demand elite reflexes, strategy, and teamwork before audiences that rival championship finals.\n\n### Key Points\n- Sustained precision under pressure is measurable athletic performance\n- Prize pools and viewership already exceed many Olympic sports\n- Training regimens mirror traditional athletics, coaches and all",
    againstAnalysis:
      "Recognition should track physical excellence, which esports by definition lacks.\n\n### Key Points\n- Athletic institutions exist to celebrate bodily achievement\n- Game publishers own the 'sport' — a private company controls the rules\n- Titles die within a decade; chess and football are centuries old",
    comments: [
      { side: "for", text: "F1 drivers and archers aren't sprinting either — precision under pressure is the sport." },
      { side: "for", text: "The League finals outdrew the NBA finals with viewers under thirty." },
      { side: "against", text: "When the publisher patches the game, the 'sport' changes overnight by corporate memo." },
      { side: "against", text: "Fine motor skill isn't athleticism, or surgeons would have podiums." },
    ],
  },
  {
    author: 2,
    content: "Remote work should be the default for knowledge jobs.",
    keyword: "Remote work",
    domain: "Society & Culture",
    affirmative: 63,
    forAnalysis:
      "Knowledge work measured by output has no business requiring a commute.\n\n### Key Points\n- Productivity held or rose in the largest remote experiments ever run\n- Reclaims 200+ hours per worker per year from commuting\n- Opens elite jobs to talent outside megacity housing markets",
    againstAnalysis:
      "Distributed-by-default quietly starves the collaboration that builds careers and culture.\n\n### Key Points\n- Juniors lose the apprenticeship of proximity\n- Serendipitous problem-solving doesn't schedule itself into calls\n- Weak ties fray first, and they're what hold teams together under stress",
    comments: [
      { side: "for", text: "My team shipped more in two remote years than five office ones. Measured, not vibes." },
      { side: "for", text: "The office was a real-estate cost pretending to be a culture." },
      { side: "against", text: "Every junior I mentor remotely takes twice as long to ramp. The hallway mattered." },
      { side: "against", text: "Companies go default-remote in boom times, then wonder where loyalty went in layoffs." },
    ],
  },
  {
    author: 15,
    content: "Gene editing of human embryos should be legal.",
    keyword: "Gene editing",
    domain: "Science",
    affirmative: 41,
    forAnalysis:
      "Refusing to edit out heritable suffering when we can is itself an ethical choice.\n\n### Key Points\n- Could eliminate Huntington's, Tay-Sachs, and thousands of single-gene diseases\n- Bans push the research into unregulated jurisdictions\n- The somatic-germline distinction is already blurring in the clinic",
    againstAnalysis:
      "Editing embryos crosses into consequences no consent framework can cover.\n\n### Key Points\n- Edits propagate to descendants who never consented\n- Therapeutic lines blur into enhancement and designer pressure\n- Off-target effects may take generations to surface",
    comments: [
      { side: "for", text: "We already select embryos in IVF. Editing is a difference of degree, not kind." },
      { side: "for", text: "Telling families with Huntington's to wait is not neutrality." },
      { side: "against", text: "The He Jiankui affair showed exactly how this goes without governance." },
      { side: "against", text: "The consent problem is unsolvable — the patient doesn't exist yet." },
    ],
  },
];

const seed = async () => {
  const client = await pool.connect();

  try {
    const presets = await listPresets();
    if (presets.length === 0) {
      throw new Error("no preset avatars found — cannot assign user avatars");
    }

    await client.query("BEGIN");

    // Idempotent: re-running the seed resets the dummy data (and ids)
    await client.query(
      "TRUNCATE users, arguments, comments, refresh_tokens RESTART IDENTITY CASCADE",
    );

    // ============================================================
    // USERS — each gets a random preset avatar
    // ============================================================
    const hashedPassword = await bcrypt.hash("secret", 10);

    const userValues: unknown[] = [];
    const userRows = USERS.map((u, i) => {
      userValues.push(
        u.name,
        u.username,
        `${u.username}@example.com`,
        hashedPassword,
        u.role ?? "user",
        u.logicScore,
        u.description,
        pick(presets).url,
      );
      const o = i * 8;
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8})`;
    }).join(",\n        ");

    const usersResult = await client.query(
      `
      INSERT INTO users (name, username, email, hashed_password, role, logic_score, description, avatar)
      VALUES
        ${userRows}
      RETURNING id;
      `,
      userValues,
    );
    const users = usersResult.rows;
    console.log(`✅ Seeded ${users.length} users`);

    // ============================================================
    // ARGUMENTS — staggered creation times over the last ~45 days
    // ============================================================
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const statementTimes = STATEMENTS.map(
      () => new Date(now - randInt(3, 45 * 24) * HOUR),
    );

    const domainRows = await client.query("SELECT id, name FROM domains");
    const domainIds = new Map<string, number>(
      domainRows.rows.map((r: { id: number; name: string }) => [r.name, r.id]),
    );

    const argValues: unknown[] = [];
    const argRows = STATEMENTS.map((s, i) => {
      argValues.push(
        users[s.author].id,
        s.content,
        s.keyword,
        domainIds.get(s.domain) ??
          (() => {
            throw new Error(
              `Unknown seed domain: ${s.domain} — run migrations first`,
            );
          })(),
        s.forAnalysis,
        s.againstAnalysis,
        s.affirmative,
        100 - s.affirmative,
        statementTimes[i],
      );
      const o = i * 9;
      return `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9})`;
    }).join(",\n        ");

    const argsResult = await client.query(
      `
      INSERT INTO arguments (user_id, content, content_keyword, domain_id, for_analysis, against_analysis, affirmative, negative, created_at)
      VALUES
        ${argRows}
      RETURNING id;
      `,
      argValues,
    );
    const args = argsResult.rows;
    console.log(`✅ Seeded ${args.length} arguments`);

    // ============================================================
    // COMMENTS — random commenters (never the statement author),
    // posted after their statement, with a spread of likes
    // ============================================================
    const commentValues: unknown[] = [];
    const commentRows: string[] = [];

    STATEMENTS.forEach((s, i) => {
      const statementTime = statementTimes[i]!.getTime();
      s.comments.forEach((c) => {
        let commenter = randInt(0, users.length - 1);
        while (commenter === s.author) {
          commenter = randInt(0, users.length - 1);
        }
        const postedAt = new Date(
          Math.min(statementTime + randInt(1, 96) * HOUR, now),
        );
        const likes = randInt(0, 12) + (Math.random() < 0.3 ? randInt(8, 25) : 0);

        const o = commentValues.length;
        commentValues.push(
          users[commenter].id,
          args[i].id,
          c.side,
          c.text,
          likes,
          postedAt,
        );
        commentRows.push(
          `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6})`,
        );
      });
    });

    const commentsResult = await client.query(
      `
      INSERT INTO comments (user_id, argument_id, side, content, likes, created_at)
      VALUES
        ${commentRows.join(",\n        ")}
      RETURNING id;
      `,
      commentValues,
    );
    console.log(`✅ Seeded ${commentsResult.rows.length} comments`);

    await client.query("COMMIT");
    console.log("🎉 Seeding complete! (every user's password is \"secret\")");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed, rolled back:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
