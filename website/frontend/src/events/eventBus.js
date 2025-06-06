// A simple pub/sub event bus for managing terrain and asset events
export const eventBus = (() => {
  const topics = new Map();
  
  return {
    on: (topic, handler) => {
      if (!topics.has(topic)) {
        topics.set(topic, new Set());
      }
      topics.get(topic).add(handler);
    },
    
    off: (topic, handler) => {
      topics.get(topic)?.delete(handler);
    },
    
    emit: (topic, payload) => {
      topics.get(topic)?.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${topic}:`, error);
        }
      });
    },
    
    once: (topic, handler) => {
      const wrapHandler = (payload) => {
        handler(payload);
        eventBus.off(topic, wrapHandler);
      };
      eventBus.on(topic, wrapHandler);
    },
    
    clear: (topic) => {
      if (topic) {
        topics.delete(topic);
      } else {
        topics.clear();
      }
    }
  };
})();

// Event types
export const EVENTS = {
  TERRAIN_SELECTED: 'terrain:selected',
  TERRAIN_LOADED: 'terrain:loaded',
  TERRAIN_ERROR: 'terrain:error',
  
  ASSET_ADDED: 'asset:added',
  ASSET_VISUAL_SYNC: 'asset:visualSync', // For visual-only sync without triggering persistence
  ASSET_UPDATED: 'asset:updated',
  ASSET_DELETED: 'asset:deleted',
  ASSET_SELECTED: 'asset:selected',
  ASSET_MOVE_STARTED: 'asset:moveStarted',
  ASSET_MOVE_FINISHED: 'asset:moveFinished',
  
  GRID_TOGGLE: 'grid:toggle',
  GRID_HIGHLIGHT: 'grid:highlight',
  GRID_CLEAR_HIGHLIGHT: 'grid:clearHighlight'
}; 