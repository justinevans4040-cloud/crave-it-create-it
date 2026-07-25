import { handleRequest } from '../services/api/server.mjs';

export default async function handler(req, res) {
  await handleRequest(req, res);
}
