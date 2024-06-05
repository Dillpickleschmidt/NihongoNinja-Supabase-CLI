import type { VocabEntry } from "@/types/vocab"
import { promises as fs } from "fs"
import path from "path"

export async function readJSONFile(
  filePath: string
): Promise<Record<string, VocabEntry>> {
  const fullPath = path.resolve(filePath)
  const data = await fs.readFile(fullPath, "utf-8")
  return JSON.parse(data)
}

export function filterData(
  data: VocabEntry[],
  selectedOptions: (keyof VocabEntry)[]
): VocabEntry[] {
  return data.map((entry) => {
    const filteredEntry: Partial<VocabEntry> = { word: entry.word } // Always include the word

    selectedOptions.forEach((key) => {
      if (entry[key] !== undefined) {
        ;(filteredEntry as any)[key] = entry[key]
      }
    })

    return filteredEntry as VocabEntry
  })
}
