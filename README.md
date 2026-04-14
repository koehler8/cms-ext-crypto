# Presale Extension

Composable presale deck that powers the Status/Buy/Stake surface, social proof, curiosity teaser, and admin console for on-chain launches. The bundle keeps every presale-focused component, schema, and helper code under `extensions/presale` so marketing-only sites can omit it entirely while token launches only update a single folder.

## Requirements
- `VITE_TOKEN`, `VITE_REGISTRY_ADDRESS`, `VITE_RPC_READ` – required for contract discovery and read-only widgets.
- `VITE_REOWN_PROJECT_ID` – enables Reown AppKit (wallet connect banner, modal, admin panel). When missing, wallet CTAs stay hidden and presale cards short-circuit.
- Shared ABIs live in `abis/Presale.abi.json` and `abis/TokenStandard.abi.json`; update them when the on-chain interface changes.

## Usage
Add the bundle to a page via the object syntax:

```json
"components": [
  "Header",
  { "name": "Presale", "source": "presale" },
  "Footer"
]
```

Individual modules (Hero, Momentum card, Curiosity teaser, etc.) can be referenced the same way if you only need a subset:

```json
{ "name": "HeroPresale", "source": "presale" }
```

## Component Catalog

| Component | Module | Config Key | Allowed Pages | Purpose |
|-----------|--------|------------|---------------|---------|
| `Presale` | `components/Presale.vue` | `presale` | `home` | Wrapper that mounts `Status`, `Buy`, and `Stake` cards plus FAQ inside the standard `.ui-section` container. |
| `PresaleFaq` | `components/PresaleFaq.vue` | `presale` | `home` | Accordion that renders `presale.faq` entries with analytics instrumentation. |
| `MomentumCard` | `components/presale/MomentumCard.vue` | `presale` | `home` | Standalone progress/momentum card that mirrors the live presale pulse stats (`progressFomo`). |
| `HeroPresale` | `components/HeroPresale.vue` | `heroPresale` | Any | Presale hero variant with badge, CTA pair, optional secondary list, and smooth scroll into the buy widget. |
| `ProgressFomo` | `components/ProgressFomo.vue` | `progressFomo` | Any | Edge-to-edge card with allocation progress, animated fuse meter, and price schedule sidebar. |
| `CuriosityTeaser` | `components/CuriosityTeaser.vue` | `curiosityTeaser` | `home` | Secret-drop teaser with modal CTA, highlights, and community links. |
| `SocialProofFeed` | `components/SocialProofFeed.vue` | `socialProof` | Any | Carousel of curated posts/testimonials plus share CTA and optional live community counter. |
| `Tokenomics` | `components/Tokenomics.vue` | `tokenomics` | Any | Doughnut chart + allocation table driven by Chart.js, respecting `tokenomicsHeading` / `tokenomicsIntro`. |
| `Trust` | `components/Trust.vue` | `trust` | Any | Trust signals grid with partners, audits, and highlight badges. |
| `TrustBar` | `components/TrustBar.vue` | `trustBar` | Any | Sticky contract strip with copy-to-clipboard, audit links, and verification CTAs. |
| `CommunityStrip` | `components/CommunityStrip.vue` | `communityStrip` | Any | Social proof rail with social badges and optional email capture endpoint. |
| `PresaleAdmin` | `components/PresaleAdmin.vue` | `presaleAdmin` | `admin` | Operator console for price overrides, APY, treasury actions, and maintenance flags. |

The `Presale` wrapper auto-registers sub-components via `import.meta.glob`, so adding new cards only requires creating the Vue file and referencing it in site config.

## Configuration Reference

### Core `presale` Block
Defines strings for `Status.vue`, `Buy.vue`, `Stake.vue`, FAQ entries, helper cards, onboarding overlays, and celebration modals. All keys live under `pages.<slug>.content.presale` (or `shared.content.presale`) and support locale overrides.

