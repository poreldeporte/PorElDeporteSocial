import type { DPDatesMode, DPDay, DatePickerProviderProps } from '@rehookify/datepicker'
import { useDatePickerContext } from '@rehookify/datepicker'
import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { useMemo, useState } from 'react'
import type { GetProps } from 'tamagui'
import {
  AnimatePresence,
  Button,
  H3,
  Separator,
  SizableText,
  Stack,
  Tabs,
  View,
  YStack,
  isWeb,
  useMedia,
} from 'tamagui'
import { LinearGradient } from 'tamagui/linear-gradient'

import {
  CalendarHeader,
  HeaderTypeProvider,
  MonthPicker,
  WeekView,
  YearPicker,
  YearRangeSlider,
  swapOnClick,
  useHeaderType,
} from './common/dateParts'
import { useDateAnimation } from './common/useDateAnimation'

function CalendarView({
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
                  //   flex={1}
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
                      return <Stack key={day.$date.toString()} flex={1} w="100%" />
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
                        {day.selected ? (
                          <Button.Text
                            key="text-selected"
                            animation="quicker"
                            enterStyle={{
                              opacity: 0,
                              y: 20,
                            }}
                            exitStyle={{
                              opacity: 0,
                              y: 20,
                            }}
                            opacity={1}
                            fontWeight="bold"
                          >
                            {day.day}
                          </Button.Text>
                        ) : (
                          <Button.Text key="text-normal">{day.day}</Button.Text>
                        )}
                      </Button>
                    )

                    if (shouldWrapInGradient) {
                      const direction =
                        day.$date.getDate() === 1 ? 'rightToLeft' : 'leftToRight'

                      return (
                        <LinearGradient
                          key={day.$date.toString()}
                          flex={1}
                          w="100%"
                          colors={['$color5', '$background06']}
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
                        {(day.range === 'in-range' ||
                          day.range === 'range-start' ||
                          day.range === 'range-end') && (
                          <View
                            animation="quick"
                            pos="absolute"
                            w="100%"
                            h="100%"
                            {...BG_RANGE_STYLE[day.range]}
                            enterStyle={{
                              opacity: 0,
                            }}
                            exitStyle={{
                              opacity: 0,
                            }}
                            opacity={1}
                            y={0}
                          />
                        )}

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

export function Calendar({ showTabs = true }: { showTabs?: boolean }) {
  const now = new Date()
  const [selectedDates, onDatesChange] = useState<Date[]>([])
  const [offsetDate, onOffsetChange] = useState<Date>(now)
  const [mode, setMode] = useState<DPDatesMode>('range')

  const config: DatePickerProviderProps['config'] = {
    selectedDates,
    onDatesChange,
    offsetDate,
    onOffsetChange,
    dates: {
      mode,
    },
    calendar: {
      offsets: [-1, 1],
    },
  }

  const [header, setHeader] = useState<'month' | 'year' | 'day'>('day')
  const { gtSm: fullWidthMode } = useMedia()

  return (
    <YStack gap="$4">
      {showTabs && (
        <Tabs
          defaultValue="range"
          flexDirection="row"
          orientation="horizontal"
          borderRadius="$4"
          borderWidth="$0.25"
          overflow="hidden"
          w="fit"
          alignSelf="center"
          $gtMd={{
            ai: 'center',
            jc: 'center',
          }}
          bg="$color1"
          borderColor="$borderColor"
          onValueChange={(value) => {
            setMode(value as DPDatesMode)
            onDatesChange([])
          }}
        >
          <AnimatePresence>
            <Tabs.List
              disablePassBorderRadius="end"
              aria-label="Calendar Mode"
              separator={<Separator />}
            >
              <Tabs.Tab
                focusStyle={{
                  backgroundColor: '$color3',
                }}
                w="full"
                value="range"
              >
                <SizableText>Range</SizableText>
              </Tabs.Tab>
              <Tabs.Tab
                focusStyle={{
                  backgroundColor: '$color3',
                }}
                value="single"
              >
                <SizableText>Single</SizableText>
              </Tabs.Tab>
              <Tabs.Tab
                focusStyle={{
                  backgroundColor: '$color3',
                }}
                value="multiple"
              >
                <SizableText>Multiple</SizableText>
              </Tabs.Tab>
            </Tabs.List>
          </AnimatePresence>
          <Separator vertical />
        </Tabs>
      )}

      <HeaderTypeProvider config={config} type={header} setHeader={setHeader}>
        <View
          bg="$background"
          flexDirection="row"
          gap="$4"
          p="$4"
          bw={1}
          borderColor="$borderColor"
          borderRadius="$8"
          shadowColor="$color10"
          shadowOffset={{ width: 0, height: '$6' }}
          shadowOpacity={0.2}
          shadowRadius="$6"
        >
          {header === 'day' && !fullWidthMode && (
            <CalendarView order="either" calendarIndex={0} />
          )}
          {header === 'day' && fullWidthMode && (
            <>
              <CalendarView order="first" calendarIndex={1} />
              <Separator vertical />
              <CalendarView order="last" calendarIndex={0} />
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
    </YStack>
  )
}

Calendar.fileName = 'Calendar'
