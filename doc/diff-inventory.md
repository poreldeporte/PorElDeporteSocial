diff-inventory (lines reflect current workspace; deleted items use HEAD snapshot)
apps/ — 1402 lines
  expo/ — 905 lines
    app/ — 686 lines
      (auth)/ — 87 lines
        onboarding.tsx [M] — 21 lines
          fn Screen — 14 lines @L7
        reset-password.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
        sign-in.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
        sign-up.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
      (drawer)/ — 187 lines
        (tabs)/ — 180 lines
          community/ — 6 lines
            index.tsx [A] — 6 lines
              fn Screen — 3 lines @L3
          games/ — 6 lines
            index.tsx [A] — 6 lines
              fn Screen — 3 lines @L3
          profile/ — 45 lines
            _layout.tsx [M] — 28 lines
              fn Layout — 24 lines @L4
            index.tsx [M] — 17 lines
              fn Screen — 13 lines @L4
          _layout.tsx [M] — 123 lines
            fn Layout — 112 lines @L11 ⚠︎ >27
        _layout.tsx [M] — 7 lines
          fn Layout — 3 lines @L4
      games/ — 118 lines
        [id]/ — 87 lines
          draft.tsx [A] — 29 lines
            fn Screen — 21 lines @L8
          edit.tsx [A] — 29 lines
            fn Screen — 21 lines @L8
          result.tsx [A] — 29 lines
            fn Screen — 21 lines @L8
        [id].tsx [A] — 31 lines
          fn Screen — 23 lines @L8
      settings/ — 88 lines
        change-email.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
        change-password.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
        general.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
        index.tsx [M] — 22 lines
          fn Screen — 14 lines @L8
      _layout.tsx [M] — 113 lines
        fn HomeLayout — 48 lines @L22 ⚠︎ >27
        fn AppStack — 29 lines @L84 ⚠︎ >27
      about.tsx [M] — 24 lines
        fn Screen — 16 lines @L8
      create.tsx [M] — 21 lines
        fn Screen — 14 lines @L7
      privacy-policy.tsx [M] — 24 lines
        fn Screen — 16 lines @L8
      terms-of-service.tsx [M] — 24 lines
        fn Screen — 16 lines @L8
    assets/ — 0 lines
      ped-logo-official.png [A] — binary lines
      pixel-logo-ped.png [A] — binary lines
    app.config.js [M] — 80 lines
    metro.config.js [M] — 45 lines
    next-shim.js [A] — 2 lines
    package.json [M] — 92 lines
  next/ — 497 lines
    pages/ — 467 lines
      games/ — 161 lines
        [id]/ — 102 lines
          draft.tsx [A] — 34 lines
            fn Page — 15 lines @L11
          edit.tsx [A] — 34 lines
            fn Page — 15 lines @L11
          result.tsx [A] — 34 lines
            fn Page — 15 lines @L11
        [id].tsx [A] — 31 lines
          fn Page — 17 lines @L10
        index.tsx [A] — 28 lines
          fn Page — 8 lines @L12
      profile/ — 56 lines
        edit.tsx [M] — 28 lines
          fn Page — 10 lines @L10
        index.tsx [M] — 28 lines
          fn Page — 10 lines @L10
      settings/ — 112 lines
        change-email.tsx [M] — 28 lines
          fn Page — 10 lines @L10
        change-password.tsx [M] — 28 lines
          fn Page — 10 lines @L10
        general.tsx [M] — 28 lines
          fn Page — 10 lines @L10
        index.tsx [M] — 28 lines
          fn Page — 10 lines @L10
      _app.tsx [M] — 54 lines
        fn MyApp — 29 lines @L23 ⚠︎ >27
      community.tsx [A] — 28 lines
        fn Page — 8 lines @L12
      create.tsx [M] — 28 lines
        fn Page — 10 lines @L10
      index.tsx [M] — 28 lines
        fn Page — 10 lines @L10
    public/ — 0 lines
      ped-logo-official.png [A] — binary lines
      pixel-logo-ped.png [A] — binary lines
    tsconfig.json [M] — 30 lines
