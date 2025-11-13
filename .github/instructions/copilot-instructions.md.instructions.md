---
applyTo: '**'
---
Kim Tuyền
bunbogan7
Trực tuyến

Vo Tuan Thanh — Hôm qua lúc 20:16
mấy cái thống kê đồ
Kim Tuyền — Hôm qua lúc 20:16
Oce đúng r
Vo Tuan Thanh — Hôm qua lúc 20:18
🙁
Hình ảnh
Kim Tuyền — Hôm qua lúc 20:51
Sê acc với
Đúng se ni ơ xài toàn hàng sịn
Vo Tuan Thanh — Hôm qua lúc 21:40
sinio
à mà sếp cái vụ auto submit bữa ai thống nhất architect chưa v
quên hết rồi
đừng đi ngủ mà
Kim Tuyền — Hôm qua lúc 22:03
Nộp tới đâu chấm tới dod ông
Vo Tuan Thanh — Hôm qua lúc 22:03
ý là architect á
Kim Tuyền — Hôm qua lúc 22:03
Là s ta
Vo Tuan Thanh — Hôm qua lúc 22:05
không ý là giờ nó đang làm dở thì hết giờ nó sẽ redirect qua cái trang kq đúng k
thì khi nhấn tham gia be trả fe cái start end rồi fe tự countdown thôi à sếp
Kim Tuyền — Hôm qua lúc 22:06
Là đang hỏi logic countdown hả
Vo Tuan Thanh — Hôm qua lúc 22:06
vâng ạ
Kim Tuyền — Hôm qua lúc 22:06
Đroi
Vo Tuan Thanh — Hôm qua lúc 22:06
Hình ảnh
Kim Tuyền — Hôm qua lúc 22:06
Fe tự count nhma lúc chấm sẽ có verify dưới be
Vo Tuan Thanh — Hôm qua lúc 22:06
là be chỉ cần như này thôi chứ j
còn chấm thì mình tự verify
oke
Kim Tuyền — Hôm qua lúc 22:07
Chắc là v nào tích hợp lòi ra gì nx thì thêm dần
Ủa mà tôi tưởng ô fe
Full snack à
Vo Tuan Thanh — Hôm qua lúc 22:07
tôi chuồn
chuồn fe
sợ fe quá
chịu k nỗi
Vo Tuan Thanh — Hôm qua lúc 22:26
à btw nếu chưa paticipate thì chỉ xem được tên contest chứ không xem được detail nhỉ
Kim Tuyền — Hôm qua lúc 22:29
Bữa a Vũ bảo v
Vo Tuan Thanh — Hôm qua lúc 22:56
Method,Endpoint,Function
POST,/v1/contests,Create a new contest.
PUT,/v1/contests/{id},"Update a contest (edit name, start/end time, late_deadline...)."
DELETE,/v1/contests/{id},Delete a contest.
POST,/v1/contests/{id}/problems,Add an existing problem to a contest (links problemId to contestId).
PUT,/v1/contests/{id}/problems/{problemId},"Update a problem within a contest (e.g., change the score)."
DELETE,/v1/contests/{id}/problems/{problemId},Remove a problem from a contest.
GET,/v1/contests/{id}/participants,Get the list of participants in a contest.
mấy cái crud này
cũng e làm luôn à sếp
Kim Tuyền — Hôm qua lúc 22:56
Tạo contest thì có r
Ủa
Mấy này k 0hair a
Vo Tuan Thanh — Hôm qua lúc 22:57
mấy này chưa có
mới có tạo à
mấy cái crud thôi á
Kim Tuyền — Hôm qua lúc 22:57
V thì từ từ kệ đi
Có tạo là đc r
A làm từ khúc nó join thôi
Vo Tuan Thanh — Hôm qua lúc 22:57
1 rôm thôi mà...
Kim Tuyền — Hôm qua lúc 22:58
80 rôm fix this bug please
Vo Tuan Thanh — Hôm qua lúc 22:59
đóng cái rule 500 dòng
Hình ảnh
Kim Tuyền — Hôm qua lúc 22:59
Cho xin với ạ
Con nô lệ bên này k khôn bằng bên đó
Vo Tuan Thanh — Hôm qua lúc 23:01
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Mở rộng
CLAUDE.md
18 KB
Kim Tuyền — Hôm qua lúc 23:01
Nice
﻿
Vo Tuan Thanh
_azzurriii
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe Match Backend is a NestJS-based REST API for a competitive programming platform with LTI 1.3 integration for Moodle. The platform supports problem management, code submission with Judge0 execution, contest management, and automatic grade passback to Moodle.

