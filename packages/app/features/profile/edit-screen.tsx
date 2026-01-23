import {
  Button,
  Card,
  FieldError,
  Fieldset,
  FormWrapper,
  FullscreenSpinner,
  Paragraph,
  Label,
  isWeb,
  SizableText,
  SubmitButton,
  Theme,
  XStack,
  YStack,
  useToastController,
} from '@my/ui/public'
import { Alert, type ScrollViewProps } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SCREEN_CONTENT_PADDING } from 'app/constants/layout'
import { useBrand } from 'app/provider/brand'
import { useThemeSetting } from 'app/provider/theme'
import { CountryPicker } from 'app/components/CountryPicker'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { SectionHeading } from 'app/components/SectionHeading'
import { UserAvatar } from 'app/components/UserAvatar'
import { SchemaForm } from 'app/utils/SchemaForm'
import { formatPhoneDisplay, getPhoneCountryOptions, parsePhoneToE164, type PhoneCountryOption } from 'app/utils/phone'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useUser } from 'app/utils/useUser'
import { UploadAvatar } from 'app/features/settings/components/upload-avatar'
import { BrandStamp } from 'app/components/BrandStamp'
import { InfoPopup } from 'app/components/InfoPopup'
import { useAppRouter } from 'app/utils/useAppRouter'
import { type ReactNode, useRef, useState } from 'react'
import { createParam } from 'solito'
import { useController, useFormContext } from 'react-hook-form'
import { LinearGradient } from '@tamagui/linear-gradient'
import { HelpCircle } from '@tamagui/lucide-icons'

import { api } from '../../utils/api'
import {
  emptyBirthDateParts,
  formatBirthDateParts,
  parseBirthDateParts,
  type BirthDateParts,
} from '../../utils/birthDate'
import {
  profileUpdateFieldSchema,
  POSITION_OPTIONS,
  type ProfileUpdateFieldValues,
} from './profile-field-schema'
import { StatePicker } from './state-picker'

const { useParams } = createParam<{ edit_name?: '1' }>()
export const EditProfileScreen = (props: ScrollHeaderProps) => {
  return <ProfileFormScreen floatingCta {...props} />
}

const ProfileSchema = profileUpdateFieldSchema

type ProfileFormScreenProps = {
  submitLabel?: string
  onComplete?: () => void
  showStatusBadge?: boolean
  floatingCta?: boolean
  variant?: 'default' | 'immersive'
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const ProfileFormScreen = ({
  submitLabel,
  onComplete,
  showStatusBadge = true,
  floatingCta = false,
  variant = 'default',
  scrollProps,
  headerSpacer,
  topInset,
}: ProfileFormScreenProps & ScrollHeaderProps) => {
  const { profile, user } = useUser()

  if (!profile || !user?.id) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }
  const approvalStatus = profile.approval_status === 'approved' ? 'approved' : 'pending'
  return (
    <EditProfileForm
      userId={user.id}
      initial={buildProfileFormInitial(profile, user)}
      avatarUrl={profile.avatar_url ?? null}
      submitLabel={submitLabel}
      approvalStatus={approvalStatus}
      showStatusBadge={showStatusBadge}
      onComplete={onComplete}
      floatingCta={floatingCta}
      variant={variant}
      scrollProps={scrollProps}
      headerSpacer={headerSpacer}
    />
  )
}

