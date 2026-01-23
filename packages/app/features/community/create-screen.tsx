import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { StyleSheet, type ScrollViewProps } from 'react-native'

import * as ImagePicker from 'expo-image-picker'
import { Check, HelpCircle } from '@tamagui/lucide-icons'
import { useController, useFormContext, type FieldPath } from 'react-hook-form'
import { z } from 'zod'

import {
  Avatar,
  Button,
  FieldError,
  Input,
  Paragraph,
  ScrollView,
  SizableText,
  Theme,
  XStack,
  YStack,
  isWeb,
  submitButtonBaseProps,
  useToastController,
} from '@my/ui/public'
import { LinearGradient } from 'tamagui/linear-gradient'

import { brandIcon } from 'app/assets'
import { FloatingCtaDock } from 'app/components/FloatingCtaDock'
import { InfoPopup } from 'app/components/InfoPopup'
import { SectionHeading } from 'app/components/SectionHeading'
import { uploadCommunityLogo } from 'app/features/community/community-logo-upload'
import { StatePicker } from 'app/features/profile/state-picker'
import { useBrand } from 'app/provider/brand'
import { useThemeSetting } from 'app/provider/theme'
import { api } from 'app/utils/api'
import { isValidHexColor, normalizeHexColor } from 'app/utils/brand'
import { formatPhoneInput, normalizePhoneDigits, parsePhoneToE164 } from 'app/utils/phone'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useActiveCommunity } from 'app/utils/useActiveCommunity'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { useAppRouter } from 'app/utils/useAppRouter'

const COMMUNITY_SPORTS = [
  'Fútbol',
  'Basketball',
  'Volleyball',
  'Pickleball',
  'Padel',
  'Other',
] as const

const COMMUNITY_NAME_MIN = 3
const COMMUNITY_NAME_MAX = 40
const COMMUNITY_NAME_PATTERN = (() => {
  try {
    return new RegExp('^[\\p{L}\\p{N} ]+$', 'u')
  } catch {
    return /^[A-Za-z0-9À-ÖØ-öø-ÿ ]+$/
  }
})()

const normalizeCommunityName = (value: string) => value.trim().replace(/\s+/g, ' ')
const normalizeSportsList = (sports: readonly string[]) => {
  const unique = new Set(sports)
  return COMMUNITY_SPORTS.filter((sport) => unique.has(sport))
}
const PRIMARY_COLOR_OPTIONS = [
  '#F15F22',
  '#E53935',
  '#D81B60',
  '#8E24AA',
  '#5E35B1',
  '#3949AB',
  '#1E88E5',
  '#039BE5',
  '#00897B',
  '#43A047',
  '#FDD835',
  '#FB8C00',
] as const

const getContrastColor = (color: string) => {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return '#FFFFFF'
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 160 ? '#0B0B0B' : '#FFFFFF'
}

const basicsInfoBullets = [
  'Use a name members will recognize in search.',
  'City and state appear on community cards.',
  'Select all sports you play - the first is the primary tag.',
  'Primary color becomes your accent across the app.',
]
const contactInfoBullets = [
  'These details are public on your community profile.',
  'Use a shared inbox or main contact line.',
  'Phone is normalized and saved in a standard format.',
]
const socialInfoBullets = [
  'Use full URLs (https://...) so links work everywhere.',
  'Shown publicly for members to follow.',
  'Optional now - you can add more later in settings.',
]

const isValidEmail = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

const isValidUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return true
  return /^https?:\/\//i.test(trimmed)
}

const isValidOptionalPhone = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return true
  return Boolean(parsePhoneToE164(trimmed, 'US'))
}

