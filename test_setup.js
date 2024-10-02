import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// We need to attach the component to a HTML,
// or .isVisible() function does not work
document.body.innerHTML = `
  <div>
      <div id="app"></div>
      <div id="analytics"></div>
      <div id="masternodeTab"></div>
      <div id="governanceTab"></div>
  </div>
`;

// Mock indexDB
vi.stubGlobal('indexedDB', new IDBFactory());

process.env.TZ = 'UTC';