## Database schema:
```
schema: vibe-match
tables[20]:

# System Tables
- table: migrations
  columns[3]{name,type,constraints}:
    id,serial,"PK"
    timestamp,bigint,"NOT NULL"
    name,varchar,"NOT NULL"

- table: languages
  columns[2]{name,type,constraints}:
    id,integer,"PK NOT NULL"
    name,varchar,"NOT NULL"

# Core Tables
- table: user
  columns[11]{name,type,constraints}:
    user_id,serial,"PK"
    email,varchar,
    password,varchar,
    firstName,varchar,
    lastName,varchar,
    roles,text,
    authType,user_authtype_enum,"NOT NULL DEFAULT 'lti'"
    ltiSubjectId,varchar,
    ltiPlatformId,varchar,
    createdAt,timestamp with time zone,"NOT NULL DEFAULT now()"
    updatedAt,timestamp with time zone,"NOT NULL DEFAULT now()"
  constraints[1]{type,definition}:
    UNIQUE,"(ltiSubjectId, ltiPlatformId)"

- table: course
  columns[6]{name,type,constraints}:
    course_id,serial,"PK"
    ltiCourseId,varchar,"NOT NULL"
    ltiPlatformId,varchar,"NOT NULL"
    title,varchar,
    createdAt,timestamp with time zone,"NOT NULL DEFAULT now()"
    updatedAt,timestamp with time zone,"NOT NULL DEFAULT now()"
  constraints[1]{type,definition}:
    UNIQUE,"(ltiCourseId, ltiPlatformId)"

- table: tags
  columns[4]{name,type,constraints}:
    tag_id,serial,"PK"
    name,varchar,"NOT NULL UNIQUE"
    created_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp with time zone,"NOT NULL DEFAULT now()"

- table: topics
  columns[5]{name,type,constraints}:
    topic_id,serial,"PK"
    name,varchar,"NOT NULL UNIQUE"
    description,varchar,"NOT NULL"
    created_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp with time zone,"NOT NULL DEFAULT now()"

# Relationship Tables
- table: refresh_token
  columns[7]{name,type,constraints,references}:
    id,serial,"PK"
    token,varchar(500),"NOT NULL UNIQUE"
    userId,integer,"NOT NULL FK","user (user_id) ON DELETE CASCADE"
    expiresAt,timestamp with time zone,"NOT NULL"
    revokedAt,timestamp with time zone,
    createdAt,timestamp with time zone,"NOT NULL DEFAULT now()"
    updatedAt,timestamp with time zone,"NOT NULL DEFAULT now()"

- table: auth
  columns[6]{name,type,constraints,references}:
    id,serial,"PK"
    userId,integer,"NOT NULL FK","user (user_id) ON DELETE CASCADE"
    token,varchar,"NOT NULL"
    tokenType,varchar,"NOT NULL"
    expiresAt,timestamp,"NOT NULL"
    createdAt,timestamp with time zone,"NOT NULL DEFAULT now()"
    updatedAt,timestamp with time zone,"NOT NULL DEFAULT now()"

- table: user_course
  columns[6]{name,type,constraints,references}:
    user_course_id,serial,"PK"
    userId,integer,"NOT NULL FK","user (user_id) ON DELETE CASCADE"
    courseId,integer,"NOT NULL FK","course (course_id) ON DELETE CASCADE"
    rolesInCourse,text,
    enrolledAt,timestamp,"NOT NULL DEFAULT now()"
    UNIQUE,"(userId, courseId)"

# Problem Domain
- table: problems
  columns[17]{name,type,constraints,references}:
    problem_id,serial,"PK"
    title,varchar,"NOT NULL"
    problem_description,varchar,"NOT NULL"
    input_description,varchar,"NOT NULL"
    output_description,varchar,"NOT NULL"
    max_score,smallint,"NOT NULL"
    time_limit_ms,double precision,"NOT NULL"
    memory_limit_kb,double precision,"NOT NULL"
    difficulty,problems_difficulty_enum,"NOT NULL DEFAULT 'easy'"
    type,problems_type_enum,"NOT NULL DEFAULT 'standalone'"
    author_id,integer,"NOT NULL FK","user (user_id)"
    created_at,timestamp(3) with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp(3) with time zone,"NOT NULL DEFAULT now()"
    tsv,tsvector,
    max_attempts,integer,
    show_submission_count,boolean,"NOT NULL DEFAULT true"
    submission_strategy,problems_submission_strategy_enum,"NOT NULL DEFAULT 'BEST_SCORE'"
    visibility,problems_visibility_enum,"NOT NULL DEFAULT 'public'"

- table: testcases
  columns[5]{name,type,constraints,references}:
    testcase_id,serial,"PK"
    fileUrl,text,"NOT NULL"
    created_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    problem_id,integer,"NOT NULL UNIQUE FK" # Index is unique
  indexes[1]{name,columns}:
    idx_testcase_problem_id,"problem_id"

- table: testcase_samples
  columns[6]{name,type,constraints,references}:
    testcase_sample_id,serial,"PK"
    problem_id,integer,"NOT NULL FK","problems (problem_id)"
    input,text,"NOT NULL"
    output,text,"NOT NULL"
    created_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp with time zone,"NOT NULL DEFAULT now()"

- table: problem_tags
  columns[3]{name,type,constraints,references}:
    problem_tag_id,serial,"PK"
    problem_id,integer,"NOT NULL FK","problems (problem_id) ON DELETE CASCADE"
    tag_id,integer,"NOT NULL FK","tags (tag_id) ON DELETE CASCADE"
  constraints[1]{type,definition}:
    UNIQUE,"(problem_id, tag_id)"

- table: problem_topics
  columns[3]{name,type,constraints,references}:
    problem_topic_id,serial,"PK"
    problem_id,integer,"NOT NULL FK","problems (problem_id) ON DELETE CASCADE"
    topic_id,integer,"NOT NULL FK","topics (topic_id) ON DELETE CASCADE"
  constraints[1]{type,definition}:
    UNIQUE,"(problem_id, topic_id)"

# Contest Domain
- table: contests
  columns[12]{name,type,constraints,references}:
    contest_id,serial,"PK"
    name,varchar,"NOT NULL"
    description,varchar,"NOT NULL"
    start_time,timestamp(3) with time zone,"NOT NULL"
    end_time,timestamp(3) with time zone,"NOT NULL"
    duration_minutes,integer,
    course_id,integer,"NOT NULL FK","course (course_id)"
    author_id,integer,"NOT NULL FK","user (user_id)"
    created_at,timestamp(3) with time zone,"NOT NULL DEFAULT now()"
    updated_at,timestamp(3) with time zone,"NOT NULL DEFAULT now()"
    tsv,tsvector,
    late_deadline,timestamp(3) with time zone,
    deadline_enforcement,contests_deadline_enforcement_enum,"NOT NULL DEFAULT 'strict'"

- table: contest_participation
  columns[6]{name,type,constraints,references}:
    contest_participation_id,serial,"PK"
    start_time,timestamp,"NOT NULL DEFAULT now()"
    end_time,time,
    final_score,double precision,
    contest_id,integer,"FK","contests (contest_id)"
    user_id,integer,"FK","user (user_id)"
  constraints[1]{type,definition}:
    UNIQUE,"(contest_id, user_id)"

- table: contest_problems
  columns[4]{name,type,constraints,references}:
    contest_problem_id,serial,"PK"
    contest_id,integer,"NOT NULL FK","contests (contest_id)"
    problem_id,integer,"NOT NULL FK","problems (problem_id)"
    score,integer,"NOT NULL"
  constraints[1]{type,definition}:
    UNIQUE,"(contest_id, problem_id)"

- table: course_problems
  columns[3]{name,type,constraints,references}:
    course_problem_id,serial,"PK"
    course_id,integer,"NOT NULL FK","course (course_id) ON DELETE CASCADE"
    problem_id,integer,"NOT NULL FK","problems (problem_id) ON DELETE CASCADE"
  constraints[1]{type,definition}:
    UNIQUE,"(course_id, problem_id)"

# Submission Domain
- table: lti_launch_sessions
  columns[11]{name,type,constraints,references}:
    id,uuid,"PK NOT NULL DEFAULT uuid_generate_v4()"
    user_id,integer,"FK","user (user_id)"
    lti_user_id,varchar,"NOT NULL"
    resource_link_id,varchar,"NOT NULL"
    context_id,varchar,"NOT NULL"
    ags_lineitem_url,varchar,
    ags_scopes,text,
    deployment_id,varchar,"NOT NULL"
    platform_issuer,varchar,"NOT NULL"
    created_at,timestamp with time zone,"NOT NULL DEFAULT now()"
    expires_at,timestamp with time zone,"NOT NULL"
    contest_id,integer,"FK","contests (contest_id)"

- table: submission
  columns[18]{name,type,constraints,references}:
    submission_id,serial,"PK"
    status,submission_status_enum,"NOT NULL DEFAULT 'PENDING'"
    score,double precision,
    runtime,double precision,
    memory,double precision,
    source_code,text,
    created_at,timestamp,"NOT NULL DEFAULT now()"
    file_url,varchar,
    total_tests,integer,
    passed_tests,integer,
    note,varchar,
    user_id,integer,"NOT NULL FK","user (user_id)"
    problem_id,integer,"NOT NULL FK","problems (problem_id)"
    contest_participation_id,integer,"FK","contest_participation (contest_participation_id)"
    language_id,integer,"FK","languages (id)"
    lti_launch_session_id,uuid,"FK","lti_launch_sessions (id)"
    ags_grade_sent,boolean,"NOT NULL DEFAULT false"
    ags_grade_sent_at,timestamp,
    ags_error,text,
    result_description,json
```

