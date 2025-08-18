# Vibe Match Backend

Backend service for the **Vibe Match** platform

---

## Getting Started

### Option 1: Docker Compose (Recommended)

#### 1. Clone the repo

```bash
git clone https://github.com/Diploma-Survivors/vibe-match-backend
cd vibe-match-backend
```

#### 2. Copy env file

```bash
cp env.example .env
```

#### 3. Update .env with your values

Edit `.env` to configure database, Redis, and other environment-specific settings.

#### 4. Start infrastructure

```bash
docker compose up -d
```

#### 5. Install dependencies

```bash
npm install
```

#### 6. Start the application

```bash
npm run start:dev
```

### Option 2: Manual Setup

1. Install **PostgreSQL** and **Redis** locally.
2. Create a database named `vibe-match`:
   ```bash
   createdb vibe-match
   ```
3. Copy `.env` from `env.example` and update credentials.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the application:
   ```bash
   npm run start:dev
   ```

---

## API Documentation

Available at:
👉 [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## Scripts

- `npm run start:dev` → Run in development with hot-reload
- `npm run start:prod` → Run in production
- `npm run build` → Compile the application to `/dist`
- `npm run test` → Run unit tests with Jest
- `npm run test:e2e` → Run end-to-end tests
- `npm run lint` → Run ESLint to check code style
- `npm run format` → Run Prettier to format code

---

## Database & Migrations

- **Development**: Auto-sync enabled via TypeORM for schema updates.
- **Production**: Use migrations for controlled schema changes.

### Migration Commands

```bash
# Generate a new migration
npm run typeorm:generate -- -n MigrationName

# Run migrations
npm run typeorm:run

# Revert the last migration
npm run typeorm:revert
```

---

## Development Guidelines

Yes 👍 your **Development Guidelines** section is already clear and professional. I’d just make a few **small refinements** for readability, consistency, and developer-friendliness. Here’s a polished version:

---

## Development Guidelines

- Use **NestJS Logger** instead of `console.log` for consistent logging.
- Follow coding standards enforced by **ESLint** and **Prettier**.
- **Commit messages** must follow the [Conventional Commit](https://www.conventionalcommits.org/) format:
  - `feat: add user auth`
  - `fix: resolve login bug`
  - `chore: update dependencies`

- Always create a branch for your work:
  - `feature/*` → new features
  - `fix/*` → bug fixes
  - `chore/*` → maintenance tasks

- All changes must go through a **Pull Request** with at least **one reviewer approval**.
- Generate new services/resources using the NestJS CLI:

  ```bash
  nest g resource <service-name>
  ```

- All services must live under the `src/modules` folder.

---

## Workflow: Trunk-Based Development

1. Create a feature branch:
   ```bash
   git checkout -b feature/awesome-feature
   ```
2. Commit changes and push:
   ```bash
   git commit -m "feat: implement awesome feature"
   git push origin feature/awesome-feature
   ```
3. Open a Pull Request on GitHub.
4. Request review and ensure CI checks (tests, linting) pass.
5. Merge into the `main` branch after approval.

---

## Notes for Team

- **Dependency Management**: Keep dependencies up to date using `npm outdated` and update as needed.
- **API Documentation**: Update Swagger annotations for any API changes to keep [http://localhost:3000/api/docs](http://localhost:3000/api/docs) current.
- **Environment Variables**: Add new variables to `env.example` when updating `.env` requirements.
- **Logging**: Use structured logging (e.g., JSON format) for better observability in production.
- **Testing**: Write unit and end-to-end tests for all new features and bug fixes.
- **Security**: Ensure sensitive data (e.g., API keys, credentials) is stored in `.env` and never committed.

---

## Troubleshooting

- **Database Connection Issues**: Verify PostgreSQL is running and `.env` credentials match.
- **Redis Connection Errors**: Ensure Redis is accessible and the port in `.env` is correct.
- **Dependency Issues**: Run `npm ci` for a clean install if `npm install` fails.
- **Migration Conflicts**: Check migration history with `npm run typeorm:log` and resolve conflicts manually.