const CreateCommunitySchema = z
  .object({
    name: formFields.text,
    city: formFields.text,
    state: formFields.text,
    sports: formFields.selectMulti,
    primaryColor: formFields.text,
    contactEmail: formFields.text,
    contactPhone: formFields.text,
    contactWebsite: formFields.text,
    contactInstagram: formFields.text,
    contactX: formFields.text,
    contactYoutube: formFields.text,
    contactTiktok: formFields.text,
  })
  .superRefine((values, ctx) => {
    const normalizedName = normalizeCommunityName(values.name)
    if (
      normalizedName.length < COMMUNITY_NAME_MIN ||
      normalizedName.length > COMMUNITY_NAME_MAX
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: `Name must be ${COMMUNITY_NAME_MIN}-${COMMUNITY_NAME_MAX} characters.`,
      })
    } else if (!COMMUNITY_NAME_PATTERN.test(normalizedName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Use letters, numbers, and spaces only.',
      })
    }

    if (!values.city.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city'],
        message: 'City is required.',
      })
    }
    if (!values.state.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['state'],
        message: 'State is required.',
      })
    }

    if (!Array.isArray(values.sports) || values.sports.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sports'],
        message: 'Select at least one sport.',
      })
    } else if (!values.sports.every((item) => COMMUNITY_SPORTS.includes(item as (typeof COMMUNITY_SPORTS)[number]))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sports'],
        message: 'Select a valid sport.',
      })
    }

    const trimmedPrimary = values.primaryColor.trim()
    if (trimmedPrimary) {
      const normalized = normalizeHexColor(trimmedPrimary)
      if (!normalized || !isValidHexColor(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['primaryColor'],
          message: 'Use hex like #F15F22.',
        })
      }
    }

    if (!isValidEmail(values.contactEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactEmail'],
        message: 'Enter a valid email.',
      })
    }
    if (!isValidOptionalPhone(values.contactPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactPhone'],
        message: 'Enter a valid phone number.',
      })
    }
    if (!isValidUrl(values.contactWebsite)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactWebsite'],
        message: 'Use a full URL (https://...).',
      })
    }
    if (!isValidUrl(values.contactInstagram)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactInstagram'],
        message: 'Use a full URL (https://...).',
      })
    }
    if (!isValidUrl(values.contactX)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactX'],
        message: 'Use a full URL (https://...).',
      })
    }
    if (!isValidUrl(values.contactYoutube)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactYoutube'],
        message: 'Use a full URL (https://...).',
      })
    }
    if (!isValidUrl(values.contactTiktok)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactTiktok'],
        message: 'Use a full URL (https://...).',
      })
    }
  })

type CreateCommunityValues = z.infer<typeof CreateCommunitySchema>