- `panelTitles.buy|stake|status` – card headings.
- `statusCopy.priceContext`, `countdownPendingLabel`, `timeEndingLabel`, `timeEndedLabel` – countdown and KPI copy for `Status.vue`.
- `personalPurchasedLabel`, `personalStakedLabel`, `personalStakeableLabel`, `personalRewardsLabel` – wallet-connected summary cards.
- `helperSurfaces.howItWorks` / `helperSurfaces.needEth` – toggles plus titles/links for the helper cards beside the buy widget.
- `benefits` (`presaleBenefits`) – eyebrow/title/items[]/cta object rendered in `HoldersBenefits`.
- `bonusIncentive` – early-buyer badge (enabled flag, copy, counts, CTA, countdown).
- `onboarding` – controls first-time overlay (delay, skip mobile, steps[], CTA copy, storage key).
- `secondaryCtas.links[]`, `secondaryCtas.emailSignup.*` – link stack and optional email capture below the buy card.
- `needEth.*` – modal copy plus resource links for acquiring ETH.
- `successCelebration.*` – post-purchase modal headline/body/cta strings with `{tokens}`, `{tokenSymbol}`, `{amount}`, `{asset}` substitutions.
- `faq[]` – entries with `id`, `question`, `answer`, optional analytics label (used by `PresaleFaq`).
- `presaleAdmin.*` – localized titles, CTA labels, and helper copy for the `/admin` console.

### Hero & Sticky CTA
- `heroPresale` – badge/headline/subheadline, `primaryCta`, `secondaryActions[]`, optional `connectLabel`, `backgroundImage`, `backgroundWidths`.
- `promo.actions[].style` shares the same palette tokens so marketing and presale CTAs stay aligned (`dark`/`primary`, `light`/`secondary`, `link`).
- `stickyCta` – label/target for the mobile-only CTA bar (use `#centerPresale` / `#rightPresale` to focus tabs).

### Progress & Momentum
- `progressFomo.enabled`, `totalAllocation`, `soldAmount`, `uniqueBuyers`, `nextPhaseTimestamp`, `showFuse`, `animates`.
- `progressFomo.title`, `caption`, `priceSchedule[]`, `priceScheduleTitle`, `priceScheduleSubtitle`.
- `presale.priceTimeline.entries[]` feeds `PriceTimeline.vue` when you need a text-only schedule.

### Social & Community Surfaces
- `socialProof` – badge/title/subtitle, `share` payload (`tweetText`, `url`, `hashtags`, `utm`), optional `community` counter with `endpoint`, `refreshMinutes`, `label`, `count`, `daily`, and `posts[]`.
- `communityStrip` – `title`, `subtitle`, `socials[]` (`label`, `href`, `count`, `icon?`, `cta?`) plus optional `email` form config (endpoint/method/fields/success/error copy).
- `curiosityTeaser` – `enabled`, `eyebrow`, `headline`, `description`, `disclaimer`, `cta` (link vs modal), `modal` block (title, lead, highlights[], reward code, CTA), and `community` link list.

### Tokenomics & Trust
- `tokenomicsHeading`, `tokenomicsIntro`, `tokenomics.sections[]` – drive the donut chart/table.
- `trust` – heading, description, `items[]` (icon, title, description, CTA, badges).
- `trustBar` – contract address, network label, CTA list, audit metadata.

### Admin & Routing
- `/admin` automatically mounts `PresaleAdmin` when `{ "name": "PresaleAdmin", "source": "presale" }` appears in `pages.admin.components`.
- Ensure `vite.config.js` loads the same site slug so the registry resolves the correct on-chain addresses.

## Architecture Notes
- `Status.vue`, `Buy.vue`, and `Stake.vue` share the same presale pulse object; updates to one surface propagate to the others without duplicate RPC calls.
- `Buy.vue` caches price snapshots, auto-renders a connect banner backed by AppKit, persists pending tx hashes in `sessionStorage`, and resumes the spinner after reloads.
- `Stake.vue` clears personal metrics on disconnect to avoid stale balances.
- Layout utilities (`.ui-card`, `.ui-section--stacked`, `.brand-card`) live in `src/styles/base.css` and keep presale cards aligned with the rest of the marketing grid.
- Skeleton loaders and motion-heavy surfaces (`ProgressFomo`, `FuseMeter`, `HeroPresale`) respect `prefers-reduced-motion`.

