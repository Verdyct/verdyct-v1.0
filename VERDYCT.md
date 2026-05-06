# Verdyct — Master Context File
*Last updated: May 2026. Upload this file to your Claude Project so every conversation starts with full context.*

---

## 1. Who we are

**Julius Peschard** — Co-Founder, Frontend & Design. 18 years old. Full-stack developer specialising in UI/UX, brand identity, and frontend engineering (Next.js, Tailwind, TypeScript, Figma). Leads product design, user experience, and client-facing architecture. Email: julius@verdyct.io

**Issa Prunier** — Co-Founder, Backend & AI. 18 years old. Python developer specialising in backend systems, LLM integration, and AI pipeline architecture. Leads document parsing engine, HS code intelligence, and CBAM automation logic. Email: issa@verdyct.io

Both are first-year Computer Science students at Université de Caen Normandie. Both went full-time on Verdyct from May 1st 2026.

---

## 2. What Verdyct is

**One sentence:** Verdyct is the daily operating system for independent French customs brokers — turning 45 minutes of manual paperwork per dossier into 90 seconds of validation.

**The right mental model:** Verdyct is not a PDF parser with AI bolted on. It is the broker's business information system — a structured memory of every dossier ever processed, connected to an intelligent suggestion engine, with AI as a last resort when memory runs out.

The best analogy: an assistant who has worked with the broker for 10 years. When importateur Renault orders stainless bolts from India, the assistant says: "We've done this dossier 47 times — here's the code, here's the regime, declaration is ready, validate in 5 seconds." When a genuinely new product arrives, the assistant researches the official nomenclature, proposes 2-3 options with reasoning and sources, and asks the broker (or the importateur via automated email) for the missing information.

**The AI is not the hero. The memory is the hero. AI is the last resort.**

---

## 3. The problem we solve

Independent customs brokers process 20–50 dossiers per day using 30-year-old software. Every shipment requires:

- Manually parsing 5+ disconnected PDFs (invoice, packing list, bill of lading, certificate of origin)
- Navigating 17,000+ TARIC codes without intelligent search
- Manually typing extracted data into DELTA and government portals — every single dossier
- Losing 60 minutes/day answering "Where is my cargo?" status emails
- Managing CBAM (Carbon Border Adjustment Mechanism) compliance with no proper tooling

**The average file takes 45 minutes. Verdyct brings it to 90 seconds.**

The five validated pain points (confirmed independently by two senior industry experts):
1. Document fragmentation — manually parsing 5+ PDFs per shipment
2. The rekeying loop — manually typing data into DELTA government portals
3. Classification fatigue — 17,000+ TARIC codes with no intelligent search
4. Status call fatigue — 60 min/day answering cargo status emails
5. The CBAM crisis — regulation live January 2026, no SME tool exists
6. Email conflicts — client sends wrong HS code then corrects it; current tools don't detect the contradiction

---

## 4. Our target customer

**Primary:** Independent commissionnaire en douane (customs broker) — 1 to 5 employees, no enterprise IT infrastructure. There are approximately 15,000 such firms in France.

**Not:** Large freight forwarders (Nabu's market), enterprise shippers (MyTower's market), or large logistics operators (Géodis, CEVA, etc.).

**Why they are underserved:** Conex (the 30-year incumbent) has enterprise pricing and weeks of onboarding. Nabu requires existing IT infrastructure. Neither can serve a 2-person broker firm that needs to be live in one day.

---

## 5. The product

### The suggestion cascade (core logic)
For every line item in a dossier, the system searches in this order:

1. **Broker history first** — "This product, this client, we've done it 47 times. Code HS 7318.15.95, 100% accepted by customs." Broker validates in one click.
2. **Official rules second** — TARIC database, CN8 nomenclature, public BTI records. Suggestion with cited source.
3. **Claude AI last resort** — For genuinely new products. Proposes 2-3 codes with reasoning. If it can't decide, asks a structured question: "To choose the right code, I need to know: does the machine cut by laser or mechanical press?"

