import json

def rename_part_of_speech(pos):
    if "keiyoushi" in pos.lower():
        return "I-adjective"
    elif "keiyodoshi" in pos.lower():
        return "Na-adjective"
    elif "suru verb - special class" in pos.lower():
        return "Suru verb - special class"
    elif "suru verb - included" in pos.lower():
        return "Suru verb - included"
    return pos

def parse_jmdict(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tags = data.get("tags", {})

    output_data = {
        "verb": [],
        "adj-i": [],
        "adj-na": []
    }

    counters = {
        "verb": 0,
        "adj-i": 0,
        "adj-na": 0
    }

    for word in data["words"]:
        kanji = word.get("kanji", [])
        kana = word.get("kana", [])
        
        if not kanji and not kana:
            continue

        senses = word.get("sense", [])
        if not senses:
            continue

        word_data = {
            "japanese": [],
            "senses": [{
                "english_definitions": [g["text"] for g in s.get("gloss", [])],
                "parts_of_speech": [rename_part_of_speech(tags.get(pos, pos)) for pos in s.get("partOfSpeech", [])]
            } for s in senses],
            "jlpt_level": ""
        }

        # Handle kanji entries
        for k in kanji:
            word_entry = {"word": k.get("text", ""), "reading": ""}
            # Find corresponding kana reading
            for kana_entry in kana:
                if "*" in kana_entry.get("appliesToKanji", []) or k.get("text") in kana_entry.get("appliesToKanji", []):
                    word_entry["reading"] = kana_entry.get("text", "")
                    break
            word_data["japanese"].append(word_entry)

        # Handle kana-only entries if no kanji entries exist
        if not kanji:
            for k in kana:
                word_data["japanese"].append({"word": k.get("text", ""), "reading": k.get("text", "")})

        for sense in senses:
            pos = [rename_part_of_speech(tags.get(p, p)) for p in sense.get("partOfSpeech", [])]
            if any(p.lower().startswith(("verb", "godan", "ichidan", "nidan", "yodan", "suru", "kuru")) for p in pos):
                output_data["verb"].append(word_data)
                counters["verb"] += 1
                break
            elif "I-adjective" in pos:
                output_data["adj-i"].append(word_data)
                counters["adj-i"] += 1
                break
            elif "Na-adjective" in pos:
                output_data["adj-na"].append(word_data)
                counters["adj-na"] += 1
                break

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    return counters

# Usage
input_file = 'jmdict-eng-3.5.0.json'
output_file = 'conjugationDatabase.json'
word_counts = parse_jmdict(input_file, output_file)

print("Parsing complete. Output saved to conjugationDatabase.json")
print("Word entries written:")
print(f"  Verbs: {word_counts['verb']}")
print(f"  I-adjectives: {word_counts['adj-i']}")
print(f"  Na-adjectives: {word_counts['adj-na']}")
print(f"  Total: {sum(word_counts.values())}")