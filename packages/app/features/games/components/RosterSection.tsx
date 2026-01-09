import { Alert } from 'react-native'

import { Check, X } from '@tamagui/lucide-icons'

import { Button, Card, Paragraph, SizableText, XStack, YStack } from '@my/ui/public'
import type { QueueEntry } from '../types'
import { StatusBadge } from './GameStatus'

type Props = {
  entries: QueueEntry[]
  emptyLabel?: string
  canManage?: boolean
  removingId?: string | null
  confirmingId?: string | null
  onRemovePlayer?: (queueId: string) => void
  onConfirmAttendance?: (profileId: string) => void
  confirmationEnabled?: boolean
}

export const RosterSection = ({
  entries,
  emptyLabel = 'No players yet.',
  canManage = false,
  removingId,
  confirmingId,
  onRemovePlayer,
  onConfirmAttendance,
  confirmationEnabled = true,
}: Props) => (
  <Card bordered $platform-native={{ borderWidth: 0 }} px="$3" py="$2" gap="$2">
    {entries.length === 0 ? (
      <Paragraph theme="alt2">{emptyLabel}</Paragraph>
    ) : (
      <YStack gap="$2">
        {entries.map((entry, index) => (
          <PlayerRow
            key={entry.id}
            entry={entry}
            index={index}
            canRemove={canManage}
            isRemoving={removingId === entry.id}
            isConfirming={confirmingId === entry.profileId}
            onRemove={() => onRemovePlayer?.(entry.id)}
            onConfirm={() => onConfirmAttendance?.(entry.profileId)}
            confirmationEnabled={confirmationEnabled}
          />
        ))}
      </YStack>
    )}
  </Card>
)

const PlayerRow = ({
  entry,
  index,
  canRemove,
  isRemoving,
  isConfirming,
  onRemove,
  onConfirm,
  confirmationEnabled = true,
}: {
  entry: QueueEntry
  index: number
  canRemove?: boolean
  isRemoving?: boolean
  isConfirming?: boolean
  onRemove?: () => void
  onConfirm?: () => void
  confirmationEnabled?: boolean
}) => {
  const confirmed =
    entry.status === 'rostered' && (!confirmationEnabled || Boolean(entry.attendanceConfirmedAt))
  const canConfirm =
    canRemove && confirmationEnabled && entry.status === 'rostered' && !entry.attendanceConfirmedAt
  const handleConfirm = () => {
    if (!onConfirm || isConfirming) return
    Alert.alert('Confirm attendance?', 'This marks the player as confirmed for this game.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'default', onPress: onConfirm },
    ])
  }
  const handleRemove = () => {
    if (!onRemove || isRemoving) return
    Alert.alert('Remove player?', 'This removes them from this game.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ])
  }
  const record = entry.record
  const recent = record?.recent?.length ? record.recent.join(' ') : null
  const jersey = typeof entry.player.jerseyNumber === 'number' ? `#${entry.player.jerseyNumber}` : null
  const positions = formatPositions(entry.player.position)
  const recordLabel =
    record && (record.wins > 0 || record.losses > 0) ? `Record ${record.wins}-${record.losses}` : null
  const sublineParts = [jersey, positions, recordLabel].filter(Boolean)
  return (
    <XStack ai="center" gap="$2" jc="space-between">
      <Paragraph theme="alt2" minWidth={24}>
        {index + 1}.
      </Paragraph>
      <YStack f={1} pr="$2" gap="$0.5">
        <SizableText fontWeight="600">{entry.player.name ?? 'Anonymous Player'}</SizableText>
        {sublineParts.length ? (
          <Paragraph theme="alt2" size="$2">
            {sublineParts.join(' · ')}
          </Paragraph>
        ) : null}
        {recent ? (
          <Paragraph theme="alt2" size="$2">
            Last 5: {recent}
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
        {canRemove ? (
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

const positionAbbrev: Record<string, string> = {
  goalkeeper: 'GK',
  defender: 'Def',
  midfielder: 'Mid',
  forward: 'Fwd',
}

const formatPositions = (positions?: string | null) => {
  if (!positions) return null
  const mapped = positions
    .split(',')
    .map((pos) => pos.trim().toLowerCase())
    .filter(Boolean)
    .map((pos) => positionAbbrev[pos])
    .filter(Boolean)
  if (!mapped.length) return null
  return mapped.join(', ')
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