## Development Commands

```bash
# Development
npm run start:dev              # Start with hot-reload
npm run start:debug            # Start with debugging enabled
npm run build                  # Compile to /dist

# Testing
npm run test                   # Run unit tests
npm run test -- <file-name>    # Run specific test file (e.g., npm run test -- auth.service.spec)
npm run test:watch             # Run tests in watch mode
npm run test:cov               # Run tests with coverage
npm run test:e2e               # Run end-to-end tests

# Linting & Formatting
npm run lint                   # Run ESLint (auto-fix)
npm run format                 # Format code with Prettier

# Database Migrations
npm run migration:generate -- -n MigrationName    # Generate migration from entities
npm run migration:create -- -n MigrationName      # Create blank migration
npm run migration:run          # Run pending migrations
npm run migration:revert       # Revert last migration
npm run typeorm -- <command>   # Run TypeORM CLI commands

# Database Seeding
npm run seed:run               # Run database seeders

# Infrastructure
docker compose up -d           # Start PostgreSQL, Redis, Judge0, and Moodle containers
```

## Architecture

### Module Structure

NestJS modular architecture with each feature as a self-contained module under `src/modules/`:

**Core Modules**:
- `auth/` - JWT authentication with Google OAuth, Passport strategies (`jwt-auth.strategy`, `jwt-refresh.strategy`)
- `user/` - User management and profiles
- `lti/` - LTI 1.3 integration with Moodle (login, launch, deep linking, Assignment and Grade Services)
- `problems/` - Problem CRUD, test cases, topics, tags
- `contests/` - Contest management, participation tracking
- `submission/` - Code submission processing with BullMQ queues, SSE streaming
- `judge0/` - Integration with Judge0 code execution engine
- `language/` - Programming language management
- `course/` - Course management
- `storages/` - AWS S3 file storage integration

