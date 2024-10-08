#!/usr/bin/env bun

/*
This program reads a JSON file containing vocabulary data and inserts or updates the data into a Supabase database.
If a word already exists, the program will prompt the user to either create a new entry or update the existing entry.
If they choose to update an existing word, prompt them to select which matched entry to update.
If the word doesn't already exist or the user chooses to create a new word when an existing word is found, insert a new word.
Also, the videos property should be handled differently since there's a videos table.
*/

import createSupabase from "@/components/createSupabase"
import { readJSONFile, filterData } from "@/components/handleJSON"
import type { VocabEntry } from "@/types/vocab"
import input from "@inquirer/input"
import checkbox, { Separator } from "@inquirer/checkbox"
import select from "@inquirer/select"

const supabase = createSupabase()

// Step 1: Prompt for the JSON file path
const getJsonFilePath = await input({
  message: "Enter the path to the JSON file",
  default: "chapter-0/vocab.json",
})
const jsonFilePath = "./src/data/" + getJsonFilePath

// Step 2: Read the JSON file
const jsonData = await readJSONFile(jsonFilePath)

// Step 3: Prompt for the options
const getOptions = await checkbox({
  message: "Select the data you want to insert or update",
  choices: [
    new Separator(),
    { name: "furigana", value: "furigana", checked: true },
    { name: "english", value: "english", checked: true },
    { name: "mnemonics", value: "mnemonics", checked: true },
    { name: "info", value: "info", checked: true },
    { name: "example_sentences", value: "example_sentences", checked: true },
    { name: "chapter", value: "chapter", checked: true },
    { name: "category", value: "category", checked: true },
    { name: "videos", value: "videos", checked: true },
  ],
  required: true,
  pageSize: 8,
})
const selectedOptions = getOptions as (keyof VocabEntry)[]
console.log("Selected options:", selectedOptions)

const filteredData = filterData(Object.values(jsonData), selectedOptions)

// Fetch existing words from the database that match the words in our input data
const existingWords = await getWords(filteredData)

const idsToUpdate: number[] = []

// Step 3.5: Prompt for additional actions if words already exist and english values or chapters are different
if (existingWords.length > 0) {
  for (const entry of filteredData) {
    const matchingEntries = existingWords.filter(
      (word) => word.word === entry.word,
    )
    const differentEntries = matchingEntries.filter(
      (word) =>
        JSON.stringify(word.english) !== JSON.stringify(entry.english) ||
        word.chapter !== entry.chapter,
    )

    if (matchingEntries.length > 0) {
      if (differentEntries.length > 0) {
        const existingEntriesMessage = matchingEntries
          .map(
            (word) =>
              `Chapter ${word.chapter}: English: "${word.english?.join(", ") || "N/A"}"`,
          )
          .join("\n")

        const action = await select({
          message: `The word "${entry.word}" exists in the following chapter(s):\n${existingEntriesMessage}\n\nYou're trying to add it to chapter ${entry.chapter} with English: "${entry.english?.join(", ") || "N/A"}"\nWhat would you like to do?`,
          choices: [
            { name: "Create new entry", value: "create" },
            { name: "Update an existing entry", value: "update" },
            { name: "Skip this word", value: "skip" },
          ],
          loop: false,
        })

        if (action === "update") {
          const wordSelection = await select({
            message: `Which entry of "${entry.word}" do you want to update?`,
            choices: [
              new Separator(),
              ...matchingEntries.map((word) => ({
                name: `Chapter ${word.chapter} - English: ${word.english?.join(", ") || "N/A"}`,
                value: word.id,
              })),
            ],
            loop: false,
          })
          idsToUpdate.push(wordSelection)
        } else if (action === "skip") {
          console.log(`Skipping word: ${entry.word}`)
        }
        // If action is "create", we don't add to idsToUpdate,
        // so it will be treated as a new entry
      } else {
        // Automatically update if English values and chapter are the same
        console.log(
          `Word "${entry.word}" already exists with the same English values in chapter ${entry.chapter}. Automatically updating.`,
        )
        idsToUpdate.push(matchingEntries[0].id)
      }
    }
  }
}

// Split the existing words into two arrays: one for words to insert and one for words to update
const wordsToInsert: (VocabEntry & { id?: number })[] = []
const wordsToUpdate: (VocabEntry & { id: number })[] = []

for (const entry of filteredData) {
  const existingUpdateWord = existingWords.find(
    (word) =>
      word.word === entry.word &&
      (idsToUpdate.includes(word.id) ||
        (JSON.stringify(word.english) === JSON.stringify(entry.english) &&
          word.chapter === entry.chapter)),
  )

  if (existingUpdateWord) {
    wordsToUpdate.push({ ...entry, id: existingUpdateWord.id })
  } else {
    wordsToInsert.push(entry)
  }
}

// Step 4: Insert or update data into Supabase
await insertVocabulary(wordsToInsert)
await updateVocabulary(wordsToUpdate)
await insertVideos(wordsToInsert)
await updateVideos(wordsToUpdate)

/*
 **Functions**
 */

async function getWords(entries: VocabEntry[]) {
  const words = entries.map((entry) => entry.word)
  const { data, error } = await supabase
    .from("vocabulary")
    .select("id, word, english, chapter")
    .in("word", words)

  if (error) {
    throw error
  }
  return data
}

// Insert new vocabulary data
async function insertVocabulary(entries: (VocabEntry & { id?: number })[]) {
  const entriesWithoutVideosAndId = entries.map(
    ({ videos, id, ...entry }) => entry,
  )
  const { data, error } = await supabase
    .from("vocabulary")
    .insert(entriesWithoutVideosAndId)
    .select()

  if (error) {
    throw error
  }
  console.log(`Vocabulary data inserted successfully:`, data)

  // Update entries with the new IDs from the database
  for (const entry of entries) {
    const newEntry = data.find((d) => d.word === entry.word)
    if (newEntry) {
      entry.id = newEntry.id
    }
  }
}

// Insert new video data
async function insertVideos(entries: (VocabEntry & { id?: number })[]) {
  const videoEntries = entries.flatMap(
    ({ id, videos }) =>
      videos?.map((video) => ({ word_id: id, ...video })) || [],
  )
  if (videoEntries.length > 0) {
    const { data, error } = await supabase
      .from("videos")
      .insert(videoEntries)
      .select()

    if (error) {
      throw error
    }
    console.log(`Video data inserted successfully:`, data)
  }
}

// Update existing vocabulary data
async function updateVocabulary(entries: (VocabEntry & { id: number })[]) {
  for (const entry of entries) {
    const { id, ...entryWithoutId } = entry
    console.log(`Updating vocabulary entry with id: ${id}`)
    const { data, error } = await supabase
      .from("vocabulary")
      .update(entryWithoutId)
      .eq("id", id)
      .select()

    if (error) {
      throw error
    }
    console.log(`Vocabulary data updated successfully:`, data)
  }
}

// Update existing video data
async function updateVideos(entries: (VocabEntry & { id: number })[]) {
  for (const entry of entries) {
    const { id, videos } = entry
    if (videos) {
      const videoEntries = videos.map((video) => ({
        word_id: id,
        ...video,
      }))
      console.log(`Updating videos for word_id: ${id}`)
      const { data, error } = await supabase
        .from("videos")
        .upsert(videoEntries, { onConflict: "word_id, src" })
        .select()

      if (error) {
        throw error
      }
      console.log(`Video data updated successfully:`, data)
    }
  }
}
