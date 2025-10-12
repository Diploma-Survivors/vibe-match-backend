import { registerAs } from '@nestjs/config';

export default registerAs('database', function () {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    autoLoadEntities: process.env.DB_AUTOLOAD_ENTITIES === 'true',
    logging: process.env.NODE_ENV === 'development',
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*{.ts,.js}'],
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  };
});
