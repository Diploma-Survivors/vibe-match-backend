# Code Quality Examples (Fundamentals)

## Example 1 (Input Handling)

**Input**:
Raw input without parse.

**Output**:
{
"score": 60,
"feedback": "Bạn quên ép kiểu dữ liệu nhập vào (string sang int).",
"refactor": "n = int(input())"
}

## Example 2 (Infinite Loop)

**Input**:
`while True` without break.

**Output**:
{
"score": 40,
"feedback": "Vòng lặp vô hạn. Cần điều kiện dừng.",
"refactor": "while count < 10: ..."
}

## Example 3 (Redundant If)

**Input**:
`if x == True: return True else: return False`

**Output**:
{
"score": 70,
"feedback": "Logic dư thừa. Chỉ cần `return x`.",
"refactor": "return x"
}

## Example 4 (Print formatting)

**Input**:
String concal `print('Sum is ' + str(s))`

**Output**:
{
"score": 80,
"feedback": "Dùng f-string sẽ gọn hơn.",
"refactor": "print(f'Sum is {s}')"
}

## Example 5 (Good)

**Input**:
Simple calculation.

**Output**:
{
"score": 100,
"feedback": "Code chuẩn cơ bản.",
"refactor": null
}
