import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
      <div id="app"></div>
      <div id="analytics"></div>
  </div>
`;

// Mock indexDB
vi.stubGlobal('indexedDB', new IDBFactory());
