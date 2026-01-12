import { Children, Fragment, type ReactNode, useMemo, useRef } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { useController, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { useRouter } from 'solito/router'

import {
  FieldError,
  FormWrapper,
  FullscreenSpinner,
  Button,
  Input,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  SubmitButton,
  Switch,
  Theme,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui/public'
import {
  DEFAULT_CONFIRMATION_WINDOW_HOURS,
  DEFAULT_COMMUNITY_PRIORITY_ENABLED,
  DEFAULT_CRUNCH_TIME_ENABLED,
  DEFAULT_CRUNCH_TIME_START_TIME_LOCAL,
} from '@my/config/game'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { BRAND_COLORS } from 'app/constants/colors'
import { getDockSpacer } from 'app/constants/dock'
import { SCREEN_CONTENT_PADDING, screenContentContainerStyle } from 'app/constants/layout'
import { api } from 'app/utils/api'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useSafeAreaInsets } from 'app/utils/useSafeAreaInsets'
import { useUser } from 'app/utils/useUser'

import { formatTimeList, parseTimeList } from './time-list'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

const DEFAULT_REMINDERS = '09:00, 12:00, 15:00'
const SECTION_LETTER_SPACING = 1.6

const CommunitySettingsSchema = z.object({
  community_timezone: formFields.text.describe('Community timezone // America/New_York'),
  community_priority_enabled: formFields.boolean_switch.describe('Community priority'),
  confirmation_window_hours_before_kickoff: formFields.number
    .min(0)
    .describe('Confirmation window (hours) // 24'),
  confirmation_reminders_local_times: formFields.text.describe('Confirmation reminders // HH:MM, HH:MM'),
  crunch_time_enabled: formFields.boolean_switch.describe('Crunch time enabled'),
  crunch_time_start_time_local: formFields.text.min(1).describe('Crunch time start // 17:00'),
  game_notification_times_local: formFields.text.describe('Game notifications // HH:MM, HH:MM'),
})

type CommunitySettingsValues = z.infer<typeof CommunitySettingsSchema>

export const CommunitySettingsScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { isAdmin } = useUser()
  const toast = useToastController()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const showFloatingCta = !isWeb
  const dockSpacer = showFloatingCta ? getDockSpacer(insets.bottom) : 0
  const submitRef = useRef<(() => void) | null>(null)

  const { data: defaults, isLoading, error } = api.community.defaults.useQuery(undefined, {
    enabled: isAdmin,
  })
  const mutation = api.community.updateDefaults.useMutation({
    onSuccess: () => toast.show('Community defaults updated'),
    onError: (err) => toast.show('Unable to update settings', { message: err.message }),
  })

  const defaultValues = useMemo<CommunitySettingsValues>(() => {
    const confirmationTimes = defaults?.confirmationRemindersLocalTimes ?? []
    const confirmationValue = confirmationTimes.length
      ? formatTimeList(confirmationTimes)
      : DEFAULT_REMINDERS
    const notificationTimes = defaults?.gameNotificationTimesLocal ?? []
    return {
      community_timezone: defaults?.timezone ?? 'UTC',
      community_priority_enabled:
        defaults?.communityPriorityEnabled ?? DEFAULT_COMMUNITY_PRIORITY_ENABLED,
      confirmation_window_hours_before_kickoff:
        defaults?.confirmationWindowHoursBeforeKickoff ?? DEFAULT_CONFIRMATION_WINDOW_HOURS,
      confirmation_reminders_local_times: confirmationValue,
      crunch_time_enabled: defaults?.crunchTimeEnabled ?? DEFAULT_CRUNCH_TIME_ENABLED,
      crunch_time_start_time_local: defaults?.crunchTimeStartTimeLocal ?? DEFAULT_CRUNCH_TIME_START_TIME_LOCAL,
      game_notification_times_local: notificationTimes.length
        ? formatTimeList(notificationTimes)
        : confirmationValue,
    }
  }, [defaults])

  if (!isAdmin) {
    const { contentContainerStyle, ...scrollViewOnly } = scrollProps ?? {}
    const baseContentStyle = headerSpacer
      ? { ...screenContentContainerStyle, paddingTop: 0, flexGrow: 1 }
      : { ...screenContentContainerStyle, flexGrow: 1 }
    const mergedContentStyle = StyleSheet.flatten(
      Array.isArray(contentContainerStyle)
        ? [baseContentStyle, ...contentContainerStyle]
        : [baseContentStyle, contentContainerStyle]
    )
    return (
      <ScrollView {...scrollViewOnly} contentContainerStyle={mergedContentStyle}>
        {headerSpacer}
        <Paragraph theme="alt2">Only admins can update community settings.</Paragraph>
      </ScrollView>
    )
  }

  if (isLoading && !defaults) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (error) {
    return (
      <YStack f={1} ai="center" jc="center" gap="$2" px="$4" pt={topInset ?? 0}>
        <Paragraph theme="alt2">We couldn’t load community settings.</Paragraph>
      </YStack>
    )
  }

  return (
    <SchemaForm
      bare
      schema={CommunitySettingsSchema}
      defaultValues={defaultValues}
      onSubmit={(values) =>
        mutation.mutate({
          communityTimezone: values.community_timezone.trim(),
          communityPriorityEnabled: values.community_priority_enabled,
          confirmationWindowHoursBeforeKickoff: values.confirmation_window_hours_before_kickoff,
          confirmationRemindersLocalTimes: parseTimeList(values.confirmation_reminders_local_times),
          crunchTimeEnabled: values.crunch_time_enabled,
          crunchTimeStartTimeLocal: values.crunch_time_start_time_local.trim(),
          gameNotificationTimesLocal: parseTimeList(values.game_notification_times_local),
        })
      }
      renderAfter={
        showFloatingCta
          ? ({ submit }) => {
              submitRef.current = submit
              return null
            }
          : ({ submit }) => (
              <Theme inverse>
                <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
                  Save settings
                </SubmitButton>
              </Theme>
            )
      }
    >
      {() => {
        const handleSubmit = () => submitRef.current?.()
        return (
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
                  Community settings
                </SizableText>
                <Paragraph theme="alt2" size="$3">
                  Defaults apply to all new games unless overridden.
                </Paragraph>
              </YStack>
              <SettingSection
                title="General"
                note="Set the community timezone and roster priority for guests."
              >
                <SettingRowText
                  name="community_timezone"
                  label="Timezone"
                  placeholder="America/New_York"
                />
                <SettingRowSwitch
                  name="community_priority_enabled"
                  label="Community priority"
                />
              </SettingSection>
              <SettingSection
                title="Confirmations"
                note="Players can confirm within the window, and reminders send at the times below."
              >
                <SettingRowNumber
                  name="confirmation_window_hours_before_kickoff"
                  label="Confirmation window (hours)"
                  placeholder="24"
                  width={80}
                />
                <SettingRowText
                  name="confirmation_reminders_local_times"
                  label="Confirmation reminder times"
                  placeholder="HH:MM, HH:MM"
                  width={160}
                />
              </SettingSection>
              <SettingSection
                title="Crunch time"
                note="Enable crunch time to let waitlisted players grab open spots at the start time."
              >
                <SettingRowSwitch name="crunch_time_enabled" label="Crunch time enabled" />
                <CrunchTimeStartRow />
              </SettingSection>
              <SettingSection
                title="Game notifications"
                note="Set the default notification times for rostered players."
              >
                <SettingRowText
                  name="game_notification_times_local"
                  label="Game notification times"
                  placeholder="HH:MM, HH:MM"
                  width={160}
                />
              </SettingSection>
              <SettingSection title="Members" note="Review approvals and member access.">
                <SettingRow label="Review members">
                  <Button
                    chromeless
                    size="$2"
                    px={0}
                    py={0}
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => router.push('/admin/approvals')}
                  >
                    Open
                  </Button>
                </SettingRow>
              </SettingSection>
              <SettingSection
                title="Groups"
                note="Create private audiences for games."
              >
                <SettingRow label="Manage groups">
                  <Button
                    chromeless
                    size="$2"
                    px={0}
                    py={0}
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => router.push('/settings/groups')}
                  >
                    Open
                  </Button>
                </SettingRow>
              </SettingSection>
              {showFloatingCta ? <YStack h={dockSpacer} /> : null}
            </FormWrapper.Body>
            {showFloatingCta ? (
              <FloatingCtaDock transparent>
                <Theme inverse>
                  <XStack>
                    <SubmitButton flex={1} disabled={mutation.isPending} onPress={handleSubmit}>
                      Save settings
                    </SubmitButton>
                  </XStack>
                </Theme>
              </FloatingCtaDock>
            ) : null}
          </>
        )
      }}
    </SchemaForm>
  )
}

