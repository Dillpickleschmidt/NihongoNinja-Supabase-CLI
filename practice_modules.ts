#!/usr/bin/env bun

import createSupabase from "@/components/createSupabase"
import type { VocabEntry } from "@/types/vocab"
import select from "@inquirer/select"

// Create a Supabase client
const supabase = createSupabase()

type PracticeModule = {
  path: string
  word_id: number
}

// Define a new type that includes the id, word, and english properties
type VocabEntryWithId = VocabEntry & {
  id: number
}

async function upsertPracticeModules(
  path: string,
  words: string[]
): Promise<void> {
  const entries: PracticeModule[] = []

  // Fetch all vocabulary entries for the given words
  const { data: vocabularyData, error } = await supabase
    .from("vocabulary")
    .select("id, word, english")
    .in("word", words)

  if (error) {
    console.error("Error fetching vocabulary data:", error)
    return
  }

  // Group vocabulary data to word keys for easy lookup
  const vocabMap = new Map<string, VocabEntryWithId[]>()
  vocabularyData.forEach((entry) => {
    if (!vocabMap.has(entry.word)) {
      vocabMap.set(entry.word, [])
    }
    const entries = vocabMap.get(entry.word)
    if (entries) {
      entries.push(entry)
    }
  })

  for (const word of words) {
    const matchingEntries = vocabMap.get(word) || []

    if (matchingEntries.length === 0) {
      console.warn(`Word "${word}" not found in vocabulary.`)
      continue
    }

    let word_id: number

    if (matchingEntries.length > 1) {
      // Prompt user to select which word to link to
      const selectedWord = await select({
        message: `Multiple entries found for word "${word}". Please select the correct one:`,
        choices: matchingEntries.map((entry) => ({
          name: `${entry.word} - ${entry.english?.join(", ")}`,
          value: entry.id,
        })),
        loop: false,
      })
      word_id = selectedWord
    } else {
      word_id = matchingEntries[0].id
    }

    entries.push({ path: path, word_id: word_id })
  }

  if (entries.length > 0) {
    const { data, error } = await supabase
      .from("practice_modules")
      .upsert(entries, { onConflict: "word_id, path" }) // Handle conflicts on both columns
      .select()

    if (error) {
      console.error("Error upserting practice modules:", error)
      return
    }

    // Success
    console.log("Upserted practice modules:", data)
  } else {
    console.log("No valid entries to upsert.")
  }
}

// Usage
const url_path = "chapter-0/practice-hiragana"
const practice_words = [
  "あ",
  "い",
  "う",
  "え",
  "お",
  "か",
  "き",
  "く",
  "け",
  "こ",
  "さ",
  "し",
  "す",
  "せ",
  "そ",
  "た",
  "ち",
  "つ",
  "て",
  "と",
  "な",
  "に",
  "ぬ",
  "ね",
  "の",
  "は",
  "ひ",
  "ふ",
  "へ",
  "ほ",
  "ま",
  "み",
  "む",
  "め",
  "も",
  "や",
  "ゆ",
  "よ",
  "ら",
  "り",
  "る",
  "れ",
  "ろ",
  "わ",
  "を",
  "ん",
]

upsertPracticeModules(url_path, practice_words).then(() => {
  console.log("Upsert operation completed.")
})
