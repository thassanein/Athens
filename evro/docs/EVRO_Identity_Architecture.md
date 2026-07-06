# EVRO Identity Architecture — the 6C.1B convergence record

**Phase:** 6C.1B · **Status:** shipped · **Supersedes:** the master-brand sections of
`EVRO_Brand_Guidelines.md` (v2.0); tokens, typography, symbols and signature moments
in that document remain current.

The living version of everything here renders inside the product:
**Reference → Identity** (the architecture, live), **Reference → Brand** (the master
system + manifesto), **Reference → Identity Lab** (the 6C.1A exploration that led here).

---

## 1. The strategic realization

6C.1A proved EVRO does not have one identity — it has **layers with different
psychological, functional and operating jobs**. 6C.1 had made the Pulse Rings the
master brand; the 6C.1A panel showed why that conflates two jobs: the mark that signs
the company should not be the mark that gauges its state. The question the brief
posed — can EVRO run multiple coordinated identity systems the way Apple runs the
logo, Activity Rings and system iconography — is answered by this architecture.

## 2. The four layers

| # | Layer | Mark | Says | Lives in |
|---|---|---|---|---|
| 1 | **Master Brand** | EV Monogram | premium · ownership · timelessness | chrome, favicon, covers, ceremony |
| 2 | **Operating Identity** | Enterprise Compass | command · navigation · strategy | mission control, navigation, heading |
| 3 | **Enterprise State** | Pulse Rings | energy · health · momentum | gauges and vitals — the operating language |
| 4 | **AI Identity** | Enterprise Signal | sensing · intelligence · telemetry | AI presence, predictions, orchestration |

### Layer 1 — Master Brand (`components/Identity.jsx`)

The EV Monogram, chosen by the 6C.1A panel (6.9 mean, Borda 21, four of five first
picks) and refined against its two named weaknesses:

- **Size-aware geometry.** Below 28px the bezel drops, letterforms thicken (stroke
  6.8 → 8) and the gold apex grows (r 5.2 → 6), so "EV" stays literally readable at
  16px. The 16px tile *is* the favicon, verbatim.
- **Semantic muteness** is carried by the system, not the drawing: the gold apex is
  the shared value-spark token — the one point of grammar the brand shares with the
  Pulse layer.

Variants: primary · light field · luxury gold-line · engraved · embossed · mono.
Lockups: horizontal (chrome) and vertical (ceremony/boardroom). Promoted across the
product in Wave 1: NavBar, app-loading, Signature welcome, Landing lockup, favicon.
Rules: never tilted beyond its built-in italic; apex always gold on brand surfaces;
motion is a glint on the apex only — the master brand does not dance.

### Layer 2 — Operating Identity (`components/IdentitySystems.jsx` · CompassSymbol)

The Enterprise Compass, evolved from 6C.1A Direction 4 into the operating symbol.
Its states are not theatre — they read the actual mission queue
(`lib/identity-systems.js` · compassIdentity):

- **orient** — decisions open: the gold needle searches until a heading is chosen
- **locked** — a ranked mission leads with nothing undecided: the needle commits NE
- **idle** — the queue is clear: the needle rests in ink

Rules: moves only when the decision state moves; the needle is the recall element;
gold means a heading is in play.

### Layer 3 — Enterprise State (`components/IdentitySystems.jsx` · PulseRings)

The Pulse Rings, formalized as the brief's five named gauges. Each ring's sweep IS
its live score; the formula is carried on the ring; each dimension is fed by the
engine that already owns it:

| Ring | Source | Formula |
|---|---|---|
| Energy | 6B energy engine | 45% health + 30% pulse + 25% delivery pace |
| Momentum | 6B momentum engine | units accelerating or steady ÷ all units (2-month windows) |
| Health | health score | weighted blend of the six enterprise-health dimensions |
| Risk containment | mission health | 1 − value at risk ÷ (RA pipeline + value at risk) |
| Transformation | mission health | RA value in realizing stages ÷ active RA value |

Behaviors: **desktop** — the full five-ring stack; **mobile** — the Energy gauge
carries the core score, the other four collapse to chips. A zero score renders an
empty track, never a fake dot. The rings gauge; they never sign.

