(() => {
  "use strict";

  const DefaultDatabase = Object.freeze({
    schemaVersion: 2,
    waifus: [],
    cards: []
  });

  window.DefaultDatabase = DefaultDatabase;
})();
