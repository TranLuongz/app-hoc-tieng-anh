# English Vocabulary Quiz App – Specification

## 1. Project Goal

Build a simple **English vocabulary learning web app** that helps users learn the **3000 most common English words**.

The app should run **locally only**.
No deployment is required.

The application displays an English word and asks the user to select the correct Vietnamese meaning from **4 options**.

---

# 2. Core Features

### Vocabulary Quiz

Each question contains:

* 1 English word
* 4 Vietnamese meaning options
* Only **one correct answer**

### User Interaction Rules

1. Show one English word at a time
2. Display 4 multiple-choice answers
3. User selects an option
4. If the answer is:

#### Correct

* Show a correct message
* Enable the **Next** button
* Move to the next word

#### Incorrect

* Show a wrong message
* User must choose again
* Do NOT move to next word

---

# 3. Quiz Flow

```
Start
  ↓
Load vocabulary dataset
  ↓
Show English word
  ↓
Generate 4 options
  ↓
User selects answer
  ↓
Correct? ─── No ──> choose again
  │
 Yes
  ↓
Next word
  ↓
Repeat
```

When the last word is reached:

```
loop back to the first word
```

---

# 4. Technical Requirements

## Run Mode

Local only.

Example:

```
open index.html
```

or run a simple local server.

No backend server is required.

---

# 5. Tech Stack

Use simple technologies:

Frontend:

* HTML
* CSS
* Vanilla JavaScript

No frameworks required.

---

# 6. Project Structure

The bot should generate the following structure:

```
english-quiz-app

index.html
style.css
app.js
words.json
README.md
```

---

# 7. Vocabulary Dataset

Create a file:

```
words.json
```

Structure:

```json
[
  {
    "word": "apple",
    "meaning": "quả táo"
  },
  {
    "word": "run",
    "meaning": "chạy"
  },
  {
    "word": "book",
    "meaning": "quyển sách"
  }
]
```

Requirements:

* dataset contains **3000 records**
* each record contains

```
word
meaning
```

---

# 8. Quiz Logic

Algorithm:

1. Load dataset
2. Track current word index
3. Display word
4. Generate answer options

Option generation:

```
1 correct meaning
3 random wrong meanings
```

Then:

```
shuffle options
```

---

# 9. State Variables

Use JavaScript variables:

```
words
currentIndex
correctAnswer
```

Example:

```
let words = []
let currentIndex = 0
let correctAnswer = ""
```

---

# 10. UI Layout

Basic layout:

```
-----------------------------

     APPLE

[ quả táo ]
[ chạy ]
[ con mèo ]
[ cái bàn ]

          Next

-----------------------------
```

Requirements:

* large English word
* 4 clickable buttons
* next button

---

# 11. Behavior Rules

### When user selects option

If correct:

```
highlight correct
enable next
```

If wrong:

```
show message: "Sai rồi, chọn lại"
```

User must retry.

---

# 12. Next Button Logic

When clicking next:

```
currentIndex++
```

If:

```
currentIndex >= words.length
```

Then:

```
currentIndex = 0
```

Loop the quiz forever.

---

# 13. Random Option Generator

Pseudo code:

```
correct = word.meaning

options = [correct]

while options < 4
    randomMeaning = random(words).meaning
    if randomMeaning not in options
        add to options

shuffle(options)
```

---

# 14. UI Behavior

When user clicks option:

Correct:

```
button turns green
```

Wrong:

```
button turns red
```

---

# 15. Extra Features (Optional)

The bot may optionally add:

* correct / wrong counter
* localStorage progress
* shuffle words

But these are **optional**.

---

# 16. Expected Result

A working web app that:

* loads 3000 English words
* generates multiple choice quiz
* forces retry on wrong answer
* loops through all words
* runs locally

---

# 17. How To Run

Open:

```
index.html
```

or run:

```
python -m http.server
```

Then open browser.

---

# End of Specification
