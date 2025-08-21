import configManager from  './config_drivers/config_manager.js';
import { _log, _error } from './logging.js';
import { getGPTList } from './gpt_manager.js';
import { extractUrlParams } from './utils.js';
import { getBaseDir, writeToConf, checkPathExists, readFromFile } from './io.js';

import path from 'path';

const OPERATIONS = configManager.OPERATIONS;
const ACCESS_LEVELS = configManager.ACCESS_LEVELS;
const RESPONSE_CODES = configManager.RESPONSE_CODES;
const PATHS = configManager.PATHS;


export async function authAccessMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const authConf = await getAuthConf();
  const AUTH_USERS = authConf?.users || [];

  _log(`GPT memory endpoint call attempt for ${req.method} ${req.originalUrl}`);

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm=\"Memory API\"');
    return res.status(RESPONSE_CODES.UNAUTHORIZED).send('Authentication required.');
  }

  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64')
    .toString()
    .split(':');

  const authKey = `${user}:${pass}`;

  if (!AUTH_USERS.includes(authKey)) {
    _log(`Not matching auth key found for the user ${user}`);
    return res.status(RESPONSE_CODES.FORBIDDEN).send('Forbidden');
  }

  req.authUser = user;

  const accessPermitted = await isAccessPermitted(extractUrlParams(req.path), req.authUser, req.method, req.path);

  if (!accessPermitted) {
    _log(`User ${req.authUser} is not allowed to execute ${req.method} ${req.originalUrl} `);
    return res.status(RESPONSE_CODES.FORBIDDEN).send('Forbidden');
  }

  _log(`GPT memory endpoint call success  - User: ${user}, Path: ${req.method} ${req.originalUrl}`);
  next();
}

export async function isAccessPermitted({gptId, filename}, user, operation, path) {

  if (!Object.values(OPERATIONS).includes(operation)) {
    _log(`${operation} is not a valid access operation`);
    return false;  // nobody can execture an invalid operation
  }

  const config = await getGPTList();
  const userConf = config[user];

  if (!userConf) {
   _log(`User ${user} is not found when trying to do ${operation} ${path} with gptID ${gptId || "unknown"} and filename ${filename || "unknown"}`);
    return false; // user is not found

  }

  const userRole = userConf?.access_level || ACCESS_LEVELS.USER;

  if (path.startsWith(PATHS.ADMIN_PATH)) {

   return (userRole === ACCESS_LEVELS.ADMIN);
   // only admin has access  to admin routes
  }

  else if (path.startsWith(PATHS.GPTS_PATH)) {

   return (user === gptId); // user can only access details of its own GPT
  }
  else if (path.startsWith(PATHS.MEMORY_PATH) || path.startsWith(PATHS.FILE_PATH)) {

    _log(`User ${user} is trying to access the memory or file: ${operation} ${path} with gptID ${gptId || "unknown"} and filename ${filename || "unknown"}`);
    if (user === gptId) {
      _log(`User ${user} is the owner and has the permission to execute the operation`);
      return true; // User is the owner
    }
    else if (operation === OPERATIONS.DELETE) {

      _log(`User ${user} is not the owner and has no permission to delete the file`);
      return false;  // If the user is not the owner, he can not delete
    }

    return userConf.shared_memories.includes(gptId); // check if user has access to the owner's memory
  }
  else {

    _log(`User ${user} is trying to access the path ${path} which is not valid`); // this is not the valid path
    return false;
  }
};

export function generatePassword(length = 15) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}


export async function getAuthConf() {

  const authConfPath = path.join(getBaseDir(), PATHS.AUTH_FILE);
  if (!(await checkPathExists(authConfPath))) {
    _error(`Auth conf not found on ${PATHS.AUTH_FILE}`); 
    return null;
  }

  const authConf = await readFromFile(authConfPath);
  return JSON.parse(authConf);

}

export async function updateAuthConf(content) {

    // this is used for a new GPT addition by admin
    const authConfPath = path.join(getBaseDir(), PATHS.AUTH_FILE);
    if (!(await checkPathExists(authConfPath))) {
      return false;
    }
    else {
      await writeToConf(authConfPath, content);
      return true;
    }
}
