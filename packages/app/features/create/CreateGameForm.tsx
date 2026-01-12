import { useMemo, useRef, type ReactNode } from 'react'
import type { ScrollViewProps } from 'react-native'

import { useController, useFormContext } from 'react-hook-form'

import {
  FormWrapper,
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
import { api } from 'app/utils/api'
import { SchemaForm } from 'app/utils/SchemaForm'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'

import {
  GameFormSchema,
  buildGameFormDefaults,
  buildGameFormProps,
  serializeGameFormValues,
  type GameFormValues,
} from '../games/form-config'
import {
  SettingRowDate,
  SettingRowNumber,
  SettingRowSelect,
  SettingRowSwitch,
  SettingRowText,
  SettingRowToggle,
  SettingSection,
} from '../games/game-settings-rows'

export const CreateGameForm = ({
  onSuccess,
  headerSpacer,
  scrollProps,
}: {
  onSuccess: () => void
  headerSpacer?: ReactNode
  scrollProps?: ScrollViewProps
}) => {
  const toast = useToastController()
  const utils = api.useContext()
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)
  const formDefaults = useMemo(() => buildGameFormDefaults(), [])
  const groupsQuery = api.groups.list.useQuery(undefined, {
    enabled: true,
  })
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

  const mutation = api.games.create.useMutation({
    onSuccess: async () => {
      await utils.games.list.invalidate()
      toast.show('Game created')
      onSuccess()
    },
    onError: (error) => {
      toast.show('Unable to create game', {
        message: error.message,
      })
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
            Create Game
          </SubmitButton>
        </Theme>
      )
  const handleSubmit = () => submitRef.current?.()

  return (
    <SchemaForm
      bare
      schema={GameFormSchema}
      props={formProps}
      onSubmit={(values) => {
        const payload = serializeGameFormValues(values)
        mutation.mutate(payload)
      }}
      defaultValues={formDefaults}
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
                Create game
              </SizableText>
              <Paragraph theme="alt2" size="$3">
                Set the kickoff and roster rules so members can claim spots right away.
              </Paragraph>
            </YStack>
            <SettingSection
              title="Game details"
              note="Set the kickoff date, time, venue, roster cap, and join cutoff."
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
            {showFloatingCta ? <YStack h={dockSpacer} /> : null}
          </FormWrapper.Body>
          {showFloatingCta ? (
            <FloatingCtaDock transparent>
              <Theme inverse>
                <XStack>
                  <SubmitButton flex={1} disabled={mutation.isPending} onPress={handleSubmit}>
                    Create Game
                  </SubmitButton>
                </XStack>
              </Theme>
            </FloatingCtaDock>
          ) : null}
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
