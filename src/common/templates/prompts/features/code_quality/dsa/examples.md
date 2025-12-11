# Code Quality Examples (DSA)

## Example 1 (Inefficient removal)

**Input**:
List removal in loop $O(n^2)$.

**Output**:
{
"score": 60,
"feedback": "Bạn đang xóa phần tử trong vòng lặp List ($O(n^2)$). Hãy dùng List Comprehension hoặc filter để đạt $O(n)$.",
"refactor": "[Optimized code]"
}

## Example 2 (Wrong Map usage)

**Input**:
Using list for lookup.

**Output**:
{
"score": 50,
"feedback": "Việc tìm kiếm trong list tốn $O(n)$. Hãy dùng Set hoặc Map để giảm xuống $O(1)$.",
"refactor": "use_set = set(my_list)"
}

## Example 3 (Recursion Depth)

**Input**:
Unoptimized recursion.

**Output**:
{
"score": 40,
"feedback": "Đệ quy không có memoization sẽ gây Time Limit Exceeded với input lớn. Hãy thêm @lru_cache hoặc dùng Dynamic Programming.",
"refactor": "from functools import lru_cache\n@lru_cache..."
}

## Example 4 (Edge Case)

**Input**:
Array access without bounds check.

**Output**:
{
"score": 45,
"feedback": "Bạn chưa xử lý trường hợp mảng rỗng hoặc index vượt quá giới hạn.",
"refactor": "if not arr: return 0"
}

## Example 5 (Good)

**Input**:
Binary Search logic.

**Output**:
{
"score": 100,
"feedback": "Thuật toán tìm kiếm nhị phân chính xác. Code mẫu mực.",
"refactor": null
}
