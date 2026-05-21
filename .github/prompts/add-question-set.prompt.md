---
description: "Scaffold a new question set JSON file for the quiz app. Use when: adding new questions, creating a new domain, expanding the question bank."
agent: "agent"
---
Create a new question set for the SnowPro Core Practice Exam Quiz.

## Inputs

- **Set number**: The next available set number (check existing `data/set*.json` files)
- **Domain name**: {{input:Domain name (e.g. "Data Governance")}}
- **Domain weight**: {{input:Domain weight percentage (0-100, use 0 for bonus sets)}}
- **Number of questions**: {{input:How many questions to generate?}}

## Steps

1. Determine the next set number by checking existing files in `web-app/data/`
2. Create `web-app/data/set<N>-<slug>.json` following this exact schema:

```json
{
  "setId": "set<N>-<slug>",
  "setName": "<Domain Name>",
  "domain": "<Full Domain Name>",
  "domainWeight": <weight>,
  "questions": [
    {
      "id": "s<N>q001",
      "question": "Question text here?",
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correctAnswers": ["A"],
      "multiSelect": false,
      "explanation": "Explanation of why the correct answer is right.",
      "difficulty": "medium"
    }
  ]
}
```

3. Register the new set in `web-app/js/question-loader.js` by adding an entry to the `QUESTION_SETS` array
4. Question IDs must use format `s<N>q001`, `s<N>q002`, etc. (zero-padded to 3 digits)
5. `difficulty` must be one of: `easy`, `medium`, `hard`
6. For multi-select questions, set `"multiSelect": true` and include multiple keys in `correctAnswers`
7. All correct answers must be verifiable against official Snowflake documentation
