# Feature State Map

## 1. Schedule / Game List
### User Types & States
- **Anonymous / Not joined**
- **Joined (confirmed)**
- **Waitlisted**

### Screen Elements by State
| Element | Anonymous | Confirmed | Waitlisted |
| --- | --- | --- | --- |
| Kickoff, venue, roster counts | ✅ | ✅ | ✅ |
| Status badge | `Spots open` | `Spots open · You’re in` | `Waitlist open · You’re waiting` |
| CTA button | `Claim spot` | `Drop out` | `Leave waitlist` |
| Arrow CTA | Always links to game detail | — | — |

## 2. Game Detail
### User States
- **Not in queue**
- **Confirmed (pending vs attendance-confirmed)**
- **Waitlisted**
- **Admin** (overlay on top of above)

### Sections & State-specific Elements
| Section | Not in queue | Confirmed | Waitlisted | Admin |
| --- | --- | --- | --- | --- |
| Hero meta (kickoff, venue, cost) | ✅ | ✅ | ✅ | ✅ |
| Status badge | `Spots open` | `Spots open · Confirm attendance` | `Waitlist open · You’re waiting` | Same but includes admin tools | 
| Attendance card (web only) | Hidden | Shows CTA (`Confirm attendance` or `Drop out`) | `Leave waitlist` CTA | Shows admin-specific messaging |
| Draft status card | Visible once roster full | Same | Same | Additional hint text (e.g., “Tap to manage draft”) |
| Admin panel | Hidden | Hidden | Hidden | Visible (edit game, lock roster, etc.) |
| Match summary | Shows “Captains drafting…” when no result | Shows result + teams | Same | Same |
| Roster / Waitlist lists | Always show, but buttons to remove players only for admins | Admin see remove controls | Admin see remove controls | Admin removes |
| Community guidelines | Always visible | — | — | — |
| Bottom CTA bar (mobile only) | `Claim spot` | `Drop out / Confirm attendance` | `Leave waitlist` | Same but respects admin state |

## 3. Draft Room
### Roles
- **Admin**
- **Captain (active turn vs waiting)**
- **Spectator**

### Key UI Areas & State Behavior
| Area | Admin | Captain (on turn) | Captain (waiting) | Spectator |
| --- | --- | --- | --- | --- |
| Banner | Shows finalize/reset actions | Shows “You are on the clock” | Shows status | Shows read-only status |
| Teams section | Manage captains/picks | Sees roster sorted by pick | Same | Same |
| Available players list | Full controls (draft, undo) | Can draft (button enabled) | Buttons disabled | Buttons disabled but list visible |
| Spectator notice | Hidden | Hidden | Hidden | Visible at bottom |
| Draft action buttons | Reset, Finalize, Undo | Draft/Undo if on turn | Disabled buttons | None |

## 4. Chat / Community Screen
### States
- **Connected**
- **Connecting**
- **Offline / disabled**
- **Admin (can delete messages)**

| Element | Connected | Connecting | Offline | Admin |
| --- | --- | --- | --- | --- |
| Status line (“Online/Connecting…”) | Shows state | Shows “Connecting…” + disabled copy | Shows “Offline” + disabled message | Same |
| Composer | Enabled | Disabled | Disabled | Same |
| Send button | Enabled | Disabled | Disabled | Same |
| Delete icon | Only for admins on own/others’ messages | — | — | ✅ |
| Spectator notice | Not applicable | — | — | — |

## 5. Profile (My Profile)
### States
- **Member**
- **Admin / elevated roles**
- **Loading stats**

| Element | Member | Admin | Loading |
| --- | --- | --- | --- |
| Hero card (name, role, avatar) | ✅ | Shows “Admin” badge | — |
| Stats | Shows matches/wins/win rate | Same | Placeholder “—” |
| Badges | Standard badges (Inner Circle, Clean Play) | Adds admin badge | — |
| Quick actions (edit profile, settings) | “Edit profile” button | Same | Hidden until loaded |

## 6. Notifications (Future)
### States
- **Enabled / disabled per category**
- **Quiet hours active**
- **Unread vs read**

| Element | Enabled | Disabled | Quiet Hours |
| --- | --- | --- | --- |
| Notification center badge | Shows count | Hidden | Shows but may snooze push |
| Settings toggles | On | Off | Quiet hour slider controls do-not-disturb |
| Toasts/push | Delivered | Suppressed | Delayed or local badge only |

---

This overview ties each screen to the user states we’ve observed so far. We can flesh this out further (e.g., Settings, Create flow) once we map more screens.
