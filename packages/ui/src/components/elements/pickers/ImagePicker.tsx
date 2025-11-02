import { X } from '@tamagui/lucide-icons'
import { useId, useState, forwardRef } from 'react'
import { Button, Image, Label, ScrollView, View, XStack } from 'tamagui'

import { useFilePicker } from './hooks/useFilePicker'

enum MediaTypeOptions {
  /**
   * Images and videos.
   */
  All = 'All',
  /**
   * Only videos.
   */
  Videos = 'Videos',
  /**
   * Only images.
   */
  Images = 'Images',
}

/** ------ EXAMPLE ------ */
export const ImagePicker = forwardRef<
  HTMLInputElement,
  {
    disabled: boolean
    value: { fileURL: string; path: string } | undefined
    onChangeText: (imageSource: { fileURL: string; path: string }) => void
    onBlur: () => void
    placeholder?: string
    [key: string]: any
  }
>(({ disabled, value, onChangeText, onBlur, placeholder, ...props }, ref) => {
  const id = useId()
  const [images, setImages] = useState<string[]>([])
  const { open, getInputProps, getRootProps, dragStatus } = useFilePicker({
    typeOfPicker: 'image',
    mediaTypes: [MediaTypeOptions.Images],
    multiple: true,

    onPick: ({ webFiles, nativeFiles }) => {
      if (webFiles?.length) {
        const pickedImages = webFiles?.map((file: File) => {
          return {
            fileURL: URL.createObjectURL(file),
            path: (file as any)?.path, // Type assertion to bypass the TypeScript error
          }
        })
        onChangeText(pickedImages[0])
        setImages((images) => [...images, pickedImages[0].fileURL])
      } else if (nativeFiles?.length) {
        // setImages((images) => [...images, pickedImages[0]])
      }
    },
  })

  const { isDragActive } = dragStatus

  return (
    // @ts-ignore reason: getRootProps() which is web specific return some react-native incompatible props, but it's fine
    <View
      flexDirection="column"
      {...getRootProps()}
      borderStyle="dashed"
      id="image-picker"
      maxWidth={600}
      width="100%"
      height={350}
      justifyContent="center"
      alignItems="center"
      borderWidth={isDragActive ? 2 : 1}
      borderColor={isDragActive ? '$gray11' : '$gray9'}
      gap="$2"
      borderRadius="$true"
    >
      {/* need an empty input div just have image drop feature in the web */}
      {/* @ts-ignore */}
      <View id={id} tag="input" width={0} height={0} {...getInputProps()} ref={ref} />
      <View>
        <Button size="$3" onPress={open}>
          Pick image
        </Button>

        <View width="100%" alignItems="center" justifyContent="center">
          <Label
            display={images.length ? 'none' : 'flex'}
            $platform-native={{
              display: 'none',
            }}
            size="$3"
            htmlFor={id}
            color="$color9"
            t="$1"
            pos="absolute"
            whiteSpace="nowrap"
          >
            Drag cover image into this area
          </Label>
        </View>
      </View>

      <ScrollView
        display={images.length ? 'flex' : 'none'}
        flexDirection="row"
        borderRightWidth={1}
        borderLeftWidth={1}
        borderColor="$gray4Light"
        minWidth="100%"
        themeInverse
        paddingBottom="$0"
        horizontal
        overflow="scroll"
        flexWrap="nowrap"
        maxHeight={110}
      >
        <XStack gap="$4" flexWrap="nowrap" minWidth="100%" maxHeight={110} px="$4" pt={10}>
          {[images[0]]?.map((image, i) => (
            <View key={image} maxHeight={110}>
              <Image
                borderRadius={10}
                key={image}
                width={400}
                height={200}
                source={{ uri: image }}
              />
              <Button
                onPress={() => {
                  setImages(images.filter((_, index) => index !== i))
                }}
                right={0}
                y={-6}
                x={6}
                size="$1"
                circular
                position="absolute"
              >
                <X size={12} />
              </Button>
            </View>
          ))}
        </XStack>
      </ScrollView>
    </View>
  )
})
