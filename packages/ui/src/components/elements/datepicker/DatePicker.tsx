// tamagui-ignore
import { forwardRef, useCallback, useId, useMemo, useState } from 'react'

import type { DPDay, DPDayInteger } from '@rehookify/datepicker'
import { useDatePickerContext } from '@rehookify/datepicker'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { AnimatePresence, Button, Sheet, SizableText, View, XStack, YStack, isWeb } from 'tamagui'

import { useDateAnimation } from './common/datePickerUtils'
import {
  CalendarHeader,
  DatePicker,
  DatePickerInput,
  HeaderTypeProvider,
  type HeaderType,
  MonthPicker,
  WeekView,
  YearPicker,
  YearRangeSlider,
  swapOnClick,
  useHeaderType,
} from './common/dateparts'

function DateHeader() {
  const {
    data: { calendars },
    propGetters: { subtractOffset },
  } = useDatePickerContext()
  const { type: header, setHeader } = useHeaderType()
  const { year, month } = calendars[0]

  if (header === 'year') {
    return <YearRangeSlider />
  }

  if (header === 'month') {
    return (
      <SizableText width="100%" ta="center" userSelect="auto" tabIndex={0} size="$8">
        Select a month
      </SizableText>
    )
  }

  return (
    <XStack width="100%" alignItems="center" justifyContent="space-between">
      <Button
        circular
        size="$3"
        {...swapOnClick(subtractOffset({ months: 1 }))}
      >
        <Button.Icon scaleIcon={1.5}>
          <ChevronLeft />
        </Button.Icon>
      </Button>

      <CalendarHeader year={year} month={month} setHeader={setHeader} />

      <Button circular size="$3" {...swapOnClick(subtractOffset({ months: -1 }))}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronRight />
        </Button.Icon>
      </Button>
    </XStack>
  )
}

function DayPicker() {
  const {
    data: { calendars, weekDays },
    propGetters: { dayButton },
  } = useDatePickerContext()

  const { days } = calendars[0]

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'month',
  })

  // divide days array into sub arrays that each has 7 days, for better stylings
  const subDays = useMemo(
    () =>
      days.reduce((acc, day, i) => {
        if (i % 7 === 0) {
          acc.push([])
        }
        acc[acc.length - 1].push(day)
        return acc
      }, [] as DPDay[][]),
    [days]
  )

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <View animation="medium" {...prevNextAnimation()}>
        <WeekView weekDays={weekDays} />
        <View flexDirection="column" gap="$1" flexWrap="wrap">
          {subDays.map((days) => {
            return (
              <View flexDirection="row" key={days[0].$date.toString()} gap="$1">
                {days.map((d) => (
                  <Button
                    key={d.$date.toString()}
                    chromeless
                    circular
                    padding={0}
                    width={45}
                    {...swapOnClick(dayButton(d))}
                    backgroundColor={d.selected ? '$background' : 'transparent'}
                    themeInverse={d.selected}
                    disabled={!d.inCurrentMonth}
                  >
                    <Button.Text
                      color={d.selected ? '$gray12' : d.inCurrentMonth ? '$gray11' : '$gray6'}
                    >
                      {d.day}
                    </Button.Text>
                  </Button>
                ))}
              </View>
            )
          })}
        </View>
      </View>
    </AnimatePresence>
  )
}

type DatePickerConfig = {
  selectedDates: Date[]
  onDatesChange: (dates: Date[]) => void
  calendar: {
    startDay: DPDayInteger
  }
}

function DatePickerBody({ config }: { config: DatePickerConfig }) {
  const [header, setHeader] = useState<HeaderType>('day')

  return (
    <HeaderTypeProvider config={config} type={header} setHeader={setHeader}>
      <YStack ai="center" gap="$6" width="100%">
        <DateHeader />
        {header === 'month' && <MonthPicker onChange={() => setHeader('day')} />}
        {header === 'year' && <YearPicker onChange={() => setHeader('day')} />}
        {header === 'day' && <DayPicker />}
      </YStack>
    </HeaderTypeProvider>
  )
}

