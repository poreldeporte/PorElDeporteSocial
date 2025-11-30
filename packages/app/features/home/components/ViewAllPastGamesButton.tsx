import { Button } from '@my/ui'
import { useLink } from 'solito/link'

export const ViewAllPastGamesButton = () => {
  const link = useLink({ href: '/games?scope=past' })
  return (
    <Button size="$2" br="$10" variant="outlined" {...link}>
      View all
    </Button>
  )
}