const createCommunityDefaults: CreateCommunityValues = {
  name: '',
  city: '',
  state: '',
  sports: [],
  primaryColor: '',
  contactEmail: '',
  contactPhone: '',
  contactWebsite: '',
  contactInstagram: '',
  contactX: '',
  contactYoutube: '',
  contactTiktok: '',
}

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const CreateCommunityScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const toast = useToastController()
  const { primaryColor } = useBrand()
  const { resolvedTheme } = useThemeSetting()
  const isDark = resolvedTheme === 'dark'
  const glassBackground = isDark ? 'rgba(9, 14, 20, 0.72)' : 'rgba(255, 255, 255, 0.82)'
  const { profile, updateProfile } = useUser()
  const { memberships, refresh, setActiveCommunityId, setFavoriteCommunityId } =
    useActiveCommunity()
  const router = useAppRouter()
  const supabase = useSupabase()
  const showFloatingCta = !isWeb
  const phonePlaceholder = formatPhoneInput('2015550123', 'US') || '2015550123'
  const [createLogo, setCreateLogo] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(null)
  const [basicsInfoOpen, setBasicsInfoOpen] = useState(false)
  const [contactInfoOpen, setContactInfoOpen] = useState(false)
  const [socialInfoOpen, setSocialInfoOpen] = useState(false)
  const submitRef = useRef<(() => void) | null>(null)

  const apiUtils = api.useUtils()
  const createMutation = api.community.create.useMutation()
  const updateDefaultsMutation = api.community.updateDefaults.useMutation()
  const isCreating = createMutation.isPending || updateDefaultsMutation.isPending

  const createdCommunityId =
    (profile as { created_community_id?: string | null } | null)?.created_community_id ?? null
  const createdMembership = createdCommunityId
    ? memberships.find((membership) => membership.communityId === createdCommunityId) ?? null
    : null
  const createdCommunity = createdMembership?.community ?? null
  const createdApproved = createdMembership?.status === 'approved'
  const createdArchived = Boolean(createdCommunity?.archivedAt)
  const canCreate = !createdCommunityId

  useEffect(() => {
    if (!pendingCommunityId) return
    const match = memberships.find(
      (membership) =>
        membership.communityId === pendingCommunityId && membership.status === 'approved'
    )
    if (!match) return
    setActiveCommunityId(pendingCommunityId)
    void setFavoriteCommunityId(pendingCommunityId)
    setPendingCommunityId(null)
    router.replace('/')
  }, [
    memberships,
    pendingCommunityId,
    router,
    setActiveCommunityId,
    setFavoriteCommunityId,
  ])

  const handleCreate = async (values: CreateCommunityValues) => {
    if (isCreating) return
    const normalizedName = normalizeCommunityName(values.name)
    const normalizedPrimary = normalizeHexColor(values.primaryColor)
    const normalizedSports = normalizeSportsList(values.sports)
    try {
      const normalizedEmail = values.contactEmail.trim()
      const normalizedWebsite = values.contactWebsite.trim()
      const normalizedInstagram = values.contactInstagram.trim()
      const normalizedX = values.contactX.trim()
      const normalizedYoutube = values.contactYoutube.trim()
      const normalizedTiktok = values.contactTiktok.trim()
      const normalizedContactPhone = values.contactPhone.trim()
        ? parsePhoneToE164(values.contactPhone, 'US')
        : null

      const response = await createMutation.mutateAsync({
        name: normalizedName,
        city: values.city.trim(),
        state: values.state.trim().toUpperCase(),
        sports: normalizedSports,
        primaryColor: normalizedPrimary ?? null,
        contactEmail: normalizedEmail || null,
        contactPhone: normalizedContactPhone,
        websiteUrl: normalizedWebsite || null,
        instagramUrl: normalizedInstagram || null,
        xUrl: normalizedX || null,
        youtubeUrl: normalizedYoutube || null,
        tiktokUrl: normalizedTiktok || null,
      })

      if (createLogo) {
        try {
          const logoUrl = await uploadCommunityLogo({
            supabase,
            communityId: response.communityId,
            asset: createLogo,
          })
          await updateDefaultsMutation.mutateAsync({
            communityId: response.communityId,
            communityLogoUrl: logoUrl,
          })
        } catch (error) {
          console.error(error)
          toast.show('Logo upload failed', {
            message: error instanceof Error ? error.message : undefined,
          })
        }
      }

      setPendingCommunityId(response.communityId)
      await Promise.all([refresh(), apiUtils.community.listPublic.invalidate()])
      await updateProfile()
      setCreateLogo(null)
      toast.show('Community created')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create community.'
      toast.show('Unable to create community', { message })
    }
  }

  return (
    <YStack f={1} position="relative" bg="$color1">
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
      <SchemaForm
        bare
        schema={CreateCommunitySchema}
        defaultValues={createCommunityDefaults}
        onSubmit={handleCreate}
        renderAfter={({ submit }) => {
          submitRef.current = submit
          return null
        }}
      >
        {() => (
          <>
            <ScrollView
              style={{ flex: 1 }}
              {...(scrollProps ?? {})}
              contentContainerStyle={StyleSheet.flatten([
                {
                  flexGrow: 1,
                  paddingHorizontal: 24,
                  paddingBottom: showFloatingCta ? 140 : 32,
                  paddingTop: headerSpacer ? 0 : 24,
                },
                scrollProps?.contentContainerStyle,
              ])}
            >
              {headerSpacer}
              <YStack gap="$4">
                <YStack ai="center" gap="$3" mb="$3">
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
                          <Avatar circular size={136} bg="$color3">
                            {createLogo ? (
                              <Avatar.Image
                                source={{ uri: createLogo.uri, width: 160, height: 160 }}
                              />
                            ) : (
                              <Avatar.Image source={brandIcon} />
                            )}
                          </Avatar>
                        </YStack>
                      </LinearGradient>
                    </YStack>
                    {canCreate ? (
                      <XStack gap="$2" flexWrap="wrap" jc="center">
                        <Button
                          size="$2"
                          onPress={async () => {
                            if (isCreating) return
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              allowsEditing: true,
                              aspect: [1, 1],
                              quality: 1,
                            })
                            if (result.canceled) return
                            const asset = result.assets[0]
                            if (!asset) return
                            setCreateLogo(asset)
                          }}
                          height={36}
                          borderRadius={999}
                          fontSize={14}
                          fontWeight="600"
                          pressStyle={{ opacity: 0.85 }}
                          backgroundColor="$color2"
                          borderColor="$color4"
                          borderWidth={1}
                          color="$color12"
                        >
                          {createLogo ? 'Change logo' : 'Add logo'}
                        </Button>
                        {createLogo ? (
                          <Button
                            size="$2"
                            onPress={() => setCreateLogo(null)}
                            height={36}
                            borderRadius={999}
                            fontSize={14}
                            fontWeight="600"
                            pressStyle={{ opacity: 0.85 }}
                            backgroundColor="$color2"
                            borderColor="$color4"
                            borderWidth={1}
                            color="$color12"
                          >
                            Remove logo
                          </Button>
                        ) : null}
                      </XStack>
                    ) : null}
                  </YStack>
                  <SizableText size="$7" fontWeight="700" textAlign="center">
                    Your Community Card
                  </SizableText>
                  <Paragraph color="$color12" size="$3" textAlign="center">
                    Set the basics. You can edit later in settings.
                  </Paragraph>
                  <YStack h={2} w={64} br={999} bg={primaryColor} />
                  <Paragraph
                    color="$color12"
                    size="$2"
                    textTransform="uppercase"
                    letterSpacing={1.5}
                    mt="$2"
                  >
                    Set up community
                  </Paragraph>
                </YStack>

                {createdCommunityId ? (
                  <SectionPanel
                    title={createdArchived ? 'Archived community' : 'My community'}
                    description="You can only create 1 community."
                    glassBackground={glassBackground}
                    isDark={isDark}
                  >
                    {createdApproved ? (
                      <Button
                        onPress={() => {
                          if (!createdCommunityId) return
                          setActiveCommunityId(createdCommunityId)
                          void setFavoriteCommunityId(createdCommunityId)
                          router.replace(createdArchived ? '/settings/community' : '/')
                        }}
                        height={48}
                        borderRadius={999}
                        fontSize={15}
                        fontWeight="600"
                        pressStyle={{ opacity: 0.85 }}
                        backgroundColor={primaryColor}
                        borderColor={primaryColor}
                        borderWidth={1}
                        color="$background"
                      >
                        {createdArchived ? 'Archived community' : 'My community'}
                      </Button>
                    ) : (
                      <Button
                        disabled
                        height={48}
                        borderRadius={999}
                        fontSize={15}
                        fontWeight="600"
                        backgroundColor="$color2"
                        borderColor="$color4"
                        borderWidth={1}
                        color="$color11"
                      >
                        You already created a community.
                      </Button>
                    )}
                  </SectionPanel>
                ) : (
                  <>
                    <SectionPanel
                      title="1. Basics"
                      description="Your identity and location."
                      onInfoPress={() => setBasicsInfoOpen(true)}
                      infoLabel="Basics info"
                      glassBackground={glassBackground}
                      isDark={isDark}
                    >
                      <TextInputField
                        name="name"
                        label="Name"
                        placeholder="Downtown FC"
                        inputProps={{ autoCapitalize: 'words', autoCorrect: false }}
                      />

                      <XStack gap="$3">
                        <TextInputField
                          name="city"
                          label="City"
                          placeholder="Miami"
                          inputProps={{ autoCapitalize: 'words', autoCorrect: false }}
                          containerProps={{ f: 1 }}
                        />
                        <StateField name="state" label="State" />
                      </XStack>

                      <SportsField name="sports" primaryColor={primaryColor} />
                      <PrimaryColorField
                        name="primaryColor"
                        label="Primary color"
                        primaryColor={primaryColor}
                      />
                    </SectionPanel>

                    <SectionPanel
                      title="2. Contact (optional)"
                      description="Public ways to reach the community."
                      onInfoPress={() => setContactInfoOpen(true)}
                      infoLabel="Contact info"
                      glassBackground={glassBackground}
                      isDark={isDark}
                    >
                      <TextInputField
                        name="contactEmail"
                        label="Email"
                        placeholder="contact@community.com"
                        inputProps={{
                          autoCapitalize: 'none',
                          autoCorrect: false,
                          keyboardType: 'email-address',
                        }}
                      />
                      <TextInputField
                        name="contactPhone"
                        label="Phone"
                        placeholder={phonePlaceholder}
                        transform={(text) => normalizePhoneDigits(text, 'US')}
                        inputProps={{
                          autoCapitalize: 'none',
                          autoCorrect: false,
                          keyboardType: 'phone-pad',
                        }}
                      />
                      <TextInputField
                        name="contactWebsite"
                        label="Website"
                        placeholder="https://community.com"
                        inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                      />
                    </SectionPanel>

                    <SectionPanel
                      title="3. Social (optional)"
                      description="Public social links."
                      onInfoPress={() => setSocialInfoOpen(true)}
                      infoLabel="Social info"
                      glassBackground={glassBackground}
                      isDark={isDark}
                    >
                      <TextInputField
                        name="contactInstagram"
                        label="Instagram"
                        placeholder="https://instagram.com/club"
                        inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                      />
                      <TextInputField
                        name="contactX"
                        label="X"
                        placeholder="https://x.com/club"
                        inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                      />
                      <TextInputField
                        name="contactYoutube"
                        label="YouTube"
                        placeholder="https://youtube.com/@club"
                        inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                      />
                      <TextInputField
                        name="contactTiktok"
                        label="TikTok"
                        placeholder="https://tiktok.com/@club"
                        inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
                      />
                    </SectionPanel>
                  </>
                )}
              </YStack>
            </ScrollView>
            <InfoPopup
              open={basicsInfoOpen}
              onOpenChange={setBasicsInfoOpen}
              title="Basics"
              description="Set the core identity for your community."
              bullets={basicsInfoBullets}
            />
            <InfoPopup
              open={contactInfoOpen}
              onOpenChange={setContactInfoOpen}
              title="Contact"
              description="Public contact details for members and visitors."
              bullets={contactInfoBullets}
            />
            <InfoPopup
              open={socialInfoOpen}
              onOpenChange={setSocialInfoOpen}
              title="Social"
              description="Link your social profiles."
              bullets={socialInfoBullets}
            />
            {showFloatingCta && canCreate ? (
              <FloatingCtaDock transparent>
                <Theme inverse>
                  <XStack>
                    <Button
                      {...submitButtonBaseProps}
                      flex={1}
                      disabled={isCreating}
                      onPress={() => submitRef.current?.()}
                    >
                      {isCreating ? 'Creating…' : 'Create community'}
                    </Button>
                  </XStack>
                </Theme>
              </FloatingCtaDock>
            ) : null}
          </>
        )}
      </SchemaForm>
    </YStack>
  )
}

