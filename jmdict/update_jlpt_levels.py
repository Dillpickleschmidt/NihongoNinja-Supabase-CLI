import json
import os
import codecs

def detect_encoding(file_path):
    """Detect the encoding of a file."""
    encodings = ['utf-8', 'utf-16', 'utf-16le', 'utf-16be', 'shift_jis', 'euc-jp']
    for enc in encodings:
        try:
            with codecs.open(file_path, 'r', encoding=enc) as f:
                f.read()
            return enc
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Unable to determine encoding for file: {file_path}")

def load_jlpt_words(file_path):
    encoding = detect_encoding(file_path)
    with codecs.open(file_path, 'r', encoding=encoding) as f:
        return set(line.strip() for line in f if line.strip())

def has_valid_pos(entry, valid_pos):
    for sense in entry['senses']:
        if any(pos in valid_pos for pos in sense['parts_of_speech']):
            return True
    return False

def prioritize_valid_pos(parts_of_speech, valid_pos):
    valid = [pos for pos in parts_of_speech if pos in valid_pos]
    invalid = [pos for pos in parts_of_speech if pos not in valid_pos]
    return valid + invalid

def update_jlpt_levels(database_file, output_file, filtered_output_file, jlpt_files):
    # Load the conjugation database
    with open(database_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    valid_pos = [
        "Godan verb with 'u' ending",
        "Godan verb with 'tsu' ending",
        "Godan verb with 'ru' ending",
        "Godan verb with 'ru' ending (irregular verb)",
        "Godan verb - -aru special class",
        "Godan verb - Iku/Yuku special class",
        "Godan verb with 'ku' ending",
        "Godan verb with 'gu' ending",
        "Godan verb with 'bu' ending",
        "Godan verb with 'mu' ending",
        "Godan verb with 'nu' ending",
        "Godan verb with 'su' ending",
        "Ichidan verb",
        "Kuru verb - special class",
        "Suru verb - special class",
        "Suru verb - included",
        "Suru verb - compound word",
        "I-adjective",
        "Na-adjective",
    ]

    # Limit senses to first two for each entry and prioritize valid parts of speech
    for category in data.keys():
        for entry in data[category]:
            entry['senses'] = entry['senses'][:2]
            for sense in entry['senses']:
                sense['parts_of_speech'] = prioritize_valid_pos(sense['parts_of_speech'], valid_pos)

    # Load JLPT words
    jlpt_words = {}
    for level, file_path in jlpt_files.items():
        jlpt_words[level] = load_jlpt_words(file_path)

    # Update JLPT levels and remove unmatched words
    jlpt_counts = {level: 0 for level in jlpt_files.keys()}
    deleted_counts = {category: 0 for category in data.keys()}
    pos_filtered_counts = {category: 0 for category in data.keys()}
    filtered_words = {category: [] for category in data.keys()}

    for category in data.keys():
        matched_entries = []
        for entry in data[category]:
            matched = False
            for japanese in entry['japanese']:
                word = japanese['word']
                for level, words in jlpt_words.items():
                    if word in words:
                        entry['jlpt_level'] = int(level[1])  # Convert 'N5' to 5
                        jlpt_counts[level] += 1
                        matched = True
                        break
                if matched:
                    break
            if matched:
                matched_entries.append(entry)
            else:
                deleted_counts[category] += 1
        data[category] = matched_entries

    # Filter by part of speech
    for category in data.keys():
        filtered_entries = []
        for entry in data[category]:
            if has_valid_pos(entry, valid_pos):
                filtered_entries.append(entry)
            else:
                pos_filtered_counts[category] += 1
                filtered_words[category].append(entry)
        data[category] = filtered_entries

    # Write updated data back to file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Write filtered words to a separate file
    with open(filtered_output_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_words, f, ensure_ascii=False, indent=2)

    return data, jlpt_counts, deleted_counts, pos_filtered_counts

# Usage
database_file = 'conjugationDatabase.json'
output_file = 'export/VerbsAndAdjectivesJLPT.json'
filtered_output_file = 'export/FilteredOutWords.json'
jlpt_files = {
    'N5': 'N5.txt',
    'N4': 'N4.txt',
    'N3': 'N3.txt',
    'N2': 'N2.txt',
    'N1': 'N1.txt'
}

updated_data, jlpt_counts, deleted_counts, pos_filtered_counts = update_jlpt_levels(database_file, output_file, filtered_output_file, jlpt_files)

print("JLPT levels updated. Output saved to", output_file)
print("Filtered out words saved to", filtered_output_file)
print("\nWords assigned JLPT levels:")
for level, count in jlpt_counts.items():
    print(f"  {level}: {count}")
print(f"  Total: {sum(jlpt_counts.values())}")

print("\nDeleted words (not in JLPT lists):")
for category, count in deleted_counts.items():
    print(f"  {category}: {count}")
print(f"  Total deleted: {sum(deleted_counts.values())}")

print("\nWords filtered out due to invalid part of speech:")
for category, count in pos_filtered_counts.items():
    print(f"  {category}: {count}")
print(f"  Total filtered: {sum(pos_filtered_counts.values())}")

total_remaining = sum(len(updated_data[category]) for category in updated_data.keys())
print(f"\nTotal words remaining in database: {total_remaining}")