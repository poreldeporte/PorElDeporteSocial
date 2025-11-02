import { useEffect, useState, useRef, useCallback } from 'react'
import type { Control, UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import type { SizeTokens } from 'tamagui'
import {
  AnimatePresence,
  Form,
  Input,
  Paragraph,
  Spinner,
  View,
  Button,
  XStack,
  YStack,
  Label,
  Text,
} from 'tamagui'

import {
  CheckCircle2,
  ChevronLeft,
  KeySquare,
  LockKeyhole,
  Mail,
  RefreshCcw,
  Smartphone,
} from '@tamagui/lucide-icons'

interface CodeConfirmationInputProps {
  id: number
  size?: SizeTokens
  codeSize: number
  secureTextEntry?: boolean
  control: Control<FormFields, any>
  register: UseFormRegister<FormFields>
  setValue: UseFormSetValue<FormFields>
  switchInputPlace: (currentField: number, value: string) => void
  onSubmit: () => void
}

function CodeConfirmationInput({
  id,
  size,
  codeSize,
  secureTextEntry,
  control,
  register,
  setValue,
  switchInputPlace,
  onSubmit,
}: CodeConfirmationInputProps) {
  return (
    <Controller
      name={`code${id}`}
      defaultValue=""
      control={control}
      rules={{ required: true, pattern: /^[0-9]*$/ }}
      render={({ fieldState: { invalid }, field: { value, onChange } }) => (
        <Input
          {...register(`code${id}`)}
          value={value}
          maxLength={codeSize}
          // uncomment this for autofocus
          // autoFocus={id === 0}
          selectTextOnFocus
          onChangeText={(code: string) => {
            // Max length is disabled to enable multiple digit paste
            if (code.length === codeSize) {
              // Paste logic

              const digits = code.split('')
              digits.forEach((digit, index) => {
                // Set each digit to the corresponding input
                setValue(`code${index}`, digit)
              })

              onSubmit()
            } else {
              // Manual input logic

              // Only take the first digit (disables multiple digits in one input)
              onChange(code.split('')[0])
              // Focus next input
              switchInputPlace(id, code)

              // Submit on last input
              if (id === codeSize - 1) {
                onSubmit()
              }
            }
          }}
          onKeyPress={(e) => {
            const event = e.nativeEvent
            if (event.key === 'Backspace') {
              // Prevent the backspace key from navigating back
              e.preventDefault()

              if (value !== '') {
                // Reset input field
                onChange('')
              } else {
                // Set focus to the previous input
                switchInputPlace(id, value)
              }
            }
            if (event.key === 'Enter') {
              onSubmit()
            }
          }}
          inputMode="numeric"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          secureTextEntry={secureTextEntry}
          enterKeyHint={id === codeSize - 1 ? 'done' : 'next'}
          textAlign="center"
          fontSize="$8"
          borderRadius="$5"
          theme="active"
          aspectRatio={1}
          w="100%"
          h="100%"
          flex={1}
          backgroundColor={invalid ? '$red7' : value ? '$color1' : '$color5'}
          hoverStyle={{ outlineWidth: 0 }}
          focusStyle={{
            backgroundColor: invalid ? '$red8' : '$color1',
            outlineWidth: 0,
          }}
        />
      )}
    />
  )
}

interface CodeConfirmationProps {
  size?: SizeTokens
  codeSize: number
  secureText?: boolean
  onEnter: (code: number) => void
}

interface FormFields {
  [key: string]: string
}

function CodeConfirmation({
  size,
  codeSize,
  secureText,
  onEnter,
}: CodeConfirmationProps) {
  const defaultValues = Array.from({ length: codeSize }, (_, i) => `code${i}`).reduce(
    (acc, key) => ({ ...acc, [key]: '' }),
    {}
  )

  const { control, setFocus, register, handleSubmit, setValue, formState } =
    useForm<FormFields>({
      defaultValues: defaultValues,
    })

  const switchInputPlace = (currentInput: number, value: string) => {
    if (value === '') {
      setFocus(`code${currentInput - 1}`)
    } else {
      setFocus(`code${currentInput + 1}`)
    }
  }

  const onSubmit = handleSubmit((data) => {
    const code = Number(Object.values(data).join(''))
    onEnter(code)
  })

  const [translateX, setTranslateX] = useState(0)
  const [isValid, setValid] = useState(true)

  useEffect(() => {
    if (Object.keys(formState.errors).length > 0) {
      setValid(false)
    }
  }, [formState.isValidating])

  // shake animation
  useEffect(() => {
    let interval: number | null = null

    interval = window.setInterval(() => {
      if (isValid) {
        setTranslateX(0)
      } else {
        setValid(false)
        setTranslateX((prevState) => {
          if (prevState === 0) return -16
          if (prevState < 0) return Math.abs(prevState) - 2
          setValid(true)
          return -(prevState - 2)
        })
      }
    }, 50)

    return () => {
      if (interval) window.clearInterval(interval)
    }
  }, [isValid])

  return (
    <Form
      gap="$2"
      alignItems="center"
      minWidth="100%"
      justifyContent="center"
      x={translateX}
      animation="bouncy"
      w="100%"
      mt="$2"
      flexDirection="row"
      onSubmit={onSubmit}
      mb="$0"
      pb="$0"
    >
      {Array(codeSize)
        .fill(null)
        .map((_, id) => {
          return (
            <CodeConfirmationInput
              key={`code${id}`}
              id={id}
              size={size}
              codeSize={codeSize}
              secureTextEntry={secureText}
              control={control}
              register={register}
              setValue={setValue}
              switchInputPlace={switchInputPlace}
              onSubmit={onSubmit}
            />
          )
        })}
    </Form>
  )
}

// ResendTimer component
const ResendTimer = ({
  onComplete,
  onResendClick,
}: {
  onComplete: () => void
  onResendClick: () => void
}) => {
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [seconds, setSeconds] = useState(30)
  const startTimeRef = useRef<number>(null)
  const rafIdRef = useRef<number>(null)

  const handleResendClick = () => {
    setIsTimerActive(true)
    onResendClick()
  }

  useEffect(() => {
    if (!isTimerActive || seconds === 0) return

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const newSeconds = 30 - Math.floor(elapsed / 1000)

      if (newSeconds <= 0) {
        setSeconds(0)
        setIsTimerActive(false)
        onComplete()
        return
      }

      if (newSeconds !== seconds) {
        setSeconds(newSeconds)
      }

      rafIdRef.current = requestAnimationFrame(animate)
    }

    rafIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
      startTimeRef.current = null
    }
  }, [isTimerActive, seconds === 0, onComplete])

  if (!isTimerActive) {
    return (
      <XStack
        alignItems="center"
        alignSelf="flex-end"
        justifyContent="flex-end"
        gap="$2"
        className="flex"
        cursor="pointer"
        onPress={handleResendClick}
      >
        <RefreshCcw size={12} color="$blue10" />
        <Paragraph color="$blue10" textAlign="right" fontSize="$1">
          Resend OTP
        </Paragraph>
      </XStack>
    )
  }

  return (
    <XStack
      alignItems="center"
      alignSelf="flex-end"
      justifyContent="flex-end"
      gap="$2"
      className="flex"
      cursor="default"
    >
      <RefreshCcw size={12} color="$color10" />
      <Paragraph color="$color10" textAlign="right" fontSize="$1">
        Resend in {seconds} {seconds > 1 ? 'seconds' : 'second'}
      </Paragraph>
    </XStack>
  )
}

