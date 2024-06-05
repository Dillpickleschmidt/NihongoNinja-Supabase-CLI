# Vocabulary Data CLI

## Overview

This CLI tool is designed to read a JSON file containing vocabulary data and insert or update the data into a Supabase database. It handles scenarios where the vocabulary word already exists in the database, allowing the user to either update the existing entry or create a new one if the English values differ. Additionally, the tool manages video data associated with each vocabulary word in a separate table.

## Features

- **Read JSON Data**: Reads vocabulary data from a specified JSON file.
- **Filter Data**: Allows users to select specific fields (e.g., furigana, english, mnemonics) to be inserted or updated.
- **Check Existing Entries**: Checks if a vocabulary word already exists in the database.
  - If the word exists with different English values, the user is prompted to update the existing entry or create a new one.
  - If the word exists with the same English values, the entry is updated automatically.
- **Insert/Update Data**: Inserts new vocabulary data and updates existing data as per user input.
- **Handle Video Data**: Manages video data associated with each vocabulary word in a separate `videos` table.

## Usage

1. **Install Dependencies**: Ensure you have the necessary dependencies installed. This tool uses `bun`, `Supabase`, and `inquirer`.

2. **Run the CLI**: Use the following command to start the CLI tool.

   ```sh
   ./path/to/cli/script
   ```

3. **Specify JSON File Path**: The CLI will prompt you to enter the path to the JSON file containing the vocabulary data.

   ```sh
   Enter the path to the JSON file: chapter-0/vocab.json
   ```

4. **Select Data Fields**: Select the fields you want to insert or update.

   ```sh
   Select the data you want to insert or update:
   [ ] furigana
   [ ] english
   [ ] mnemonics
   [ ] info
   [ ] example_sentences
   [ ] chapter
   [ ] videos
   ```

5. **Handle Existing Entries**: If the word already exists in the database with different English values, you will be prompted to either update the existing entry or create a new one.
   ```sh
   The word [word] already exists in the database with different English values.
   [ ] Create new entry
   [ ] Update entry
   ```

## Database Schema

### Vocabulary Table

```sql
CREATE TABLE public.vocabulary (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT current_timestamp,
  word TEXT NOT NULL,
  furigana TEXT[] NOT NULL,
  english TEXT[] NOT NULL,
  chapter INTEGER NULL,
  example_sentences TEXT[] NULL,
  info TEXT[] NULL,
  mnemonics TEXT[] NULL,
  CONSTRAINT vocabulary_pkey PRIMARY KEY (id)
);
```

```sql
CREATE TABLE public.videos (
  id SERIAL,
  word_id BIGINT NOT NULL,
  src TEXT NOT NULL,
  title TEXT NULL,
  origin TEXT NULL,
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_word_id_fkey FOREIGN KEY (word_id) REFERENCES vocabulary (id) ON UPDATE CASCADE ON DELETE CASCADE
);
```

### Example JSON Structure

```json
[
  {
    "word": "日本語",
    "furigana": ["日本語[にほんご]"],
    "english": ["Japanese (language)"],
    "chapter": 1,
    "example_sentences": ["私は日本語を勉強しています。"],
    "info": ["Japanese language"],
    "mnemonics": ["Nihon go"],
    "videos": [
      {
        "src": "https://example.com/video1",
        "title": "Japanese Lesson 1",
        "origin": "YouTube"
      }
    ]
  }
]
```