### How a dossier arrives (3 channels)
1. **Email forward** — importateur sends email with PDFs attached. Broker forwards to their personal Verdyct address (dossiers+broker123@in.verdyct.fr). Dossier auto-creates, attachments attached, sender identified.
2. **Direct upload** — broker uploads files from their computer
3. **Manual entry** — broker types information directly (for phone calls with clients)

### Key features
- **Multi-format ingestion** — PDF, Excel, scanned images, email attachments. Most tools only do PDF. Confirmed differentiator by CEVA Super Key User.
- **Context input field** — Before processing, broker adds context: "Client always uses DAP, steel grade S355, Germany origin." AI goes from 95% to 100% accuracy. No competitor has this. This is Verdyct's proprietary moat.
- **Coherence checking** — A second AI pass reviews all extracted fields and flags inconsistencies: weight mismatches, value anomalies, HS code vs product description. Confirmed missing from all incumbent tools by both expert calls independently.
- **Email conflict detection** — Detects when a client sends contradictory HS codes across multiple emails. Identified by CEVA Super Key User.
- **CBAM compliance** — Auto-detects CBAM-applicable shipments from HS code + origin. Badge fires automatically. Future: calculates embedded carbon, exports EU registry XML format.
- **Source transparency** — Every suggestion shows where it came from: broker history (green badge), official rules (blue badge), AI (orange badge). Brokers sign declarations legally — they need to understand, not just click.
- **Automated relance** — When information is missing, Verdyct generates a professional pre-filled email to the importateur. Broker clicks send. When importateur replies, Verdyct re-parses and completes the dossier.
- **Audit trail** — Every decision logged: who (broker or AI), when, on what source. Exportable as PDF for customs control 18 months later.
- **Client portal** — Broker generates unique read-only link for each client. Client sees their shipments, statuses, CBAM flags. Viral growth engine.
- **Importateur fiche** — Not just a directory. Shows: total dossiers, customs acceptance rate, recurring products with usual HS codes, BTI records, contact history.

### UI/UX principles
- Always show the source — no suggestion without provenance
- History before AI — green (history) always displayed more prominently than orange (AI)
- Optimise for click, not typing — broker should handle 90% of dossiers without typing
- Information density — this is a professional work tool, not a consumer app. 12 useful pieces of information visible at once beats 4 tabs of hidden data.
- Sober, professional tone — no gamification, no emojis, no "Bravo!" messages

---

## 6. Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + Tailwind CSS |
| Backend / DB | Supabase (auth + database + storage) |
| AI | Claude API (Anthropic) — parsing, classification, coherence |
| Hosting | Vercel |
| Payments | Stripe |
| Email | Zoho Mail — julius@verdyct.io / issa@verdyct.io |
| Domain | verdyct.io (Namecheap) |

The product UI is in French. The codebase and comments are in English.

---

## 7. Pricing

| Plan | Price | Users | Key features |
|------|-------|-------|-------------|
| Starter | €149/mo | 1 | AI doc parsing, HS codes, dashboard, unlimited shipments |
| Pro (most popular) | €249/mo | 3 | Everything + CBAM module, client portal, invoice reconciliation |
| Team | €499/mo | 10 | Everything + AI email agent, custom branding, priority support |

Gross margin: >90%. Infrastructure cost <€100/mo at 50 customers. No sales team required to close Starter and Pro.

Launch pricing (May 2026): 50% off first month to acquire first paying customers. €74 instead of €149.

---

## 8. Market

| Segment | Size | Notes |
|---------|------|-------|
| TAM | €2.2B | Global Customs Software, growing to €5.8B by 2033 |
| SAM | €60M | France & Benelux — 20,000 SME brokers × €2,988/yr |
| Year 1 Target | €540K | 180 brokers × €249/mo × 12 |
| EU Expansion | €800M | 27 EU states, same CBAM framework |

Market growing at 10.2% annually driven by CBAM, EU Single Window reform, and post-Brexit complexity.

---

## 9. Competitive landscape

### Conex — critical incumbent
30-year French incumbent. Controls ~2/3 of the French broker market. Has AI (ZEN + ALBA) bolted onto legacy architecture. **No CBAM module.** Enterprise pricing. Weeks of onboarding. Key line: "Conex has AI. It just takes weeks of onboarding and enterprise pricing to access it."