type TextInputFieldProps = {
  name: FieldPath<CreateCommunityValues>
  label: string
  placeholder?: string
  transform?: (value: string) => string
  inputProps?: Partial<ComponentProps<typeof Input>>
  containerProps?: Partial<ComponentProps<typeof YStack>>
}

const TextInputField = ({
  name,
  label,
  placeholder,
  transform,
  inputProps,
  containerProps,
}: TextInputFieldProps) => {
  const { control, formState } = useFormContext<CreateCommunityValues>()
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' ? field.value : ''
  const disabled = Boolean(formState.isSubmitting || inputProps?.disabled)

  return (
    <YStack gap="$2" {...containerProps}>
      <Paragraph fontWeight="600">{label}</Paragraph>
      <Input
        value={value}
        onChangeText={(text) => field.onChange(transform ? transform(text) : text)}
        onBlur={field.onBlur}
        ref={field.ref}
        placeholder={placeholder}
        placeholderTextColor="$color10"
        borderRadius={12}
        borderColor="$color12"
        borderWidth={1}
        backgroundColor="$white1"
        color="$color"
        {...inputProps}
        disabled={disabled}
      />
      <FieldError message={fieldState.error?.message} />
    </YStack>
  )
}

const StateField = ({
  name,
  label,
}: {
  name: FieldPath<CreateCommunityValues>
  label: string
}) => {
  const { control, formState } = useFormContext<CreateCommunityValues>()
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' ? field.value : ''
  const disabled = formState.isSubmitting
  const triggerTextColor = value ? '$color12' : '$color10'

  return (
    <YStack gap="$2" f={1}>
      <Paragraph fontWeight="600">{label}</Paragraph>
      <YStack borderWidth={1} borderColor="$color12" borderRadius={12} backgroundColor="$white1">
        <StatePicker
          value={value || null}
          onChange={(code) => field.onChange(code)}
          disabled={disabled}
          placeholder="Select state"
          title="Select state"
          triggerTextColor={triggerTextColor}
          triggerIconColor="$color12"
          triggerProps={{ px: '$3', py: '$3', minHeight: 48 }}
        />
      </YStack>
      <FieldError message={fieldState.error?.message} />
    </YStack>
  )
}

