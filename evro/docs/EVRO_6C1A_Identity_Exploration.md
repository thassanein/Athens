# EVRO 6C.1A — Icon & Identity Exploration (rationale record)

**Phase:** 6C.1A · **Status:** complete, advisory · **Production identity:** unchanged (the 6C.1 Enterprise Pulse Orbital)

This document is the record of the 6C.1A exploration: what was built, why each
direction exists, how the panel judged them, and what the verdict does — and
does not — decide. The living version of everything described here renders on
the **Identity Lab** page inside the product (Reference → Identity Lab).

---

## 1. The strategic question

Phase 6C.1 established the **Enterprise Pulse Rings as EVRO's operating
language** — the in-product visual grammar for state, health and telemetry.
What it deliberately left open is whether that operating language is also the
**master brand**. A gauge can be the way a product speaks without being the
way the company signs its name.

The brief poses the design challenge as: *"If Bloomberg, Palantir, Apple,
Formula 1 strategy, NASA Mission Control and Blackstone collaborated on an
Enterprise Intelligence Operating System — what would its mark be?"* — against
ten principles (executive, premium, timeless, intelligent, strategic, elegant,
powerful, minimal, memorable, scalable) and six success criteria.

## 2. Method

Three waves, each adversarially reviewed before commit:

1. **Wave 1 — five icon systems.** Each direction implemented as a real SVG
   system (`Marks.jsx`): 100-grid tile + glyph, dark/light preview fields,
   motion variant (reduced-motion safe), and a 40/24/16 px scale row — the
   recognizability floor the brief demands. Every card carries its rationale
   *and* its risk.
2. **Wave 2 — systems and comps.** Three of the five developed into complete
   logo systems (horizontal + vertical lockups, icon ladder, pairing rules),
   plus three landing concepts and two executive homepage concepts as
   desktop + mobile artboards (`Concepts.jsx`). Every number in the comps is
   computed live from the portfolio — even a mock must not lie.
3. **Wave 3 — the panel.** Six independent AI judges (five identity lenses,
   one landing/mobile lens) scored the rendered artifacts against the brief's
   success criteria; a chair synthesized their notes. The result is recorded
   as static editorial data (`identity-verdict.js`) and rendered on the lab
   page, labelled as exactly what it is: a one-time, advisory judgment.

## 3. The five directions

### D1 — Executive Pulse Mark (Apple Activity × Blackstone)

*Says:* Enterprise health, motion, intelligence.

Three closed rings, each mid-sweep — the enterprise as a living instrument that is always partway through earning its day. The gold inner ring is the value engine. Quietest of the five; the most Blackstone.

**The risk:** Closest to Apple Activity — familiarity cuts both ways: instantly legible, but borrowed.

### D2 — Value Orbit (NASA × Bloomberg)

*Says:* Enterprise, value flow, movement.

A governed system with mass at the centre and a trajectory breaking orbit to the NE — value reaching escape velocity. The evolution of the shipped 6C.1 mark: same physics, more literal orbital mechanics.

**The risk:** Busiest silhouette at 16px; the ellipses demand room.

### D3 — EV Monogram (Porsche × Apple)

*Says:* Motion, value and intelligence in the letterforms.

The name itself, engineered: E as speed lines, V as the descent that turns — with the gold point of value at the apex where it turns upward. A crest, not a chart. The most timeless; the most luxury-marque.

**The risk:** Says nothing about intelligence or telemetry without the system around it.

### D4 — Enterprise Compass (Formula 1 × Mission Control)

*Says:* Command, orientation and leadership.

A bezel of ticks and a needle locked NE — command is knowing your heading and holding it. Reads as an instrument dial from a race wall or a flight deck. Strongest "executive command" signal of the five.

**The risk:** Compasses are a crowded metaphor in enterprise software; the execution must stay this austere to avoid cliché.

### D5 — Enterprise Signal (Palantir × Anduril)

*Says:* Insight, sensing and awareness.

Telemetry propagating from an origin, one detection confirmed in gold — the enterprise, instrumented. Asymmetric and directional; the most Palantir. Pairs naturally with the AI presence layer.

**The risk:** The defence-tech register may read colder than the AVCM movement side of the product wants.

