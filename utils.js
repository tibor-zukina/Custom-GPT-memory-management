import { _log } from './logging.js';
import configManager from  './config_drivers/config_manager.js';

const URLS = configManager.URLS;

export function extractUrlParams(inputPath) {
    _log(`Input path: ${inputPath}`);

    for (const [key, pattern] of Object.entries(URLS)) {
      const paramNames = [];
      const regexPattern = pattern.replace(/:([^\/]+)/g, (_, param) => {
        paramNames.push(param);
        return '([^/]+)';
      }).replace(/\/$/, ''); // normalize trailing slash

      const regex = new RegExp(`^${regexPattern}$`);
      const match = inputPath.replace(/\/$/, '').match(regex);

      if (match) {
        const values = match.slice(1);
        const params = {};
        paramNames.forEach((name, idx) => {
          params[name] = values[idx];
        });
        return params;
      }
    }
    return {};
}

export function encodeBase64(str) {
  return Buffer.from(str).toString('base64');
}