/** ------ EXAMPLE ------ */
export function OneTimeCodeInputExample({
  size = '$5',
  codeSize = 4,
  secureText = false,
}: {
  size?: SizeTokens
  codeSize?: number
  secureText?: boolean
}) {
  const [code, setCode] = useState<number>()
  const [codeEntered, setCodeEntered] = useState(false)
  const [verified, setVerified] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [activeInterface, setActiveInterface] = useState<'email' | 'code'>('code')
  const [isResendEnabled, setIsResendEnabled] = useState(false)

  const handleEnter = useCallback((code: number) => {
    setCode(code)
  }, [])

  const handleResendComplete = useCallback(() => {
    setIsResendEnabled(true)
  }, [])

  const handleResendClick = useCallback(() => {}, [])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (code !== undefined) {
      timer = setTimeout(() => {
        setCodeEntered(true)
      }, 2500)
    }

    return () => clearTimeout(timer)
  }, [code])

  //NOTE: for testing purposes
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (codeEntered === true) {
      timer = setTimeout(() => {
        setVerified(false)
      }, 2000)
    }

    return () => clearTimeout(timer)
  }, [codeEntered])

  const showCode = activeInterface === 'email' || codeEntered

  return (
    <View alignItems="center" justifyContent="center" gap="$4">
      <View
        minWidth={300}
        ai="center"
        jc="center"
        borderRadius="$8"
        overflow="hidden"
        p="$5"
        borderWidth={1}
        borderColor="$borderColor"
        bg="$backgroundColor"
        //
        $gtSm={{
          shadowColor: '$shadowColor',
          shadowOffset: {
            width: 0,
            height: 12,
          },
          shadowOpacity: 0.5,
          shadowRadius: '$6',
        }}
      >
        <View position="absolute" t="$4" r="$4">
          {codeEntered ? (
            <View animation="bouncy" key="success" flexDirection="row" gap="$2">
              <AnimatePresence>
                {verified && (
                  <Paragraph
                    key="success"
                    color="$green10"
                    enterStyle={{ opacity: 0, x: 15 }}
                    exitStyle={{ opacity: 0, x: 15, scale: 0.5 }}
                    animation="200ms"
                  >
                    Success
                  </Paragraph>
                )}
              </AnimatePresence>
              <View enterStyle={{ opacity: 0.5, scale: 1.5 }} animation="bouncy">
                <CheckCircle2 color="$green10" />
              </View>
            </View>
          ) : (
            <View key="email" enterStyle={{ opacity: 0.5, scale: 1.5 }} animation="100ms">
              {activeInterface === 'email' ? (
                <Mail size={16} opacity={0.25} />
              ) : (
                <KeySquare size={16} opacity={0.25} />
              )}
            </View>
          )}
        </View>

        <View
          key="code"
          animation="200ms"
          w="100%"
          opacity={showCode ? 0 : 1}
          pointerEvents={showCode ? 'none' : 'auto'}
          transform={[{ translateX: showCode ? -150 : 0 }]}
        >
          <YStack
            key="code"
            animation="200ms"
            exitStyle={{ opacity: 0 }}
            justifyContent="space-between"
            gap="$4"
            w="100%"
            opacity={code ? 0 : 1}
            h="auto"
          >
            <View alignItems="center" gap="$2">
              <Text
                fontWeight="700"
                fontSize="$6"
                $gtMd={{
                  fontSize: '$8',
                }}
                color="$color12"
              >
                Code
              </Text>

              {email ? (
                <View
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap="$2"
                  w="100%"
                >
                  <Mail size="$1" color="$color12" />
                  <Paragraph size="$4" fontWeight="500" color="$color12">
                    {email}
                  </Paragraph>
                </View>
              ) : (
                <View
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap="$2"
                  w="100%"
                >
                  <Smartphone size={16} color="$color12" />
                  <Paragraph size="$4" fontWeight="500" color="$color12">
                    (•••) ••• ••73
                  </Paragraph>
                </View>
              )}
            </View>

            <View px="$4" $gtMd={{ px: 0 }}>
              <YStack gap="$2">
                <CodeConfirmation
                  size={size}
                  codeSize={codeSize}
                  secureText={secureText}
                  onEnter={handleEnter}
                />

                <ResendTimer
                  onComplete={handleResendComplete}
                  onResendClick={handleResendClick}
                />
              </YStack>
            </View>

            {!email ? (
              <XStack
                borderColor="$transparent"
                onPress={() => setActiveInterface('email')}
                gap="$2"
                ai="center"
                jc="center"
                cursor="pointer"
              >
                <Mail size={16} color="$color10" />
                <Paragraph color="$color11">Send code to email</Paragraph>
              </XStack>
            ) : null}
          </YStack>

          {code ? (
            <View
              position="absolute"
              w="100%"
              h="100%"
              alignItems="center"
              justifyContent="center"
              bg="$backgroundColor"
            >
              <Spinner color="$color10" />
            </View>
          ) : null}
        </View>

        <View
          position="absolute"
          enterStyle={{ opacity: 0, x: 350 }}
          exitStyle={{ opacity: 0, x: 0 }}
          bg="$backgroundColor"
          ai="center"
          jc="center"
          w="full"
          h="100%"
          $gtMd={{ w: '100%', p: '$5' }}
          animation={'200ms'}
          opacity={!showCode ? 0 : 1}
          pointerEvents={!showCode ? 'none' : 'auto'}
          transform={[{ translateX: !showCode ? 150 : 0 }]}
        >
          <AnimatePresence>
            {(activeInterface === 'email' || codeEntered) && (
              <>
                {!codeEntered ? (
                  <EmailInput
                    setActiveInterface={setActiveInterface}
                    email={email}
                    setEmail={setEmail}
                  />
                ) : (
                  <View
                    w="100%"
                    h="100%"
                    justifyContent="space-between"
                    alignItems="center"
                    gap="$4"
                    pt="$6"
                  >
                    <YStack
                      flexGrow={1}
                      justifyContent="center"
                      alignItems="center"
                      w="100%"
                      gap="$2"
                    >
                      <Text fontWeight="bold" fontSize="$6">
                        Code Verified
                      </Text>

                      <Paragraph color="$color10" textAlign="center">
                        Congratulations, successful confirmation
                      </Paragraph>
                    </YStack>

                    <Button minWidth="100%" themeInverse>
                      Continue
                    </Button>
                  </View>
                )}
              </>
            )}
          </AnimatePresence>
        </View>
      </View>
      <View flexDirection="row" alignItems="center" gap="$2">
        <LockKeyhole size={12} color="$color10" />
        <Paragraph size="$2" color="$color10">
          Encrypted
        </Paragraph>
      </View>
    </View>
  )
}

