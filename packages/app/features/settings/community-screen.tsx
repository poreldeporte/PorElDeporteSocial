import { Children, Fragment, type ComponentProps, type ReactNode, useMemo, useRef } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import { useController, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { SolitoImage } from 'solito/image'

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
import { BrandStamp } from 'app/components/BrandStamp'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { SCREEN_CONTENT_PADDING, screenContentContainerStyle } from 'app/constants/layout'
import { UploadCommunityLogo } from 'app/features/settings/components/upload-community-logo'
import { useBrand } from 'app/provider/brand'
import { api } from 'app/utils/api'
import { isValidHexColor, normalizeHexColor } from 'app/utils/brand'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useUser } from 'app/utils/useUser'

import { formatTimeList, parseTimeList } from './time-list'

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

const DEFAULT_REMINDERS = '09:00, 12:00, 15:00'
const SECTION_LETTER_SPACING = 1.6

const isPrimaryColorValid = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return true
  const normalized = normalizeHexColor(trimmed)
  return normalized ? isValidHexColor(normalized) : false
}

const CommunitySettingsSchema = z.object({
  community_timezone: formFields.text.describe('Community timezone // America/New_York'),
  community_priority_enabled: formFields.boolean_switch.describe('Prioritize members over guests'),
  community_primary_color: formFields.text
    .describe('Primary color // #F15F22')
    .refine(isPrimaryColorValid, { message: 'Use hex like #F15F22' }),
  confirmation_window_hours_before_kickoff: formFields.number
    .min(0)
    .describe('Confirmation window (hours) // 24'),
  confirmation_reminders_local_times: formFields.text.describe('Confirmation reminders (local) // 09:00, 12:00, 15:00'),
  crunch_time_enabled: formFields.boolean_switch.describe('Crunch time enabled'),
  crunch_time_start_time_local: formFields.text.min(1).describe('Crunch time start (local) // 17:00'),
  game_notification_times_local: formFields.text.describe('Game notifications (local) // 09:00, 12:00'),
})

type CommunitySettingsValues = z.infer<typeof CommunitySettingsSchema>

export const CommunitySettingsScreen = ({ scrollProps, headerSpacer, topInset }: ScrollHeaderProps = {}) => {
  const { isAdmin } = useUser()
  const toast = useToastController()
  const showFloatingCta = !isWeb
  const submitRef = useRef<(() => void) | null>(null)
  const { primaryColor, logo } = useBrand()
  const apiUtils = api.useUtils()

  const { data: defaults, isLoading, error } = api.community.defaults.useQuery(undefined, {
    enabled: isAdmin,
  })
  const mutation = api.community.updateDefaults.useMutation({
    onSuccess: (data) => {
      apiUtils.community.defaults.setData(undefined, data)
      apiUtils.community.branding.setData(undefined, {
        logoUrl: data.logoUrl ?? null,
        primaryColor: data.primaryColor ?? null,
      })
      toast.show('Community defaults updated')
    },
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
      community_primary_color: defaults?.primaryColor ?? '',
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
      onSubmit={(values) => {
        const normalizedPrimary = normalizeHexColor(values.community_primary_color)
        const primaryColor =
          normalizedPrimary && isValidHexColor(normalizedPrimary) ? normalizedPrimary : null
        return mutation.mutate({
          communityTimezone: values.community_timezone.trim(),
          communityPriorityEnabled: values.community_priority_enabled,
          communityPrimaryColor: primaryColor,
          confirmationWindowHoursBeforeKickoff: values.confirmation_window_hours_before_kickoff,
          confirmationRemindersLocalTimes: parseTimeList(values.confirmation_reminders_local_times),
          crunchTimeEnabled: values.crunch_time_enabled,
          crunchTimeStartTimeLocal: values.crunch_time_start_time_local.trim(),
          gameNotificationTimesLocal: parseTimeList(values.game_notification_times_local),
        })
      }}
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
                  Defaults apply to all new games. Existing games keep their own settings.
                </Paragraph>
              </YStack>
              <SettingSection
                title="General"
                note="Set the community timezone and roster priority. All times below use this timezone."
              >
                <SettingRowText
                  name="community_timezone"
                  label="Timezone"
                  placeholder="America/New_York"
                  description="All times follow this timezone."
                />
                <SettingRowSwitch
                  name="community_priority_enabled"
                  label="Prioritize members over guests"
                  description="Members are placed ahead of guests in rosters."
                />
              </SettingSection>
              <SettingSection
                title="Branding"
                note="Logo and primary color show across the app."
              >
                <SettingRowLogo
                  label="Community logo"
                  description="Used in headers, auth, and watermark."
                  communityId={defaults?.id}
                  logo={logo}
                />
                <SettingRowColor
                  name="community_primary_color"
                  label="Primary color"
                  placeholder="#F15F22"
                  description="Used for buttons and highlights."
                  fallbackColor={primaryColor}
                />
              </SettingSection>
              <SettingSection
                title="Confirmations"
                note="Players can confirm within the window. Reminders send at the times below."
              >
                <SettingRowNumber
                  name="confirmation_window_hours_before_kickoff"
                  label="Confirmation window (hours)"
                  placeholder="24"
                  width={80}
                  description="Players can confirm within this window before kickoff."
                />
                <SettingRowText
                  name="confirmation_reminders_local_times"
                  label="Reminder times"
                  placeholder="09:00, 12:00, 15:00"
                  width={160}
                  description="Times are local to the community timezone."
                />
              </SettingSection>
              <SettingSection
                title="Crunch time"
                note="Crunch time opens unclaimed spots to the waitlist at the start time."
              >
                <SettingRowSwitch
                  name="crunch_time_enabled"
                  label="Crunch time enabled"
                  description="Enables waitlist claims at the crunch time start."
                />
                <CrunchTimeStartRow />
              </SettingSection>
              <SettingSection
                title="Game notifications"
                note="Set the default notification times for rostered players."
              >
                <SettingRowText
                  name="game_notification_times_local"
                  label="Game notification times (local)"
                  placeholder="09:00, 12:00"
                  width={160}
                  description="Default reminder times for rostered players."
                />
              </SettingSection>
              <BrandStamp />
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
      <YStack bw={1} boc="$color12" br="$6" overflow="hidden" backgroundColor="$background">
        <SettingRowGroup>{children}</SettingRowGroup>
      </YStack>
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
          {index < rows.length - 1 ? <Separator bw="$0.5" boc="$color12" /> : null}
        </Fragment>
      ))}
    </YStack>
  )
}

