import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';
import '@oreillymedia/cypress-playback/addCommands.js';
import './commands';

addMatchImageSnapshotCommand();
