#!/usr/bin/env bun
import { getJpdbVocab } from "@/components/jpdbFunctions"
import checkbox, { Separator } from "@inquirer/checkbox"
import input from "@inquirer/input"

const jpdbDeckName = await input({
  message: "Enter the jpdb deck name",
  default: "Add to Nihongo Ninja",
})

const options = await checkbox({
  message: "Select the data you want to insert or update",
  choices: [
    new Separator(),
    { name: "ids", value: "ids", checked: true },
    { name: "words", value: "words", checked: true },
  ],
})
console.log("Selected options:", options)

await getJpdbVocab(jpdbDeckName, options)