### Nabu — most direct competitor
French AI customs startup, founded 2018 Strasbourg. Raised €3M March 2026 (Getlink, Maersk Growth, Techstars). Processes emails, PDFs, Excel. Partnership with Akanea. **Critical weakness: Nabu is middleware.** It plugs INTO existing customs software via API/EDI/SFTP. Requires enterprise IT infrastructure. Cannot serve independent SME brokers who have no existing system. Their tagline: "your declarants have enough tools" — our target customer does NOT have enough tools.

### Akanea — legacy incumbent
30+ years, DGDDI certified, 500+ clients. Legacy architecture. Partnership with Nabu.

### Digicust — European comparable
Austrian, €4.84M raised, 60+ clients, 500K+ declarations. DACH focus. Most comparable AI-native product but targeting German-speaking markets. Founded 2020, first VC raise only in 2023. Validates that investors write cheques for AI-native customs automation.

### Our positioning in one sentence
**Nabu sells to established transitaires with IT infrastructure. Verdyct IS the infrastructure — for the independent SME broker who has nothing and needs everything in one place, live in one day.**

---

## 10. Traction (as of May 2026)

- 300+ broker conversations initiated via LinkedIn
- 3 confirmed beta testers (target: 10 before June)
- €0 raised
- MVP live on Vercel (real Claude API integration in progress — Week 1 of May sprint)
- 2 independent expert calls — both confirmed same 5 product gaps without knowing each other's answers
- Pitch deck submitted to Deel London pitch (April 28, 2026)

---

## 11. Expert relationships

### Houda Zebar
Solutions architect, 10 years customs experience, independent consultant, 1.8K LinkedIn. Offered to advise Verdyct. Has contacts at Géodis, Géotrans, CEVA, RDE networks, MACF lawyers. Key insights from her call: CBAM is "un peu le brouillard" — no real tools exist. All-in-one is the gap. Source transparency is non-negotiable. Coherence checking is the most important feature missing from ZEN (Conex). Status: pending formalisation as advisor (free access + revenue share if she brings clients).

### Super Key User @ CEVA (Nord-Normandie)
Digitalization/automation lead. IT-focused. Demo well received: "c'est pas mal, c'est un bon début." Key insights: multi-format is genuinely rare and a real differentiator. Context input field is essential. Agentic AI should propose solutions, not just flag problems. Email conflict detection was his specific insight. Said he will follow up on Verdyct's progress.

**What both experts confirmed independently (treat as product gospel):**
All-in-one is the gap. Coherence checking is missing from current tools. Source transparency is non-negotiable. Context input is essential for AI reliability. Multi-format is a real differentiator.

---

## 12. Fundraising

**Fund allocation:**
- 40% Product (ship MVP, CBAM module, client portal)
- 35% GTM (dedicated outreach, first sales hire, ODASCE partnership)
- 25% Infrastructure & legal (incorporation, Stripe billing, cloud costs)

**Target milestones:** 50 paying customers · €10K MRR · 18 months runway

**Wave 1 VCs:** Partech, Axeleo, Antler, Breega, Alven, Serena, Speedinvest, Eurazeo, 360 Capital, Runa

**Key warm lead:** Elise Stern at Eurazeo (estern@eurazeo.com) — saw deck via Deel submission

**Programs:** Station F (top priority), BPI Tremplin (€30K grant), BPI Aide à l'Innovation (€30K non-dilutive), Kima Ventures, YC autumn batch, Techstars Paris

**Fundraising timing:** Wait until 1–2 paying customers before serious conversations. One paying customer transforms the narrative completely.

---

## 13. Product roadmap

### Q2 2026 — Ship. Charge. Learn. (May–June)
**Week 1 (May 1–7):** Claude API live, Supabase auth, Stripe billing, frontend wired to real API
**Week 2 (May 8–14):** Multi-format ingestion (Excel, email, images), context input field
**Week 3 (May 15–21):** Coherence checking engine, email conflict detection, CBAM auto-detection
**Week 4 (May 22–31):** Client portal, bulk upload queue, HS classifier standalone
**The one number:** ONE paying customer by May 31st

