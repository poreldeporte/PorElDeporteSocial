import { StyleSheet, type ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { H1, Paragraph, ScrollView, SizableText, YStack, isWeb } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'

const TERMS_SECTIONS = [
  {
    title: '1. Eligibility and invitations',
    body: [
      'Por El Deporte is invite-only.',
      'You must be at least 16 and legally able to use the app.',
      'Some actions (including membership) may require admin approval.',
    ].join(' '),
  },
  {
    title: '2. Beta access and confidentiality',
    body: [
      'Beta access is for testing and feedback.',
      'Beta features are confidential until public release.',
      'Do not share screenshots, recordings, or details publicly or with non-testers without permission.',
      'You may share feedback and materials privately with us.',
      'We own the app; beta access may change or end at any time.',
    ].join(' '),
  },
  {
    title: '3. Account access and security',
    body: [
      'Login uses your phone number and SMS one-time passcodes.',
      'Keep your number current and secure; you are responsible for activity on your account.',
      'One account per person; no impersonation.',
    ].join(' '),
  },
  {
    title: '4. Acceptable use',
    body: [
      'Be respectful; no harassment, discrimination, threats, or abuse.',
      'No cheating, spam, scraping, or attempts to bypass approvals.',
      'No illegal or unsafe activity.',
    ].join(' '),
  },
  {
    title: '5. Scheduling and attendance',
    body: 'Claim spots only if you plan to attend. Cancel as early as possible if you cannot make it. Show up on time and follow venue rules.',
  },
  {
    title: '6. User content',
    body: [
      'You own your content (profile info, photos, game notes).',
      'You grant Por El Deporte a license to host, display, and share it with other users and admins to operate the app.',
      'You are responsible for what you post.',
    ].join(' '),
  },
  {
    title: '7. Notifications and messages',
    body: [
      'We send SMS for login; message and data rates may apply.',
      'We may send in-app or push notifications about games and attendance; manage these in settings.',
    ].join(' '),
  },
  {
    title: '8. Safety',
    body: [
      'Playing sports carries risk.',
      'You participate at your own risk.',
      'We do not supervise games and are not responsible for other users\' conduct.',
    ].join(' '),
  },
  {
    title: '9. Termination',
    body: 'You can stop using the app anytime. We may suspend or remove accounts for safety, violations, or admin decisions.',
  },
  {
    title: '10. Disclaimers and liability limits',
    body: [
      'The app is provided as is.',
      'We are not liable for indirect damages or injuries connected to events or use of the app.',
      'Our total liability is limited to the amount you paid in the last 12 months (or $0 if none), to the maximum extent allowed by law.',
    ].join(' '),
  },
  {
    title: '11. Changes',
    body: 'We may update these Terms and will post the new version.',
  },
  {
    title: '12. Governing law',
    body: 'These Terms are governed by the laws of the United States, without regard to conflict of law principles.',
  },
  {
    title: '13. Contact',
    body: 'Contact us at contact@poreldeporte.com.',
  },
] as const

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const TermsOfServiceScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
  const { contentContainerStyle, ...scrollViewProps } = scrollProps ?? {}
  const baseContentStyle = headerSpacer
    ? { ...screenContentContainerStyle, paddingTop: 0 }
    : screenContentContainerStyle
  const mergedContentStyle = StyleSheet.flatten(
    Array.isArray(contentContainerStyle)
      ? [baseContentStyle, ...contentContainerStyle]
      : [baseContentStyle, contentContainerStyle]
  )
  return (
    <ScrollView {...scrollViewProps} contentContainerStyle={mergedContentStyle}>
      {headerSpacer}
      <YStack gap="$4">
        {/* only show title on web since mobile has navigator title */}
        {isWeb && <H1>Terms of Service</H1>}
        <Paragraph>Last Updated: December 10, 2025</Paragraph>
        <Paragraph>These Terms govern your use of the Por El Deporte app.</Paragraph>
        {TERMS_SECTIONS.map((section) => (
          <Section key={section.title} title={section.title} body={section.body} />
        ))}
      </YStack>
    </ScrollView>
  )
}

const Section = ({ title, body }: { title: string; body: string }) => (
  <YStack gap="$2">
    <SizableText size="$5" fontWeight="700">
      {title}
    </SizableText>
    <Paragraph>{body}</Paragraph>
  </YStack>
)
