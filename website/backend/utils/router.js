/**
 * Centralized router setup for the Express application
 */
const CONFIG = require('../config/config');

/**
 * Mount all API routers at the appropriate paths
 * @param {Object} app - Express application
 * @param {Object} routers - Object containing all router modules
 */
const setupRouters = (app, routers) => {
  // Extract routers from the provided object
  const {
    modelsApi,
    trellis,
    images,
    systemPrompt,
    debug
  } = routers;

  // Mount all API routers
  app.use('/api', modelsApi);
  app.use('/api', trellis);
  app.use('/api', images);
  app.use('/api', systemPrompt);
  app.use('/api', debug);
};

module.exports = {
  setupRouters
}; 