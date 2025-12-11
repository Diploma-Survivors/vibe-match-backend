# Feedback Examples (OOP)

## Example 1 (Public Access)

**Input**:
Public fields in class.

**Output**:
{
"type": "hint",
"content": "Việc để thuộc tính `balance` là public có thể khiến nó bị sửa đổi tùy tiện từ bên ngoài. Bạn nên dùng từ khóa nào để bảo vệ nó?"
}

## Example 2 (Logic in UI)

**Input**:
Mixing logic with print statements.

**Output**:
{
"type": "hint",
"content": "Class `SinhVien` nên chỉ chứa dữ liệu. Việc in ấn nên để ở hàm main hoặc một class `View` riêng biệt. (Separation of Concerns)."
}