## 4. The three logo systems

The lab develops **A — Executive Pulse**, **B — EV Monogram** and **C —
Enterprise Compass** into full systems. The other two are excluded
deliberately: the shipped Pulse Orbital already covers D2's territory (a
Value-Orbit choice would merely re-ship the production mark), and D5's
defence-tech register is the riskiest fit for the movement side of the
product. Each system defines a horizontal lockup, a vertical (ceremonial)
lockup, a 28/20/16 px icon ladder, and a pairing rule for the wordmark.

## 5. The page concepts

Three landing explorations — **L1 Enterprise Status First** (energy ring +
weather + one-line state), **L2 Mission Control First** (missions ranked,
decisions waiting, money rows), **L3 Enterprise Value First** (the EVUM hero
number, then its decomposition) — and two executive homepages: **H1 Executive
Command Center** (Bloomberg density: vitals strip, queue, decisions, value
bridge) and **H2 Living Enterprise Dashboard** (the breathing energy hero;
state before tasks). All rendered as desktop + mobile artboards with live
portfolio numbers.

## 6. The panel

**Method.** Six AI judges — model-run persona lenses, not human consultants.
Five identity judges, one lens each; every judge scored all five
directions on the brief's four identity criteria (integers 1–10, instructed
to discriminate and to ground every score in the rendered pixels), gave an
explicit ranking, and wrote a one-paragraph remark. A sixth judge scored the
landing concepts on the brief's two remaining criteria (value immediacy,
purpose-built mobile) and the homepage concepts on purpose-built mobile plus
executive fit — a judge-added criterion, since a homepage is a working seat,
not a landing pitch. Aggregation is
deterministic: the matrix is the plain mean of the five identity judges;
Borda points award 5…1 for ranked positions 1…5. The chair's synthesis was
constrained to the judges' own outputs.

**The lenses and their first picks:**

- **Brand strategist (ownability & distinctiveness)** → D3 EV Monogram
- **Design craft (geometry & the 16px floor)** → D3 EV Monogram
- **Executive buyer (premium, timeless, the engraving test)** → D3 EV Monogram
- **Intelligence semantics (what the pixels say, Palantir/NASA register)** → D5 Enterprise Signal
- **Product systems (extensibility & coexistence with the Pulse Rings)** → D3 EV Monogram

**Score matrix** (mean of 5 judges; criteria = instantly recognizable ·
premium & timeless · says enterprise intelligence · category-defining):

| Direction | Recognizable | Premium | Intelligence | Category-defining | **Overall** | Borda |
|---|---|---|---|---|---|---|
| D3 EV Monogram | 8.2 | 8.6 | 4.4 | 6.4 | **6.9** | 21 |
| D4 Enterprise Compass | 5.4 | 6.8 | 6 | 3.8 | **5.5** | 17 |
| D5 Enterprise Signal | 5 | 5.2 | 7.6 | 4.2 | **5.5** | 15 |
| D1 Executive Pulse Mark | 5.6 | 7 | 4.8 | 3.2 | **5.1** | 12 |
| D2 Value Orbit | 4 | 5 | 6.2 | 3.6 | **4.7** | 10 |

The compass/signal tie on overall mean (5.5) breaks on Borda (17 vs 15).

### The panel's view, direction by direction

**D3 EV Monogram** — The winner on ownability, 16px survival, and boardroom-in-2036 premium — the device and the name are the same asset, with the gold apex as watchmaker's restraint — against one sharp dissent: the semantics lens scores it lowest-but-one on intelligence, a handsome crest that says electric vehicles, not enterprise intelligence, until the system around it speaks.

**D4 Enterprise Compass** — Instrument-grade at hero size with the best small-size recall element on the sheet — the gold needle locked NE reads 'decision taken, heading held' even at 16px — but brand-strategist and buyer agree the dial-and-needle silhouette is a near-Safari read, and small-size survival of a borrowed form builds Apple's equity, not EVRO's.

**D5 Enterprise Signal** — The only mark that actually speaks the category — emitter, propagating fronts, gold contact confirmed, the Palantir register verbatim, and the semantics lens's outright winner — but four judges see a rotated Wi-Fi/RSS glyph at 16px, and as the buyer put it, nobody engraves a wireless icon on a boardroom door.

