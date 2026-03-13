"""
Script to generate words.json from google-10000-english dataset.
Downloads top English words and translates them to Vietnamese.
"""

import json
import requests
import time
import re
import os

def download_word_list():
    """Download the google-10000-english word list from GitHub."""
    url = "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt"
    print("Downloading word list from GitHub...")
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    words = response.text.strip().split('\n')
    print(f"Downloaded {len(words)} words")
    return words

def filter_words(words, target_count=3000):
    """Filter words: remove single chars, numbers, and non-alphabetic words."""
    filtered = []
    for w in words:
        w = w.strip().lower()
        if len(w) < 2:
            continue
        if not re.match(r'^[a-z]+$', w):
            continue
        if w not in filtered:
            filtered.append(w)
        if len(filtered) >= target_count:
            break
    print(f"Filtered to {len(filtered)} words")
    return filtered

def translate_batch(words_batch, retries=3):
    """Translate a batch of words using deep-translator."""
    from deep_translator import GoogleTranslator
    translator = GoogleTranslator(source='en', target='vi')
    
    for attempt in range(retries):
        try:
            # deep-translator supports batch translation
            results = translator.translate_batch(words_batch)
            return results
        except Exception as e:
            print(f"  Retry {attempt+1}/{retries}: {e}")
            time.sleep(2 * (attempt + 1))
    
    # If all retries fail, return None for each word
    return [None] * len(words_batch)

def main():
    # Check if we already have a partial result
    output_file = "words.json"
    existing = []
    if os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing = json.load(f)
            print(f"Found existing {len(existing)} words in words.json")
        except:
            existing = []
    
    # Download and filter words
    all_words = download_word_list()
    words = filter_words(all_words, 3000)
    
    # Skip already translated words
    existing_words = {item['word'] for item in existing}
    remaining = [w for w in words if w not in existing_words]
    
    if not remaining:
        print("All words already translated!")
        return
    
    print(f"Need to translate {len(remaining)} words...")
    
    result = list(existing)
    batch_size = 50  # Translate 50 words at a time
    
    for i in range(0, len(remaining), batch_size):
        batch = remaining[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(remaining) + batch_size - 1) // batch_size
        print(f"Translating batch {batch_num}/{total_batches} ({len(batch)} words)...")
        
        translations = translate_batch(batch)
        
        for word, meaning in zip(batch, translations):
            if meaning and meaning.strip():
                result.append({
                    "word": word,
                    "meaning": meaning.strip().lower()
                })
            else:
                # Use the word itself as fallback
                result.append({
                    "word": word,
                    "meaning": word
                })
        
        # Save progress after each batch
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"  Progress: {len(result)}/{len(words)} words saved")
        
        # Small delay to avoid rate limiting
        if i + batch_size < len(remaining):
            time.sleep(1)
    
    print(f"\nDone! Generated {len(result)} words in {output_file}")

if __name__ == "__main__":
    main()
