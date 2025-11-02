import { View, Text, ToggleGroup, styled } from 'tamagui'

const Item = styled(ToggleGroup.Item, {
  color: '$color10',
  flex: 1,
  width: '100%',
  focusStyle: {
    color: '$color1',
    backgroundColor: '$color12',
  },
})

const directions = ['left', 'right', 'top', 'bottom'] as const
type Direction = (typeof directions)[number]

export function DirectionSlide({
  direction,
  setDirection,
}: {
  direction: Direction
  setDirection: (direction: Direction) => void
}) {
  return (
    <View flexDirection="row" gap="$2">
      <ToggleGroup
        orientation="horizontal"
        type="single"
        size="$2"
        disableDeactivation={true}
        value={direction}
        onValueChange={(value) => setDirection(value as Direction)}
        width="100%"
      >
        {directions.map((dir) => {
          const active = dir === direction
          return (
            <Item
              themeInverse={active}
              active={active}
              value={dir}
              aria-label={dir}
              key={dir}
            >
              <Text
                color={'$color12'}
                fontFamily="$mono"
                fontWeight="600"
                textTransform="capitalize"
              >
                {dir}
              </Text>
            </Item>
          )
        })}
      </ToggleGroup>
    </View>
  )
}
