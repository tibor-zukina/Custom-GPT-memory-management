import { readFromFile } from  '../io.js';

const configuration = JSON.parse(
  await readFromFile('./config/configuration.json')
);

const PATHS = configuration.paths;
const OPERATIONS = configuration.operations;
const RESPONSE_CODES = configuration.responseCodes;
const SERVER = configuration.server;
const ACCESS_LEVELS = configuration.accessLevels;
const URLS = configuration.urls;
const DATA_TYPES = configuration.data_types;

export default {
  PATHS,
  OPERATIONS,
  RESPONSE_CODES,
  SERVER,
  ACCESS_LEVELS,
  URLS,
  DATA_TYPES
};