### Layer 4 — AI Identity (`components/IdentitySystems.jsx` · SignalGlyph)

The Enterprise Signal, from 6C.1A Direction 5 — the semantics lens's dissenting
winner, given the job it argued for. States from the real AI-presence layer plus the
mission queue (signalIdentity):

- **sensing** — the fronts propagate: agents sweeping the live record
- **orchestrating** — sensing plus the confirmed gold contact: missions ranked and moving
- **idle** — documented for completeness; a live enterprise rarely rests

The AI is deterministic and rules-based, and the identity says so. The signal may
annotate any surface; it never replaces the layer it annotates and never carries
state colour — the gold contact is its only accent.

## 3. The interaction rules

**Hierarchy** — the master signs → the compass orients → the rings gauge → the
signal senses. **Coexistence** — one layer leads per surface; the mark that signs is
never the mark that gauges (the 6C.1 lesson, made law); gold is the only crossing
token (the master's apex, the compass's needle, the signal's contact — one value
spark, three jobs); the compass never sits inside a ring stack; the signal never
carries state colour. **Transitions** — the loop: signal detects → compass orients →
decision journals → rings move → state hands back to the signal for the next sweep.
The master never participates in the loop; it presides over it.

## 4. The motion identity

| Layer | Verbs | Law |
|---|---|---|
| Master Brand | glint | the signature never breathes, never travels |
| Compass | orient · lock | moves only when the decision state moves |
| Pulse Rings | breathe · sweep | ambient only where the enterprise is live |
| Signal | propagate · contact | event-driven — moves when it senses, never to look busy |

Laws: one moving layer per surface (motion hierarchy follows identity hierarchy);
transform and opacity only, glow's low-frequency ceremony exception honoured;
prefers-reduced-motion mandatory — under reduce every state rests in its final pose;
motion must mean something, never decoration.

## 5. The convergence surfaces

- **Landing (definitive):** the 6C.1A pages verdict executed — the winning Value
  First structure ($23M EVUM hero, reconciling chips) plus the Enterprise Status
  band the panel praised in L1: compact Energy gauge, state, weather, net momentum —
  the enterprise, live, before you even enter. The landing is a fixed dark surface,
  so its palette is pinned (the comp-artboard convention).
- **Homepage (converged):** Mission Control's vitals strip — already the Command
  Center's density with the breathing Energy ring — absorbed the Living Enterprise
  layer: live momentum chips and the season chip.
- **Mobile identity:** the strip distills instead of cropping — gauge + state +
  weather + created/net + chips; deeper telemetry (leaking, needed-to-land, FY
  projection, sparkline) stays on desktop. The layers stack by rank on mobile:
  signature in chrome, rings compact to one gauge plus chips.

## 6. The emotional language

Five registers, and nothing outside them: **calm authority** (the master brand, the
boardroom lockup, the type hierarchy) · **earned confidence** (numbers that
reconcile, provenance on every claim, formulas on every ring) · **quiet urgency**
(weather, the risk ring, the alert line — felt, never shouted) · **momentum**
(velocity telemetry, momentum chips, the breathing gauge) · **ceremony** (seasons,
celebrations, the vertical lockup — rare by design).

The manifesto closes: *"Four systems, one identity: the monogram signs, the compass
orients, the rings gauge, the signal senses. Nothing decorative, nothing borrowed,
nothing that lies."*

## 7. Provenance & verification

- Lineage: 6C.1 shipped the Pulse Orbital as master brand → the 6C.1A panel (six AI
  judges, recorded verdict, `EVRO_6C1A_panel_result.json`) ranked the EV Monogram
  first and the pages verdict named the winning landing/homepage structures → 6C.1B
  converged on that architecture in four waves (master system + promotion; operating
  systems + rules; convergence surfaces + mobile; motion + manifesto + this record).
- Every state and score in the identity systems is computed from the live portfolio
  (`lib/identity-systems.js` composes existing engine and 6B-engine exports; nothing
  is invented for the visuals). The deterministic engine itself is untouched, as it
  has been since Phase 3A.
- Every wave was verified in both themes and both form factors with zero page
  errors before commit; the fixed dark surfaces (SVG tile fields, comp artboards,
  the landing) pin their palettes so the theme toggle cannot flip their ink.
