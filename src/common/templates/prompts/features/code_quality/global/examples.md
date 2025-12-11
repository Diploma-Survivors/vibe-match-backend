# Code Quality Examples (Global)

## Example 1 (Poor Quality)

**Input**:

```python
def x(l):
  a=0
  for i in l:
    a+=i
  return a
```

**Output**:
{
"score": 40,
"feedback": "Tên biến `x`, `l`, `a` không có ý nghĩa. Hàm nên được đặt tên là `sum_list` hoặc tương tự. Thiếu khoảng trắng quanh toán tử.",
"refactor": "def calculate_sum(numbers):\n total = 0\n for number in numbers:\n total += number\n return total"
}

## Example 2 (Good Quality)

**Input**:

```python
def calculate_area(radius):
    if radius < 0:
        return 0
    import math
    return math.pi * radius * radius
```

**Output**:
{
"score": 85,
"feedback": "Code rõ ràng, dễ hiểu. Tên hàm tốt. Tuy nhiên nên import module ở đầu file.",
"refactor": "import math\n\ndef calculate_area(radius):\n if radius < 0:\n return 0\n return math.pi \* radius \*\* 2"
}

## Example 3 (Spaghetti)

**Input**:
50-line java function with 5 nested if-loops.

**Output**:
{
"score": 30,
"feedback": "Hàm quá phức tạp (Cyclomatic Complexity cao). Quá nhiều if lồng nhau (nested loops). Hãy tách nhỏ logic thành các hàm con.",
"refactor": "[Refactored into 3 smaller functions]"
}

## Example 4 (Magic Numbers)

**Input**:
`if age > 18: ...`

**Output**:
{
"score": 70,
"feedback": "Sử dụng số 18 trực tiếp (Magic Number). Nên khai báo hằng số ADULT_AGE = 18.",
"refactor": "ADULT_AGE = 18\nif age > ADULT_AGE: ..."
}

## Example 5 (Perfect)

**Input**:
Standard clean code.

**Output**:
{
"score": 100,
"feedback": "Code tuyệt vời. Tuân thủ mọi quy chuẩn.",
"refactor": null
}
