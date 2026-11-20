/**
 * Map PostgreSQL errors caused by client input to safe 4xx responses.
 * Without this, a malformed UUID in a URL, an over-long string or a duplicate
 * insert race surfaced as a 500 that echoed the raw database message.
 * See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_CLIENT_ERRORS = {
  '22P02': [400, 'Invalid request parameter.'], // invalid_text_representation (e.g. bad UUID)
  '22001': [400, 'A submitted value is too long.'], // string_data_right_truncation
  '22003': [400, 'A submitted number is out of range.'], // numeric_value_out_of_range
  '22007': [400, 'Invalid date/time value.'], // invalid_datetime_format
  '22008': [400, 'Invalid date/time value.'], // datetime_field_overflow
  '23502': [400, 'A required field is missing.'], // not_null_violation
  '23514': [400, 'A submitted value is not allowed.'], // check_violation
  '23503': [409, 'A referenced resource does not exist or is still in use.'], // foreign_key_violation
  '23505': [409, 'This resource already exists.'], // unique_violation
};

const resolveStatusAndMessage = (err) => {
  if (err && err.statusCode) return [err.statusCode, err.message];
  if (err && typeof err.status === 'number') return [err.status, err.message];

  if (err && typeof err.code === 'string' && PG_CLIENT_ERRORS[err.code]) {
    return PG_CLIENT_ERRORS[err.code];
  }

  // Database unreachable / pg-pool could not hand out a connection in time:
  // a transient outage, not a client error. 503 lets clients and load balancers retry.
  const DB_UNAVAILABLE_CODES = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', '57P01', '57P03', '53300'];
  if (err && (DB_UNAVAILABLE_CODES.includes(err.code)
    || (typeof err.message === 'string' && (err.message.includes('timeout exceeded when trying to connect') || err.message.includes('Connection terminated'))))) {
    return [503, 'Service temporarily unavailable. Please try again shortly.'];
  }

  return [500, err?.message || 'Internal Server Error'];
};

/**
 * Global error handler middleware
 * Protects internal details, database queries, and stack traces from leaking to clients in production.
 */
const errorHandler = (err, req, res, next) => {
  // Always log full error details on server side for debugging and security audits
  console.error('Unhandled Server Error:', {
    message: err?.message,
    name: err?.name,
    stack: err?.stack,
    url: req?.originalUrl,
    method: req?.method,
    ip: req?.ip,
  });

  const [statusCode, resolvedMessage] = resolveStatusAndMessage(err);
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, mask internal server errors with a generic safe message
  let clientMessage = resolvedMessage || 'Internal Server Error';
  if (isProduction && statusCode === 500) {
    clientMessage = 'Internal server error. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(!isProduction && statusCode >= 500 && { stack: err.stack }),
  });
};

/**
 * 404 Not Found route handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`,
  });
};

module.exports = {
  resolveStatusAndMessage,
  errorHandler,
  notFoundHandler,
};