**Common Infrastructure** (`src/common/`):
- `decorators/` - Custom decorators: `@CurrentUser()`, `@Roles()`, `@Cookies()`, `@SkipTransform()`
- `guards/` - `JwtAuthGuard`, `JwtRefreshGuard`, `RolesGuard`, `EnvironmentGuard`
- `filters/` - `GlobalExceptionFilter` for standardized error responses
- `interceptors/` - `DataResponseInterceptor` wraps responses in `{ status, apiVersion, data }` format
- `pagination/` - Custom cursor-based pagination system with filtering, sorting, and search
- `enums/` - Shared enumerations
- `utils/` - Utility functions

### Database & ORM

**TypeORM** with PostgreSQL:
- Entities are co-located with their modules under `entities/` subdirectories
- Migrations in `src/migrations/` (managed via `data-source.ts`)
- `synchronize: false` in production - all schema changes must go through migrations
- Transactional support via `typeorm-transactional` with `@Transactional()` decorator

**Migration Workflow**:
1. Update entity files
2. Generate migration: `npm run migration:generate -- -n DescriptiveName`
3. Review generated SQL in `src/migrations/`
4. Run migration: `npm run migration:run`

### Authentication & Authorization

**JWT-based authentication**:
- Access tokens and refresh tokens stored in HTTP-only cookies
- Passport strategies in `src/modules/auth/strategies/`
- Guards: `@UseGuards(JwtAuthGuard)` for protected routes
- Role-based access control: `@Roles(Role.ADMIN)` with `RolesGuard`
- Google OAuth integration for social login