const EditProfileForm = ({
  initial,
  avatarUrl,
  userId,
  submitLabel = 'Update Profile',
  approvalStatus,
  showStatusBadge = true,
  onComplete,
  floatingCta = false,
  showBrandAccent = false,
  variant = 'default',
  scrollProps,
  headerSpacer,
  topSection,
}: {
  initial: ProfileFormInitial
  avatarUrl: string | null
  userId: string
  submitLabel?: string
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  showStatusBadge?: boolean
  onComplete?: () => void
  floatingCta?: boolean
  showBrandAccent?: boolean
  variant?: 'default' | 'immersive'
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topSection?: ReactNode
}) => {
  const { params } = useParams()
  const showFloatingCta = floatingCta && !isWeb
  const isImmersive = variant === 'immersive'
  const { primaryColor } = useBrand()
  const { resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const glassBackground = isDark ? 'rgba(9, 14, 20, 0.72)' : 'rgba(255, 255, 255, 0.82)'
  const submitRef = useRef<(() => void) | null>(null)
  const [profileInfoOpen, setProfileInfoOpen] = useState(false)
  const [playerInfoOpen, setPlayerInfoOpen] = useState(false)
  const [locationInfoOpen, setLocationInfoOpen] = useState(false)
  const supabase = useSupabase()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const router = useAppRouter()
  const apiUtils = api.useUtils()
  const mutation = useMutation({
    async mutationFn(data: ProfileUpdateFieldValues) {
      const birthDate = formatBirthDateParts(data.birthDate)
      if (!birthDate) {
        throw new Error('Enter a valid birth date.')
      }
      const normalizedPhone = parsePhoneToE164(data.phone, 'US')
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          email: data.email.trim(),
          phone: normalizedPhone ?? data.phone.trim(),
          address: data.address?.trim() || null,
          city: data.city.trim(),
          state: data.state.trim().toUpperCase(),
          nationality: data.nationality?.trim() || null,
          name: `${data.firstName} ${data.lastName}`.trim(),
          birth_date: birthDate,
          jersey_number: data.jerseyNumber,
          position: data.position?.length ? data.position.join(',') : null,
          approval_status: approvalStatus,
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle()
      if (error) {
        throw new Error(error.message)
      }
      if (!updated?.id) {
        throw new Error('Unable to update profile.')
      }
    },

    async onSuccess() {
      toast.show('Successfully updated!')
      await queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      await apiUtils.greeting.invalidate()
      if (onComplete) {
        onComplete()
        return
      }
      router.back()
    },

    onError(error: Error) {
      toast.show('Unable to update profile', { message: error.message })
    },
  })
  const handleAvatarUpdated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['members', 'approved'] }),
    ])
    await apiUtils.greeting.invalidate()
  }

  const displayName = buildProfileDisplayName(initial)
  const statusLabel = buildProfileStatusLabel(approvalStatus)
  const mergedScrollProps = {
    ...scrollProps,
    contentInsetAdjustmentBehavior: 'never',
    automaticallyAdjustKeyboardInsets: true,
    keyboardDismissMode: 'on-drag',
  }
  const profileInfoBullets = [
    'Your name appears on your player card.',
    'Email is used for invites and updates.',
    'Phone is verified and can only be changed by an admin.',
  ]
  const playerInfoBullets = [
    'Select every position you play.',
    'Birth date is used for eligibility and birthdays.',
    'Jersey number helps teammates identify you.',
  ]
  const locationInfoBullets = [
    'Add your street address, city, and state.',
    'Shown on your player card.',
    'Keep it current if you move.',
  ]
  const handleSubmit = () => submitRef.current?.()
  const renderAfter = showFloatingCta
    ? ({ submit }: { submit: () => void }) => {
        submitRef.current = submit
        return null
      }
    : ({ submit }: { submit: () => void }) => (
        <Theme inverse>
          <YStack>
            <SubmitButton disabled={mutation.isPending} onPress={() => submit()}>
              {mutation.isPending ? 'Saving…' : submitLabel}
            </SubmitButton>
          </YStack>
        </Theme>
      )

  const renderHeader = () => (
    <YStack ai="center" gap="$3" mb="$3">
      {isImmersive ? (
        <YStack ai="center" gap="$2">
          <YStack position="relative" ai="center" jc="center">
            <YStack
              position="absolute"
              width={210}
              height={210}
              br={999}
              bg={primaryColor}
              opacity={0.18}
              style={isWeb ? { filter: 'blur(40px)' } : undefined}
            />
            <UploadAvatar
              profileId={userId}
              avatarUrl={avatarUrl}
              onComplete={handleAvatarUpdated}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,120,48,0.6)', 'rgba(7,12,20,0.9)']
                    : ['rgba(255,120,48,0.35)', 'rgba(255,255,255,0.95)']
                }
                start={[0.1, 0.1]}
                end={[1, 1]}
                br={999}
                p="$1.5"
              >
                <YStack
                  br={999}
                  p="$1.5"
                  bg={isDark ? 'rgba(6,10,16,0.9)' : '$color1'}
                  shadowColor={primaryColor}
                  shadowOpacity={0.35}
                  shadowRadius={24}
                  elevation={10}
                >
                  <UserAvatar size={136} name={displayName} avatarUrl={avatarUrl} />
                </YStack>
              </LinearGradient>
            </UploadAvatar>
          </YStack>
          <SizableText size="$7" fontWeight="700" textAlign="center">
            Your Player Card
          </SizableText>
          {showStatusBadge ? <StatusBadge label={statusLabel} /> : null}
          <Paragraph color="$color12" size="$3" textAlign="center">
            The essentials for lineups, access, and stats.
          </Paragraph>
          {showBrandAccent || isImmersive ? (
            <YStack h={2} w={64} br={999} bg={primaryColor} />
          ) : null}
          <Paragraph
            color="$color12"
            size="$2"
            textTransform="uppercase"
            letterSpacing={1.5}
            mt="$2"
          >
            Set up profile
          </Paragraph>
        </YStack>
      ) : (
        <YStack ai="center" gap="$2">
          <UploadAvatar
            profileId={userId}
            avatarUrl={avatarUrl}
            onComplete={handleAvatarUpdated}
          >
            <UserAvatar size={128} name={displayName} avatarUrl={avatarUrl} />
          </UploadAvatar>
          <SizableText size="$7" fontWeight="700" textAlign="center">
            Your Player Card
          </SizableText>
          {showStatusBadge ? <StatusBadge label={statusLabel} /> : null}
          <Paragraph color="$color12" size="$2" textAlign="center">
            The essentials for lineups, access, and stats.
          </Paragraph>
          {showBrandAccent ? <YStack h={2} w={56} br={999} bg={primaryColor} /> : null}
          <Paragraph
            color="$color12"
            size="$2"
            textTransform="uppercase"
            letterSpacing={1.5}
            mt="$2"
          >
            Set up profile
          </Paragraph>
        </YStack>
      )}
    </YStack>
  )

  const SectionPanel = ({
    title,
    description,
    onInfoPress,
    infoLabel,
    children,
  }: {
    title: string
    description: string
    onInfoPress?: () => void
    infoLabel?: string
    children: ReactNode
  }) =>
    isImmersive ? (
      <YStack
        borderWidth={1}
        borderColor="$color12"
        borderRadius={20}
        p={0}
        bg={glassBackground}
        overflow="hidden"
        shadowColor={isDark ? '#00000066' : '#00000022'}
        shadowOpacity={0.18}
        shadowRadius={18}
        elevation={6}
        style={isWeb ? { backdropFilter: 'blur(14px)' } : undefined}
      >
        <Theme inverse>
          <YStack
            p="$4"
            gap="$1"
            borderBottomWidth={1}
            borderBottomColor="$color12"
            backgroundColor="$color1"
          >
            <XStack ai="center" jc="space-between" gap="$2">
              <SectionHeading>{title}</SectionHeading>
              {onInfoPress ? (
                <Button
                  chromeless
                  size="$2"
                  p="$1"
                  onPress={onInfoPress}
                  aria-label={infoLabel ?? `${title} info`}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Button.Icon>
                    <HelpCircle size={18} color="$color12" />
                  </Button.Icon>
                </Button>
              ) : null}
            </XStack>
            <Paragraph color="$color12" size="$2">
              {description}
            </Paragraph>
          </YStack>
        </Theme>
        <YStack p="$4" gap="$3" backgroundColor="$color1">
          {children}
        </YStack>
      </YStack>
    ) : (
      <Card bordered bw={1} boc="$color12" br="$5" p={0} overflow="hidden" backgroundColor="$color2">
        <Theme inverse>
          <YStack
            p="$4"
            gap="$1"
            borderBottomWidth={1}
            borderBottomColor="$color12"
            backgroundColor="$color1"
          >
            <XStack ai="center" jc="space-between" gap="$2">
              <SectionHeading>{title}</SectionHeading>
              {onInfoPress ? (
                <Button
                  chromeless
                  size="$2"
                  p="$1"
                  onPress={onInfoPress}
                  aria-label={infoLabel ?? `${title} info`}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Button.Icon>
                    <HelpCircle size={18} color="$color12" />
                  </Button.Icon>
                </Button>
              ) : null}
            </XStack>
            <Paragraph color="$color12" size="$2">
              {description}
            </Paragraph>
          </YStack>
        </Theme>
        <YStack p="$4" gap="$3" backgroundColor="$color1">
          {children}
        </YStack>
      </Card>
    )

  return (
    <YStack f={1} position="relative" bg="$color1">
      {isImmersive ? (
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,120,48,0.35)', 'rgba(6,10,16,0.96)']
              : ['rgba(255,120,48,0.2)', 'rgba(255,255,255,0.95)']
          }
          start={[0, 0]}
          end={[1, 1]}
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          pointerEvents="none"
        />
      ) : null}
      <FormWrapper jc="flex-start" zIndex={1} bg="transparent">
      <SchemaForm
        bare
        schema={ProfileSchema}
        props={{
          firstName: {
            autoFocus: !!params?.edit_name,
          },
          phone: {
            inputMode: 'tel',
            disabled: true,
            bg: '$white1',
            borderColor: '$color8',
            color: '$color10',
            opacity: 0.7,
          } as any,
          address: {
            autoCapitalize: 'words',
          },
          city: {
            autoCapitalize: 'words',
          },
        }}
        defaultValues={{
          firstName: initial.firstName,
          lastName: initial.lastName,
          email: initial.email,
          phone: initial.phone,
          address: initial.address,
          city: initial.city,
          state: initial.state,
          nationality: initial.nationality,
          birthDate: initial.birthDate,
          jerseyNumber: initial.jerseyNumber,
          position: initial.position ?? [],
        }}
        onSubmit={(values) => mutation.mutate(values)}
        renderAfter={renderAfter}
      >
        {(fields) => (
          <>
            <FormWrapper.Body
              p={0}
              px={SCREEN_CONTENT_PADDING.horizontal}
              pt={headerSpacer ? 0 : SCREEN_CONTENT_PADDING.top}
              pb={SCREEN_CONTENT_PADDING.bottom}
              scrollProps={mergedScrollProps}
            >
              {headerSpacer}
              {renderHeader()}
              <YStack gap="$4">
                {topSection}
                <SectionPanel
                  title="1. Profile"
                  description="Your name, your identity — show up the right way."
                  onInfoPress={() => setProfileInfoOpen(true)}
                  infoLabel="Profile info"
                >
                  <XStack gap="$3">
                    <YStack f={1}>{fields.firstName}</YStack>
                    <YStack f={1}>{fields.lastName}</YStack>
                  </XStack>
                  <YStack gap="$1">
                    {fields.email}
                    <Paragraph color="$color12" size="$2">
                      For invites and updates.
                    </Paragraph>
                  </YStack>
                  <YStack gap="$1">
                    {fields.phone}
                    <Paragraph color="$color12" size="$2">
                      Verified. Ask an admin to change.
                    </Paragraph>
                  </YStack>
                </SectionPanel>
                <SectionPanel
                  title="2. Player"
                  description="Roles, number, and eligibility — your on-field stamp."
                  onInfoPress={() => setPlayerInfoOpen(true)}
                  infoLabel="Player info"
                >
                  <PositionCheckboxes />
                  <NationalityField />
                  <XStack gap="$3" $sm={{ fd: 'column' }}>
                    <YStack f={1} gap="$1">
                      {fields.jerseyNumber}
                      <Paragraph color="$color12" size="$2">
                        1-99. Match your kit.
                      </Paragraph>
                    </YStack>
                    <YStack f={1} gap="$1">
                      {fields.birthDate}
                      <Paragraph color="$color12" size="$2">
                        Used for eligibility and birthdays.
                      </Paragraph>
                    </YStack>
                  </XStack>
                </SectionPanel>
                <SectionPanel
                  title="3. Location"
                  description="Represent your city."
                  onInfoPress={() => setLocationInfoOpen(true)}
                  infoLabel="Location info"
                >
                  <YStack gap="$3">
                    {fields.address}
                    <XStack gap="$3">
                      <YStack f={1}>{fields.city}</YStack>
                      <YStack f={1}>
                        <StateField />
                      </YStack>
                    </XStack>
                  </YStack>
                </SectionPanel>
                {isImmersive ? <BrandStamp size={84} /> : null}
              </YStack>
            </FormWrapper.Body>
            <InfoPopup
              open={profileInfoOpen}
              onOpenChange={setProfileInfoOpen}
              title="Profile"
              description="These details define how you appear to the community."
              bullets={profileInfoBullets}
              footer="Keep them accurate so teammates can reach you."
            />
            <InfoPopup
              open={playerInfoOpen}
              onOpenChange={setPlayerInfoOpen}
              title="Player"
              description="Your on-field identity for lineups and rosters."
              bullets={playerInfoBullets}
              footer="Update anytime as your role changes."
            />
            <InfoPopup
              open={locationInfoOpen}
              onOpenChange={setLocationInfoOpen}
              title="Location"
              description="Where you represent the community."
              bullets={locationInfoBullets}
            />
            {showFloatingCta ? (
              <FloatingSubmitBar
                label={mutation.isPending ? 'Saving…' : submitLabel}
                onPress={handleSubmit}
                disabled={mutation.isPending}
              />
            ) : null}
          </>
        )}
      </SchemaForm>
      </FormWrapper>
    </YStack>
  )
}

