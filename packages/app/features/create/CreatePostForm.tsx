import { FullscreenSpinner, SubmitButton, Theme, YStack, useToastController } from '@my/ui'
import { useMutation } from '@tanstack/react-query'
import { SchemaForm, formFields } from 'app/utils/SchemaForm'
import { useSupabase } from 'app/utils/supabase/useSupabase'
import { useUser } from 'app/utils/useUser'
import { z } from 'zod'

const CreatePostSchema = z.object({
  title: formFields.text.min(10).describe('Name // Your post title'),
  content: formFields.textarea.describe('Description // Content of your post'),
  category_id: formFields.select.describe('Category // Category of your post'),
  image_url: formFields.image.describe('Image URL // Image URL of your post'),
})

export const CreatePostForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { profile, user } = useUser()
  const toast = useToastController()
  const supabase = useSupabase()

  const uploadImageAndGetUrl = async (imageSource: { fileURL: string; path: string }) => {
    console.log('imageSource', imageSource)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(
        `public/${Date.now()}_image${imageSource.path}`,
        await fetch(imageSource.fileURL).then((res) => res.blob())
      )

    console.log('uploadData', uploadData)
    if (uploadError) {
      // throw uploadError
      console.log('error', uploadError)
    }

    const { data: publicUrlData } = supabase.storage
      .from('post-images')
      .getPublicUrl(uploadData?.path as string)
    return publicUrlData.publicUrl
  }

  const mutation = useMutation({
    async onError(error) {
      console.error(error)
      toast.show('Error creating post')
    },

    async mutationFn(data: z.infer<typeof CreatePostSchema>) {
      const imageUrl = await uploadImageAndGetUrl(
        data.image_url as {
          fileURL: string
          path: string
        }
      )

      // Insert post with the image URL
      await supabase.from('posts').insert({
        title: data.title,
        content: data.content,
        category_id: data.category_id,
        image_url: imageUrl,
        profile_id: user?.id,
      })
    },

    async onSuccess() {
      onSuccess()
    },
  })

  if (!profile || !user?.id) {
    return <FullscreenSpinner />
  }

  return (
    <>
      <SchemaForm
        onSubmit={(values) => mutation.mutate(values)}
        schema={CreatePostSchema}
        defaultValues={{
          title: '',
          content: '',
          category_id: '3b145e4a-9654-4c23-b0fc-d81c48729e67',
        }}
        props={{
          category_id: {
            placeholder: 'Choose a category',
            options: [
              {
                name: 'React',
                value: '3b145e4a-9654-4c23-b0fc-d81c48729e67',
              },
              {
                name: 'Tamagui',
                value: 'e5e7769b-73c0-4888-aded-a69870b8f0e1',
              },
            ],
          },
        }}
        renderAfter={({ submit }) => (
          <Theme inverse>
            <SubmitButton onPress={() => submit()}>Create Post</SubmitButton>
          </Theme>
        )}
      >
        {(fields) => (
          <YStack gap="$2" py="$4" pb="$0" pt="$0" minWidth="100%" $gtSm={{ minWidth: 480 }}>
            {Object.values(fields)}
          </YStack>
        )}
      </SchemaForm>
    </>
  )
}
