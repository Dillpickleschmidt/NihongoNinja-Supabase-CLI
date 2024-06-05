export type Video = {
  src: string
  title?: string
  origin?: string
}
export type VocabEntry = {
  word: string
  furigana?: string[]
  english?: string[]
  mnemonics?: string[]
  info?: string[]
  example_sentences?: string[]
  chapter?: number
  videos?: Video[]
}