const FloatingSubmitBar = ({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled: boolean
}) => {
  return (
    <FloatingCtaDock transparent>
      <Theme inverse>
        <XStack>
          <SubmitButton flex={1} onPress={onPress} disabled={disabled}>
            {label}
          </SubmitButton>
        </XStack>
      </Theme>
    </FloatingCtaDock>
  )
}

type ProfileRow = {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  nationality: string | null
  birth_date: string | null
  jersey_number: number | null
  position: string | null
}

type ProfileFormInitial = {
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  city: string
  state: string
  nationality: string
  birthDate: BirthDateParts
  jerseyNumber?: number
  position: string[]
}

const buildProfileFormInitial = (
  profile: ProfileRow,
  user?: { email?: string | null; phone?: string | null }
) => {
  const rawPhone = profile.phone ?? user?.phone ?? ''
  const phone = formatPhoneDisplay(rawPhone) || rawPhone
  return {
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    email: profile.email ?? user?.email ?? '',
    phone,
    address: profile.address ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    nationality: profile.nationality ?? '',
    birthDate: parseBirthDateParts(profile.birth_date) ?? emptyBirthDateParts(),
    jerseyNumber: profile.jersey_number ?? undefined,
    position: profile.position
      ? profile.position.split(',').map((p) => p.trim()).filter(Boolean)
      : [],
  }
}