const SportsField = ({
  name,
  primaryColor,
}: {
  name: FieldPath<CreateCommunityValues>
  primaryColor: string
}) => {
  const { control, formState } = useFormContext<CreateCommunityValues>()
  const { field, fieldState } = useController({ control, name })
  const value = Array.isArray(field.value) ? field.value : []
  const disabled = formState.isSubmitting

  return (
    <YStack gap="$2">
      <Paragraph fontWeight="600">Sports</Paragraph>
      <XStack gap="$2" flexWrap="wrap">
        {COMMUNITY_SPORTS.map((sport) => {
          const selected = value.includes(sport)
          return (
            <Button
              key={sport}
              size="$2"
              onPress={() => {
                if (disabled) return
                const next = value.includes(sport)
                  ? value.filter((item) => item !== sport)
                  : [...value, sport]
                field.onChange(normalizeSportsList(next))
              }}
              height={36}
              borderRadius={999}
              fontSize={14}
              fontWeight="600"
              pressStyle={{ opacity: 0.85 }}
              backgroundColor={selected ? primaryColor : '$color2'}
              borderColor={selected ? primaryColor : '$color4'}
              borderWidth={1}
              color={selected ? '$background' : '$color12'}
              disabled={disabled}
            >
              {sport}
            </Button>
          )
        })}
      </XStack>
      <FieldError message={fieldState.error?.message} />
    </YStack>
  )
}

