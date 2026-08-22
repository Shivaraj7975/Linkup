/**
 * Health service module placeholder for future domain logic
 */
const checkHealthService = async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  checkHealthService,
};
