DatePicker.tsx
import {
  useDatePickerContext,
  type DatePickerProviderProps,
  type DPDay,
} from '@rehookify/datepicker'

import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, Button, H3, View } from 'tamagui'

import {
  DatePicker,
  DatePickerInput,
  HeaderTypeProvider,
  MonthPicker,
  YearPicker,
  YearRangeSlider,
  swapOnClick,
  useHeaderType,
  CalendarHeader,
  type HeaderType,
  WeekView,
} from './common/dateParts'
import { useDateAnimation } from './common/useDateAnimation'

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
      <H3 size="$7" self="center">
        Select a month
      </H3>
    )
  }
  return (
    <View flexDirection="row" width="100%" items="center" justify="space-between">
      <Button circular size="$4" {...swapOnClick(subtractOffset({ months: 1 }))}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronLeft />
        </Button.Icon>
      </Button>

      <CalendarHeader year={year} month={month} setHeader={setHeader} />

      <Button circular size="$4" {...swapOnClick(subtractOffset({ months: -1 }))}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronRight />
        </Button.Icon>
      </Button>
    </View>
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
      <View width="100%" gap="$4" animation="medium" {...prevNextAnimation()}>
        <WeekView weekDays={weekDays} />

        <View
          flexDirection="column"
          gap="$2"
          items="center"
          justify="center"
          width="100%"
        >
          {subDays.map((days) => {
            return (
              <View
                justify="space-between"
                items="center"
                flexDirection="row"
                key={days[0].$date.toString()}
                gap="$1"
                flex={1}
                width="100%"
              >
                {days.map((d) => (
                  <Button
                    key={d.$date.toString()}
                    chromeless
                    circular
                    p={0}
                    {...swapOnClick(dayButton(d))}
                    bg={d.selected ? '$background' : 'transparent'}
                    themeInverse={d.selected}
                    disabled={!d.inCurrentMonth}
                  >
                    <Button.Text
                      fontWeight="500"
                      fontSize="$4"
                      color={
                        d.selected
                          ? '$color12'
                          : d.inCurrentMonth
                            ? '$color11'
                            : '$color6'
                      }
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

function DatePickerBody({ config }: { config: DatePickerProviderProps['config'] }) {
  const [header, setHeader] = useState<HeaderType>('day')

  return (
    <HeaderTypeProvider config={config} type={header} setHeader={setHeader}>
      <View
        flexDirection="column"
        items="center"
        gap="$4"
        width="100%"
        p="$4"
        $gtMd={{ p: '$2' }}
      >
        <DateHeader />
        {header === 'month' && <MonthPicker onChange={() => setHeader('day')} />}
        {header === 'year' && <YearPicker onChange={() => setHeader('day')} />}
        {header === 'day' && <DayPicker />}
      </View>
    </HeaderTypeProvider>
  )
}

/** ------ EXAMPLE ------ */
export function DatePickerExample() {
  const [selectedDates, onDatesChange] = useState<Date[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [selectedDates])

  const config: DatePickerProviderProps['config'] = {
    selectedDates,
    onDatesChange,
    calendar: {
      startDay: 1,
    },
  }

  return (
    <DatePicker keepChildrenMounted open={open} onOpenChange={setOpen} config={config}>
      <DatePicker.Trigger asChild>
        <DatePickerInput
          placeholder="Select Date"
          value={selectedDates[0]?.toDateString() || ''}
          onReset={() => onDatesChange([])}
          onButtonPress={() => setOpen(true)}
        />
      </DatePicker.Trigger>

      <DatePicker.Content>
        <DatePicker.Content.Arrow />
        <DatePickerBody config={config} />
      </DatePicker.Content>
    </DatePicker>
  )
}



dateParts.tsx
import type { DatePickerProviderProps } from '@rehookify/datepicker'
import { DatePickerProvider, useDatePickerContext } from '@rehookify/datepicker'
import { getFontSized } from '@tamagui/get-font-sized'
import { Calendar, ChevronLeft, ChevronRight, X } from '@tamagui/lucide-icons'
import type { GestureReponderEvent, ViewProps } from '@tamagui/web'
import type { PopoverProps } from 'tamagui'
import {
  Adapt,
  AnimatePresence,
  Button,
  Popover,
  Text,
  View,
  createStyledContext,
  isWeb,
  styled,
  withStaticProperties,
} from 'tamagui'

import { Input } from '../../../forms/inputs/components/inputsParts'
import { useDateAnimation } from './useDateAnimation'
import { type ReactNode, type ProviderExoticComponent, useEffect, useRef } from 'react'

type DatePickerProps = PopoverProps & {
  config: DatePickerProviderProps['config']
}

export type HeaderType = 'day' | 'month' | 'year'

/** rehookify internally return `onClick` and that's incompatible with native */
export function swapOnClick<D>(d: D) {
  //@ts-ignore
  d.onPress = d.onClick
  return d
}

export const { Provider: HeaderStyleTypeProvider, useStyledContext: useHeaderType } =
  createStyledContext({
    type: 'day',
    setHeader: (_: HeaderType) => {},
  })

export const HeaderTypeProvider = ({
  config,
  ...props
}: {
  config: DatePickerProviderProps['config']
  type: HeaderType
  setHeader: (type: HeaderType) => void
  children: ReactNode
}) => {
  return (
    <DatePickerProvider config={config}>
      <HeaderStyleTypeProvider {...props} />
    </DatePickerProvider>
  )
}

const DatePickerImpl = (props: DatePickerProps) => {
  const { children, config, ...rest } = props
  const popoverRef = useRef<Popover>(null)

  // hide date picker on scroll (web)
  useEffect(() => {
    if (isWeb) {
      const controller = new AbortController()
      // NOTE: For cross-browser compatibility:
      // - We use document.addEventListener('scroll', ...) instead of document.body.addEventListener because Safari does not fire scroll events on body.
      // - We use capture: true because Chrome only fires scroll events on document in the capture phase.
      //   (Chrome works with document.body.addEventListener and capture: false, but that is not reliable in Safari.)
      // This combination ensures the scroll event is caught in both Chrome and Safari.
      document.addEventListener(
        'scroll',
        () => {
          popoverRef.current?.close()
        },
        {
          capture: true,
          signal: controller.signal,
        }
      )

      return () => {
        controller.abort()
      }
    }
  }, [])

  return (
    <DatePickerProvider config={config}>
      <Popover ref={popoverRef} keepChildrenMounted size="$4" allowFlip {...rest}>
        <Adapt when="maxMd">
          <Popover.Sheet modal dismissOnSnapToBottom snapPointsMode="fit">
            <Popover.Sheet.Frame p="$4" width="100%" items="center">
              <Adapt.Contents />
            </Popover.Sheet.Frame>
            <Popover.Sheet.Overlay
              animation="lazy"
              opacity={0.8}
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
            />
          </Popover.Sheet>
        </Adapt>
        {children}
      </Popover>
    </DatePickerProvider>
  )
}

const DatePickerContent = styled(Popover.Content, {
  animation: 'quick',
  variants: {
    unstyled: {
      false: {
        padding: 12,
        borderWidth: 1,
        borderColor: '$borderColor',
        enterStyle: { y: -10, opacity: 0 },
        exitStyle: { y: -10, opacity: 0 },
        elevate: true,
      },
    },
  } as const,

  defaultVariants: {
    unstyled: process.env.TAMAGUI_HEADLESS === '1',
  },
})

export const DatePicker = withStaticProperties(DatePickerImpl, {
  Trigger: Popover.Trigger,
  Content: withStaticProperties(DatePickerContent, {
    Arrow: styled(Popover.Arrow, {
      borderWidth: 1,
      borderColor: '$borderColor',
    }),
  }),
})

type DatePickerInputProps = {
  onReset: () => void
  onButtonPress?: (e: GestureReponderEvent) => void
}

export const DatePickerInput = Input.Area.styleable<DatePickerInputProps>(
  (props, ref) => {
    const { value, onButtonPress, size = '$3', onReset, ...rest } = props
    return (
      <View $platform-native={{ minW: '100%' }}>
        <Input cursor="pointer" onPress={onButtonPress} size={size}>
          <Input.Box>
            <Input.Section>
              <Input.Area
                editable={false}
                value={value}
                ref={ref}
                {...rest}
                color="$color11"
              />
            </Input.Section>
            <Input.Section>
              <Input.Button
                onPress={(e) => {
                  if (value) {
                    e.stopPropagation()
                    onReset()
                  } else {
                    onButtonPress?.(e)
                  }
                }}
              >
                {value ? (
                  <Input.Icon>
                    <X />
                  </Input.Icon>
                ) : (
                  <Input.Icon>
                    <Calendar />
                  </Input.Icon>
                )}
              </Input.Button>
            </Input.Section>
          </Input.Box>
        </Input>
      </View>
    )
  }
)

export function MonthPicker({
  onChange = (_e, _date) => {
    'noop'
  },
}: {
  onChange?: (e: MouseEvent, date: Date) => void
}) {
  const {
    data: { months },
    propGetters: { monthButton },
  } = useDatePickerContext()

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'year',
  })

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <View
        {...prevNextAnimation()}
        flexDirection="row"
        flexWrap="wrap"
        gap="$2"
        animation="100ms"
        grow={0}
        $platform-native={{
          justify: 'space-between',
          width: '100%',
        }}
        $gtMd={{ width: 285 }}
      >
        {months.map((month) => (
          <Button
            themeInverse={month.active}
            rounded="$4"
            shrink={0}
            flexBasis={90}
            bg={month.active ? '$background' : 'transparent'}
            key={month.$date.toString()}
            chromeless
            p={0}
            {...swapOnClick(
              monthButton(month, {
                onClick: onChange as any,
              })
            )}
          >
            <Button.Text color={month.active ? '$color12' : '$color11'}>
              {month.month}
            </Button.Text>
          </Button>
        ))}
      </View>
    </AnimatePresence>
  )
}

export function YearPicker({
  onChange = () => {},
}: {
  onChange?: (e: MouseEvent, date: Date) => void
}) {
  const {
    data: { years, calendars },
    propGetters: { yearButton },
  } = useDatePickerContext()
  const selectedYear = calendars[0].year

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'years',
  })

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <View
        {...prevNextAnimation()}
        animation={'quick'}
        flexDirection="row"
        flexWrap="wrap"
        gap="$2"
        width="100%"
        $gtMd={{
          maxW: 280,
        }}
      >
        {years.map((year) => (
          <Button
            themeInverse={year.year === Number(selectedYear)}
            rounded="$4"
            flexBasis="30%"
            grow={1}
            bg={year.year === Number(selectedYear) ? '$background' : 'transparent'}
            key={year.$date.toString()}
            chromeless
            p={0}
            {...swapOnClick(
              yearButton(year, {
                onClick: onChange as any,
              })
            )}
          >
            <Button.Text
              color={year.year === Number(selectedYear) ? '$color12' : '$color11'}
            >
              {year.year}
            </Button.Text>
          </Button>
        ))}
      </View>
    </AnimatePresence>
  )
}
export function YearRangeSlider() {
  const {
    data: { years },
    propGetters: { previousYearsButton, nextYearsButton },
  } = useDatePickerContext()

  return (
    <View flexDirection="row" width="100%" items="center" justify="space-between">
      <Button circular size="$4" {...swapOnClick(previousYearsButton())}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronLeft />
        </Button.Icon>
      </Button>
      <View y={2} flexDirection="column" items="center">
        <SizableText size="$5">
          {`${years[0].year} - ${years[years.length - 1].year}`}
        </SizableText>
      </View>
      <Button circular size="$4" {...swapOnClick(nextYearsButton())}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronRight />
        </Button.Icon>
      </Button>
    </View>
  )
}

export function YearSlider() {
  const {
    data: { calendars },
    propGetters: { subtractOffset },
  } = useDatePickerContext()
  const { setHeader } = useHeaderType()
  const { year } = calendars[0]
  return (
    <View
      flexDirection="row"
      width="100%"
      height={50}
      items="center"
      justify="space-between"
    >
      <Button circular size="$3" {...swapOnClick(subtractOffset({ months: 12 }))}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronLeft />
        </Button.Icon>
      </Button>
      <SizableText
        onPress={() => setHeader('year')}
        selectable
        tabIndex={0}
        size="$6"
        cursor="pointer"
        color="$color11"
        hoverStyle={{
          color: '$color12',
        }}
      >
        {year}
      </SizableText>
      <Button circular size="$3" {...swapOnClick(subtractOffset({ months: -12 }))}>
        <Button.Icon scaleIcon={1.5}>
          <ChevronRight />
        </Button.Icon>
      </Button>
    </View>
  )
}

export const CalendarHeader = ({
  year,
  month,
  setHeader,
}: {
  year: string
  month: string
  setHeader: (header: 'year' | 'month') => void
}) => {
  return (
    <View flexDirection="column" height={50} items="center">
      <SizableText
        onPress={() => setHeader('year')}
        tabIndex={0}
        size="$4"
        cursor="pointer"
        color="$color11"
        hoverStyle={{
          color: '$color12',
        }}
      >
        {year}
      </SizableText>
      <SizableText
        onPress={() => setHeader('month')}
        select="auto"
        tabIndex={0}
        cursor="pointer"
        size="$6"
        color="$color12"
        fontWeight="bold"
        hoverStyle={{
          color: '$color10',
        }}
      >
        {month}
      </SizableText>
    </View>
  )
}

export const WeekView = ({
  weekDays,
  ...props
}: {
  weekDays: string[]
  props?: ViewProps
}) => {
  return (
    <View width="100%" flexDirection="row" gap="$1" {...props}>
      {weekDays.map((day) => (
        <SizableText flex={1} theme="alt1" key={day} text="center" width="100%" size="$4">
          {day}
        </SizableText>
      ))}
    </View>
  )
}

export const SizableText = styled(Text, {
  name: 'SizableText',
  fontFamily: '$body',

  variants: {
    size: {
      '...fontSize': getFontSized,
    },
  } as const,

  defaultVariants: {
    size: '$true',
  },
})

inputParts.tsx
import { getFontSized } from '@tamagui/get-font-sized'
import { getSpace } from '@tamagui/get-token'
import { User } from '@tamagui/lucide-icons'
import type { SizeVariantSpreadFunction } from '@tamagui/web'
import { useState } from 'react'
import type { ColorTokens, FontSizeTokens } from 'tamagui'
import {
  Label,
  Button as TButton,
  Input as TInput,
  Text,
  View,
  XGroup,
  createStyledContext,
  getFontSize,
  getVariable,
  isWeb,
  styled,
  useGetThemedIcon,
  useTheme,
  withStaticProperties,
} from 'tamagui'

const defaultContextValues = {
  size: '$true',
  scaleIcon: 1.2,
  color: undefined,
} as const

export const InputContext = createStyledContext<{
  size: FontSizeTokens
  scaleIcon: number
  color?: ColorTokens | string
}>(defaultContextValues)

export const defaultInputGroupStyles = {
  size: '$true',
  fontFamily: '$body',
  borderWidth: 1,
  outlineWidth: 0,
  color: '$color',

  ...(isWeb
    ? {
        tabIndex: 0,
      }
    : {
        focusable: true,
      }),

  borderColor: '$borderColor',
  backgroundColor: '$color2',

  // this fixes a flex bug where it overflows container
  minWidth: 0,

  hoverStyle: {
    borderColor: '$borderColorHover',
  },

  focusStyle: {
    outlineColor: '$outlineColor',
    outlineWidth: 2,
    outlineStyle: 'solid',
    borderColor: '$borderColorFocus',
  },
} as const

const InputGroupFrame = styled(XGroup, {
  justify: 'space-between',
  context: InputContext,
  variants: {
    unstyled: {
      false: defaultInputGroupStyles,
    },
    scaleIcon: {
      ':number': {} as any,
    },
    applyFocusStyle: {
      ':boolean': (val, { props }) => {
        if (val) {
          return props.focusStyle || defaultInputGroupStyles.focusStyle
        }
      },
    },
    size: {
      '...size': (val, { tokens }) => {
        return {
          borderRadius: tokens.radius[val],
        }
      },
    },
  } as const,
  defaultVariants: {
    unstyled: process.env.TAMAGUI_HEADLESS === '1',
  },
})

const FocusContext = createStyledContext({
  setFocused: (val: boolean) => {},
  focused: false,
})

const InputGroupImpl = InputGroupFrame.styleable((props, forwardedRef) => {
  const { children, ...rest } = props
  const [focused, setFocused] = useState(false)

  return (
    <FocusContext.Provider focused={focused} setFocused={setFocused}>
      <InputGroupFrame applyFocusStyle={focused} ref={forwardedRef} {...rest}>
        {children}
      </InputGroupFrame>
    </FocusContext.Provider>
  )
})

export const inputSizeVariant: SizeVariantSpreadFunction<any> = (
  val = '$true',
  extras
) => {
  const radiusToken = extras.tokens.radius[val] ?? extras.tokens.radius['$true']
  const paddingHorizontal = getSpace(val, {
    shift: -1,
    bounds: [2],
  })
  const fontStyle = getFontSized(val as any, extras)
  // lineHeight messes up input on native
  if (!isWeb && fontStyle) {
    delete fontStyle['lineHeight']
  }
  return {
    ...fontStyle,
    height: val,
    borderRadius: extras.props.circular ? 100_000 : radiusToken,
    paddingHorizontal,
  }
}

const InputFrame = styled(TInput, {
  unstyled: true,
  context: InputContext,
})

const InputImpl = InputFrame.styleable((props, ref) => {
  const { setFocused } = FocusContext.useStyledContext()
  const { size } = InputContext.useStyledContext()
  const { ...rest } = props
  return (
    <View flex={1}>
      <InputFrame
        ref={ref}
        onFocus={() => {
          setFocused(true)
        }}
        onBlur={() => setFocused(false)}
        size={size}
        {...rest}
      />
    </View>
  )
})

const InputSection = styled(XGroup.Item, {
  justify: 'center',
  items: 'center',
  context: InputContext,
})

const Button = styled(TButton, {
  context: InputContext,
  justify: 'center',
  items: 'center',

  variants: {
    size: {
      '...size': (val = '$true', { tokens }) => {
        if (typeof val === 'number') {
          return {
            paddingHorizontal: 0,
            height: val,
            borderRadius: val * 0.2,
          }
        }
        return {
          paddingHorizontal: 0,
          height: val,
          borderRadius: tokens.radius[val],
        }
      },
    },
  } as const,
})

// Icon starts

export const InputIconFrame = styled(View, {
  justify: 'center',
  items: 'center',
  context: InputContext,

  variants: {
    size: {
      '...size': (val, { tokens }) => {
        return {
          paddingHorizontal: tokens.space[val],
        }
      },
    },
  } as const,
})

const getIconSize = (size: FontSizeTokens, scale: number) => {
  return (
    (typeof size === 'number' ? size * 0.5 : getFontSize(size as FontSizeTokens)) * scale
  )
}

const InputIcon = InputIconFrame.styleable<{
  scaleIcon?: number
  color?: ColorTokens | string
}>((props, ref) => {
  const { children, color: colorProp, ...rest } = props
  const inputContext = InputContext.useStyledContext()
  const { size = '$true', color: contextColor, scaleIcon = 1 } = inputContext

  const theme = useTheme()
  const color = getVariable(
    contextColor || theme[contextColor as any]?.get('web') || theme.color10?.get('web')
  )
  const iconSize = getIconSize(size as FontSizeTokens, scaleIcon)

  const getThemedIcon = useGetThemedIcon({ size: iconSize, color: color as any })
  return (
    <InputIconFrame ref={ref} {...rest}>
      {getThemedIcon(children)}
    </InputIconFrame>
  )
})

export const InputContainerFrame = styled(View, {
  context: InputContext,
  flexDirection: 'column',

  variants: {
    size: {
      '...size': (val, { tokens }) => ({
        gap: tokens.space[val].val * 0.3,
      }),
    },
    color: {
      '...color': () => ({}),
    },
    gapScale: {
      ':number': {} as any,
    },
  } as const,

  defaultVariants: {
    size: '$4',
  },
})

export const InputLabel = styled(Label, {
  context: InputContext,
  variants: {
    size: {
      '...fontSize': getFontSized as any,
    },
  } as const,
})

export const InputInfo = styled(Text, {
  context: InputContext,
  color: '$color10',

  variants: {
    size: {
      '...fontSize': (val, { font }) => {
        if (!font) return
        const fontSize = font.size[val].val * 0.8
        const lineHeight = font.lineHeight?.[val].val * 0.8
        const fontWeight = font.weight?.['$2']
        const letterSpacing = font.letterSpacing?.[val]
        const textTransform = font.transform?.[val]
        const fontStyle = font.style?.[val]
        return {
          fontSize,
          lineHeight,
          fontWeight,
          letterSpacing,
          textTransform,
          fontStyle,
        }
      },
    },
  } as const,
})

const InputXGroup = styled(XGroup, {
  context: InputContext,

  variants: {
    size: {
      '...size': (val, { tokens }) => {
        const radiusToken = tokens.radius[val] ?? tokens.radius['$true']
        return {
          borderRadius: radiusToken,
        }
      },
    },
  } as const,
})

export const Input = withStaticProperties(InputContainerFrame, {
  Box: InputGroupImpl,
  Area: InputImpl,
  Section: InputSection,
  Button,
  Icon: InputIcon,
  Info: InputInfo,
  Label: InputLabel,
  XGroup: withStaticProperties(InputXGroup, { Item: XGroup.Item }),
})

export const InputNew = () => {
  return (
    <Input width={400} size="$3">
      <Input.Box>
        <Input.Section>
          <Input.Icon>
            <User />
          </Input.Icon>
        </Input.Section>
        <Input.Section>
          <Input.Area pl={0} />
        </Input.Section>
        <Input.Section>
          <Input.Button>
            <Input.Icon>
              <User />
            </Input.Icon>
          </Input.Button>
        </Input.Section>
      </Input.Box>
    </Input>
  )
}

useDateAnimation.tsx
import { useDatePickerContext } from '@rehookify/datepicker'
import { useEffect, useState } from 'react'

export function useDateAnimation({
  listenTo,
}: {
  listenTo: 'year' | 'month' | 'years'
}) {
  const {
    data: { years, calendars },
  } = useDatePickerContext()
  const [currentMonth, setCurrentMonth] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState<string | null>(null)
  const [currentYearsSum, setCurrentYearsSum] = useState<number | null>(null)

  const sumYears = () => {
    return years.reduce((acc, date) => acc + date.year, 0)
  }
  useEffect(() => {
    if (listenTo === 'years') {
      if (currentYearsSum !== sumYears()) {
        setCurrentYearsSum(sumYears())
      }
    }
  }, [years, currentYearsSum])

  useEffect(() => {
    if (listenTo === 'month') {
      if (currentMonth !== calendars[0].month) {
        setCurrentMonth(calendars[0].month)
      }
    }
  }, [calendars[0][listenTo], currentMonth])

  useEffect(() => {
    if (listenTo === 'year') {
      if (currentYear !== calendars[0].year) {
        setCurrentYear(calendars[0].year)
      }
    }
  }, [calendars[0][listenTo], currentYear])

  const prevNextAnimation = () => {
    if (listenTo === 'years') {
      if (currentYearsSum === null) return { enterStyle: { opacity: 0 } }

      return {
        enterStyle: { opacity: 0, x: sumYears() < currentYearsSum ? -15 : 15 },
        exitStyle: { opacity: 0, x: sumYears() < currentYearsSum ? -15 : 15 },
      }
    }
    if (listenTo === 'month') {
      if (currentMonth === null) return { enterStyle: { opacity: 0 } }
      const newDate = new Date(`${calendars[0][listenTo]} 1, ${calendars[0].year}`)
      const currentDate = new Date(`${currentMonth} 1, ${calendars[0].year}`)

      if (currentMonth === 'December' && calendars[0].month === 'January') {
        return {
          enterStyle: { opacity: 0, x: 15 },
          exitStyle: { opacity: 0, x: 15 },
        }
      }
      if (currentMonth === 'January' && calendars[0].month === 'December') {
        return {
          enterStyle: { opacity: 0, x: -15 },
          exitStyle: { opacity: 0, x: -15 },
        }
      }
      return {
        enterStyle: { opacity: 0, x: newDate < currentDate ? -15 : 15 },
        exitStyle: { opacity: 0, x: newDate < currentDate ? -15 : 15 },
      }
    }
    if (listenTo === 'year') {
      if (currentYear === null) return { enterStyle: { opacity: 0 } }
      const newDate = new Date(`${calendars[0].month} 1, ${calendars[0].year}`)
      const currentDate = new Date(`${calendars[0].month} 1, ${currentYear}`)

      return {
        enterStyle: { opacity: 0, x: newDate < currentDate ? -15 : 15 },
        exitStyle: { opacity: 0, x: newDate < currentDate ? -15 : 15 },
      }
    }
  }
  return {
    prevNextAnimation,
    prevNextAnimationKey: listenTo === 'years' ? sumYears() : calendars[0][listenTo],
  }
}