doc/ — 71 lines
  diff-inventory.md [A] — 1 lines
  realtime-architecture-roadmap.md [A] — 70 lines
docs/ — 875 lines
  features/ — 409 lines
    roadmap.md [A] — 313 lines ⚠︎ >270 lines
    team-draft.md [A] — 96 lines
  chat-roadmap.md [A] — 72 lines
  frontend-roadmap.md [A] — 46 lines
  realtime-roadmap.md [A] — 83 lines
  roadmap.md [D] — 265 lines (removed)
packages/ — 9882 lines
  api/ — 1727 lines
    src/ — 1716 lines
      routers/ — 1336 lines
        _app.ts [M] — 28 lines
        games.ts [A] — 478 lines ⚠︎ >270 lines
        queue.ts [A] — 193 lines
          fn mapRpcError — 14 lines @L19
          fn unwrapRpcResult — 9 lines @L34
          fn promoteNextWaitlisted — 31 lines @L44 ⚠︎ >27
          fn syncPendingGameLockState — 35 lines @L76 ⚠︎ >27
        teams.ts [A] — 637 lines ⚠︎ >270 lines
          fn fetchGame — 9 lines @L481
          fn fetchTeams — 15 lines @L491
          fn fetchRosterEntry — 10 lines @L507
          fn isPlayerDrafted — 15 lines @L518
          fn isUserAdmin — 5 lines @L534
          fn isUserCaptain — 10 lines @L540
          fn countConfirmedPlayers — 9 lines @L551
          fn countDraftedPlayers — 9 lines @L561
          fn nextPickOrder — 22 lines @L571
          fn nextSnakeTurn — 12 lines @L594
          fn recordPlayerStats — 30 lines @L607 ⚠︎ >27
      services/ — 220 lines
        draft.ts [A] — 220 lines
          fn recordDraftEvent — 22 lines @L18
          fn startDraftForGame — 90 lines @L50 ⚠︎ >27
          fn resetDraftForGame — 73 lines @L147 ⚠︎ >27
      utils/ — 28 lines
        ensureAdmin.ts [A] — 28 lines
          fn ensureAdmin — 22 lines @L6
      trpc.ts [M] — 132 lines
        fn createTRPCContext — 74 lines @L12 ⚠︎ >27
    tsconfig.json [M] — 11 lines
  app/ — 7386 lines
    assets/ — 7 lines
      index.ts [A] — 2 lines
      ped-logo-official.png [A] — binary lines
      ped-logo-official.png.d.ts [A] — 5 lines
    constants/ — 37 lines
      chat.ts [A] — 16 lines
        fn getGameChatRoomName — 1 lines @L6
        fn getDraftChatRoomName — 1 lines @L7
        fn formatChatTimestamp — 6 lines @L10
      layout.ts [A] — 12 lines
      realtime.ts [A] — 9 lines
    features/ — 5808 lines
      auth/ — 368 lines
        components/ — 23 lines
          AuthIntro.tsx [A] — 21 lines
            fn AuthIntro — 10 lines @L11
          index.ts [A] — 2 lines
        onboarding-screen.tsx [M] — 46 lines
          fn OnboardingScreen — 4 lines @L42
        sign-in-screen.tsx [M] — 146 lines
          fn SignInScreen — 84 lines @L22 ⚠︎ >27
          fn SignUpLink — 10 lines @L107
          fn ForgotPasswordLink — 11 lines @L118
          fn useRedirectAfterSignIn — 14 lines @L132
        sign-up-screen.tsx [M] — 153 lines
          fn SignUpScreen — 99 lines @L18 ⚠︎ >27
          fn SignInLink — 11 lines @L118
          fn CheckYourEmail — 23 lines @L130
      create/ — 432 lines
        CreateEventForm.tsx [D] — 104 lines (removed)
          fn CreateEventForm — 85 lines @L19 ⚠︎ >27
        CreateGameForm.tsx [A] — 60 lines
          fn CreateGameForm — 48 lines @L12 ⚠︎ >27
        CreatePostForm.tsx [D] — 114 lines (removed)
          fn CreatePostForm — 99 lines @L15 ⚠︎ >27
        CreateProjectForm.tsx [D] — 99 lines (removed)
          fn CreateProjectForm — 80 lines @L19 ⚠︎ >27
        screen.tsx [M] — 55 lines
          fn CreateScreen — 47 lines @L8 ⚠︎ >27
      games/ — 3006 lines
        components/ — 818 lines
          AdminPanel.tsx [A] — 52 lines
            fn AdminPanel — 45 lines @L7 ⚠︎ >27
          CaptainSelector.tsx [A] — 159 lines
            fn CaptainSelector — 136 lines @L23 ⚠︎ >27
          GameActionBar.native.tsx [A] — 50 lines
            fn GameActionBar — 42 lines @L8 ⚠︎ >27
          GameActionBar.tsx [A] — 13 lines
            fn GameActionBar — 6 lines @L7
          GameActionBar.types.ts [A] — 10 lines
          GameActionBar.web.tsx [A] — 46 lines
            fn GameActionBar — 40 lines @L6 ⚠︎ >27
          GameChatCard.tsx [A] — 283 lines ⚠︎ >270 lines
            fn GameChatCard — 245 lines @L28 ⚠︎ >27
            fn ConnectionDot — 9 lines @L274
          GameStatus.tsx [A] — 95 lines
            fn StatusBadge — 40 lines @L9 ⚠︎ >27
            fn StatusNote — 21 lines @L50
            fn InfoChip — 23 lines @L72
          index.ts [A] — 7 lines
          RosterSection.tsx [A] — 103 lines
            fn RosterSection — 30 lines @L14 ⚠︎ >27
            fn PlayerRow — 47 lines @L45 ⚠︎ >27
            fn getPlayerInitials — 10 lines @L93
        state/ — 266 lines
          deriveDraftViewModel.spec.ts [A] — 127 lines
            fn baseGameDetail — 24 lines @L9
            fn buildCaptain — 10 lines @L34
            fn buildQueueEntry — 17 lines @L45
            fn run — 45 lines @L79 ⚠︎ >27
          deriveDraftViewModel.ts [A] — 139 lines
            fn sortConfirmed — 4 lines @L39
            fn getCombinedDraftedIds — 8 lines @L44
            fn getCaptainNameMap — 12 lines @L53
            fn deriveDraftViewModel — 73 lines @L66 ⚠︎ >27
        detail-screen.tsx [A] — 523 lines ⚠︎ >270 lines
          fn GameDetailScreen — 151 lines @L72 ⚠︎ >27
          fn CommunityGuidelinesSection — 34 lines @L224 ⚠︎ >27
          fn GameHeroBand — 19 lines @L259
          fn HeroMetaBlock — 8 lines @L279
          fn formatDateOnly — 4 lines @L288
          fn ResultSummary — 80 lines @L293 ⚠︎ >27
          fn ResultTeamSection — 54 lines @L376 ⚠︎ >27
          fn DraftCallout — 20 lines @L431
          fn getDraftCalloutContent — 36 lines @L452 ⚠︎ >27
          fn GameOverviewCard — 22 lines @L489
          fn StatCard — 11 lines @L512
        draft-screen.tsx [A] — 686 lines ⚠︎ >270 lines
          fn GameDraftScreen — 329 lines @L29 ⚠︎ >27
          fn DraftStatus — 52 lines @L359 ⚠︎ >27
          fn TeamColumn — 67 lines @L412 ⚠︎ >27
          fn TurnSummary — 64 lines @L480 ⚠︎ >27
          fn PickHistoryCard — 35 lines @L554 ⚠︎ >27
          fn AvailablePlayersCard — 55 lines @L590 ⚠︎ >27
          fn AdminToolsCard — 40 lines @L646 ⚠︎ >27
        edit-form.tsx [A] — 93 lines
          fn EditGameForm — 65 lines @L28 ⚠︎ >27
        edit-screen.tsx [A] — 48 lines
          fn GameEditScreen — 40 lines @L8 ⚠︎ >27
        form-config.ts [A] — 70 lines
          fn defaultGameStart — 5 lines @L20
          fn buildGameFormDefaults — 13 lines @L36
          fn buildGameFormProps — 6 lines @L50
          fn serializeGameFormValues — 13 lines @L57
        result-screen.tsx [A] — 125 lines
          fn GameResultScreen — 104 lines @L21 ⚠︎ >27
        status-helpers.ts [A] — 77 lines
          fn deriveAvailabilityStatus — 26 lines @L12
          fn deriveUserBadge — 17 lines @L41
          fn deriveUserStateMessage — 18 lines @L59
        time-utils.ts [A] — 43 lines
          fn formatTimeLabel — 5 lines @L3
          fn combineDateAndTime — 19 lines @L9
          fn buildTimeOptions — 14 lines @L29
        types.ts [A] — 7 lines
        useGameDetailState.spec.ts [A] — 110 lines
          fn buildQueueEntry — 20 lines @L7
          fn run — 55 lines @L52 ⚠︎ >27
        useGameDetailState.ts [A] — 140 lines
          fn deriveCtaState — 5 lines @L40
          fn sortConfirmed — 6 lines @L46
          fn computeGameDetailState — 79 lines @L53 ⚠︎ >27
          fn useGameDetailState — 7 lines @L133
      home/ — 1340 lines
        components/ — 973 lines
          game-card.tsx [A] — 179 lines
            fn deriveCtaState — 5 lines @L29
            fn GameCard — 137 lines @L42 ⚠︎ >27
          HeroCard.tsx [A] — 25 lines
            fn HeroCard — 20 lines @L5
          index.ts [A] — 16 lines
          nav-tabs.web.tsx [M] — 137 lines
            fn NavTabs — 91 lines @L21 ⚠︎ >27
            fn Tab — 5 lines @L113
            fn TabsRovingIndicator — 18 lines @L119
          PastGamesSection.tsx [A] — 103 lines
            fn PastGamesSection — 58 lines @L16 ⚠︎ >27
            fn PastGameRow — 28 lines @L75 ⚠︎ >27
          QuickJoinCard.tsx [A] — 36 lines
            fn QuickJoinCard — 26 lines @L10
          SchedulePreviewCard.tsx [A] — 24 lines
            fn SchedulePreviewCard — 19 lines @L5
          ScheduleTeaserCard.tsx [A] — 47 lines
            fn ScheduleTeaserCard — 35 lines @L12 ⚠︎ >27
          StatsCard.tsx [A] — 29 lines
            fn StatsCard — 12 lines @L8
            fn StatBlock — 8 lines @L21
          upcoming-games.tsx [A] — 51 lines
            fn UpcomingGamesSection — 42 lines @L9 ⚠︎ >27
          ViewAllPastGamesButton.tsx [A] — 12 lines
            fn ViewAllPastGamesButton — 8 lines @L4
          WhatsAppStyleChat.tsx [A] — 314 lines ⚠︎ >270 lines
            fn WhatsAppStyleChat — 275 lines @L26 ⚠︎ >27
            fn IconButton — 12 lines @L302
        hooks/ — 10 lines
          useMyStats.ts [A] — 10 lines
            fn useMyStats — 7 lines @L3
        community-screen.tsx [A] — 38 lines
          fn CommunityScreen — 25 lines @L13
        layout.web.tsx [M] — 227 lines
          fn HomeLayout — 36 lines @L35 ⚠︎ >27
          fn UserAvatar — 14 lines @L72
          fn CtaButton — 15 lines @L87
          fn ProfileMenu — 49 lines @L103 ⚠︎ >27
          fn Header — 23 lines @L153
          fn BottomNav — 42 lines @L177 ⚠︎ >27
          fn PageHeading — 7 lines @L220
        schedule-screen.tsx [A] — 21 lines
          fn ScheduleScreen — 12 lines @L9
        screen.tsx [M] — 71 lines
          fn HomeScreen — 60 lines @L11 ⚠︎ >27
      profile/ — 615 lines
        drawer-screen.tsx [A] — 68 lines
          fn ProfileDrawerScreen — 59 lines @L9 ⚠︎ >27
        edit-screen.tsx [M] — 133 lines
          fn EditProfileScreen — 18 lines @L27
          fn EditProfileForm — 76 lines @L48 ⚠︎ >27
          fn UserAvatar — 8 lines @L125
        field-copy.ts [A] — 16 lines
          fn describeProfileField — 4 lines @L12
        profile-details.tsx [A] — 53 lines
          fn formatValue — 5 lines @L13
          fn DetailRow — 8 lines @L19
          fn ProfileDetails — 25 lines @L28
        profile-field-schema.ts [A] — 33 lines
        screen.tsx [M] — 249 lines
          fn ProfileScreen — 39 lines @L14 ⚠︎ >27
          fn ProfileHero — 30 lines @L54 ⚠︎ >27
          fn HeroMeta — 8 lines @L85
          fn ProfileStats — 47 lines @L94 ⚠︎ >27
          fn ProfileBadges — 19 lines @L142
          fn BadgeChip — 21 lines @L162
          fn ProfilePledge — 11 lines @L184
          fn QuickActions — 17 lines @L196
          fn ActionButton — 21 lines @L214
          fn formatRole — 5 lines @L236
          fn formatMemberSince — 7 lines @L242
        screen.web.tsx [D] — 63 lines (removed)
          fn ProfileScreen — 48 lines @L15 ⚠︎ >27
      settings/ — 47 lines
        layout.web.tsx [M] — 47 lines
          fn SettingsLayout — 30 lines @L17 ⚠︎ >27
    navigation/ — 316 lines
      layouts.ts [A] — 228 lines
        fn getScreenLayout — 1 lines @L224
        fn getScreenLayoutByNativeSegment — 2 lines @L226
      routes.ts [A] — 88 lines
        fn getRoutesById — 1 lines @L87
    provider/ — 50 lines
      index.tsx [M] — 50 lines
        fn Provider — 16 lines @L14
        fn compose — 11 lines @L31
    types/ — 16 lines
      chat.ts [A] — 16 lines
    utils/ — 1078 lines
      global-store/ — 35 lines
        index.tsx [D] — 35 lines (removed)
          fn GlobalStoreProvider — 13 lines @L14
          fn useGlobalStore — 7 lines @L28
      debugRealtime.ts [A] — 20 lines
        fn debugRealtimeLog — 12 lines @L8
      useChatScroll.ts [A] — 17 lines
        fn useChatScroll — 13 lines @L4
      usePathname.native.ts [M] — 6 lines
        fn usePathname — 3 lines @L3
      useQueueActions.ts [A] — 115 lines
        fn useGameInvalidator — 9 lines @L8
        fn useJoinQueueMutation — 13 lines @L18
        fn useLeaveQueueMutation — 13 lines @L32
        fn useConfirmAttendanceMutation — 11 lines @L46
        fn confirmDrop — 23 lines @L58
        fn useQueueActions — 31 lines @L82 ⚠︎ >27
      useRealtimeChannel.ts [A] — 45 lines
        fn useRealtimeChannel — 31 lines @L14 ⚠︎ >27
      useRealtimeChatRoom.ts [A] — 270 lines
        fn sortMessages — 4 lines @L24
        fn mergeMessage — 7 lines @L29
        fn mutateReactions — 31 lines @L52 ⚠︎ >27
        fn useRealtimeChatRoom — 186 lines @L84 ⚠︎ >27
      useRealtimeSync.ts [A] — 350 lines ⚠︎ >270 lines
        fn shouldFlushNow — 4 lines @L14
        fn useFocusInvalidate — 13 lines @L19
        fn useThrottledInvalidate — 34 lines @L33 ⚠︎ >27
        fn invalidateAllGameLists — 5 lines @L73
        fn patchGameListItem — 19 lines @L80
        fn patchGameDetail — 11 lines @L100
        fn recalcCounts — 9 lines @L112
        fn updateQueue — 17 lines @L122
        fn mergeQueueEntryFields — 8 lines @L141
        fn getQueueDelta — 25 lines @L150
        fn useGameRealtimeSync — 99 lines @L176 ⚠︎ >27
        fn useGamesListRealtime — 51 lines @L276 ⚠︎ >27
        fn useStatsRealtime — 22 lines @L328
      useTeamsState.ts [A] — 152 lines
        fn useTeamsState — 140 lines @L12 ⚠︎ >27
      useUser.ts [M] — 68 lines
        fn useProfile — 23 lines @L6
        fn useUser — 38 lines @L30 ⚠︎ >27
    package.json [M] — 59 lines
    tsconfig.json [M] — 15 lines
  config/ — 10 lines
    game.ts [A] — 3 lines
    package.json [A] — 7 lines
  ui/ — 759 lines
    src/ — 748 lines
      components/ — 739 lines
        elements/ — 239 lines
          datepicker/ — 239 lines
            DatePicker.tsx [M] — 239 lines
              fn CalendarHeader — 70 lines @L20 ⚠︎ >27
              fn DayPicker — 66 lines @L91 ⚠︎ >27
              fn DatePickerBody — 14 lines @L158
        FormFields/ — 133 lines
          SelectField.tsx [M] — 133 lines
            fn SelectField — 43 lines @L19 ⚠︎ >27
            fn SelectSheetAdapter — 30 lines @L63 ⚠︎ >27
            fn SelectOptions — 39 lines @L94 ⚠︎ >27
        CreateModal.tsx [M] — 72 lines
          fn CreateModal — 67 lines @L5 ⚠︎ >27
        Onboarding.native.tsx [M] — 138 lines
          fn Onboarding — 83 lines @L18 ⚠︎ >27
          fn Point — 11 lines @L102
          fn Background — 24 lines @L114
        Onboarding.tsx [M] — 157 lines
          fn Onboarding — 86 lines @L34 ⚠︎ >27
          fn Point — 11 lines @L121
          fn Background — 24 lines @L133
      hooks/ — 9 lines
        useSafeAreaInsets.native.ts [A] — 2 lines
        useSafeAreaInsets.ts [A] — 7 lines
          fn useSafeAreaInsets — 6 lines @L1
    tsconfig.json [M] — 11 lines