**D1 Executive Pulse Mark** — The best-engineered geometry of the five — disciplined stroke gradation and the only coded sub-24px fallback — but every lens converges on the same verdict: it is Apple Activity trade dress that decays to a generic bullseye at floor, and it collides with the product's own ring gauges rather than signing above them.

**D2 Value Orbit** — The panel's floor as executed: the gold escape trajectory is its one ownable gesture and it carries continuity with the shipped mark, but the 16px tile smears into an illegible blob on both fields, it fights the atom/React register, and the lab itself declined to build it a lockup — choosing it would merely re-ship the Pulse Orbital.

### What each judge saw (full notes)

**D3 EV Monogram:**

- *Brand strategist:* The only candidate whose silhouette is inherently clearable because it is the name itself — the 16px tile still legibly reads 'EV' with the gold apex intact on both fields — with the residual risk being semantic ('EV' = electric vehicle in 2026), a positioning drag rather than a visual collision.
- *Design craft:* 'EV' is still literally readable in the 16px tiles of the card renders and the System B icon row — the only mark whose identity content survives the floor — and it makes the cleanest dark-to-light translation; only the 2.2-unit bezel and the r=4.6 gold apex dot drop out small.
- *Executive buyer:* The only mark that passes the engraving test: in the systems sheet the bezel-and-letterform crest still reads EV in the 16px icon row, and the gold apex point is a watchmaker's detail — the sole hesitations are the electric-vehicle collision on the letters and that it says nothing about telemetry without the system around it.
- *Intelligence semantics:* Semantically mute — nothing in three bars and a chevron says sensing, telemetry, or decision, and in 2026 'EV' in a roundel misfires hard toward electric-vehicle charging; it is the cleanest survivor at 16px, which only makes the silence crisper.
- *Product systems:* 'EV' still reads at 16px in both fields, System B's lockups hold with the crest carrying ceremony, and a letterform is the one register with zero collision with the in-product ring gauges — the gold apex dot bridges to the shared value-spark token while the rings keep the telemetry job.

**D4 Enterprise Compass:**

- *Brand strategist:* Tick bezel plus two-tone needle locked NE inside a rounded-square app tile is a near-literal Safari read — Safari's needle also points NE — most acute on the light field; the gold needle does survive at 16px, but small-size survival of a borrowed silhouette builds Apple's equity, not EVRO's.
- *Design craft:* Instrument-grade at hero size (tick hierarchy, counterweighted ghost needle, a light-field render crisper than the dark), but at 16px the 0.45-opacity ticks and 3-unit center ring vanish leaving only a gold sliver, and the dial-plus-needle silhouette ghosts Safari.
- *Executive buyer:* The gold needle survives as a clear recall element even in the 16px tile and the tick bezel has genuine watch-dial austerity, but the mark sits one step from Apple Compass/Safari and every consultancy's heading metaphor — authoritative yet unownable.
- *Intelligence semantics:* The gold needle locked NE is the clearest 'decision taken, heading held' statement on the sheet and the orange sliver still survives in the 16px render, but the 104px tile's first read is Apple Safari — a navigation quote, and a borrowed one, rather than an intelligence claim.
- *Product systems:* The gold needle is legible down to 16px in System C's icon row and its 45-degree NE lock quotes the shipped spark's direction without copying its form, but the compass-on-tile app icon sits one step from Safari and the metaphor is crowded.

**D5 Enterprise Signal:**

- *Brand strategist:* Origin dot lower-left with three arcs fanning NE is structurally the RSS icon / a rotated Wi-Fi glyph, and the rendered 16px tile reads as a connectivity indicator; the gold detection dot is the only proprietary element and it shrinks to a fleck exactly where distinctiveness is needed most.
- *Design craft:* Uniform 5-unit strokes survive 16px more legibly than compass or orbit, but what survives is a wifi glyph; the 0.3-opacity outer front all but disappears on the light field and the gold detection dot shrinks to a borderline fleck at floor.
- *Executive buyer:* At 24 and 16px it reads as a Wi-Fi status glyph with a gold dot; the sensing story is genuinely intelligent, but nobody engraves a wireless icon on a boardroom door.
- *Intelligence semantics:* The only mark with a complete event grammar — emitter dot at the origin, three propagating fronts fading 0.9/0.55/0.3, and a gold contact sitting beyond the outermost arc that reads unmistakably as a confirmed radar detection; docked one point because the underlying geometry is a rotated Wi-Fi/RSS icon until the detection dot rescues it.
- *Product systems:* The asymmetric NE fan is genuinely distinct from concentric rings and animates natively (propagating fronts, detection ping), but the 16px tile reads as a rotated Wi-Fi glyph and no lockup system was built to prove the extension.

