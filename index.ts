#! /usr/bin/env bun

import inquirer from "inquirer"
console.log("Hello via Bun!")

const prompt = inquirer.createPromptModule()
prompt([
  {
    type: "input",
    name: "name",
    message: "What is your name?",
  },
]).then((answers) => {
  console.log(`Hello, ${answers.name}!`)
})
