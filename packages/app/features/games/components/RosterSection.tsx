import { Alert } from 'react-native'

import { Check, X } from '@tamagui/lucide-icons'

import { Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import { formatPhoneDisplay } from 'app/utils/phone'
import type { QueueEntry } from '../types'
import { StatusBadge } from './GameStatus'

type Props = {
  entries: QueueEntry[]
  emptyLabel?: string
  canManage?: boolean
  currentProfileId?: string | null
  removingId?: string | null
  confirmingId?: string | null
  confirmingGuestId?: string | null
  onRemoveEntry?: (entry: QueueEntry) => void
  onConfirmAttendance?: (profileId: string) => void
  onConfirmGuest?: (queueId: string) => void
  confirmationEnabled?: boolean
  isConfirmationOpen?: boolean
}

export const RosterSection = ({
  entries,
  emptyLabel = 'No players yet.',
  canManage = false,
  currentProfileId,
  removingId,
  confirmingId,
  confirmingGuestId,
  onRemoveEntry,
  onConfirmAttendance,
  onConfirmGuest,
  confirmationEnabled = true,
  isConfirmationOpen = false,
}: Props) => (
  <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2" gap="$2">
    {entries.length === 0 ? (
      <Paragraph theme="alt2">{emptyLabel}</Paragraph>
    ) : (
      <YStack gap="$2">
        {(() => {
          const guestCounts = new Map<string, number>()
          return entries.map((entry, index) => {
            let guestNumber: number | undefined
            if (entry.isGuest) {
              const adderId = entry.guest?.addedByProfileId ?? entry.guest?.addedByName ?? 'unknown'
              const next = (guestCounts.get(adderId) ?? 0) + 1
              guestCounts.set(adderId, next)
              guestNumber = next
            }
            return (
              <PlayerRow
                key={entry.id}
                entry={entry}
                index={index}
                guestNumber={guestNumber}
                canRemove={canManage}
                currentProfileId={currentProfileId}
                isRemoving={removingId === entry.id}
                isConfirmingMember={confirmingId === entry.profileId}
                isConfirmingGuest={confirmingGuestId === entry.id}
                onRemove={() => onRemoveEntry?.(entry)}
                onConfirmMember={() => onConfirmAttendance?.(entry.profileId)}
                onConfirmGuest={() => onConfirmGuest?.(entry.id)}
                confirmationEnabled={confirmationEnabled}
              />
            )
          })
        })()}
      </YStack>
    )}
  </Card>
)

const PlayerRow = ({
  entry,
  index,
  guestNumber,
  canRemove,
  currentProfileId,
  isRemoving,
  isConfirmingMember,
  isConfirmingGuest,
  onRemove,
  onConfirmMember,
  onConfirmGuest,
  confirmationEnabled = true,
  isConfirmationOpen = false,
}: {
  entry: QueueEntry
  index: number
  guestNumber?: number
  canRemove?: boolean
  currentProfileId?: string | null
  isRemoving?: boolean
  isConfirmingMember?: boolean
  isConfirmingGuest?: boolean
  onRemove?: () => void
  onConfirmMember?: () => void
  onConfirmGuest?: () => void
  confirmationEnabled?: boolean
  isConfirmationOpen?: boolean
}) => {
  const confirmed =
    entry.status === 'rostered' && (!confirmationEnabled || Boolean(entry.attendanceConfirmedAt))
  const isGuest = entry.isGuest
  const isAdder = Boolean(
    isGuest && entry.guest?.addedByProfileId && entry.guest.addedByProfileId === currentProfileId
  )
  const canRemoveEntry = isGuest ? canRemove || isAdder : canRemove
  const canConfirmMember =
    !isGuest && canRemove && confirmationEnabled && entry.status === 'rostered' && !entry.attendanceConfirmedAt
  const canConfirmGuest =
    isGuest &&
    confirmationEnabled &&
    entry.status === 'rostered' &&
    !entry.attendanceConfirmedAt &&
    (canRemove || (isAdder && isConfirmationOpen))
  const canConfirm = canConfirmMember || canConfirmGuest
  const isConfirming = isGuest ? isConfirmingGuest : isConfirmingMember
  const handleConfirm = () => {
    if (!canConfirm || isConfirming) return
    Alert.alert('Confirm attendance?', 'This marks the player as confirmed for this game.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'default',
        onPress: () => {
          if (isGuest) {
            onConfirmGuest?.()
          } else {
            onConfirmMember?.()
          }
        },
      },
    ])
  }
  const handleRemove = () => {
    if (!onRemove || isRemoving) return
    Alert.alert(isGuest ? 'Remove guest?' : 'Remove player?', 'This removes them from this game.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ])
  }
  const record = entry.record
  const recentLabel = !isGuest
    ? record?.recent?.length
      ? record.recent.join(' ')
      : '- - - - -'
    : null
  const guestName = entry.guest?.name?.trim() || 'Guest'
  const guestPhone = isGuest ? formatPhoneDisplay(entry.guest?.phone) : null
  const guestSubline = isGuest ? [guestName, guestPhone].filter(Boolean).join(' - ') : null
  const guestNotes = isGuest ? entry.guest?.notes?.trim() : null
  const displayName = isGuest
    ? `${entry.guest?.addedByName?.trim() || 'Member'} +${guestNumber ?? 1}`
    : entry.player.name ?? 'Anonymous Player'
  return (
    <XStack ai="center" gap="$2" jc="space-between">
      <Paragraph theme="alt2" minWidth={24}>
        {index + 1}.
      </Paragraph>
      <YStack f={1} pr="$2" gap="$0.5">
        <SizableText fontWeight="600">{displayName}</SizableText>
        {guestSubline ? (
          <Paragraph theme="alt2" size="$2">
            {guestSubline}
          </Paragraph>
        ) : null}
        {recentLabel ? (
          <Paragraph theme="alt2" size="$2">
            Last 5: {recentLabel}
          </Paragraph>
        ) : null}
        {guestNotes ? (
          <Paragraph theme="alt2" size="$2">
            {guestNotes}
          </Paragraph>
        ) : null}
      </YStack>
      <XStack ai="center" gap="$1">
        {canConfirm ? (
          <Button
            size="$2"
            circular
            icon={Check}
            theme="green"
            backgroundColor="$color2"
            borderWidth={1}
            borderColor="$color5"
            pressStyle={{ backgroundColor: '$color3' }}
            hoverStyle={{ backgroundColor: '$color3' }}
            aria-label="Confirm attendance"
            disabled={isConfirming}
            onPress={handleConfirm}
          />
        ) : null}
        {entry.status === 'rostered' ? (
          <StatusBadge tone={confirmed ? 'success' : 'warning'} showIcon={false}>
            {confirmed ? 'Confirmed' : 'Pending'}
          </StatusBadge>
        ) : null}
        {canRemoveEntry ? (
          <Button
            size="$2"
            circular
            icon={X}
            theme="red"
            backgroundColor="$color2"
            borderWidth={1}
            borderColor="$color5"
            pressStyle={{ backgroundColor: '$color3' }}
            hoverStyle={{ backgroundColor: '$color3' }}
            aria-label="Remove player"
            disabled={isRemoving}
            onPress={handleRemove}
          />
        ) : null}
      </XStack>
    </XStack>
  )
}

export const getPlayerInitials = (name?: string | null) => {
  if (!name) return '??'
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase()
}
