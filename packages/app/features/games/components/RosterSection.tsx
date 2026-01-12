import { useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'

import { CheckCircle2, Clock, MoreHorizontal, Trash2 } from '@tamagui/lucide-icons'

import {
  Button,
  Card,
  Paragraph,
  Popover,
  Separator,
  SizableText,
  XStack,
  YStack,
} from '@my/ui/public'
import { UserAvatar } from 'app/components/UserAvatar'
import { formatPhoneDisplay } from 'app/utils/phone'
import type { QueueEntry } from '../types'
import { RosterPlayerSheet } from './RosterPlayerSheet'

type Props = {
  entries: QueueEntry[]
  emptyLabel?: string
  canManage?: boolean
  currentProfileId?: string | null
  removingId?: string | null
  confirmingId?: string | null
  confirmingGuestId?: string | null
  closeMenusSignal?: number
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
  closeMenusSignal,
  onRemoveEntry,
  onConfirmAttendance,
  onConfirmGuest,
  confirmationEnabled = true,
  isConfirmationOpen = false,
}: Props) => {
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const sheetOpen = Boolean(selectedEntry)
  const entriesKey = useMemo(() => entries.map((entry) => entry.id).join('|'), [entries])

  useEffect(() => {
    setOpenMenuId(null)
  }, [closeMenusSignal])

  useEffect(() => {
    if (!openMenuId) return
    const exists = entries.some((entry) => entry.id === openMenuId)
    if (!exists) {
      setOpenMenuId(null)
    }
  }, [entriesKey, entries, openMenuId])

  return (
    <>
      <Card bordered borderColor="$black1" p={0} gap={0} overflow="visible">
        {entries.length === 0 ? (
          <YStack px="$3" py="$2">
            <Paragraph theme="alt2">{emptyLabel}</Paragraph>
          </YStack>
        ) : (
          <YStack gap={0}>
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
                  <YStack
                    key={entry.id}
                    px="$3"
                    py="$2"
                    borderTopWidth={index === 0 ? 0 : 1}
                    borderColor="$black1"
                    pressStyle={{ backgroundColor: '$color2' }}
                    overflow="visible"
                    onPress={() => setSelectedEntry(entry)}
                  >
                    <PlayerRow
                      entry={entry}
                      index={index}
                      guestNumber={guestNumber}
                      canRemove={canManage}
                      currentProfileId={currentProfileId}
                      isRemoving={removingId === entry.id}
                      isConfirmingMember={confirmingId === entry.profileId}
                      isConfirmingGuest={confirmingGuestId === entry.id}
                      menuOpen={openMenuId === entry.id}
                      onMenuOpenChange={(open) => {
                        setOpenMenuId(open ? entry.id : null)
                      }}
                      onRemove={() => onRemoveEntry?.(entry)}
                      onConfirmMember={() => onConfirmAttendance?.(entry.profileId)}
                      onConfirmGuest={() => onConfirmGuest?.(entry.id)}
                      confirmationEnabled={confirmationEnabled}
                    />
                  </YStack>
                )
              })
            })()}
          </YStack>
        )}
      </Card>
      <RosterPlayerSheet
        entry={selectedEntry}
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null)
        }}
      />
    </>
  )
}

const PlayerRow = ({
  entry,
  index,
  guestNumber,
  canRemove,
  currentProfileId,
  isRemoving,
  isConfirmingMember,
  isConfirmingGuest,
  menuOpen,
  onMenuOpenChange,
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
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
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
  const showMenu = canConfirm || canRemoveEntry
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
  const avatarName = isGuest ? guestName : entry.player.name ?? 'Player'
  const avatarUrl = isGuest ? null : entry.player.avatarUrl ?? null
  const avatarSize = 40
  return (
    <XStack ai="center" gap="$2" jc="space-between">
      <Paragraph theme="alt2" minWidth={24}>
        {index + 1}.
      </Paragraph>
      <XStack ai="center" gap="$2" flex={1} pr="$2">
        <UserAvatar size={avatarSize} name={avatarName} avatarUrl={avatarUrl} />
        <YStack f={1} minHeight={avatarSize} jc="center" gap="$0.5">
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
      </XStack>
      <XStack ai="center" gap="$1">
        {entry.status === 'rostered' ? (
          confirmed ? (
            <CheckCircle2 size={18} color="$green10" aria-label="Confirmed" />
          ) : (
            <Clock size={18} color="$yellow10" aria-label="Pending" />
          )
        ) : null}
        {showMenu ? (
          <Popover
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            allowFlip
            stayInFrame={{ padding: 8 }}
          >
            <Popover.Trigger asChild>
              <Button
                size="$2"
                circular
                icon={MoreHorizontal}
                backgroundColor="$color2"
                borderWidth={1}
                borderColor="$color5"
                pressStyle={{ backgroundColor: '$color3' }}
                hoverStyle={{ backgroundColor: '$color3' }}
                aria-label="Roster actions"
                disabled={isRemoving || isConfirming}
                onPress={(event) => {
                  event?.stopPropagation?.()
                }}
              />
            </Popover.Trigger>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={4}
              bw={1}
              boc="$borderColor"
              br="$4"
              p="$2"
              bg="$background"
              minWidth={180}
              enterStyle={{ y: -6, o: 0 }}
              exitStyle={{ y: -6, o: 0 }}
              elevate
              themeInverse
            >
              <Popover.Arrow bw={1} boc="$borderColor" bg="$background" />
              <YStack gap="$1">
                {canConfirm ? (
                  <Button
                    chromeless
                    justifyContent="flex-start"
                    space="$2"
                    size="$4"
                    px="$3"
                    icon={CheckCircle2}
                    onPress={() => {
                      onMenuOpenChange(false)
                      handleConfirm()
                    }}
                  >
                    Confirm attendance
                  </Button>
                ) : null}
                {canConfirm && canRemoveEntry ? <Separator /> : null}
                {canRemoveEntry ? (
                  <Button
                    chromeless
                    justifyContent="flex-start"
                    theme="red"
                    space="$2"
                    size="$4"
                    px="$3"
                    icon={Trash2}
                    onPress={() => {
                      onMenuOpenChange(false)
                      handleRemove()
                    }}
                  >
                    {isGuest ? 'Remove guest' : 'Remove player'}
                  </Button>
                ) : null}
              </YStack>
            </Popover.Content>
          </Popover>
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
