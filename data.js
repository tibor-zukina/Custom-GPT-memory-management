import configManager from './config_drivers/config_manager.js';
import { _log, _error } from './logging.js';

import path from 'path';
import { getBaseDir, checkPathExists, copyDirectory, ensureDirectory, readFromMemory } from './io.js';

const PATHS = configManager.PATHS;
const MEMORY_DIR = path.join(getBaseDir(), PATHS.MEMORY_DIR);
const FILES_DIR = path.join(getBaseDir(), PATHS.FILES_DIR);
const DATA_TYPES = configManager.DATA_TYPES;

export async function ensureDataDirectories() {
  await ensureDirectory(MEMORY_DIR);
  await ensureDirectory(FILES_DIR);
}

export async function ensureGPTFileDirectory(filePath) {

    await ensureDirectory(path.dirname(filePath));
}


export function getMemoryPath(gptId) {
  return path.join(MEMORY_DIR, `${gptId}.json`);
}

export function getFilePath(gptId, filename) {
  return path.join(FILES_DIR, gptId, filename);
}

export async function backupAndLogUpdate(username, filepath, newValue, dataType) {

  let sourceDir;
  let backupRoot;
  let backupDir;
  const date = new Date();
  const dateString = date.toISOString().replace(/[-:T]/g, '_').split('.')[0];

  if (dataType === DATA_TYPES.MEMORY) {

    sourceDir = MEMORY_DIR;
    backupRoot = path.join(getBaseDir(), PATHS.MEMORY_BACKUPS_DIR);
    backupDir = path.join(backupRoot, `${PATHS.MEMORY_PREFIX}${dateString}`);
  }
  else if (dataType === DATA_TYPES.FILE) {

    sourceDir = FILES_DIR;
    backupRoot = path.join(getBaseDir(), PATHS.FILES_BACKUPS_DIR);
    backupDir = path.join(backupRoot, `${PATHS.FILES_PREFIX}_${dateString}`);
  }
  else {

    _error('Invalid data type specified for backup');
    return;
  }

  try {

    await ensureDirectory(backupDir);

    if (await checkPathExists(sourceDir)) {
      await copyDirectory(sourceDir, backupDir);
    }

    _log(`${username} updating ${filepath}:\n`);

    if (dataType === DATA_TYPES.MEMORY) {

      let oldValue = {};

      if (await checkPathExists(filepath)) {
        oldValue = await readFromMemory(filepath);
      }

      _log(`${username} updating ${filepath}:\n`, 'Old value:\n', oldValue, '\nNew value:\n', newValue);
    }
    else {
      _log(`${username} updating ${filepath}:\n`);
    }
  } catch (error) {
    _error('Backup or logging failed:', error);
  }
}