## Analytics

### Presale Funnel (`trackFunnelEvent`)

#### Wallet Connection

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `wallet_connect_initiated` | Primary connect CTA and quick connector chips in `presale/Buy.vue` | `wallet_provider` (`appkit`, `metamask`, `walletconnect`, `coinbase`), `source` (`primary_button`, `quick_connect`). A matching `trackEvent('wallet_connect_initiated')` also records `token` and `connector`. |
| `wallet_connect_clicked` | Same surfaces as above (immediately after the CTA is pressed) | `wallet_provider`, `source` |
| `wallet_connected` | When the wallet resolves accounts successfully (header wallet CTA or `presale/Buy.vue`) | `wallet_provider`, `accounts_connected`, `chain_id` (when resolved), `source` (`header`, `buy_widget`) |
| `wallet_connected_success` | Helper emission after `wallet_connected` for downstream funnels | Same payload as `wallet_connected` |

#### Purchase Lifecycle

All purchase events extend `buildPurchaseAnalyticsPayload(flow, ethAmount, tokenAmount)` which includes: `flow` (`buy`, `buy_and_stake`), `token_symbol`, `buy_mode` (`buy_only`, `buy_stake`), `stake_included` (boolean), `purchase_amount_eth`, `purchase_amount_usd` (when price available), `purchase_amount_token`, `tokens_bought`, `value`, `currency`.

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `purchase_initiated` | Immediately before `buyTokens` or `buyAndStakeTokens` submits a transaction | Purchase payload |
| `purchase_attempt` | Same moment as `purchase_initiated` (pre-flight marker) | Purchase payload |
| `purchase_success` | After the receipt resolves (buy or buy+stake) | Purchase payload plus `transaction_hash` |
| `purchase_completed` | Mirrors `purchase_success` for GA funnels | Purchase payload plus `transaction_hash` |
| `purchase_failed` | When the flow is blocked or rejected | Purchase payload plus `reason` (`rejected_by_user`, `insufficient_funds`, `wrong_network`, `error`), optional `error_code`, `error_name` |
| `purchase_error` | When a contract call throws | Purchase payload plus `error_code`, `error_name` |

#### Stake Lifecycle

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `stake_initiated` | Auto stake branch inside `buyAndStakeTokens` and manual stake CTA in `presale/Stake.vue` | `stake_type` (`auto_buy_and_stake`, `manual`), `token_symbol`, optional `stake_amount_token` |
| `stake_attempt` | Same moment as `stake_initiated` | Stake payload |
| `stake_success` | When staking succeeds | Stake payload plus `transaction_hash` |
| `stake_completed` | Mirrors `stake_success` for GA funnels | Stake payload plus `transaction_hash` |
| `stake_failed` | When staking fails | Stake payload plus `reason` (`error`), optional `error_code`, `error_name` |
| `stake_error` | Error helper for stake failures | Stake payload plus `error_code`, `error_name` |

### Presale UI Events (`trackEvent`)