const SettingSection = ({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) => {
  return (
    <YStack gap="$3">
      <YStack gap="$1">
        <SizableText
          size="$2"
          fontWeight="700"
          color="$color10"
          letterSpacing={SECTION_LETTER_SPACING}
        >
          {title.toUpperCase()}
        </SizableText>
        {note ? (
          <Paragraph theme="alt2" size="$2">
            {note}
          </Paragraph>
        ) : null}
      </YStack>
      <SettingRowGroup>{children}</SettingRowGroup>
    </YStack>
  )
}

const SettingRowGroup = ({ children }: { children: ReactNode }) => {
  const rows = Children.toArray(children).filter(Boolean)
  return (
    <YStack>
      {rows.map((row, index) => (
        <Fragment key={`row-${index}`}>
          {row}
          {index < rows.length - 1 ? (
            <Separator bw="$0.5" boc="$color4" />
          ) : null}
        </Fragment>
      ))}
    </YStack>
  )
}

const SettingRow = ({
  label,
  children,
  error,
}: {
  label: string
  children: ReactNode
  error?: string
}) => {
  return (
    <YStack>
      <XStack ai="center" jc="space-between" minHeight={60} py="$2" gap="$3">
        <SizableText size="$4" fontWeight="600" color="$color" flex={1} numberOfLines={2}>
          {label}
        </SizableText>
        {children}
      </XStack>
      <FieldError message={error} />
    </YStack>
  )
}

const SettingRowSwitch = ({
  name,
  label,
}: {
  name: keyof CommunitySettingsValues
  label: string
}) => {
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const checked = Boolean(field.value)

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Switch
        native
        size="$2"
        disabled={disabled}
        checked={checked}
        onCheckedChange={(next) => field.onChange(next)}
        backgroundColor={checked ? BRAND_COLORS.primary : '$color5'}
        borderColor={checked ? BRAND_COLORS.primary : '$color6'}
        borderWidth={1}
        opacity={disabled ? 0.5 : 1}
      >
        <Switch.Thumb animation="100ms" />
      </Switch>
    </SettingRow>
  )
}