**Getting current user in controllers**:
```typescript
@Get()
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  return user;
}
```

### Submission Processing Architecture

**Queue-based async processing with BullMQ**:
1. User submits code via `POST /v1/submissions`
2. Submission record created in database
3. Job queued in BullMQ with exponential backoff retry (5 attempts)
4. Worker sends code to Judge0 with callback URL
5. Judge0 executes code asynchronously and POSTs result to callback endpoint
6. Backend updates submission, stores result
7. Real-time updates streamed to frontend via Server-Sent Events (SSE)
8. If LTI context exists, grade is sent back to Moodle via Assignment and Grade Services

**Key Components**:
- `SubmissionService` - Main service for submission CRUD
- `SubmissionFinalizeProcessor` - BullMQ processor for finalization queue
- `SubmissionsSseService` - SSE streaming service for real-time updates
- `CallbackProcessor` - Handles Judge0 callback webhook
- `GradingStrategyFactory` - Factory for different grading strategies (single, best, latest, average)
- Cleanup job removes old SSE streams after `SUBMISSION_CLEANUP_STREAM_TIME` (default 60s)

### LTI 1.3 Integration

**LTI flow**:
1. Moodle initiates login via `/v1/lti/login`
2. Backend validates and redirects to authentication URL
3. Moodle sends LTI launch request to `/v1/lti/launch`
4. Backend validates JWT, creates session, sets cookies, redirects to frontend
5. Frontend receives LTI context via cookies
6. For assignments, grades are sent back via Assignment and Grade Services (AGS)

