# Complexity Examples

## Example 1 (Simple Loop)

**Input**:

```python
for i in range(n):
    print(i)
```

**Output**:
{
"time_complexity": "O(n)",
"space_complexity": "O(1)",
"explanation": "Vòng lặp chạy n lần, mỗi lần thực hiện phép in tốn thời gian hằng số. Không sử dụng thêm bộ nhớ ngoài."
}

## Example 2 (Nested Loop)

**Input**:

```python
for i in range(n):
    for j in range(n):
        print(i, j)
```

**Output**:
{
"time_complexity": "O(n^2)",
"space_complexity": "O(1)",
"explanation": "Hai vòng lặp lồng nhau, mỗi vòng chạy n lần nên tổng số bước là n \* n."
}

## Example 3 (Binary Search)

**Input**:
Binary Search implementation.

**Output**:
{
"time_complexity": "O(log n)",
"space_complexity": "O(1)",
"explanation": "Mỗi bước tìm kiếm chia đôi không gian tìm kiếm, do đó độ phức tạp là logarit cơ số 2 của n."
}

## Example 4 (Merge Sort)

**Input**:
Merge Sort implementation.

**Output**:
{
"time_complexity": "O(n log n)",
"space_complexity": "O(n)",
"explanation": "Merge Sort chia mảng làm đôi (log n bước) và merge lại mất O(n) mỗi bước. Cần mảng phụ kích thước n để merge."
}

## Example 5 (Fibonacci Recursive)

**Input**:

```python
def fib(n):
    if n <= 1: return n
    return fib(n-1) + fib(n-2)
```

**Output**:
{
"time_complexity": "O(2^n)",
"space_complexity": "O(n)",
"explanation": "Mỗi bước gọi đệ quy 2 nhánh, tạo ra cây nhị phân độ sâu n. Space complexity là độ sâu của stack hoán đổi (stack depth)."
}
