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

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, mask internal server errors with a generic safe message
  let clientMessage = err.message || 'Internal Server Error';
  if (isProduction && statusCode === 500) {
    clientMessage = 'Internal server error. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(!isProduction && { stack: err.stack }),
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
  errorHandler,
  notFoundHandler,
};