const SettingRowText = ({
  name,
  label,
  placeholder,
  width = 180,
  disabled: disabledOverride = false,
}: {
  name: keyof CommunitySettingsValues
  label: string
  placeholder?: string
  width?: number
  disabled?: boolean
}) => {
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting || disabledOverride
  const value = typeof field.value === 'string' ? field.value : ''

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Input
        value={value}
        onChangeText={(text) => field.onChange(text)}
        onBlur={field.onBlur}
        placeholder={placeholder}
        placeholderTextColor="$color10"
        autoCapitalize="none"
        autoCorrect={false}
        disabled={disabled}
        textAlign="right"
        width={width}
        maxWidth="60%"
        fontSize={15}
        color="$color"
        borderWidth={0}
        backgroundColor="transparent"
        px={0}
        py={0}
        opacity={disabled ? 0.6 : 1}
      />
    </SettingRow>
  )
}

const SettingRowNumber = ({
  name,
  label,
  placeholder,
  width = 96,
}: {
  name: keyof CommunitySettingsValues
  label: string
  placeholder?: string
  width?: number
}) => {
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const value = typeof field.value === 'number' ? String(field.value) : ''

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^\d]/g, '')
    if (!cleaned) {
      field.onChange(undefined)
      return
    }
    const next = Number(cleaned)
    if (Number.isNaN(next)) return
    field.onChange(next)
  }

  return (
    <SettingRow label={label} error={fieldState.error?.message}>
      <Input
        value={value}
        onChangeText={handleChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        placeholderTextColor="$color10"
        inputMode="numeric"
        keyboardType="number-pad"
        disabled={disabled}
        textAlign="right"
        width={width}
        fontSize={15}
        color="$color"
        borderWidth={0}
        backgroundColor="transparent"
        px={0}
        py={0}
        opacity={disabled ? 0.6 : 1}
      />
    </SettingRow>
  )
}

const CrunchTimeStartRow = () => {
  const { watch } = useFormContext<CommunitySettingsValues>()
  const crunchEnabled = Boolean(watch('crunch_time_enabled'))
  return (
    <SettingRowText
      name="crunch_time_start_time_local"
      label="Crunch time start"
      placeholder="17:00"
      width={120}
      disabled={!crunchEnabled}
    />
  )
}
