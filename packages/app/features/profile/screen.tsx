import { Button, Card, Paragraph, ScrollView, SizableText, XStack, YStack } from '@my/ui/public'
import { Shield, Share2, Sparkles, UserCog } from '@tamagui/lucide-icons'
import { pedLogo } from 'app/assets'
import { screenContentContainerStyle } from 'app/constants/layout'
import { useMyStats } from 'app/features/home/hooks/useMyStats'
import { useStatsRealtime } from 'app/utils/useRealtimeSync'
import { useUser } from 'app/utils/useUser'
import { SolitoImage } from 'solito/image'
import { useLink } from 'solito/link'
import { useMemo } from 'react'
import { LinearGradient } from '@tamagui/linear-gradient'

import { ProfileDetails } from './profile-details'

export const ProfileScreen = () => {
  const { profile, avatarUrl, user, displayName, role } = useUser()
  const { stats, isLoading: statsLoading } = useMyStats()
  useStatsRealtime(true)
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null
  const editLink = useLink({ href: '/profile/edit' })
  const inviteLink = useLink({ href: '/community' })
  const settingsLink = useLink({ href: '/settings' })
  const historyLink = useLink({ href: '/games' })
  const heroLinks = [
    { icon: UserCog, label: 'Edit profile', linkProps: editLink },
    { icon: Share2, label: 'Invite a friend', linkProps: inviteLink },
    { icon: Shield, label: 'Settings', linkProps: settingsLink },
  ]

  return (
    <ScrollView contentContainerStyle={screenContentContainerStyle}>
      <YStack maw={800} mx="auto" w="100%" space="$4" py="$4">
        <ProfileHero
          name={displayName || 'Member'}
          role={role}
          avatarUrl={avatarUrl}
          memberSince={memberSince}
          quickLinks={heroLinks}
          userId={user?.id ?? ''}
        />
        <ProfileStats stats={stats} isLoading={statsLoading} historyLink={historyLink} />
        <ProfileDetails
          firstName={profile?.first_name}
          lastName={profile?.last_name}
          email={user?.email ?? null}
          phone={profile?.phone}
          address={profile?.address}
          birthDate={profile?.birth_date}
          jerseyNumber={profile?.jersey_number}
          position={profile?.position}
        />
        <ProfileCultureCard role={role} />
        <ProfilePledge inviteLink={inviteLink} />
      </YStack>
    </ScrollView>
  )
}

const ProfileHero = ({
  name,
  role,
  avatarUrl,
  memberSince,
  quickLinks,
  userId,
}: {
  name: string
  role: string
  avatarUrl: string
  memberSince: Date | null
  quickLinks: Array<{ icon: typeof Shield; label: string; linkProps: ReturnType<typeof useLink> }>
  userId: string
}) => {
  const memberId = userId ? userId.slice(0, 8).toUpperCase() : 'PEDSQUAD'
  return (
    <Card
      bordered
      $platform-native={{ borderWidth: 0 }}
      p="$5"
      gap="$4"
      backgroundColor="$color2"
      borderStyle="solid"
      borderColor="$color5"
    >
      <XStack gap="$4" flexWrap="wrap" ai="center" jc="space-between">
        <XStack gap="$3" ai="center" flexShrink={1}>
          <SolitoImage src={pedLogo} alt="Por El Deporte crest" width={72} height={72} />
          <YStack gap="$1">
            <Paragraph theme="alt2">Por El Deporte · Inner Circle</Paragraph>
            <SizableText size="$7" fontWeight="700">
              {name}
            </SizableText>
            <Paragraph theme="alt2">{formatRole(role)}</Paragraph>
            <XStack gap="$4" flexWrap="wrap" pt="$2">
              <HeroMeta label="Member since" value={formatMemberSince(memberSince)} />
              <HeroMeta label="Member ID" value={memberId} />
            </XStack>
          </YStack>
        </XStack>
      </XStack>
      <XStack mt="$2" gap="$2" flexWrap="wrap">
        {quickLinks.map((link) => (
          <ActionButton
            key={link.label}
            icon={link.icon}
            label={link.label}
            linkProps={link.linkProps}
            flexValue="33%"
          />
        ))}
      </XStack>
    </Card>
  )
}

const HeroMeta = ({ label, value }: { label: string; value: string }) => (
  <YStack gap="$1">
    <Paragraph theme="alt2" size="$2">
      {label}
    </Paragraph>
    <SizableText fontWeight="600">{value}</SizableText>
  </YStack>
)

const StatPill = ({ label, value }: { label: string; value: string | number }) => (
  <YStack
    px="$3"
    py="$2"
    br="$6"
    borderWidth={1}
    borderColor="$color4"
    backgroundColor="$color1"
    minWidth={100}
  >
    <Paragraph theme="alt2" size="$2">
      {label}
    </Paragraph>
    <SizableText size="$5" fontWeight="700">
      {value}
    </SizableText>
  </YStack>
)