### Q3 2026 — Grow. Retain. Raise. (July–September)
Memory engine live, importateur fiche, audit trail, automated relance, ODASCE partnership, 10 paying customers, €2,500 MRR, resume VC conversations

### Q4 2026 — Scale the Moat. (October–December)
Full CBAM module with EU XML export, learning loop, 50 paying customers, €10K MRR, close €300K–€500K seed round

### Q1 2027 — Own France. Plan Europe.
Benelux preparation, Verdyct API for freight forwarders, 180 customers, €40K MRR, Series A conversations

---

## 14. GTM & outreach

**Outreach message (current — paid framing, May 2026 onward):**
> Objet: Verdyct — automatisez vos déclarations douanières dès aujourd'hui
> Bonjour [Prénom], je développe Verdyct, un outil IA qui traite vos documents douaniers en 2 minutes — classification SH, conformité CBAM, détection de conflits inclus. On lance cette semaine. Premier mois à 50% — €74 au lieu de €149. Est-ce que je peux vous montrer en 10 minutes ? Julius — verdyct.io

**Lead sources:**
- LinkedIn personal outreach (20 messages/day Julius + 10/day Issa)
- Pappers.fr NAF code 5229B — public registry of all French customs broker firms
- FullEnrich — 300 free credits for finding email addresses from company data
- ODASCE — broker association email blast (send mid-May when product is live)
- CDAF, AUTF, SITL event, French customs LinkedIn groups

**LinkedIn content strategy:**
- 3x/week on Julius personal page, 1x/week on Verdyct company page
- Format 1: insight post from broker conversations
- Format 2: build-in-public weekly update
- Format 3: problem post explaining the 45-minute legacy tax in plain language
- Format 4: social proof when beta testers give positive feedback
- Batch write Sunday evening, schedule for the week

---

## 15. Key strategic decisions (locked)

**Primary customer:** Independent SME commissionnaire en douane, 1–5 people, no enterprise IT. NOT large freight forwarders, NOT enterprise shippers.

**Language:** French UI for brokers. English for all investor/external communications. Bilingual by design, French first in execution.

**Geography:** France first (12 months) → Benelux (18 months) → UK (24 months). Don't spread before owning France.

**Product scope:** Pre-declaration workflow ONLY. Not declaration submission (that's DELTA/Conex territory). Not full TMS. Raw documents → reviewed, coherence-checked dossier ready for declaration.

**Nabu response:** We are the standalone product. Nabu is the middleware. "Verdyct IS the infrastructure for brokers who have nothing else. Nabu requires infrastructure you already have."

**CBAM positioning:** CBAM gets us in the door (acquisition hook). The memory system makes brokers stay (retention moat). Use each in the right context.

**Fundraising timing:** Pre-seed €300K. Wait until 1–2 paying customers before serious conversations.

---

## 16. Glossary (customs domain)

| Term | Definition |
|------|-----------|
| Code HS / TARIC | 8–10 digit code classifying every product. 17,000+ options. Wrong code = audit + fine. |
| Régime douanier | Type of customs operation. Main ones: 40 (standard import), 42 (import + intra-EU delivery), 71 (warehouse entry) |
| DELTA-G / DELTA-X | Official French customs portals where declarations are submitted. Manual, slow, ugly. |
| BTI | Binding Tariff Information — official customs ruling fixing the HS code for a specific product. Valid 3 years. Legal defence in audits. |
| EORI | European customs identification number. Equivalent of SIREN for import/export. |
| EUR.1 / REX | Certificates proving preferential origin of a product (reduced customs duties under trade agreements) |
| CBAM | Carbon Border Adjustment Mechanism. EU law live January 2026. Steel, aluminium, cement, fertilisers, hydrogen importers must declare embedded carbon and buy certificates. Verdyct's commercial Trojan horse. |
| Commissionnaire en douane | Verdyct's user. SME (1–50 people usually) handling customs declarations on behalf of importers/exporters. 15,000 in France. |
| Dossier | One shipment/declaration file. Contains all documents for one import or export operation. |
| Importateur | The broker's client — the company importing goods that needs customs clearance. |
| Déclaration en douane | The official customs declaration submitted to DELTA. This is what the broker produces. |

---