realtime-template/ — 6258 lines
  .vscode/ — 4 lines
    settings.json [A] — 4 lines
  apps/ — 553 lines
    web/ — 553 lines
      app/ — 44 lines
        favicon.ico [A] — binary lines
        layout.tsx [A] — 31 lines
          fn RootLayout — 15 lines @L16
        page.tsx [A] — 13 lines
          fn Page — 10 lines @L3
      components/ — 204 lines
        .gitkeep [A] — 1 lines
        chat-message.tsx [A] — 46 lines
          fn ChatMessageItem — 36 lines @L10 ⚠︎ >27
        providers.tsx [A] — 19 lines
          fn Providers — 13 lines @L6
        realtime-chat.tsx [A] — 138 lines
          fn RealtimeChat — 108 lines @L30 ⚠︎ >27
      hooks/ — 96 lines
        .gitkeep [A] — 1 lines
        use-chat-scroll.tsx [A] — 18 lines
          fn useChatScroll — 15 lines @L3
        use-realtime-chat.tsx [A] — 77 lines
          fn useRealtimeChat — 55 lines @L22 ⚠︎ >27
      lib/ — 111 lines
        supabase/ — 110 lines
          client.ts [A] — 9 lines
            fn createClient — 6 lines @L3
          middleware.ts [A] — 67 lines
            fn updateSession — 63 lines @L4 ⚠︎ >27
          server.ts [A] — 34 lines
            fn createClient — 26 lines @L8
        .gitkeep [A] — 1 lines
      components.json [A] — 24 lines
      eslint.config.js [A] — 5 lines
      next-env.d.ts [A] — 6 lines
      next.config.mjs [A] — 7 lines
      package.json [A] — 31 lines
      postcss.config.mjs [A] — 1 lines
      tsconfig.json [A] — 24 lines
  packages/ — 533 lines
    eslint-config/ — 157 lines
      base.js [A] — 33 lines
      next.js [A] — 52 lines
      package.json [A] — 26 lines
      react-internal.js [A] — 42 lines
      README.md [A] — 4 lines
    typescript-config/ — 58 lines
      base.json [A] — 21 lines
      nextjs.json [A] — 14 lines
      package.json [A] — 10 lines
      react-library.json [A] — 9 lines
      README.md [A] — 4 lines
    ui/ — 318 lines
      src/ — 219 lines
        components/ — 83 lines
          .gitkeep [A] — 1 lines
          button.tsx [A] — 60 lines
            fn Button — 20 lines @L38
          input.tsx [A] — 22 lines
            fn Input — 15 lines @L5
        hooks/ — 1 lines
          .gitkeep [A] — 1 lines
        lib/ — 7 lines
          utils.ts [A] — 7 lines
            fn cn — 3 lines @L4
        styles/ — 128 lines
          globals.css [A] — 128 lines
      .env.local [A] — 3 lines
      components.json [A] — 21 lines
      eslint.config.js [A] — 5 lines
      package.json [A] — 42 lines
      postcss.config.mjs [A] — 7 lines
      tsconfig.json [A] — 12 lines
      tsconfig.lint.json [A] — 9 lines
  .eslintrc.js [A] — 11 lines
  .gitignore [A] — 37 lines
  .npmrc [A] — 1 lines
  package.json [A] — 22 lines
  pnpm-lock.yaml [A] — 5034 lines ⚠︎ >270 lines
  pnpm-workspace.yaml [A] — 4 lines
  README.md [A] — 32 lines
  tsconfig.json [A] — 5 lines
  turbo.json [A] — 22 lines
