import { Check, ChevronDown } from '@tamagui/lucide-icons'
import { useFieldInfo, useTsController } from '@ts-react/form'
import React, { useId } from 'react'
import { Adapt, Fieldset, Label, Select, type SelectProps, Sheet, Theme, YStack } from 'tamagui'
import { LinearGradient } from 'tamagui/linear-gradient'

import { FieldError } from '../FieldError'
import { formInputStyle } from './formInputStyle'

type SelectItem = {
  value: string
  name: string
}

type SelectFieldProps = {
  options: SelectItem[]
  placeholder?: string
} & Pick<SelectProps, 'size' | 'native'>

export const SelectField = ({
  options,
  placeholder = 'Choose an option',
  native = true,
  ...props
}: SelectFieldProps) => {
  const {
    field,
    error,
    formState: { isSubmitting },
  } = useTsController<string>()
  const { label, isOptional } = useFieldInfo()
  const id = useId()

  return (
    <Theme name={error ? 'red' : null} forceClassName>
      {label ? (
        <Label color="$color12" size={props.size || '$3'} htmlFor={id}>
          {label} {isOptional && `(Optional)`}
        </Label>
      ) : null}
      <Fieldset>
        <Select
          value={field?.value}
          onValueChange={field.onChange}
          disablePreventBodyScroll
          {...props}
          native={!!native}
        >
          <Select.Trigger
            minWidth="100%"
            disabled={isSubmitting}
            $md={{ maxWidth: 220 }}
            {...formInputStyle}
          >
            <Select.Value placeholder={placeholder} />
          </Select.Trigger>

          <SelectSheetAdapter native={!!native} />
          <Select.Content>
            <SelectOptions items={options} label={label} />
          </Select.Content>
        </Select>
        <FieldError message={error?.errorMessage} />
      </Fieldset>
    </Theme>
  )
}

const SelectSheetAdapter = ({ native }: { native: boolean }) => (
  <Adapt when="sm" platform="touch">
    <Sheet
      zIndex={1000}
      native={native}
      dismissOnSnapToBottom
      modal
      animationConfig={{
        type: 'spring',
        damping: 20,
        mass: 1.2,
        stiffness: 250,
      }}
      snapPointsMode="fit"
    >
      <Sheet.Frame marginBottom="$12" borderColor="$color12" borderWidth={1}>
        <Sheet.ScrollView>
          <Adapt.Contents />
        </Sheet.ScrollView>
      </Sheet.Frame>
      <Sheet.Overlay
        opacity={0.5}
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        zIndex={0}
      />
    </Sheet>
  </Adapt>
)

const SelectOptions = ({ items, label }: { items: SelectItem[]; label?: string | null }) => (
  <>
    <Select.Viewport minWidth={200}>
      <Select.Group>
        <Select.Label>{label ?? 'Options'}</Select.Label>
        {React.useMemo(
          () =>
            items.map((item, index) => (
              <Select.Item index={index} key={item.value} value={item.value}>
                <Select.ItemText>{item.name}</Select.ItemText>
                <Select.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            )),
          [items]
        )}
      </Select.Group>
    </Select.Viewport>
    <Select.ScrollDownButton
      alignItems="center"
      justifyContent="center"
      position="relative"
      width="100%"
      height="$3"
    >
      <YStack zIndex={10}>
        <ChevronDown size={20} />
      </YStack>
      <LinearGradient
        start={[0, 0]}
        end={[0, 1]}
        fullscreen
        colors={['transparent', '$background']}
        borderRadius="$4"
      />
    </Select.ScrollDownButton>
  </>
)
