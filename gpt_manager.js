import configManager from "./config_drivers/config_manager.js";
import { _log, _error } from "./logging.js";
import { getBaseDir, readFromConf, writeToConf, checkPathExists } from './io.js';
import path from "path";

const PATHS = configManager.PATHS;

export async function getGPTList() {

  // getting the list of GPTs with roles and the list of shared memories

 _log('Retrieving a GPT list');

  const gptListPath = path.join(getBaseDir(), PATHS.GPTS_FILE);
  if (!(await checkPathExists(gptListPath))) {
    _error('GPT list path not found');
    return null;
  }

  const gptList = await readFromConf(gptListPath);
  return gptList;
}

export async function updateGPTList(content) {

    // this is used for a new GPT addition by admin

    _log('Updating a GPT list');

    const gptListPath = path.join(getBaseDir(), PATHS.GPTS_FILE);
    if (!(await checkPathExists(gptListPath))) {
     _error('GPT list path not found');
     return false;
    }
    else {
      await writeToConf(gptListPath, content);
     _log('GPT list updated successfully');
      return true;
    }
}
