import { useFormState } from 'react-hook-form'
import { AnimatePresence, Button, ButtonProps, Spinner } from 'tamagui'

// hack to prevent it from breaking on the server
const useIsSubmitting = () => {
  try {
    return useFormState().isSubmitting
  } catch (error) {
    console.error(error)
    return false
  }
}
export const submitButtonBaseProps: ButtonProps = {
  backgroundColor: '$color2',
  borderColor: '$color4',
  borderWidth: 1,
  color: '$color12',
  fontSize: 17,
  fontWeight: '600',
  height: 54,
  borderRadius: 999,
  w: '100%',
  pressStyle: { opacity: 0.85 },
}

/**
 * created to be used in forms
 * will show loading spinners and disable submission when already submitting
 */
export const SubmitButton = (props: ButtonProps) => {
  const isSubmitting = useIsSubmitting()
  const spinnerColor = props.color ?? submitButtonBaseProps.color ?? '$color'

  return (
    <Button
      {...submitButtonBaseProps}
      iconAfter={
        <AnimatePresence>
          {isSubmitting && (
            <Spinner
              color={spinnerColor}
              key="loading-spinner"
              o={1}
              y={0}
              animation="quick"
              enterStyle={{
                o: 0,
                y: 4,
              }}
              exitStyle={{
                o: 0,
                y: 4,
              }}
            />
          )}
        </AnimatePresence>
      }
      disabled={isSubmitting}
      {...props}
    />
  )
}
