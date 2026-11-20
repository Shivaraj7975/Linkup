/**
 * Guard for destructive DB scripts (initDb drops every table; the seed script creates
 * accounts with a shared password). They ship inside the deployed server package, so
 * refuse to run against production or a non-local host unless explicitly overridden.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);

const getDestructiveRunBlockReason = (env = process.env) => {
  if (env.ALLOW_DESTRUCTIVE_DB_SCRIPTS === 'true') return null;
  if (env.NODE_ENV === 'production') {
    return 'NODE_ENV is "production"';
  }
  if (env.DATABASE_URL) {
    return 'DATABASE_URL is set (remote database)';
  }
  const host = (env.DB_HOST || '').trim().toLowerCase();
  if (!LOCAL_HOSTS.has(host)) {
    return `DB_HOST "${host}" is not a local host`;
  }
  return null;
};

const assertDestructiveRunAllowed = (scriptName, env = process.env) => {
  const reason = getDestructiveRunBlockReason(env);
  if (reason) {
    throw new Error(
      `Refusing to run ${scriptName}: ${reason}. This script deletes or overwrites data. ` +
        'Set ALLOW_DESTRUCTIVE_DB_SCRIPTS=true only if you are sure the target database is disposable.'
    );
  }
};

module.exports = { getDestructiveRunBlockReason, assertDestructiveRunAllowed };