const ProfileStats = ({
  stats,
  isLoading,
  historyLink,
}: {
  stats: { wins: number; losses: number; games: number }
  isLoading: boolean
  historyLink: ReturnType<typeof useLink>
}) => {
  const statItems = useMemo(() => {
    const winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0
    return [
      { label: 'Matches', value: stats.games },
      { label: 'Wins', value: stats.wins },
      { label: 'Win rate', value: stats.games ? `${winRate}%` : '—' },
    ]
  }, [stats])

  const summary = isLoading
    ? 'Dialing in your record…'
    : `Winning ${statItems[2].value} of ${stats.games || '—'} runs`

  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3">
      <XStack ai="center" jc="space-between" gap="$3" flexWrap="wrap">
        <YStack gap="$1">
          <SizableText size="$5" fontWeight="600">
            Scoreboard
          </SizableText>
          <Paragraph theme="alt2">{summary}</Paragraph>
        </YStack>
        <Button size="$3" br="$9" theme="alt1" {...historyLink}>
          View match history
        </Button>
      </XStack>
      <XStack gap="$3" flexWrap="wrap">
        {statItems.map((stat) => (
          <YStack
            key={stat.label}
            f={1}
            minWidth={120}
            p="$3"
            borderWidth={1}
            borderColor="$color4"
            br="$5"
            gap="$1"
          >
            <Paragraph theme="alt2" size="$2">
              {stat.label}
            </Paragraph>
            <SizableText size="$6" fontWeight="700">
              {isLoading ? '—' : stat.value}
            </SizableText>
          </YStack>
        ))}
      </XStack>
    </Card>
  )
}

const ProfileCultureCard = ({ role }: { role: string }) => {
  const badges = [
    { icon: Shield, label: formatRole(role) },
    { icon: Sparkles, label: 'Friends of friends' },
    { icon: Share2, label: 'Play clean · vibe hard' },
  ]
  const primary = badges[0]
  const secondary = badges.slice(1)
  return (
    <Card bordered $platform-native={{ borderWidth: 0 }} p="$4" gap="$3" backgroundColor="$color2">
      <SizableText size="$5" fontWeight="600">
        Badges
      </SizableText>
      {primary ? (
        <YStack
          p="$3"
          br="$6"
          borderWidth={1}
          borderColor="$color4"
          backgroundColor="$color1"
          gap="$1"
        >
          <XStack gap="$2" ai="center">
            <primary.icon size={16} />
            <Paragraph size="$2" fontWeight="600">
              {primary.label}
            </Paragraph>
          </XStack>
          <Paragraph theme="alt2" size="$2">
            Carry the standard. Show up early, choose fair play, hype the crew.
          </Paragraph>
        </YStack>
      ) : null}
      <XStack gap="$2" flexWrap="wrap">
        {secondary.map(({ icon: Icon, label }) => (
          <XStack
            key={label}
            gap="$2"
            ai="center"
            px="$3"
            py="$1.5"
            br="$10"
            borderWidth={1}
            borderColor="$color4"
            backgroundColor="$color1"
          >
            <Icon size={14} />
            <Paragraph size="$2">{label}</Paragraph>
          </XStack>
        ))}
      </XStack>
    </Card>
  )
}

const ProfilePledge = ({ inviteLink }: { inviteLink: ReturnType<typeof useLink> }) => (
  <LinearGradient
    colors={['rgba(255,120,48,0.35)', 'rgba(5,8,13,0.85)']}
    start={[0, 0]}
    end={[1, 1]}
    style={{ borderRadius: 24 }}
  >
    <Card
      br="$7"
      px="$4"
      py="$4"
      gap="$3"
      borderWidth={0}
      backgroundColor="transparent"
      $platform-native={{ borderWidth: 0 }}
    >
      <SizableText size="$5" fontWeight="700">
        The brotherhood standard
      </SizableText>
      <Paragraph theme="alt2">
        Inner-circle footy. Show up early, play clean, hype every run. Respect the invite, protect the
        vibe.
      </Paragraph>
      <Button br="$9" theme="alt1" icon={Share2} {...inviteLink}>
        Share the vibe
      </Button>
    </Card>
  </LinearGradient>
)

const ActionButton = ({
  icon: Icon,
  label,
  linkProps,
  flexValue,
}: {
  icon: typeof Shield
  label: string
  linkProps: ReturnType<typeof useLink>
  flexValue?: string
}) => (
  <Button
    size="$3"
    br="$8"
    px="$4"
    theme="alt1"
    icon={Icon}
    {...linkProps}
    flexBasis={flexValue}
    flexGrow={flexValue ? 1 : undefined}
    minWidth={flexValue ? 120 : undefined}
    justifyContent="flex-start"
  >
    {label}
  </Button>
)

const formatRole = (role: string) => {
  if (role === 'admin') return 'Club steward'
  if (role === 'captain') return 'Captain'
  return 'Member'
}

const formatMemberSince = (date: Date | null) =>
  date
    ? date.toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      })
    : 'Day one'