**D1 Executive Pulse Mark:**

- *Brand strategist:* The 104px tile is read as Apple Activity rings within a second (registered trade dress, aggressively defended), and the code's own <=24px fallback collapses to plain closed concentric circles — a generic bullseye — so at no rendered size does this silhouette identify EVRO rather than Cupertino.
- *Design craft:* Best pure geometry of the five — graduated 9/8/7 stroke widths, uniform 4-unit ring gaps, and the only mark with a coded sub-24px fallback (closed rings), so the 16px tile stays crisp on both fields — but at floor it reads as a generic bullseye borrowed from Apple Activity.
- *Executive buyer:* Quiet and well-engineered (the source drops to closed rings below 24px so small tiles stay legible), but the board will see Apple Watch fitness rings — borrowed consumer equity that stamps the mark with a 2015–2025 expiry date.
- *Intelligence semantics:* The mid-sweep story is the only telemetry it has, and it dies at small sizes — the source closes the arcs into plain concentric circles at <=24px, and the 16px tile reads as a wellness-ring bullseye, saying fitness tracking rather than sensing or command.
- *Product systems:* The engineered 16px fallback (closed rings below 24px in Marks.jsx) survives cleanly and System A's lockups work, but it is the same concentric-ring grammar as the shipped Pulse Orbital and the literal '56' ring gauge heroed on both homepage concepts — as master brand it dissolves into the product's own gauges.

**D2 Value Orbit:**

- *Brand strategist:* The gold trajectory breaking orbit NE is the one ownable asymmetry here and it carries continuity with the shipped Pulse Orbital, but the rendered 16px tile smears into an illegible tangle and the inclined-ellipses-around-a-core register is already owned by React/Electron in software mindshare.
- *Design craft:* The 3–3.4-unit ellipse strokes go sub-pixel at 16px and the floor tile is a gray smudge with a gold speck on both dark and light fields; the hero composition is elegant but stroke weights are undisciplined (3/3.4/4 plus filled dots) and no small-size simplification exists in source.
- *Executive buyer:* Its own 16px tile collapses into an illegible grey scribble, and the thin crossed ellipses will neither engrave nor emboss — an atom motif with science-fair vintage, elegant only at hero size.
- *Intelligence semantics:* The gold breakout trajectory with the spark at 76,23 is genuine Mission-Control grammar (a tracked body leaving a governed orbit), but the naive first read of two inclined ellipses plus satellites is 'atom / science company,' and the 16px render collapses into an illegible scribble exactly as the risk copy predicts.
- *Product systems:* The 16px tile visibly smears into a blob-with-a-dot in both card renders, and choosing it just re-ships the 6C.1 orbital — tellingly, systems.png builds lockups for A/B/C and explicitly skips D2 because the shipped mark already covers its territory.

### The judges' remarks

**Brand strategist (ownability & distinctiveness)** — ranking: D3 EV Monogram > D2 Value Orbit > D5 Enterprise Signal > D4 Enterprise Compass > D1 Executive Pulse Mark

> From an ownability standpoint this field splits cleanly into one clearable mark and four borrowed silhouettes. The EV Monogram is the only direction EVRO can own outright: a distinctive rendering of your own name is the classic trademark-safe route, the rendered 16px tile still reads 'EV', and memorability-after-one-exposure is highest precisely because the device and the name are the same asset — its real risk is the 2026 'electric vehicle' misread, which is manageable by class and channel. Value Orbit ranks second on the strength of its one proprietary gesture — the gold escape trajectory — and its continuity with the shipped Pulse Orbital, but it must fix its 16px collapse and it fights React/Electron for the atom register. Signal is conceptually the most on-category ('the enterprise, instrumented') yet its silhouette is genericized by RSS/Wi-Fi iconography. Pulse and Compass both fail the competitor test outright: the pulse tile is Apple Activity trade dress that degrades to a bullseye at small sizes, and the compass tile is a near-Safari read down to the NE-pointing two-tone needle. I would not take either to clearance. The lab's own risk notes on D1 and D4 are, if anything, understated — these aren't 'familiarity risks', they are specific collisions with two of the most-seen icons on earth, both owned by the same litigious company.