scripts/ — 44 lines
  test-games.js [A] — 44 lines
    fn main — 27 lines @L13
supabase/ — 2160 lines
  migrations/ — 1165 lines
    20250112090000_create_games_schema.sql [A] — 113 lines
    20250112094500_add_profile_role.sql [A] — 40 lines
    20250112100000_update_game_policies.sql [A] — 97 lines
    20250112101000_add_queue_functions.sql [A] — 166 lines
    20250112113000_update_profiles_contact.sql [A] — 6 lines
    20250112120500_create_game_stats_function.sql [A] — 22 lines
    20250112121500_add_draft_and_confirmation_fields.sql [A] — 71 lines
    20250112130000_add_team_draft_tables.sql [A] — 106 lines
    20250112131000_add_player_stats_function.sql [A] — 36 lines
    20250112132000_add_game_captains_policies.sql [A] — 45 lines
    20250115091500_update_profile_trigger.sql [A] — 28 lines
    20250115120000_enable_draft_realtime.sql [A] — 72 lines
    20250116090000_add_draft_pick_and_stats.sql [A] — 59 lines
    20250205100000_update_game_stats_function.sql [A] — 26 lines
    20250207103000_update_queue_locking.sql [A] — 220 lines
    20250207111500_add_game_draft_events.sql [A] — 58 lines
  config.toml [M] — 83 lines
  types.ts [M] — 912 lines ⚠︎ >270 lines
.DS_Store [M] — binary lines
environment.d.ts [M] — 30 lines
package.json [M] — 94 lines
yarn.lock [M] — 27667 lines ⚠︎ >270 lines
