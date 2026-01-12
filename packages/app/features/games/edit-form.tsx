import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { ScrollViewProps } from 'react-native'

import { z } from 'zod'
import { useController, useFormContext } from 'react-hook-form'
import { AlertDialog } from 'tamagui'

import {
  FormWrapper,
  Button,
  Paragraph,
  SizableText,
  SubmitButton,
  Theme,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui/public'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { getDockSpacer } from 'app/constants/dock'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { api, type RouterOutputs } from 'app/utils/api'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import {
  extendGameFormSchema,
  buildGameFormDefaults,
  buildGameFormProps,
  serializeGameFormValues,
  type GameFormValues,
} from './form-config'
import {
  SettingRowDate,
  SettingRowNumber,
  SettingRowSelect,
  SettingRowSwitch,
  SettingRowText,
  SettingRowToggle,
  SettingSection,
} from './game-settings-rows'

type GameDetail = RouterOutputs['games']['byId']

const EditGameSchema = extendGameFormSchema({
  status: formFields.select.describe('Status'),
})

const statusOptions = [
  { name: 'Scheduled', value: 'scheduled' },
  { name: 'Completed', value: 'completed' },
  { name: 'Cancelled', value: 'cancelled' },
]

export const EditGameForm = ({
  game,
  onSuccess,
  scrollProps,
  headerSpacer,
}: {
  game: GameDetail
  onSuccess?: () => void
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
}) => {
  const toast = useToastController()
  const utils = api.useContext()
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)
  const groupsQuery = api.groups.list.useQuery(undefined, { enabled: true })
  const groupOptions = useMemo(
    () => (groupsQuery.data ?? []).map((group) => ({ name: group.name, value: group.id })),
    [groupsQuery.data]
  )
  const formProps = useMemo(() => {
    const base = buildGameFormProps()
    return {
      ...base,
      audience_group_id: {
        ...base.audience_group_id,
        options: groupOptions,
        placeholder: groupOptions.length ? base.audience_group_id.placeholder : 'No groups yet',
      },
    }
  }, [groupOptions])
  const pendingDraftOffValues = useRef<(GameFormValues & { status: GameDetail['status'] }) | null>(
    null
  )
  const [draftOffConfirmOpen, setDraftOffConfirmOpen] = useState(false)
  const [recurringOffConfirmOpen, setRecurringOffConfirmOpen] = useState(false)
  const pendingRecurringOff = useRef(false)
  const mutation = api.games.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.games.byId.invalidate({ id: game.id }), utils.games.list.invalidate()])
      toast.show('Game updated')
      onSuccess?.()
    },
    onError: (error) => {
      toast.show('Unable to update game', { message: error.message })
    },
  })
  const deleteMutation = api.games.delete.useMutation({
    onSuccess: async () => {
      await utils.games.list.invalidate()
      toast.show('Recurring game removed')
      onSuccess?.()
    },
    onError: (error) => {
      toast.show('Unable to stop recurring', { message: error.message })
    },
  })
  const renderAfter = showFloatingCta
    ? ({ submit }: { submit: () => void }) => {
        submitRef.current = submit
        return null
      }
    : ({ submit }: { submit: () => void }) => (
        <Theme inverse>
          <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
            Save changes
          </SubmitButton>
        </Theme>
      )
  const handleSubmit = () => submitRef.current?.()

  return (
    <SchemaForm
      bare
      schema={EditGameSchema}
      defaultValues={{
        ...buildGameFormDefaults(
          {
            startTime: game.startTime,
            releaseAt: game.releaseAt ?? null,
            releasedAt: game.releasedAt ?? null,
            audienceGroupId: game.audienceGroupId ?? null,
            locationName: game.locationName,
            capacity: game.capacity,
            confirmationEnabled: game.confirmationEnabled,
            joinCutoffOffsetMinutesFromKickoff: game.joinCutoffOffsetMinutesFromKickoff,
            draftModeEnabled: game.draftModeEnabled,
            draftVisibility: game.draftVisibility,
            draftChatEnabled: game.draftChatEnabled,
          }
        ),
        status: game.status,
      }}
      props={{
        ...formProps,
        status: {
          options: statusOptions,
        },
      }}
      onSubmit={(values) => {
        const canEditRecurring = Boolean(game.releaseAt && !game.releasedAt)
        const shouldStopRecurring = canEditRecurring && values.recurring_enabled === false
        const hasDraftData =
          game.draftStatus !== 'pending' ||
          game.captains.length > 0 ||
          game.teams.length > 0 ||
          Boolean(game.result)
        const turningOff = game.draftModeEnabled !== false && values.draft_mode_enabled === false
        if (turningOff && hasDraftData) {
          pendingDraftOffValues.current = values
          setDraftOffConfirmOpen(true)
          return
        }
        if (shouldStopRecurring) {
          pendingRecurringOff.current = true
          setRecurringOffConfirmOpen(true)
          return
        }
        mutation.mutate({
          id: game.id,
          ...serializeGameFormValues(values),
          status: values.status as GameDetail['status'],
        })
      }}
      renderAfter={renderAfter}
    >
      {() => (
        <>
          <FormWrapper.Body
            p={0}
            px={SCREEN_CONTENT_PADDING.horizontal + 4}
            pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top + 12}
            pb={SCREEN_CONTENT_PADDING.bottom}
            gap="$6"
            scrollProps={scrollProps}
          >
            {headerSpacer}
            <YStack gap="$2">
              <SizableText size="$8" fontWeight="700">
                Game Settings
              </SizableText>
              <Paragraph theme="alt2" size="$3">
                Make sure any roster changes are communicated to the players.
              </Paragraph>
            </YStack>
            <SettingSection
              title="Game details"
              note="Adjust kickoff, venue, roster cap, and join cutoff."
            >
              <SettingRowDate<GameFormValues> name="start_time" label="Date" />
              <SettingRowSelect<GameFormValues>
                name="start_time_time"
                label="Start time"
                placeholder={formProps.start_time_time.placeholder}
                options={formProps.start_time_time.options}
                width={140}
              />
              <SettingRowText<GameFormValues>
                name="location_name"
                label="Location"
                placeholder="Brickell Soccer & Padel"
                width={220}
                autoCapitalize="words"
              />
              <SettingRowNumber<GameFormValues>
                name="capacity"
                label="Capacity"
                placeholder="12"
                width={80}
              />
              <SettingRowNumber<GameFormValues>
                name="join_cutoff_offset_minutes_from_kickoff"
                label="Join cutoff (minutes)"
                placeholder="0"
                width={80}
              />
            </SettingSection>
            <SettingSection
              title="Audience"
              note="Choose who can see this game. Create groups in Community settings."
            >
              <SettingRowSwitch<GameFormValues>
                name="audience_is_community"
                label="Entire community"
              />
              <AudienceFields
                options={formProps.audience_group_id.options}
                placeholder={formProps.audience_group_id.placeholder}
              />
            </SettingSection>
            {game.releaseAt && !game.releasedAt ? (
              <SettingSection
                title="Recurring"
                note="Auto-post this game every week at the release time."
              >
                <SettingRowSwitch<GameFormValues>
                  name="recurring_enabled"
                  label="Recurring weekly"
                />
                <RecurringFields
                  dateName="release_date"
                  timeName="release_time"
                  timeOptions={formProps.release_time.options}
                  timePlaceholder={formProps.release_time.placeholder}
                />
              </SettingSection>
            ) : null}
            <SettingSection
              title="Confirmations"
              note="Players must confirm to keep their spot."
            >
              <SettingRowSwitch<GameFormValues>
                name="confirmation_enabled"
                label="Confirmation required"
              />
            </SettingSection>
            <SettingSection
              title="Draft"
              note="Draft mode enables captains, the draft room, teams, and scoring. Toggle public visibility to hide the draft room from players."
            >
              <SettingRowSwitch<GameFormValues> name="draft_mode_enabled" label="Draft mode" />
              <DraftVisibilityRow />
              <DraftChatRow />
            </SettingSection>
            <SettingSection title="Status" note="Update if the game status changes.">
              <SettingRowSelect<{ status: GameDetail['status'] }>
                name="status"
                label="Game status"
                options={statusOptions}
                width={150}
              />
            </SettingSection>
            {showFloatingCta ? <YStack h={dockSpacer} /> : null}
          </FormWrapper.Body>
          {showFloatingCta ? (
            <FloatingCtaDock transparent>
              <Theme inverse>
                <XStack>
                  <SubmitButton flex={1} disabled={mutation.isPending} onPress={handleSubmit}>
                    Save changes
                  </SubmitButton>
                </XStack>
              </Theme>
            </FloatingCtaDock>
          ) : null}
          <AlertDialog open={draftOffConfirmOpen} onOpenChange={setDraftOffConfirmOpen}>
            <AlertDialog.Portal>
              <AlertDialog.Overlay
                key="overlay"
                animation="medium"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
                o={0.5}
                backgroundColor="$color5"
              />
              <AlertDialog.Content
                key="content"
                elevate
                animation="medium"
                enterStyle={{ opacity: 0, scale: 0.95 }}
                exitStyle={{ opacity: 0, scale: 0.95 }}
                backgroundColor="$color2"
                br="$4"
                p="$4"
                gap="$3"
              >
                <AlertDialog.Title fontWeight="700">Turn off draft mode?</AlertDialog.Title>
                <AlertDialog.Description>
                  This will delete teams and scores. The game will still count as played but won’t
                  affect W/L or GD.
                </AlertDialog.Description>
                <XStack gap="$3">
                  <Button flex={1} theme="alt1" onPress={() => setDraftOffConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    theme="red"
                    onPress={() => {
                      const pending = pendingDraftOffValues.current
                      if (!pending) {
                        setDraftOffConfirmOpen(false)
                        return
                      }
                      pendingDraftOffValues.current = null
                      setDraftOffConfirmOpen(false)
                      mutation.mutate({
                        id: game.id,
                        ...serializeGameFormValues(pending),
                        status: pending.status as GameDetail['status'],
                      })
                    }}
                    disabled={mutation.isPending}
                  >
                    Turn off
                  </Button>
                </XStack>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog>
          <AlertDialog
            open={recurringOffConfirmOpen}
            onOpenChange={(open) => {
              if (!open) pendingRecurringOff.current = false
              setRecurringOffConfirmOpen(open)
            }}
          >
            <AlertDialog.Portal>
              <AlertDialog.Overlay
                key="overlay"
                animation="medium"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
                o={0.5}
                backgroundColor="$color5"
              />
              <AlertDialog.Content
                key="content"
                elevate
                animation="medium"
                enterStyle={{ opacity: 0, scale: 0.95 }}
                exitStyle={{ opacity: 0, scale: 0.95 }}
                backgroundColor="$color2"
                br="$4"
                p="$4"
                gap="$3"
              >
                <AlertDialog.Title fontWeight="700">Stop recurring?</AlertDialog.Title>
                <AlertDialog.Description>
                  This will delete the upcoming game and stop future releases.
                </AlertDialog.Description>
                <XStack gap="$3">
                  <Button
                    flex={1}
                    theme="alt1"
                    onPress={() => {
                      pendingRecurringOff.current = false
                      setRecurringOffConfirmOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    flex={1}
                    theme="red"
                    onPress={() => {
                      if (!pendingRecurringOff.current) {
                        setRecurringOffConfirmOpen(false)
                        return
                      }
                      pendingRecurringOff.current = false
                      setRecurringOffConfirmOpen(false)
                      deleteMutation.mutate({ id: game.id })
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Stop recurring
                  </Button>
                </XStack>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog>
        </>
      )}
    </SchemaForm>
  )
}

const RecurringFields = ({
  dateName,
  timeName,
  timeOptions,
  timePlaceholder,
}: {
  dateName: 'release_date'
  timeName: 'release_time'
  timeOptions: { name: string; value: string }[]
  timePlaceholder?: string
}) => {
  const { watch } = useFormContext<GameFormValues>()
  const recurringEnabled = watch('recurring_enabled')
  if (!recurringEnabled) return null
  return (
    <>
      <SettingRowDate<GameFormValues> name={dateName} label="Release date" />
      <SettingRowSelect<GameFormValues>
        name={timeName}
        label="Release time"
        placeholder={timePlaceholder}
        options={timeOptions}
        width={140}
      />
    </>
  )
}

const DraftVisibilityRow = () => {
  const { watch, control, formState } = useFormContext<GameFormValues>()
  const { field, fieldState } = useController({ control, name: 'draft_visibility' })
  const draftModeEnabled = watch('draft_mode_enabled')
  if (!draftModeEnabled) return null
  const checked = field.value !== 'admin_only'
  const disabled = formState.isSubmitting
  return (
    <SettingRowToggle
      label="Public draft room"
      checked={checked}
      disabled={disabled}
      error={fieldState.error?.message}
      onCheckedChange={(next) => field.onChange(next ? 'public' : 'admin_only')}
    />
  )
}

const DraftChatRow = () => {
  const { watch, control, formState } = useFormContext<GameFormValues>()
  const { field, fieldState } = useController({ control, name: 'draft_chat_enabled' })
  const draftModeEnabled = watch('draft_mode_enabled')
  if (!draftModeEnabled) return null
  const checked = Boolean(field.value)
  const disabled = formState.isSubmitting
  return (
    <SettingRowToggle
      label="Enable draft chat"
      checked={checked}
      disabled={disabled}
      error={fieldState.error?.message}
      onCheckedChange={(next) => field.onChange(next)}
    />
  )
}

const AudienceFields = ({
  options,
  placeholder,
}: {
  options: { name: string; value: string }[]
  placeholder?: string
}) => {
  const { watch } = useFormContext<GameFormValues>()
  const isCommunity = watch('audience_is_community')
  if (isCommunity) return null
  return (
    <SettingRowSelect<GameFormValues>
      name="audience_group_id"
      label="Group"
      options={options}
      placeholder={placeholder}
      width={180}
    />
  )
}