**Deep Linking**: Allows instructors to select problems/contests from Moodle assignment settings

**LTI Configuration**: Platform registration stored in database, configuration in `src/config/lti.config.ts`

### Global Features

**Request/Response Pipeline**:
1. Validation: `class-validator` and `class-transformer` via global ValidationPipe
2. Guards: JWT authentication, roles, throttling (100 requests/minute)
3. Interceptor: `DataResponseInterceptor` wraps successful responses
4. Exception Filter: `GlobalExceptionFilter` standardizes error responses

**API Response Format**:
```json
{
  "status": "OK",
  "apiVersion": "v1",
  "data": { ... }
}
```

**Caching**: Redis-based caching via `@nestjs/cache-manager` with Keyv adapter (global)

**Rate Limiting**: Throttling via `@nestjs/throttler` (100 req/min default, customizable per route)

### Configuration Management

**Environment-based config** in `src/config/`:
- `app.config.ts` - Application settings (port, CORS, Swagger)
- `database.config.ts` - PostgreSQL connection
- `redis.config.ts` - Redis connection
- `auth.config.ts` - JWT and OAuth settings
- `lti.config.ts` - LTI platform configuration
- `judge0.config.ts` - Judge0 API settings
- `aws.config.ts` - AWS S3 configuration
- `submission.config.ts` - Submission queue settings

**Validation**: `environment.validation.ts` uses Joi to validate all required environment variables on startup

### Pagination System

**Cursor-based pagination** in `src/common/pagination/`:
- `CursorPaginationService` - Core pagination logic
- `PaginationQueryDto` - Standard query parameters
- Supports filtering, sorting, and search
- Response includes `data`, `meta` (cursor info), and `links` (next/prev URLs)

**Usage in controllers**:
```typescript
@Get()
async findAll(@Query() query: PaginationQueryDto) {
  return this.service.paginate(query);
}
```

## API Documentation

Swagger documentation available at `http://localhost:3000/docs`

In non-production environments, raw JSON available at `http://localhost:3000/v1/swagger-json`

## Docker Infrastructure

`docker-compose.yml` provides:
- **PostgreSQL 16** - Main database (port 5432)
- **Redis 7.2** - Cache and job queue (port 6379)
- **Judge0** - Code execution engine (server on 2358, workers)
- **Moodle 4.3** - LMS for testing LTI integration (port 8888)
- **MariaDB** - Moodle database (port 3307)

## Module Generation

Generate new modules with NestJS CLI:
```bash
nest g resource modules/<module-name>
```

This creates a complete REST resource with controller, service, module, DTOs, and entity scaffolding.

## Code Quality

**Linting**: ESLint with `typescript-eslint` plugin
**Formatting**: Prettier with consistent configuration
**Pre-commit hooks**: Husky runs lint-staged to format and lint staged files
**Commit convention**: Follow Conventional Commits format (feat:, fix:, chore:, etc.)

## Testing Conventions

**Unit tests**: Co-located with source files (`*.spec.ts`)
**E2E tests**: In `test/` directory with separate Jest configuration
**Run specific test**: `npm run test -- <filename>` (e.g., `npm run test -- auth.service.spec`)
**Coverage**: `npm run test:cov` generates coverage report in `/coverage`

## Important Notes

- **Migrations**: NEVER use `synchronize: true` in production. All schema changes must be explicit migrations
- **Logging**: Use NestJS `Logger` class, not `console.log`
- **Services**: All business logic should live under `src/modules/` in respective modules
- **DTOs**: Use `class-validator` decorators for validation, extend `PartialType`/`PickType` for updates
- **Guards**: Apply at controller or method level, compose multiple guards when needed
- **Transactions**: Use `@Transactional()` decorator for operations requiring atomicity
- **Error handling**: Throw standard NestJS exceptions (BadRequestException, NotFoundException, etc.)
- **Environment variables**: Add new variables to `.env.example` when adding to `.env`