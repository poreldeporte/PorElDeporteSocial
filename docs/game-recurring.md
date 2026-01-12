# Recurring games

## Core rules

- Recurring uses a single hidden “next game” that becomes visible at its release time.
- Players only see games after they are released.
- When a recurring game releases, the next week is created automatically from its settings.
- Editing the hidden next game updates that game and all future releases.
- Turning recurring off deletes the hidden next game and stops future releases.

## Admin flow

- Create Game → toggle Recurring → set release date/time.
- Schedule list shows the hidden next game with a “Releases …” label.
- Admins can open that game and edit settings; changes apply to the next release and future ones.
- To stop recurring, toggle Recurring off on the hidden next game.

## Scheduler

- The release job runs every 5 minutes (pg_cron when available).
