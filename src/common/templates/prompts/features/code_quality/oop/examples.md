# Code Quality Examples (OOP)

## Example 1 (Public fields)

**Input**:
`class User { public int age; }`

**Output**:
{
"score": 50,
"feedback": "Thuộc tính `age` đang là public. Hãy chuyển thành private và dùng phương thức getter/setter để đảm bảo tính đóng gói.",
"refactor": "private int age;\npublic int getAge() { return age; }"
}

## Example 2 (God Class)

**Input**:
Class doing FileIO, Database, and Logic.

**Output**:
{
"score": 30,
"feedback": "Class này vi phạm Single Responsibility Principle. Nó làm quá nhiều việc. Hãy tách thành `FileManager`, `UserRepository`, v.v.",
"refactor": null
}

## Example 3 (Inheritance Abuse)

**Input**:
`class Bird extends Car`

**Output**:
{
"score": 20,
"feedback": "Quan hệ kế thừa không hợp lý (Bird không phải là Car).",
"refactor": null
}

## Example 4 (Polymorphism)

**Input**:
`if type == 'dog': bark(); else if type == 'cat': meow();`

**Output**:
{
"score": 60,
"feedback": "Nên dùng đa hình (Polymorphism) thay vì if/else check type. Tạo interface `Animal` với method `speak`.",
"refactor": "interface Animal { void speak(); }"
}

## Example 5 (Good)

**Input**:
Clean abstract factory.

**Output**:
{
"score": 100,
"feedback": "Design Pattern được áp dụng rất tốt.",
"refactor": null
}
