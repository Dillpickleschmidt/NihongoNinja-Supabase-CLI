#!/usr/bin/env bun
import { getJpdbVocab } from "@/components/jpdbFunctions"
import input from "@inquirer/input"

const jpdbDeckName = await input({
  message: "Enter the jpdb deck name",
  default: "Add to Nihongo Ninja",
})

const jpdbVocab = await getJpdbVocab(jpdbDeckName)
if (jpdbVocab.error) {
  console.error(jpdbVocab.error)
} else {
  console.log(jpdbVocab.data.vocabulary)
}