const EmailInput = ({
  setActiveInterface,
  ...props
}: {
  setActiveInterface: (_: 'email' | 'code') => void
  email: string | null
  setEmail: (_: string | null) => void
}) => {
  const [email, setEmail] = useState<string | null>(props.email)

  const onSubmit = () => {
    setActiveInterface('code')
    props.setEmail(email)
  }

  return (
    <View pt="$3" gap="$4" w="100%" h="100%" jc="space-between">
      <XStack
        alignItems="center"
        hoverStyle={{ cursor: 'pointer' }}
        animation="200ms"
        onPress={() => setActiveInterface('code')}
        alignSelf="flex-start"
        gap="$1"
        left={-4}
      >
        <ChevronLeft size="$1" color="$white9" />

        <Paragraph size="$4" color="$white9">
          Back
        </Paragraph>
      </XStack>

      <YStack jc="flex-end" flexGrow={1} gap="$4" w="100%">
        <YStack gap="$0" w="100%">
          <Label>Email Address</Label>
          <XStack w="100%" gap="$4" justifyContent="flex-start" alignItems="flex-end">
            <Input
              size="$4"
              keyboardType="email-address"
              placeholder="Enter your email"
              textContentType="emailAddress"
              onChangeText={setEmail}
              w="100%"
            />
          </XStack>
        </YStack>

        <Button themeInverse onPress={onSubmit}>
          Send
        </Button>
      </YStack>
    </View>
  )
}

OneTimeCodeInputExample.fileName = 'OneTimeCodeInput'