const SettingRow = ({
  label,
  children,
  description,
  error,
}: {
  label: string
  children: ReactNode
  description?: string
  error?: string
}) => {
  return (
    <YStack px="$4" py="$3" gap="$2">
      <XStack ai="center" jc="space-between" minHeight={44} gap="$3">
        <SizableText size="$3" fontWeight="600" color="$color" flex={1} numberOfLines={2}>
          {label}
        </SizableText>
        {children}
      </XStack>
      {description ? (
        <Paragraph theme="alt2" size="$2">
          {description}
        </Paragraph>
      ) : null}
      <FieldError message={error} />
    </YStack>
  )
}

const LOGO_SIZE = 48

type LogoSource = ComponentProps<typeof SolitoImage>['src']

const SettingRowLogo = ({
  label,
  description,
  communityId,
  logo,
}: {
  label: string
  description?: string
  communityId?: string | null
  logo: LogoSource
}) => {
  return (
    <SettingRow label={label} description={description}>
      <UploadCommunityLogo communityId={communityId}>
        <YStack
          w={LOGO_SIZE}
          h={LOGO_SIZE}
          br={LOGO_SIZE / 2}
          overflow="hidden"
          bg="$color2"
          borderWidth={1}
          borderColor="$color8"
          ai="center"
          jc="center"
        >
          <SolitoImage src={logo} alt="Community logo" width={LOGO_SIZE} height={LOGO_SIZE} />
        </YStack>
      </UploadCommunityLogo>
    </SettingRow>
  )
}

const SettingRowColor = ({
  name,
  label,
  placeholder,
  description,
  fallbackColor,
}: {
  name: keyof CommunitySettingsValues
  label: string
  placeholder?: string
  description?: string
  fallbackColor: string
}) => {
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const value = typeof field.value === 'string' ? field.value : ''
  const normalized = normalizeHexColor(value)
  const swatchColor =
    normalized && isValidHexColor(normalized) ? normalized : fallbackColor

  return (
    <SettingRow
      label={label}
      description={description}
      error={fieldState.error?.message}
    >
      <XStack ai="center" gap="$2">
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
          width={120}
          maxWidth="60%"
          fontSize={15}
          color="$color"
          borderWidth={0}
          backgroundColor="transparent"
          px={0}
          py={0}
          opacity={disabled ? 0.6 : 1}
          maxLength={7}
        />
        <YStack
          w={20}
          h={20}
          br={6}
          backgroundColor={swatchColor}
          borderWidth={1}
          borderColor="$color6"
        />
      </XStack>
    </SettingRow>
  )
}

const SettingRowSwitch = ({
  name,
  label,
  description,
}: {
  name: keyof CommunitySettingsValues
  label: string
  description?: string
}) => {
  const { primaryColor } = useBrand()
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting
  const checked = Boolean(field.value)

  return (
    <SettingRow
      label={label}
      description={description}
      error={fieldState.error?.message}
    >
      <Switch
        native
        size="$2"
        disabled={disabled}
        checked={checked}
        onCheckedChange={(next) => field.onChange(next)}
        backgroundColor={checked ? primaryColor : '$color5'}
        borderColor={checked ? primaryColor : '$color6'}
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
  description,
}: {
  name: keyof CommunitySettingsValues
  label: string
  placeholder?: string
  width?: number
  disabled?: boolean
  description?: string
}) => {
  const { control, formState } = useFormContext<CommunitySettingsValues>()
  const { field, fieldState } = useController({ control, name })
  const disabled = formState.isSubmitting || disabledOverride
  const value = typeof field.value === 'string' ? field.value : ''

  return (
    <SettingRow
      label={label}
      description={description}
      error={fieldState.error?.message}
    >
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
  description,
}: {
  name: keyof CommunitySettingsValues
  label: string
  placeholder?: string
  width?: number
  description?: string
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
    <SettingRow
      label={label}
      description={description}
      error={fieldState.error?.message}
    >
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
      description="Crunch time start is the cutoff. After this time, waitlisted players can claim open spots. First to open and claim takes it."
    />
  )
}