**Design craft (geometry & the 16px floor)** — ranking: D3 EV Monogram > D1 Executive Pulse Mark > D4 Enterprise Compass > D5 Enterprise Signal > D2 Value Orbit

> From the craft-and-scalability bench, the 16px floor is the whole ballgame and it sorts the field cleanly. The EV Monogram wins: its chunky uniform 6.5-unit letterforms keep 'EV' literally readable in the 16px tiles on both fields, and it is the only candidate that gains authority when the field inverts to light — its flaws (half-opacity bezel ghosting at mid sizes, the gold apex dot dropping at floor) are trims, not rebuilds. Pulse is the best-engineered geometry of the five — disciplined stroke gradation and the only coded small-size fallback in source — but at floor it decays into an anonymous bullseye in Apple Activity's accent. Compass is the finest hero drawing on the table and the best light-field dial, yet at 16px it melts to a gold fleck on a dark square and its silhouette ghosts Safari, which a master brand cannot afford. Signal survives small only by collapsing into a wifi glyph, and its opacity-ramped outer front washes out on light. Orbit — notably the direction closest to the shipped mark — simply fails the floor: sub-pixel ellipse strokes with no simplification logic produce a smudge at 16px, which for a mark that must live in favicons, tab bars, and app grids is disqualifying as executed.

**Executive buyer (premium, timeless, the engraving test)** — ranking: D3 EV Monogram > D4 Enterprise Compass > D1 Executive Pulse Mark > D5 Enterprise Signal > D2 Value Orbit

> From the buyer's chair the test is simple: which of these could be engraved on the boardroom door in 2036 without apology? Only the EV Monogram passes. Its crest logic is the register of firms that outlive their founders — the bezel-and-letterform still reads at 16px in the systems sheet, the gold apex point is restraint rather than ornament, and monograms as a device have three centuries of precedent behind them; the EV/electric-vehicle collision is a real diligence flag, but it is a naming problem, not a design one. The Compass is the runner-up — proper instrument austerity, and the gold needle is the best small-size recall element of the five — but a compass is every consultancy's metaphor and one icon-grid cell away from Apple's own; you cannot define a category with a borrowed heading. The Pulse is composed and Blackstone-quiet yet fatally leveraged against Apple Activity's consumer equity — fitness rings on a term sheet — and it will date precisely as fast as the wearable era that spawned it. The Signal is a Wi-Fi glyph in a nice suit, and the Orbit, whatever its hero-size elegance, dies at favicon scale and would come back from the engraver as a smudge. One direction here is an asset the firm could still hold in ten years; the other four are product icons.

**Intelligence semantics (what the pixels say, Palantir/NASA register)** — ranking: D5 Enterprise Signal > D4 Enterprise Compass > D2 Value Orbit > D1 Executive Pulse Mark > D3 EV Monogram

> Judged purely on what the pixels say to someone who never reads the rationale, only one candidate actually speaks the language of an Enterprise Intelligence OS: D5 Signal is a sentence — something emitted, something propagated, something detected and confirmed in gold — which is the Palantir/Anduril register verbatim, and its propagation motif is the natural visual vocabulary for the AI-presence layer (an ambient intelligence that pings, senses, and surfaces contacts). Compass is second because a needle locked NE at least asserts a decision, though it quotes Safari before it says anything about EVRO; Orbit has real trajectory semantics buried under an atom cliché and a 16px silhouette that self-destructs. Pulse and Monogram are the premium-but-mute end of the sheet: Pulse's telemetry claim literally disappears at icon sizes when the arcs close, leaving Apple Activity in Blackstone clothing, and the EV Monogram is a handsome crest that says electric vehicles, not enterprise intelligence. My caution on the winner: Signal's register is cold and its geometry flirts with Wi-Fi/RSS — as a master brand it needs the warmth of the product's movement side layered around it — but it is the only direction whose mark would still communicate 'sensing, detection, command' if every word of copy were deleted."

