import { ScrollView } from '@my/ui/public'
import { useScrollToTop } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { useRef } from 'react'

const ScrollToTopTabBarContainer = ({
  children,
  ...props
}: {
  children: React.ReactNode
  style?: any
}) => {
  const ref = useRef(null)
  useScrollToTop(ref)

  return (
    <ScrollView {...props} ref={ref}>
      {children}
    </ScrollView>
  )
}

export default ScrollToTopTabBarContainer