#### Buy & Buy+Stake Attempts

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `wallet_connect_initiated` | Connect CTA / quick connectors in `presale/Buy.vue` (standard GA event that mirrors the funnel emission) | `token`, `connector`, `source` |
| `presale_buy_blocked` | Validation guard inside `buyTokens` | `token`, `reason` (`invalid_amount`) |
| `presale_buy_attempt` | Right before `buyTokens` writes to the presale contract | `token`, `amount_eth` |
| `presale_buy_success` | After a buy transaction confirms | `token`, `amount_eth`, `tx_hash` |
| `presale_buy_error` | Buy catch block | `token`, `amount_eth`, `error_code`, `error_name` |
| `presale_buy_and_stake_blocked` | Validation guard in `buyAndStakeTokens` | `token`, `reason` (`invalid_amount`) |
| `presale_buy_and_stake_attempt` | Before the combined buy+stake transaction | `token`, `amount_eth` |
| `presale_buy_and_stake_success` | After the combined transaction confirms | `token`, `amount_eth`, `tx_hash` |
| `presale_buy_and_stake_error` | Buy+stake catch block | `token`, `amount_eth`, `error_code`, `error_name` |
| `presale_transaction_submitted` | Emitted after every contract submission (`buy`, `buy_and_stake`, `stake`, `claim`, `claim_all`) | `token`, `type`, `tx_hash`, `amount_eth` (when applicable), `scope` for claim flows |
| `presale_max_eth_clicked` | “Max” helper that pre-fills the form with wallet balance minus gas buffer | `token`, `wallet_balance_eth`, `spend_eth`, `outcome: 'prefill'` |
| `presale_stake_preference_changed` | Stake-after toggle in `Buy.vue` | `token`, `stake_after_purchase` (`enabled`, `disabled`) |

### Curiosity, FAQ & Resource Surfaces

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `secret_drop_peek` | Curiosity teaser link/modal in `extensions/presale/components/CuriosityTeaser.vue` (emitted via `trackFunnelEvent`) | `source: 'curiosity_teaser'`, `trigger` (`link_click`, `modal_open`), `mode` (`link`, `modal`), `cta_text` |
| `playbook_view` | Triggered from curiosity CTA, modal CTA, presale secondary CTA | `source` (`curiosity_primary_cta`, `curiosity_modal_cta`, `presale_secondary_cta`), `href`, `label` |
| `faq_question_open` | Accordion entries inside `presale/PresaleFaqContent.vue` | `question_id`, `question`, `index`, `source: 'presale_faq'` |
| `curiosity_modal_cta_click` | Primary CTA inside the curiosity modal | `href`, `label` |
| `curiosity_teaser_community_click` | Community links rendered by `extensions/presale/components/CuriosityTeaser.vue` | `id`, `href` |

### Community & Social

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `community_strip_social_click` | Social badges inside `extensions/presale/components/CommunityStrip.vue` | `channel`, `href` (lowercased) |
| `community_strip_email_success` | Community strip email capture succeeds | `endpoint` |
| `community_strip_email_error` | Community strip email capture fails | `endpoint`, `error_name` |
| `social_proof_share_click` | Share CTA inside `SocialProofFeed.vue` | `token`, `share_url` |
| `social_proof_post_click` | Individual social proof card clicked | `token`, `post_id`, `source` |
| `social_telegram_click` | Emitted via `trackFunnelEvent` when Telegram links fire (community strip, curiosity teaser, success modal) | `source` (`community_strip`, `curiosity_teaser`, `purchase_success`), `href`, `label` |
| `social_twitter_click` | Same as above for X/Twitter links | `source`, `href`, `label` |

### Trust & Compliance

| Event | Fired From | Key Parameters |
|-------|------------|----------------|
| `trustbar_copy_contract` | Contract copy button in `TrustBar.vue` | `token`, `success` (boolean) |
| `trustbar_etherscan_click` | Etherscan link in `TrustBar.vue` | `token`, `contract_address` |
| `trustsignals_audit_click` | Audit CTA in `presale/TrustSignals.vue` | `token`, `audit_name`, `audit_status` |
| `trustsignals_verification_click` | Contract verification link | `token`, `contract_address` |
| `trustsignals_partner_click` | Partner badges inside `TrustSignals.vue` | `token`, `partner` |

## Testing
- Vitest suites under `tests/BuyComponent.spec.js`, `tests/StakeComponent.spec.js`, `tests/StatusComponent.spec.js`, and helper specs exercise the presale flow. Use them as references before altering contract calls or analytics.
- Mock env vars with `vi.stubEnv` and reuse the stubs for `getPresaleWriteContract`, `useEngagementTracking`, and storage APIs.

## Related References
- Manifest + loader contract: `docs/extensions.md`
- Site configuration primer: `docs/configuration.md`
- Architecture overview for presale/web3 flows: `docs/architecture.md`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE)
