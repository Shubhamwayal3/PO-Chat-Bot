import { parseBusinessUtterance } from './nlu.js';

/** @deprecated prefer parseBusinessUtterance — kept as thin alias */
export function parseUtterance(text) {
  return parseBusinessUtterance(text);
}