**Product systems (extensibility & coexistence with the Pulse Rings)** — ranking: D3 EV Monogram > D4 Enterprise Compass > D5 Enterprise Signal > D1 Executive Pulse Mark > D2 Value Orbit

> From a product and identity systems lens the decisive question is coexistence: EVRO already has a ring-based operating language shipped inside the product — the Pulse Orbital in Brand.jsx and the ring gauges heroed on both homepage concepts — so the master brand's job is to sign the company in a register the UI does not already speak. Only the EV Monogram does that outright: it survives to 16px as legible letterforms, System B's lockups demonstrate the crest-plus-quiet-wordmark architecture actually working, and its gold apex dot inherits the value-spark token so brand and operating language share grammar without sharing form; its weak native motion is the one gap, solvable with draw-on strokes. The Compass is the credible runner-up — the needle is the recall element at every rendered size and its NE lock rhymes with the shipped spark — but the app icon's Safari adjacency caps its ownability. Signal is distinct and motion-native but reads as rotated Wi-Fi at favicon scale and was never developed into a system. Pulse is well-engineered as a system (the sub-24px ring fallback is genuinely good icon craft) but is disqualified as master brand by direct collision with the in-product gauges, and Orbit is the non-choice: it re-ships the existing mark, fails at 16px, and the lab itself declined to build it a lockup.

### Pages verdict

| Concept | Value immediacy | Mobile purpose-built |
|---|---|---|
| L1 Enterprise Status First | 4 | 7 |
| L2 Mission Control First | 8 | 5 |
| L3 Enterprise Value First **(panel pick)** | 9 | 8 |

| Concept | Executive fit | Mobile purpose-built |
|---|---|---|
| H1 Executive Command Center **(panel pick)** | 7 | 4 |
| H2 Living Enterprise Dashboard | 6 | 8 |

- *L1 Enterprise Status First:* Cold read is a mood, not a value prop: '56' has no unit and 'Stable · Overcast' is internal vocabulary; the only dollar figure ('net momentum $3K/day') is the smallest text on the desktop comp. The phone is a real distillation though — ring + state + 'Enter →', watch-face-native — marred only by 'Stable · Overcast' wrapping to two lines.
- *L2 Mission Control First:* Desktop is the best explanation of what EVRO does: '32 missions · $16M at stake' plus three self-labeling money rows (Decisions on you 2 / Value at risk $4.83M / Top opportunity $2.64M) lands in 3 seconds. But the phone drops every dollar figure — '32 missions / 2 decisions on you' loses the pitch's strongest content — and the 'Command →' CTA visibly wraps onto two lines in the artboard.
- *L3 Enterprise Value First:* Fastest cold read: one giant green '$23M' + 'ENTERPRISE VALUE UNDER MANAGEMENT', with chips that visibly reconcile ($1.63M + $3.85M + $18M ≈ $23M) answering the follow-up question. The phone keeps exactly the hero number plus 'under management' and 'Enter →' — a textbook distillation where the one thing that matters survives intact as the hero.
- *H1 Executive Command Center:* Desktop structure is the operator-CEO's seat: vitals strip (◉56 · ☁ · $3K/d · 2 dec) → Queue → Decisions → Value bridge with real-proportioned bars. But the phone artboard is a crop, not a distillation: strip + one Queue skeleton floating over a frame that is more than half dead space, with Decisions and the Value bridge — the actionable heart — dropped entirely.
- *H2 Living Enterprise Dashboard:* Desktop is glanceable but action-free — '▼ 3 decelerating' and 'Q2 in season · 97' chips lead nowhere, so the CEO glances and then must leave. The phone comp is the best mobile artboard in either file: ring 56 + 'Overcast' + '$3K/day' reads as a complete, balanced status widget — purpose-built for the pocket, not adapted from desktop.

