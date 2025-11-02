import type { DPDay, DatePickerProviderProps } from '@rehookify/datepicker'
import { useDatePickerContext } from '@rehookify/datepicker'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { useEffect, useMemo, useState } from 'react'
import type { GetProps } from 'tamagui'
import {
  AnimatePresence,
  Button,
  H3,
  Separator,
  Stack,
  View,
  isWeb,
  useMedia,
} from 'tamagui'
import { LinearGradient } from 'tamagui/linear-gradient'

import {
  CalendarHeader,
  DatePicker,
  DatePickerInput,
  HeaderTypeProvider,
  MonthPicker,
  SizableText,
  WeekView,
  YearPicker,
  YearRangeSlider,
  swapOnClick,
  useHeaderType,
} from './common/dateParts'
import { useDateAnimation } from './common/useDateAnimation'

function Calendar({
  calendarIndex = 0,
  order,
}: {
  calendarIndex?: number
  order?: 'first' | 'last' | 'either'
}) {
  const { setHeader } = useHeaderType()
  const {
    data: { calendars, weekDays },
    propGetters: { dayButton, subtractOffset },
  } = useDatePickerContext()

  const { days, year, month } = calendars[calendarIndex]

  // divide days array into sub arrays that each has 7 days, for better stylings
  const calendarWeeks = useMemo(
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

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'month',
  })

  return (
    <View flexDirection="column" gap="$4">
      <View
        flexDirection="row"
        minWidth="100%"
        height={50}
        alignItems="center"
        justifyContent="space-between"
      >
        {order === 'first' || order === 'either' ? (
          <Button circular size="$4" {...swapOnClick(subtractOffset({ months: 1 }))}>
            <Button.Icon scaleIcon={1.5}>
              <ChevronLeft />
            </Button.Icon>
          </Button>
        ) : (
          <View />
        )}

        <CalendarHeader year={year} month={month} setHeader={setHeader} />

        {isWeb &&
          (order === 'last' || order === 'either' ? (
            <Button circular size="$4" {...swapOnClick(subtractOffset({ months: -1 }))}>
              <Button.Icon scaleIcon={1.5}>
                <ChevronRight />
              </Button.Icon>
            </Button>
          ) : (
            <View />
          ))}

        {!isWeb && (
          <Button circular size="$4" {...swapOnClick(subtractOffset({ months: -1 }))}>
            <Button.Icon scaleIcon={1.5}>
              <ChevronRight />
            </Button.Icon>
          </Button>
        )}
      </View>
      <AnimatePresence key={prevNextAnimationKey}>
        <View
          w="100%"
          jc="center"
          ai="center"
          animation="medium"
          gap="$4"
          {...prevNextAnimation()}
        >
          <WeekView weekDays={weekDays} />
          <View flexDirection="column" gap="$2" ai="center" jc="center" w="100%">
            {calendarWeeks.map((days) => {
              const isWeekInCalendarMonth = days.some((day) => day.inCurrentMonth)
              if (!isWeekInCalendarMonth) {
                return <View flex={1} />
              }

              return (
                <View
                  jc="space-between"
                  ai="center"
                  flexDirection="row"
                  key={days[0].$date.toString()}
                  flex={1}
                  w="100%"
                >
                  {days.map((day) => {
                    const dayIsFirstOrLastOfMonth =
                      day.$date.getDate() === 1 ||
                      day.$date.getDate() ===
                        new Date(
                          day.$date.getFullYear(),
                          day.$date.getMonth() + 1,
                          0
                        ).getDate()

                    const shouldWrapInGradient =
                      dayIsFirstOrLastOfMonth && day.range && day.range === 'in-range'

                    if (!day.inCurrentMonth) {
                      return <Stack flex={1} w="100%" />
                    }

                    const BG_RANGE_STYLE: {
                      [key: string]: GetProps<typeof View>
                    } = {
                      'in-range': {
                        backgroundColor: dayIsFirstOrLastOfMonth
                          ? 'transprent'
                          : '$color5',
                      },
                      'range-start': {
                        backgroundColor: '$color5',
                        width: '50%',
                        right: 0,
                      },
                      'range-end': {
                        backgroundColor: '$color5',
                        width: '50%',
                        left: 0,
                      },
                      'will-be-in-range': {
                        backgroundColor: '$gray2',
                      },
                      'will-be-range-start': {
                        backgroundColor: '$gray1',
                      },
                      'will-be-range-end': {
                        backgroundColor: '$color1',
                      },
                      '': {},
                    }

                    const buttonElement = (
                      <Button
                        key={day.$date.toString()}
                        chromeless
                        circular
                        group="item"
                        {...swapOnClick(dayButton(day))}
                        themeInverse={day.selected}
                        borderWidth={1}
                        borderColor={day.selected ? '$color1' : 'transparent'}
                        data-range={day.range}
                        {...(day.selected
                          ? {
                              bg: '$color5',
                            }
                          : {})}
                        disabled={!day.inCurrentMonth}
                      >
                        <Button.Text
                          color={
                            day.selected
                              ? '$gray12'
                              : day.inCurrentMonth
                                ? '$gray11'
                                : '$gray6'
                          }
                        >
                          {day.day}
                        </Button.Text>
                      </Button>
                    )

                    if (shouldWrapInGradient) {
                      const direction =
                        day.$date.getDate() === 1 ? 'rightToLeft' : 'leftToRight'

                      return (
                        <LinearGradient
                          key={day.$date.toString()}
                          flex={1}
                          colors={['$color6', '$background06']}
                          start={direction === 'leftToRight' ? [0, 1] : [1, 1]}
                          end={direction === 'leftToRight' ? [1, 1] : [0, 1]}
                          locations={[0.3, 1]}
                        >
                          {buttonElement}
                        </LinearGradient>
                      )
                    }

                    return (
                      <View
                        jc="center"
                        ai="center"
                        key={day.$date.toString()}
                        w="100%"
                        flex={1}
                      >
                        <View
                          pos="absolute"
                          w="100%"
                          h="100%"
                          {...BG_RANGE_STYLE[day.range]}
                        />
                        {buttonElement}
                      </View>
                    )
                  })}
                </View>
              )
            })}
          </View>
        </View>
      </AnimatePresence>
    </View>
  )
}

