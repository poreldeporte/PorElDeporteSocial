## Sign-Up Experience Roadmap (Initiatives 1–7)

Goal: elevate the existing three-step wizard into a branded, low-friction flow without discarding current architecture (`SignUpScreen`, `SchemaForm`, Supabase). Each initiative lists the user outcome, the implementation plan, acceptance criteria, and any dependencies/open questions.

### 1. Narrative Hero & Microcopy
- **Outcome**: every step reminds players why they are onboarding (exclusive runs, elite community) so the form feels purposeful.
- **Implementation**:
  1. Extend `SIGN_UP_STEPS` to include optional `heroTitle`, `heroBody`, and inline helper copy for each field group.
  2. Replace the static `SignUpStepHero` copy with data-driven content and allow injecting brand imagery/illustrations (new asset slots in `packages/app/assets`).
  3. Thread short “why we ask” blurbs beside each field group (small `Paragraph theme="alt2"`).
- **Acceptance**: copy surfaces on both web/native, is theme-aware, and remains configurable without code changes.
- **Dependencies/Open**: need final marketing copy and any art direction assets.

### 2. Step Context & Anticipation
- **Outcome**: users understand progress (“Step 1 of 3”) and what comes next, reducing uncertainty.
- **Implementation**:
  1. Replace the pill indicators with a progress header showing current step number, total steps, and title.
  2. Add a “Next: Contact & access” teaser below the CTA when not on the last step.
  3. Update responsive layout so context header is visible above the form on mobile and alongside hero on web.
- **Acceptance**: screen readers announce progress, and QA sees correct labeling in every step order change.
- **Dependencies/Open**: confirm copy for teaser lines.

### 3. Frictionless Contact (Step 2)
- **Outcome**: minimize drop-off by assisting email/phone/password entry.
- **Implementation**:
  1. Introduce a phone-input helper (mask `(###) ###-####` by locale, autopopulate country via device locale). Consider leveraging `libphonenumber-js` already used elsewhere? If not, add lightweight parsing utility to `packages/app/utils/phone.ts`.
  2. Build a password checklist component that listens to `useWatch('password')` and shows strength + requirement checkmarks (“≥6 chars”, “mix of letters/numbers”). Keep logic under 27 lines per rule.
  3. Add client-side MX/typo hints using a small domain suggestion utility (e.g., compare against `['gmail.com','icloud.com','hotmail.com']` and show “Did you mean …?”). Integrate into the email field helper text.
  4. Surface a “Send me a magic link instead” secondary action that triggers Supabase passwordless flow while keeping collected names from step 1.
- **Acceptance**: formatted values still pass existing Zod schema; helpers never block typing; passwordless CTA only appears after a valid email.
- **Dependencies/Open**: confirm allowed countries and password policy.

### 4. Purposeful Birth Date & Jersey Experience
- **Outcome**: make step 3 feel fun and trustworthy, not bureaucratic.
- **Implementation**:
  1. Wrap the birth-date picker with contextual copy (“We balance age groups…”) plus an inline tooltip describing privacy.
  2. Enhance the date picker with decade shortcuts (quick buttons for “1990s”, etc.) by extending the shared `DateField`.
  3. Pair the jersey number input with a mini kit preview component—render a jersey SVG tinted to the current theme and overlay the typed number in real time.
- **Acceptance**: preview updates without lag; validation errors stay visible; shortcuts accessible via keyboard.
- **Dependencies/Open**: need jersey SVG asset and brand approval on messaging.

### 5. Expressive Position Selection
- **Outcome**: choosing Goalie/Defender/etc. feels like joining a squad rather than selecting text.
- **Implementation**:
  1. Replace the `SelectField` with a bespoke `PositionCardGroup` component that renders cards with icon, short role description, and availability badge.
  2. Maintain the Zod schema by keeping the component wired to the same form field (radio-group semantics).
  3. Allow the cards to surface “Spots left” data (future integration with roster availability API; stub now with static copy).
- **Acceptance**: cards are keyboard/focus navigable, pass accessibility contrast, and still submit the raw string expected by Supabase metadata.
- **Dependencies/Open**: confirm iconography for each role; future hook for dynamic availability.

### 6. Proactive Social Login Placement
- **Outcome**: users see Apple/Google options before typing, but without overcrowding the form.
- **Implementation**:
  1. Move `SocialLogin` above the form on step 1 with condensed buttons (“Continue with Apple/Google”) and explanatory copy (“We’ll capture jersey later”).
  2. On native, surface these buttons as inline chips to preserve vertical space; keep full buttons beneath for web.
  3. Track click-through vs. completion to ensure the placement change increases uptake (instrument event logging via existing analytics hook, or add if missing).
- **Acceptance**: OAuth works from step 1; instrumentation emits `auth_social_selected` with provider + step index.
- **Dependencies/Open**: confirm analytics destination and legal copy for Apple/Google guidelines.

### 7. Inline Resilience & Duplication Handling
- **Outcome**: detect issues early and keep the user’s context intact.
- **Implementation**:
  1. Call a lightweight Supabase RPC or `select` to check for existing emails after the email field passes regex validation; show actionable messaging (“Looks like you already registered. Sign in or resend verification.”) with direct links.
  2. Persist partially completed data (names, phone) in local storage / secure store so returning users don’t have to retype after closing the app or bouncing from verification emails.
  3. Improve error surfaces by mapping Supabase codes to friendly copy and offering in-line remediation (resend verification, change email).
- **Acceptance**: duplicate detection triggers without delaying every keystroke (debounced); stored data clears after successful sign-up or explicit reset.
- **Dependencies/Open**: need Supabase policy confirmation for unauthenticated email existence checks; decide on storage mechanism per platform (web localStorage vs. Expo SecureStore).

---

**Next steps**: confirm copy/art assets, choose libraries for phone formatting and date shortcuts, then implement initiatives in priority order while keeping diff footprints focused per section.