const buildProfileDisplayName = (initial: ProfileFormInitial) => {
  const name = [initial.firstName, initial.lastName].filter(Boolean).join(' ').trim()
  return name || 'Member profile'
}

const buildProfileStatusLabel = (status: 'draft' | 'pending' | 'approved' | 'rejected') => {
  if (status === 'approved') return 'Membership Active'
  if (status === 'draft') return 'Setup needed'
  if (status === 'rejected') return 'Application not approved'
  return 'Review pending'
}

const formatRoleLabel = (role?: string | null) => {
  if (role === 'owner') return 'Owner'
  if (role === 'admin') return 'Admin'
  return 'Member'
}

const StatusBadge = ({ label }: { label: string }) => {
  return (
    <XStack
      ai="center"
      jc="center"
      px="$2.5"
      py="$1"
      borderRadius="$10"
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <Paragraph size="$2" fontWeight="600">
        {label}
      </Paragraph>
    </XStack>
  )
}

export const AdminProfileEditScreen = ({
  profileId,
  scrollProps,
  headerSpacer,
  topInset,
}: { profileId: string } & ScrollHeaderProps) => {
  const { isAdmin, isOwner, isLoading } = useUser()
  const { activeCommunityId } = useActiveCommunity()
  const supabase = useSupabase()
  const router = useAppRouter()
  const toast = useToastController()
  const queryClient = useQueryClient()
  const utils = api.useUtils()
  const profileQuery = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, avatar_url, first_name, last_name, email, phone, address, city, state, nationality, birth_date, jersey_number, position, approval_status'
        )
        .eq('id', profileId)
        .single()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: isAdmin && !isLoading && !!profileId,
  })
  const membershipQuery = api.members.list.useQuery(
    { communityId: activeCommunityId ?? '' },
    { enabled: isAdmin && !isLoading && Boolean(activeCommunityId) }
  )
  const membership = membershipQuery.data?.find((member) => member.id === profileId) ?? null
  const membershipRole = membership?.role ?? 'member'
  const updateRoleMutation = api.members.updateRole.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', profileId] }),
        activeCommunityId
          ? utils.members.list.invalidate({ communityId: activeCommunityId })
          : Promise.resolve(),
        activeCommunityId
          ? utils.members.pending.invalidate({ communityId: activeCommunityId })
          : Promise.resolve(),
      ])
      toast.show('Role updated')
    },
    onError: (error) => {
      toast.show('Unable to update role', { message: error.message })
    },
  })

  if (isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (!isAdmin) {
    return (
      <YStack f={1} ai="center" jc="center" px="$6" gap="$2" pt={topInset ?? 0}>
        <SizableText size="$6" fontWeight="700">
          Admin access only
        </SizableText>
        <Paragraph color="$color12" textAlign="center">
          Talk to a club steward if you need approval access.
        </Paragraph>
      </YStack>
    )
  }

  if (profileQuery.isLoading) {
    return (
      <YStack f={1} ai="center" jc="center" pt={topInset ?? 0}>
        <FullscreenSpinner />
      </YStack>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <YStack f={1} ai="center" jc="center" px="$4" gap="$3" pt={topInset ?? 0}>
        <Paragraph color="$color12">
          {profileQuery.isError ? 'Unable to load this member.' : 'Member not found.'}
        </Paragraph>
        <XStack gap="$2">
          {profileQuery.isError ? (
            <Button onPress={() => profileQuery.refetch()} disabled={profileQuery.isFetching}>
              {profileQuery.isFetching ? 'Refreshing...' : 'Retry'}
            </Button>
          ) : null}
          <Button onPress={() => router.back()}>Go back</Button>
        </XStack>
      </YStack>
    )
  }

  const approvalStatus = profileQuery.data.approval_status ?? 'pending'
  const initial = buildProfileFormInitial(profileQuery.data, {
    email: profileQuery.data.email,
    phone: profileQuery.data.phone,
  })
  const roleLabel = formatRoleLabel(membershipRole)
  const canUpdateRole = isOwner

  const handleRoleChange = () => {
    if (!canUpdateRole || updateRoleMutation.isPending) return
    Alert.alert('Set role', 'Choose a role for this member.', [
      {
        text: 'Owner',
        onPress: () => {
          if (membershipRole === 'owner' || !activeCommunityId) return
          updateRoleMutation.mutate({ communityId: activeCommunityId, profileId, role: 'owner' })
        },
      },
      {
        text: 'Admin',
        onPress: () => {
          if (membershipRole === 'admin' || !activeCommunityId) return
          updateRoleMutation.mutate({ communityId: activeCommunityId, profileId, role: 'admin' })
        },
      },
      {
        text: 'Member',
        onPress: () => {
          if (membershipRole === 'member' || !activeCommunityId) return
          updateRoleMutation.mutate({ communityId: activeCommunityId, profileId, role: 'member' })
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const roleSection = (
    <Card bordered bw={1} boc="$color12" br="$5" p="$4">
      <YStack gap="$3">
        <YStack gap="$1">
          <SizableText size="$5" fontWeight="700">
            Role
          </SizableText>
          <Paragraph color="$color12" size="$2">
            Controls who can manage games, rosters, and approvals.
          </Paragraph>
        </YStack>
        <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
          <SizableText size="$4" fontWeight="600">
            {roleLabel}
          </SizableText>
          {canUpdateRole ? (
            <Button
              size="$2"
              variant="outlined"
              disabled={updateRoleMutation.isPending}
              onPress={handleRoleChange}
            >
              Change role
            </Button>
          ) : null}
        </XStack>
        {!canUpdateRole ? (
          <Paragraph color="$color12" size="$2">
            Only owners can change roles.
          </Paragraph>
        ) : null}
      </YStack>
    </Card>
  )

  return (
    <EditProfileForm
      userId={profileId}
      initial={initial}
      avatarUrl={profileQuery.data.avatar_url ?? null}
      approvalStatus={approvalStatus}
      submitLabel="Save changes"
      floatingCta
      showBrandAccent
      topSection={roleSection}
      onComplete={() => {
        void queryClient.invalidateQueries({ queryKey: ['member-approvals', 'pending'] })
        router.back()
      }}
      scrollProps={scrollProps}
      headerSpacer={headerSpacer}
    />
  )
}

const NationalityField = () => {
  const { control, formState } = useFormContext<ProfileUpdateFieldValues>()
  const { field, fieldState } = useController({ control, name: 'nationality' })
  const options = getPhoneCountryOptions()
  const value = (field.value || null) as PhoneCountryOption['code'] | null
  const selected = value ? options.find((option) => option.code === value) ?? null : null
  const errorMessage = fieldState.error?.message

  return (
    <Theme name={errorMessage ? 'red' : null} forceClassName>
      <Fieldset>
        <Label color="$color12" size="$3">
          Nationality
        </Label>
        <YStack borderWidth={1} borderColor="$color12" borderRadius={12} backgroundColor="$white1">
          <CountryPicker
            value={value}
            onChange={(code) => field.onChange(code)}
            selected={selected}
            options={options}
            disabled={formState.isSubmitting}
            variant="country"
            title="Select nationality"
            placeholder="Select country"
            popularCountries={['US', 'AR', 'BR', 'GB', 'DE', 'ES']}
            triggerProps={{ px: '$3', py: '$3', minHeight: 48 }}
          />
        </YStack>
        <FieldError message={errorMessage} />
      </Fieldset>
    </Theme>
  )
}

const StateField = () => {
  const { control, formState } = useFormContext<ProfileUpdateFieldValues>()
  const { field, fieldState } = useController({ control, name: 'state' })
  const errorMessage = fieldState.error?.message
  const value = typeof field.value === 'string' ? field.value : ''
  const triggerTextColor = value ? '$color12' : '$color10'

  return (
    <Theme name={errorMessage ? 'red' : null} forceClassName>
      <Fieldset>
        <Label color="$color12" size="$3">
          State
        </Label>
        <YStack borderWidth={1} borderColor="$color12" borderRadius={12} backgroundColor="$white1">
          <StatePicker
            value={value || null}
            onChange={(code) => field.onChange(code)}
            disabled={formState.isSubmitting}
            placeholder="Select state"
            title="Select state"
            triggerTextColor={triggerTextColor}
            triggerIconColor="$color12"
            triggerProps={{ px: '$3', py: '$3', minHeight: 48 }}
          />
        </YStack>
        <FieldError message={errorMessage} />
      </Fieldset>
    </Theme>
  )
}

const PositionCheckboxes = () => {
  const { primaryColor } = useBrand()
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ProfileUpdateFieldValues>()
  const selected = watch('position') ?? []
  const positionError = errors.position
  const errorMessage =
    typeof positionError?.message === 'string'
      ? positionError.message
      : (positionError as { errorMessage?: string } | undefined)?.errorMessage

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    setValue('position', next, { shouldValidate: true })
  }

  return (
    <YStack gap="$2">
      <YStack gap="$0.5">
        <Paragraph color="$color12">Positions</Paragraph>
        <Paragraph color="$color12" size="$2">
          Choose at least one.
        </Paragraph>
      </YStack>
      <XStack gap="$1.5" flexWrap="nowrap">
        {POSITION_OPTIONS.map((option) => {
          const isSelected = selected.includes(option)
          const selectedText = isSelected ? getContrastColor(primaryColor) : '$color12'
          return (
            <XStack
              key={option}
              ai="center"
              jc="center"
              f={1}
              minWidth={0}
              px="$2"
              py="$1"
              br="$10"
              borderWidth={1}
              borderColor={isSelected ? primaryColor : '$color12'}
              backgroundColor={isSelected ? primaryColor : 'transparent'}
              pressStyle={{ opacity: 0.85 }}
              hoverStyle={{ opacity: 0.9 }}
              cursor="pointer"
              onPress={() => toggle(option)}
            >
              <SizableText
                size="$1"
                fontWeight="600"
                color={selectedText}
                numberOfLines={1}
                ellipsizeMode="tail"
                textAlign="center"
              >
                {option}
              </SizableText>
            </XStack>
          )
        })}
      </XStack>
      <FieldError message={errorMessage} />
    </YStack>
  )
}

const getContrastColor = (color: string) => {
  const hex = color.replace('#', '')
  if (hex.length < 6) return '#FFFFFF'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 160 ? '#0B0B0B' : '#FFFFFF'
}