const PrimaryColorField = ({
  name,
  label,
  primaryColor,
}: {
  name: FieldPath<CreateCommunityValues>
  label: string
  primaryColor: string
}) => {
  const { control, formState } = useFormContext<CreateCommunityValues>()
  const { field, fieldState } = useController({ control, name })
  const value = typeof field.value === 'string' ? field.value : ''
  const disabled = formState.isSubmitting
  const normalizedValue = normalizeHexColor(value) || ''
  const selectedValue = normalizedValue || ''
  const hasCustom = Boolean(selectedValue)
  const normalizedDefault = normalizeHexColor(primaryColor) || primaryColor
  const palette = PRIMARY_COLOR_OPTIONS.includes(normalizedDefault)
    ? PRIMARY_COLOR_OPTIONS
    : [...PRIMARY_COLOR_OPTIONS, normalizedDefault]

  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between">
        <Paragraph fontWeight="600">{label}</Paragraph>
        <Button
          chromeless
          size="$2"
          disabled={disabled || !hasCustom}
          onPress={() => field.onChange('')}
          pressStyle={{ opacity: 0.7 }}
          color="$color10"
        >
          Use default
        </Button>
      </XStack>
      <XStack gap="$2" flexWrap="wrap">
        {palette.map((color) => {
          const normalized = normalizeHexColor(color) ?? color
          const isSelected = selectedValue
            ? normalized === selectedValue
            : normalized === normalizedDefault
          const iconColor = getContrastColor(normalized)
          return (
            <Button
              key={color}
              size="$2"
              aria-label={`Select ${color}`}
              onPress={() => field.onChange(color)}
              width={44}
              height={44}
              borderRadius={12}
              backgroundColor={color}
              borderColor={isSelected ? '$color12' : '$color6'}
              borderWidth={isSelected ? 2 : 1}
              pressStyle={{ opacity: 0.85 }}
              disabled={disabled}
              padding={0}
            >
              {isSelected ? (
                <Button.Icon>
                  <Check size={18} color={iconColor} />
                </Button.Icon>
              ) : null}
            </Button>
          )
        })}
      </XStack>
      <FieldError message={fieldState.error?.message} />
    </YStack>
  )
}

const SectionPanel = ({
  title,
  description,
  glassBackground,
  isDark,
  onInfoPress,
  infoLabel,
  children,
}: {
  title: string
  description: string
  glassBackground: string
  isDark: boolean
  onInfoPress?: () => void
  infoLabel?: string
  children: ReactNode
}) => (
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
)