function DatePickerBody({ config }: { config: DatePickerProviderProps['config'] }) {
  const [header, setHeader] = useState<'month' | 'year' | 'day'>('day')
  const { gtSm: fullWidthMode } = useMedia()

  return (
    <HeaderTypeProvider config={config} type={header} setHeader={setHeader}>
      <View flexDirection="row" gap="$4" p="$4" $gtMd={{ p: '$0' }}>
        {header === 'day' && !fullWidthMode && (
          <Calendar order="either" calendarIndex={0} />
        )}
        {header === 'day' && fullWidthMode && (
          <>
            <Calendar order="first" calendarIndex={1} />
            <Separator vertical />
            <Calendar order="last" calendarIndex={0} />
          </>
        )}
        {header === 'year' && (
          <View alignItems="center" gap="$2">
            <YearRangeSlider />
            <YearPicker onChange={() => setHeader('day')} />
          </View>
        )}
        {header === 'month' && (
          <View gap="$4">
            <H3 size="$7" alignSelf="center">
              Select a month
            </H3>
            <MonthPicker
              onChange={() => {
                setHeader('day')
              }}
            />
          </View>
        )}
      </View>
    </HeaderTypeProvider>
  )
}

/** ------ EXAMPLE ------ */
export function RangePicker() {
  const now = new Date()
  const [selectedDates, onDatesChange] = useState<Date[]>([])
  const [offsetDate, onOffsetChange] = useState<Date>(now)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (selectedDates.length === 2) {
      setOpen(false)
    }
  }, [selectedDates])

  // uncomment this to limit the range of dates
  //   const M = now.getMonth()
  //   const Y = now.getFullYear()
  //   const D = now.getDate()

  const config: DatePickerProviderProps['config'] = {
    selectedDates,
    onDatesChange,
    offsetDate,
    onOffsetChange,
    dates: {
      mode: 'range',
      // limit years to 2 years before and after current year
      //   minDate: new Date(Y, M - 2, 1),
      //   maxDate: new Date(Y, M + 2, 0),
      // minDate: new Date('2023-01-01'),
      // maxDate: new Date('2023-07-31'),
    },
    calendar: {
      offsets: [-1, 1],
    },
  }

  return (
    <DatePicker keepChildrenMounted open={open} onOpenChange={setOpen} config={config}>
      <DatePicker.Trigger asChild>
        <DatePickerInput
          value={`${selectedDates[0]?.toDateString() || ''}${
            selectedDates[0] && selectedDates[1] ? ' - ' : ''
          }${selectedDates[1]?.toDateString() || ''}`}
          placeholder="Start date - End date"
          onReset={() => {
            onDatesChange([])
          }}
          onButtonPress={() => setOpen(true)}
          width={260}
        />
      </DatePicker.Trigger>

      <DatePicker.Content>
        <DatePicker.Content.Arrow />
        <DatePickerBody config={config} />
      </DatePicker.Content>
    </DatePicker>
  )
}

RangePicker.fileName = 'RangePicker'
