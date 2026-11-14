import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load backend/.env relative to this file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Fallback to current working directory .env if any
dotenv.config();

export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-min-32-chars-long';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export default {
  PORT,
  NODE_ENV,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  FRONTEND_URL,
};
