import { H2, Paragraph, YStack } from '@my/ui/public'
import { useBrand } from 'app/provider/brand'
import { SolitoImage } from 'solito/image'

type Props = {
  title: string
  subtitle: string
  description?: string
}

export const AuthIntro = ({ title, subtitle, description }: Props) => {
  const { logo } = useBrand()
  return (
    <YStack gap="$3" mb="$4">
      <YStack ai="center">
        <SolitoImage src={logo} alt="Por El Deporte crest" width={72} height={72} />
      </YStack>
      <H2 $sm={{ size: '$8' }}>{title}</H2>
      <Paragraph theme="alt1">{subtitle}</Paragraph>
      {description ? <Paragraph theme="alt2">{description}</Paragraph> : null}
    </YStack>
  )
}
