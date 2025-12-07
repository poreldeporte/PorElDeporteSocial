import { Paragraph, Text, YStack } from '@my/ui/public'
import { Link } from 'expo-router'

export const AboutScreen = () => {
  return (
    <YStack gap="$4" p="$4">
      <Link href="/create">
        <Text>go to modal</Text>
      </Link>
      <Paragraph>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
        soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
        deleniti porro! Nihil magni dicta neque aliquid.
      </Paragraph>

      <Paragraph>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
        soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
        deleniti porro! Nihil magni dicta neque aliquid.
      </Paragraph>

      <Paragraph>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Recusandae quidem neque maxime
        soluta nostrum unde eligendi, culpa qui exercitationem modi quasi debitis voluptatibus,
        deleniti porro! Nihil magni dicta neque aliquid.
      </Paragraph>
    </YStack>
  )
}
