type ActionResponse = {
  data: any | null
  error: string | null
}

async function myFetch(
  url: string,
  options: RequestInit
): Promise<ActionResponse> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.text()
    return { data: null, error }
  }
  const data = await response.json()
  return { data, error: null }
}

export async function getDeck(deckName: string) {
  const apiKey = process.env.JPDB_API_KEY

  const url = "https://jpdb.io/api/v1/list-user-decks"
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: '{"fields":["name", "id"]}',
  }

  const response = await myFetch(url, options)
  if (response.error) {
    return response // error
  }
  // Find deck
  if (response.data.decks) {
    for (const deckGroup of response.data.decks) {
      if (deckGroup[0] === deckName) {
        return { data: deckGroup, error: null }
      }
    }
  }
  return { data: null, error: "Deck not found" }
}

async function getjpdbVocabNames(vocabIds: number[][]) {
  const apiKey = process.env.JPDB_API_KEY
  const url = "https://jpdb.io/api/v1/lookup-vocabulary"
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ list: vocabIds, fields: ["spelling"] }),
  }

  const response = await myFetch(url, options)
  return response
}

export async function getJpdbVocab(deckName: string, vocabOptions: string[]) {
  const { data: deckData, error: deckError } = await getDeck(deckName)
  if (deckError) {
    console.error(deckError)
    return { data: null, error: deckError }
  }
  if (!deckData) {
    console.log("Deck not found")
    return { data: null, error: "Deck not found" }
  }
  const deckId = deckData[1]

  const apiKey = process.env.JPDB_API_KEY
  const url = "https://jpdb.io/api/v1/deck/list-vocabulary"
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: `{"id":${deckId},"fetch_occurences":false}`,
  }
  const response = await myFetch(url, options)
  // Error
  if (response.error) {
    console.error(response.error)
    return
  }
  if (!response.data.vocabulary) {
    console.log("No vocabulary found")
    return
  }

  // Success
  if (vocabOptions.includes("ids")) {
    console.log(response.data.vocabulary)
  }
  if (vocabOptions.includes("words")) {
    const namesArr = await getjpdbVocabNames(response.data.vocabulary)
    // Error
    if (namesArr.error) {
      console.error(namesArr.error)
      return
    }
    // Success
    console.log(namesArr.data.vocabulary_info)
  }
  return
}
