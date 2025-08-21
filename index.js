import express from 'express';
import bodyParser from 'body-parser';

import {_log, _error, setLogging} from './logging.js';
import { encodeBase64 } from './utils.js';
import { getGPTList, updateGPTList } from './gpt_manager.js';
import { getAuthConf, updateAuthConf, authAccessMiddleware, generatePassword } from './auth.js';
import { backupAndLogUpdate, ensureDataDirectories, ensureGPTFileDirectory } from './data.js';
import { readFromMemory, writeToMemory, clearMemory, writeToFile, deleteFile, checkPathExists } from './io.js';
import { getMemoryAccessParams, getFileAccessParams, getAdminGPTUpdateParams, getAdminGPTCreateParams, returnJSONResponse, returnErrorResponse } from './request_processor.js';

import configManager from  './config_drivers/config_manager.js';

const app = express();

const RESPONSE_CODES = configManager.RESPONSE_CODES;
const ACCESS_LEVELS = configManager.ACCESS_LEVELS;
const DATA_TYPES = configManager.DATA_TYPES;
const PORT = configManager.SERVER.PORT || 3000;
const URLS = configManager.URLS;

await setLogging();
await ensureDataDirectories();

app.use(authAccessMiddleware);
app.use(bodyParser.json());

app.get(URLS.USER_GPTS_LIST, async (req, res) => {
  try {
    const gptList = await getGPTList();
    const gptId = req.params.gptId;

    if (!gptList[gptId]) {
      return returnErrorResponse(res, `GPT ID '${gptId}' not found.`, RESPONSE_CODES.NOT_FOUND);
    }

    const { name, shared_memories = [], description } = gptList[gptId];

    const expandedSharedMemories = shared_memories
      .filter(id => gptList[id])
      .map(id => ({
        id,
        name: gptList[id].name
      }));

    returnJSONResponse(res, {
      name,
      shared_memories: expandedSharedMemories,
      description
    });

  } catch (error) {
    _error('Error listing GPTs:', error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.get(URLS.USER_MEMORY, async (req, res) => {
  const { user, gptId, memoryPath } = getMemoryAccessParams(req);

  _log(`${user} is fetching the memory for ${gptId} memory, file path is ${memoryPath}`);

  if (await checkPathExists(memoryPath)) {
    const data = await readFromMemory(memoryPath);
    returnJSONResponse(res, data);
  } else {
    returnJSONResponse(res, {});
  }
});

app.post(URLS.USER_MEMORY, async (req, res) => {
   const { user, gptId, memoryPath, memoryPayload } = getMemoryAccessParams(req);

  _log(`${user} sent update for ${gptId} memory, on file path ${memoryPath}:`, memoryPayload);

  let memoryData;
  try {
    memoryData = (typeof memoryPayload === 'object') ? memoryPayload : JSON.parse(memoryPayload);
  } catch (error) {
    _error(`Invalid memory data received when updating ${memoryPath}:`, error.message, 'Data is: ', memoryPayload);
    return returnErrorResponse(res, 'Invalid or malformed memory data received', RESPONSE_CODES.BAD_REQUEST );
  }

  try {
    await backupAndLogUpdate(user, memoryPath, memoryData, DATA_TYPES.MEMORY);
    await writeToMemory(memoryPath, memoryData);
    _log(`Memory updated successfully by ${user}`);
    returnJSONResponse(res, { message: 'Memory saved.' });
  } catch (error) {
    _error('Error updating user memory:', memoryPath, error.message, error.stack);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.delete(URLS.USER_MEMORY, async (req, res) => {
    const { user, gptId, memoryPath } = getMemoryAccessParams(req);

    _log(`${user} sent a deletion request for ${gptId} memory, on file path ${memoryPath}:`);
  try {
    const exists = await checkPathExists(memoryPath);
    if (!exists) {
      return returnErrorResponse(res, 'File not found.', RESPONSE_CODES.NOT_FOUND);
    }

    await backupAndLogUpdate(user, memoryPath, {}, DATA_TYPES.MEMORY);
    await clearMemory(memoryPath);

    returnJSONResponse(res, { message: 'Memory cleared (file retained).' });
  } catch (error) {
    _error('Error clearing memory file:', memoryPath, error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.get(URLS.USER_FILES, async (req, res) => {

  const {gptId, filename, filePath, user} = getFileAccessParams(req);

  _log(`${user} is fetching the file ${filename} for GPT ID ${gptId}, file path is ${filePath}`);

  try {
    if (!await checkPathExists(filePath)) {
      return returnErrorResponse(res, 'File not found.', RESPONSE_CODES.NOT_FOUND);
    }
    res.sendFile(filePath);
  } catch (error) {
    _error('User file retrieval failed:', error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.post(URLS.USER_FILES, async (req, res) => {

  const {gptId, filename, filePath, fileData, user} = getFileAccessParams(req);

  _log(`${user} is uploading file ${filename} for GPT ID ${gptId}, file path is ${filePath}`);

  try {
    await ensureGPTFileDirectory(filePath);
    if (!fileData) {
      _log("Unable to upload the user file, missing file content in request");
      return returnErrorResponse(res, 'Missing file content in request.', RESPONSE_CODES.BAD_REQUEST);
    }

    await backupAndLogUpdate(user, filePath, fileData, DATA_TYPES.FILE);
    await writeToFile(filePath, fileData);
    returnJSONResponse(res, { message: 'File uploaded successfully.' });
  } catch (error) {
    _error('Error updating user file:', filePath, error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.delete(URLS.USER_FILES, async (req, res) => {

  const {gptId, filename, filePath, user} = getFileAccessParams(req);

  _log(`${user} sent a deletion request for ${filename} file for GPT ID ${gptId}, file path is ${filePath}`);

  try {
    if (!await checkPathExists(filePath)) {
      return returnErrorResponse(res, 'File not found.', RESPONSE_CODES.NOT_FOUND);
    }

    await backupAndLogUpdate(user, filePath, {}, DATA_TYPES.FILE);
    await deleteFile(filePath);
    returnJSONResponse(res, { message: 'File deleted successfully.' });
  } catch (error) {
    _error('Error deleting user file:', filePath, error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.get(URLS.ADMIN_GPTS_LIST, async (req, res) => {
  try {
    const gptList = await getGPTList();

    if (!gptList) {
      return returnErrorResponse(res, 'Getting GPT list > GPT list not found.', RESPONSE_CODES.NOT_FOUND);
    }

    _log('Fetching all GPTs list for admin');

    const result = Object.entries(gptList).map(([id, gpt]) => ({
      id,
      name: gpt.name,
      description: gpt.description,
      shared_memories: (gpt.shared_memories || []).map(memId => gptList[memId]?.name || memId)
    }));

    returnJSONResponse(res, result);

  } catch (error) {
      _error('Error fetching all GPTs list:', error.message);
      return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.post(URLS.ADMIN_UPDATE_GPT, async (req, res) => {

  const { gptId, shared_memories, description, isValid } = getAdminGPTUpdateParams(req);
  if (!isValid) {
    return returnErrorResponse(res, 'shared_memories must be an array or the description must be set.', RESPONSE_CODES.BAD_REQUEST);
}

  try {
    const gptList = await getGPTList();

    if (!gptList) {
      return returnErrorResponse(res, 'Getting GPT list > GPT list not found.', RESPONSE_CODES.NOT_FOUND);
    }

    if (!gptList[gptId]) {
      return returnErrorResponse(res, 'GPT not found.', RESPONSE_CODES.NOT_FOUND);
    }

    if (Array.isArray(shared_memories)) {
      gptList[gptId].shared_memories = shared_memories;
    }

   if (description) {
      gptList[gptId].description = description;
   }

   let gptsUpdateSuccess = await updateGPTList(gptList);

   if (!gptsUpdateSuccess) {
     _error('Updating GPT list > GPT list not found.');
      return returnErrorResponse(res, 'GPTs list not found', RESPONSE_CODES.NOT_FOUND);
   }

   returnJSONResponse(res, { message: 'GPT updated successfully' });

  } catch (error) {
    _error(`Error updating shared memories for GPT with ID ${gptId || 'unknown'}:`, error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.post(URLS.ADMIN_CREATE_GPT, async (req, res) => {
  const { id, name, description, shared_memories, isValid } = getAdminGPTCreateParams(req);
  if (!isValid) {
    return returnErrorResponse(res, 'ID and name are required.', RESPONSE_CODES.BAD_REQUEST);
  }

  try {
    const gptList = await getGPTList();
    if (gptList[id]) {
      return returnErrorResponse(res, 'GPT ID already exists.', RESPONSE_CODES.BAD_REQUEST);
    }

    gptList[id] = { name, description, shared_memories, access_level: ACCESS_LEVELS.USER };
    let gptsUpdateSuccess = await updateGPTList(gptList);

    if (!gptsUpdateSuccess) {
      _error('Updating GPT list > GPT list not found.');
      return returnErrorResponse(res, 'GPTs list not found', RESPONSE_CODES.NOT_FOUND);
    }

    const password = generatePassword();
    const auth = await getAuthConf();
    if (auth === null) {
      _error('Auth config not found when trying to create a new GPT');
      return returnErrorResponse(res, 'Getting auth conf > Auth conf not found.', RESPONSE_CODES.NOT_FOUND);
    }

    _log('Fetched auth conf > Adding a new GPT to auth conf');
    auth.users.push(`${id}:${password}`);
    let authUpdateSuccess = await updateAuthConf(auth);
    if (!authUpdateSuccess) {
      _error('Auth config not updated when trying to create a new GPT');
      return returnErrorResponse(res, 'Updating auth conf > Auth conf not found.', RESPONSE_CODES.NOT_FOUND);
    }
    _log(`New GPT created with ID ${id}`);
    returnJSONResponse(res, { authString: encodeBase64(`${id}:${password}`) });
  } 
  catch (error) {
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.get(URLS.ADMIN_CREDENTIALS, async (req, res) => {
  const gptId = req.params.gptId;

  try {
    const auth = await getAuthConf();
    const userEntry = auth.users.find(entry => entry.startsWith(`${gptId}:`));

    if (!userEntry) {
      return returnErrorResponse(res, 'GPT ID not found in auth config.', RESPONSE_CODES.NOT_FOUND);
    }

    const encoded = Buffer.from(userEntry).toString('base64');
    returnJSONResponse(res, { authString: encoded });

  } catch (error) {
    _error('Admin failed to fetch encoded credentials:', error.message);
    return returnErrorResponse(res, 'Internal server error', RESPONSE_CODES.INTERNAL_SERVER_ERROR);
  }
});

app.listen(PORT, () => {
  _log(`Memory service running on http://localhost:${PORT}`);
});
