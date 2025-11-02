import { Variable } from 'tamagui'

// a tool for overriding strict types on tokens
export const validToken = (t: unknown) => t as Variable
