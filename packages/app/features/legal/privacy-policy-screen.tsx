import { StyleSheet, type ScrollViewProps } from 'react-native'
import { type ReactNode } from 'react'

import { H1, Paragraph, ScrollView, SizableText, YStack, isWeb } from '@my/ui/public'
import { screenContentContainerStyle } from 'app/constants/layout'

const PRIVACY_SECTIONS = [
  {
    title: '1. Data we collect',
    body: [
      'We collect your phone number for SMS login.',
      [
        'We collect profile information you provide such as name, photo, bio, and preferences,',
        'plus game activity like RSVPs, attendance, waitlist status, and results.',
      ].join(' '),
      [
        'We also collect usage data (screens viewed, actions, timestamps),',
        'device data (device model, OS, app version, IP address, mobile identifiers),',
        'and notification preferences.',
      ].join(' '),
    ].join(' '),
  },
  {
    title: '2. How we use data',
    body: [
      'We use data to provide login, profiles, scheduling, and attendance features and to send notifications and updates.',
      'We also use data to support admin approvals and moderation, improve the app, troubleshoot issues, keep the app safe, and comply with the law.',
    ].join(' '),
  },
  {
    title: '3. How we share data',
    body: [
      'We share relevant profile and attendance info with other users in your games or community.',
      'We share data with admins for approvals, game management, and safety.',
      'We share data with service providers for SMS delivery, hosting, and analytics.',
      'We may share information for legal or safety reasons.',
      'We do not sell your personal information.',
    ].join(' '),
  },
  {
    title: '4. Retention',
    body: [
      'We keep data while your account is active and as needed for operations or legal obligations.',
      'You can request deletion; we will delete or anonymize data unless we must keep it.',
    ].join(' '),
  },
  {
    title: '5. Security',
    body: 'We use reasonable safeguards, but no system is 100% secure.',
  },
  {
    title: '6. Your choices and rights',
    body: [
      'You can view or edit your profile in the app and control notifications in settings.',
      'You can also request access, correction, or deletion by contacting us.',
    ].join(' '),
  },
  {
    title: '7. Children',
    body: 'The app is not for people under 16.',
  },
  {
    title: '8. Changes',
    body: 'We may update this policy and will post the new version.',
  },
  {
    title: '9. Contact',
    body: 'Contact us at contact@poreldeporte.com.',
  },
] as const

type ScrollHeaderProps = {
  scrollProps?: ScrollViewProps
  headerSpacer?: ReactNode
  topInset?: number
}

export const PrivacyPolicyScreen = ({ scrollProps, headerSpacer }: ScrollHeaderProps = {}) => {
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
        {isWeb && <H1>Privacy Policy</H1>}
        <Paragraph>Effective Date: January 1, 2026</Paragraph>
        <Paragraph>This policy explains how Por El Deporte collects and uses your information.</Paragraph>
        {PRIVACY_SECTIONS.map((section) => (
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
