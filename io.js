import fs from 'fs-extra';
import path from 'path';
import { _log, _error } from './logging.js';
import { fileURLToPath } from 'url';

function getFullPath(filePath) {

  return path.resolve(filePath);
}

export function getBaseDir() {
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(__filename));
}

export async function readFromMemory(memoryPath) {
  return await fs.readJson(memoryPath);
}

export async function readFromFile(filePath) {
  const fullPath = getFullPath(filePath);
  _log(`Reading from file ${fullPath}`);

  try {
    const data = await fs.promises.readFile(fullPath, 'utf-8');
    return data;
  } catch (err) {
    throw new Error(`Failed to read file ${fullPath}: ${err.message}`);
  }
}

export async function writeToMemory(memoryPath, memoryData) {

  const fullPath = getFullPath(memoryPath);
  _log(`Writing to memory on path ${fullPath}`, memoryData);

  await fs.writeJson(fullPath, memoryData, { spaces: 2 });

}

export async function clearMemory(memoryPath) {

  _log(`Clearing memory on path ${memoryPath}`);
  await writeToMemory(memoryPath, {});
}

export async function writeToFile(filePath, fileData) {

    _log(`Writing to file on path ${filePath}`);
    await fs.writeFile(filePath, fileData);
}

export async function deleteFile(filePath) {

  _log(`Deleting file on path ${filePath}`);
  await fs.remove(filePath);
}

export async function readFromConf(confPath) {
  const fullPath = getFullPath(confPath);
  _log(`Reading from conf ${fullPath}`);

  try {
    const data = await fs.readJson(fullPath);
    return data;
  } catch (err) {
    throw new Error(`Failed to read conf ${fullPath}: ${err.message}`);
  }
}

export async function writeToConf(confPath, confData) {

  const fullPath = getFullPath(confPath);
  _log(`Writing to conf on path ${fullPath}`);

  await fs.writeJson(fullPath, confData, { spaces: 2 });

}

export async function checkPathExists(filePath) {

  _log(`Checking if file with path ${filePath} exists`);
  let filePathExists = await fs.pathExists(filePath);
  if (!filePathExists) {
    _log(`File path  ${filePath} does not exist`);
  }
  return filePathExists;
}

export async function copyDirectory(sourceDir, backupDir) {

 _log(`Copying directory ${sourceDir} to ${backupDir}`);
 await fs.copy(sourceDir, backupDir, { overwrite: true });

}

export async function ensureDirectory(directoryPath) {

   _log(`Ensuring directory ${directoryPath} exists`);
   await fs.ensureDir(directoryPath);
}

export async function createWriteStream(streamPath) {

  _log(`Creating stream on path ${streamPath}`);
  return fs.createWriteStream(streamPath, { flags: 'a' });
}
