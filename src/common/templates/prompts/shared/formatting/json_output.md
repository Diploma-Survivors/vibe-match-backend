# formatting/json_output.md

## JSON Output Structure

Ensure your response is a valid, parseable JSON object.

### Rules

1.  **Strict JSON**: Do not include markdown code fence blocks (`json ... `) unless specifically requested as part of a larger markdown document. If the system expects pure JSON, output _only_ raw JSON.
2.  **Escaping**: Strictly escape all special characters, especially within code snippets or feedback strings.
    - Quotes `"` $\rightarrow$ `\"`
    - Backslashes `\` $\rightarrow$ `\\`
    - Newlines `\n` $\rightarrow$ `\\n`
3.  **Keys**: Use English keys (e.g., `score`, `feedback`, `bugs`).
4.  **Values**: Use Vietnamese values for text content intended for the user (e.g., `feedback_text`, `explanation`).
5.  **No Trailing Commas**: Ensure the JSON is valid according to the standard.

### Example Template

```json
{
  "status": "success",
  "score": 85,
  "analysis": {
    "correctness": "Code chạy đúng với các test case cơ bản.",
    "style": "Cần cải thiện cách đặt tên biến."
  },
  "suggestions": ["Đổi tên biến x thành count.", "Thêm comment cho hàm main."]
}
```
