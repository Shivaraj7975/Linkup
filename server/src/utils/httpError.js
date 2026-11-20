/**
 * Create an Error carrying an HTTP status code. The global errorHandler uses
 * err.statusCode, so services can signal 4xx outcomes without each controller
 * pattern-matching on message text.
 */
const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { httpError };