**Landing.** L3 Value First takes the landing: the $23M hero is both the fastest three-second cold read on desktop and the one phone distillation where the number that matters survives intact — L2 explains the product better but drops every dollar figure on mobile and wraps its CTA, while L1 leads with internal vocabulary ('Stable · Overcast') instead of a value proposition.

**Home.** H1 Command Center wins the home on the question that matters — the screen a CEO keeps open — with its vitals-strip → queue → decisions → value-bridge working seat, but its mobile must be rebuilt as a true distillation rather than the current half-empty crop, borrowing H2's ring-plus-state status widget, the best mobile artboard in either file.

**Pages judge's remark.** From the landing/mobile lens: L3 is the only landing that wins both criteria at once — the $23M hero is the fastest 3-second cold read on desktop AND the cleanest phone distillation (the hero number survives intact); L2 explains the product better but its phone drops all dollars and its CTA wraps. On homes I pick H1 despite its weak phone comp: the homepage question is 'the screen a CEO keeps open,' and H1's vitals-strip + queue + decisions + value-bridge is the working seat, whereas H2 is a beautiful widget with nothing to do — but H1's mobile must be rebuilt as a distillation (strip + decisions + top of queue), not shipped as the current half-empty crop; H2's phone widget is the pattern to steal for it.

## 7. Verdict

> The panel's call is the EV Monogram — first on mean (6.9), first on Borda (21), and the top pick of four of five lenses on the grounds that it is the only silhouette EVRO can own outright, still reads "EV" at 16px on both fields, and passes the engraving test. The Compass is the closest challenger (Borda 17), carried by the best small-size recall element on the sheet, but capped by its near-Safari silhouette. The honest caveat comes from the dissenting semantics lens: the monogram is premium but mute — a crest that says nothing about sensing or command, and in 2026 risks reading "electric vehicle" — a positioning drag the naming and system, not the drawing, must absorb.

**Coexistence.** The monogram result resolves the master-brand question cleanly: letterforms sign the company in a register the product does not already speak, leaving the Pulse Rings undisturbed as the in-product operating language, with the gold apex dot inheriting the value-spark token so brand and telemetry share grammar without sharing form — the exact separation that disqualified pulse and orbit, which would have dissolved into their own gauges.

**What this decides — and what it doesn't.** The verdict is advisory. The
shipped Pulse Orbital remains the production identity; nothing in the app's
chrome, favicon or lockups changes on the strength of this exploration. What
the panel gives the eventual re-brand decision is a ranked, argued option
set: a winner (the EV Monogram) with a named weakness to design against
(semantic muteness, and the "EV = electric vehicle" 2026 read), a challenger
(the Compass) with a named ceiling (the Safari-adjacent silhouette), and a
recorded dissent (the semantics lens's case for the Signal) that any future
brand work should re-read before committing.

## 8. Provenance & honesty notes

- The panel ran **once**, during Phase 6C.1A, against the rendered artifacts
  (the direction cards and scale rows, the systems sheet, the page-concept
  artboards). The judges and the chair were **AI agents** — six independently
  prompted persona lenses plus a synthesis constrained to their outputs — not
  human consultants; the exercise is editorial, not user research. Its
  aggregates and synthesis (the criterion means, Borda points, top picks and
  the chair's prose) are stored verbatim in
  `frontend/src/lib/identity-verdict.js`; the complete raw panel output —
  every per-judge score, ranking, note and remark — is committed at
  `docs/EVRO_6C1A_panel_result.json`, so the means are independently
  auditable. Rendered on the Identity Lab page labelled "advisory · recorded
  judgment"; not live analytics and not a live product "AI" feature.
- Figures quoted in the panel's notes and verdict (e.g. "the $23M hero",
  "$3K/day") are as the artboards rendered at panel time; the concepts
  recompute from the live portfolio and may since have moved.
- Every number in the page-concept artboards is computed from the live
  portfolio (energy, weather, value velocity, mission queue, control-tower
  value at risk, momentum counts, season score, and the value bridge — whose
  bars are scaled from `enterpriseRollup().bridge`).
- All lab motion honors `prefers-reduced-motion`. No wall-clock time and no
  randomness anywhere in the lab; the panel data is a constant.
- The deterministic engine (`engine.js`, client and server mirrors) is
  untouched by this phase, as it has been since Phase 3A.
