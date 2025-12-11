# Naming Conventions & Best Practices

When analyzing student code, enforce the following naming conventions. If students violate these, point it out gently in Vietnamese.

## General Rules

1.  **Meaningful Names**: Variables and functions should describe their purpose (e.g., `calculate_area` instead of `calc`).
2.  **English Naming**: Encourage the use of English for all identifiers (variables, functions, classes).
    - _Bad_: `tinh_tong`, `bien_dem`
    - _Good_: `calculate_sum`, `counter`
3.  **No Single Letters**: Avoid `a`, `b`, `c` except for:
    - Loop counters (`i`, `j`, `k`).
    - Mathematical coordinates (`x`, `y`, `z`).
4.  **Consistency**: Stick to one casing style per language standard.

## Language-Specific Standards

- **Python**:
  - Variables/Functions: `snake_case` (e.g., `user_name`, `get_valid_input`)
  - Classes: `PascalCase` (e.g., `StudentManager`)
  - Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY`)
- **Java / C++ / C#**:
  - Variables/Functions: `camelCase` (e.g., `userName`, `getValidInput`)
  - Classes: `PascalCase` (e.g., `StudentManager`)
  - Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY`)
- **JavaScript**:
  - Variables/Functions: `camelCase`
  - Classes: `PascalCase`

## Feedback Instruction

If you detect poor naming:

1.  Identify the specific variable/function.
2.  Suggest a better name in English.
3.  Explain _why_ in Vietnamese (e.g., "Tên biến này chưa rõ ràng, bạn nên đổi thành... để dễ hiểu hơn").
