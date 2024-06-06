#!/usr/bin/env bun

import createSupabase from "@/components/createSupabase"
import type { VocabEntry } from "@/types/vocab"
import input from "@inquirer/input"
import select from "@inquirer/select"
import confirm from "@inquirer/confirm"
import { extractWordsFromJSON, readJSONFile } from "@/components/handleJSON"

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

async function main() {
  // Step 1: Prompt for the JSON file path
  const getJsonFilePath = await input({
    message: "Enter the path to the JSON file",
    default: "chapter-0/vocab.json",
  })
  const jsonFilePath = "./src/data/" + getJsonFilePath
  // remove the .json extension
  const slug = getJsonFilePath.replace(".json", "")

  // Step 2: Read the JSON file
  const jsonData = await readJSONFile(jsonFilePath)
  const words = extractWordsFromJSON(jsonData)

  const confirmation = await confirm({
    message: `Are you sure you want to upsert practice modules with \n\npath: "${slug}" \nwords: ${words.join(
      ", "
    )}?\n`,
  })

  if (confirmation) {
    await upsertPracticeModules(slug, words)
    console.log("Upsert operation completed.")
  } else {
    console.log("Operation canceled.")
  }
}

main()
