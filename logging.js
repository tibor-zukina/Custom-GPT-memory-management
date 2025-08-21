import configManager from  './config_drivers/config_manager.js';
import { ensureDirectory, createWriteStream } from './io.js';

const PATHS = configManager.PATHS;

export async function setLogging() {

    ensureDirectory(PATHS.LOG_DIR);

    const logStream = await createWriteStream(`${PATHS.LOG_DIR}/${PATHS.OUTPUT_LOG_FILE}`);
    const errorStream = await createWriteStream(`${PATHS.LOG_DIR}/${PATHS.ERROR_LOG_FILE}`);

    process.stdout.write = logStream.write.bind(logStream);
    process.stderr.write = errorStream.write.bind(errorStream);

   _log('Logging directories set');
}

export function _log(...messages) {

   const timestamp = new Date().toISOString();
   console.log(`[${timestamp}]`, ...messages);
}

export function _error(...messages) {

  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}]`, ...messages);
}
