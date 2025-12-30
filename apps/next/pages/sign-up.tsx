import type { GetServerSideProps } from 'next'

const Page = () => null

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/sign-in', permanent: false },
})

export default Page
