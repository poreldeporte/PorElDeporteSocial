import { type ReactNode, useMemo, useRef } from 'react'
import type { ScrollViewProps } from 'react-native'

import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

import {
  FormWrapper,
  FullscreenSpinner,
  Paragraph,
  ScrollView,
  SizableText,
  SubmitButton,
  Theme,
  XStack,
  YStack,
  isWeb,
  useToastController,
} from '@my/ui/public'
import {
  DEFAULT_CONFIRMATION_WINDOW_HOURS,
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

const CommunitySettingsSchema = z.object({
  community_timezone: formFields.text.describe('Community timezone // America/New_York'),
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
  const { role } = useUser()
  const isAdmin = role === 'admin'
  const toast = useToastController()
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
    const mergedContentStyle = Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
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
      {(fields) => {
        const handleSubmit = () => submitRef.current?.()
        return (
          <>
            <FormWrapper.Body
              p={0}
              px={SCREEN_CONTENT_PADDING.horizontal}
              pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top}
              pb={SCREEN_CONTENT_PADDING.bottom}
              gap="$4"
              scrollProps={scrollProps}
            >
              {headerSpacer}
              <YStack gap="$2">
                <SizableText size="$7" fontWeight="700">
                  Community settings
                </SizableText>
                <Paragraph theme="alt2">
                  Defaults apply to all new games unless overridden.
                </Paragraph>
                <YStack h={2} w={56} br={999} bg={BRAND_COLORS.primary} />
              </YStack>
              <YStack gap="$3">
                <Paragraph theme="alt1">
                  Set the community defaults for confirmations, reminders, and crunch time.
                </Paragraph>
                <FieldWithHint
                  field={fields.community_timezone}
                  hint="All game times and reminders use this timezone."
                />
                <FieldWithHint
                  field={fields.confirmation_window_hours_before_kickoff}
                  hint="How many hours before kickoff players can start confirming."
                />
                <FieldWithHint
                  field={fields.confirmation_reminders_local_times}
                  hint="Times to remind rostered players who have not confirmed."
                />
                <FieldWithHint
                  field={fields.crunch_time_enabled}
                  hint="Lets waitlisted players grab open spot during crunch time."
                />
                <CrunchTimeStartField
                  field={fields.crunch_time_start_time_local}
                  hint="Time of day when waitlisted players can grab open spot."
                />
                <FieldWithHint
                  field={fields.game_notification_times_local}
                  hint="Times to notify rostered players about the game."
                />
              </YStack>
              {showFloatingCta ? <YStack h={dockSpacer} /> : null}
            </FormWrapper.Body>
            {showFloatingCta ? (
              <FloatingCtaDock>
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

const FieldWithHint = ({ field, hint }: { field: ReactNode; hint: string }) => (
  <YStack gap="$1">
    {field}
    <Paragraph theme="alt2" size="$2">
      {hint}
    </Paragraph>
  </YStack>
)

const CrunchTimeStartField = ({ field, hint }: { field: ReactNode; hint: string }) => {
  const { watch } = useFormContext<CommunitySettingsValues>()
  const crunchEnabled = watch('crunch_time_enabled')
  return crunchEnabled ? <FieldWithHint field={field} hint={hint} /> : null
}