type DatePickerFieldProps = {
  disabled: boolean
  placeholderTextColor?: string
  value: string | undefined
  onChangeText: (dateValue: string) => void
  onBlur: () => void
  placeholder?: string
  id: string
  [key: string]: any
}

const useDatePickerFieldState = (
  props: DatePickerFieldProps,
  ref?: React.Ref<HTMLInputElement>
) => {
  const {
    disabled,
    placeholderTextColor,
    value,
    onChangeText,
    onBlur,
    placeholder,
    id,
    ...rest
  } = props

  const [open, setOpen] = useState(false)
  const instanceId = useId()
  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) onBlur()
    },
    [onBlur]
  )
  const openPicker = useCallback(() => {
    if (disabled) return
    setOpenState(true)
  }, [disabled, setOpenState])

  const selectedDate = useMemo(() => {
    if (!value) return undefined
    const next = new Date(value)
    return Number.isNaN(next.getTime()) ? undefined : next
  }, [value])
  const selectedDates = useMemo(() => (selectedDate ? [selectedDate] : []), [selectedDate])

  const datePickerConfig: DatePickerConfig = {
    selectedDates,
    onDatesChange: (dates) => {
      onChangeText(dates[0]?.toISOString() || '')
      if (dates.length) setOpenState(false)
    },
    calendar: {
      startDay: 1,
    },
  }

  const resolvedId = id ? `${id}-${instanceId}` : undefined

  const trigger = (
    <Button
      unstyled
      disabled={disabled}
      width="100%"
      padding={0}
      justifyContent="center"
      alignItems="stretch"
      cursor="pointer"
      onPress={openPicker}
    >
      <DatePickerInput
        placeholder={placeholder ?? 'Select Date'}
        placeholderTextColor={placeholderTextColor}
        value={selectedDate?.toDateString() || ''}
        disabled={disabled}
        onReset={() => {
          if (disabled) return
          onChangeText('')
          setOpenState(false)
        }}
        onOpen={openPicker}
        onBlur={onBlur}
        ref={ref}
        id={resolvedId}
        {...rest}
      />
    </Button>
  )

  const panel = open ? (
    <YStack
      gap="$4"
      padding="$3"
      borderWidth={1}
      borderColor="$color6"
      backgroundColor="$background"
      borderRadius="$4"
      elevate
      width="100%"
    >
      <DatePickerBody config={datePickerConfig} />
    </YStack>
  ) : null

  return { open, setOpenState, trigger, panel, datePickerConfig }
}

export const useDatePickerField = (
  props: DatePickerFieldProps,
  ref?: React.Ref<HTMLInputElement>
) => {
  const { open, setOpenState, trigger, panel } = useDatePickerFieldState(props, ref)
  return { open, setOpen: setOpenState, trigger, panel }
}

export const DatePickerField = forwardRef(
  (props: DatePickerFieldProps, ref: React.Ref<HTMLInputElement>) => {
    const { open, setOpenState, trigger, datePickerConfig } = useDatePickerFieldState(props, ref)

    if (!isWeb) {
      return (
        <>
          {trigger}
          <Sheet
            modal
            open={open}
            onOpenChange={setOpenState}
            dismissOnSnapToBottom
            snapPointsMode="fit"
          >
            <Sheet.Frame padding="$2" alignItems="center" borderColor="$color12" borderWidth={1}>
              <DatePickerBody config={datePickerConfig} />
            </Sheet.Frame>
            <Sheet.Overlay
              animation="lazy"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Sheet>
        </>
      )
    }

    return (
      <DatePicker keepChildrenMounted open={open} onOpenChange={setOpenState}>
        <DatePicker.Anchor asChild>{trigger}</DatePicker.Anchor>
        <DatePicker.Content>
          <DatePicker.Content.Arrow />
          <DatePickerBody config={datePickerConfig} />
        </DatePicker.Content>
      </DatePicker>
    )
  }
)
