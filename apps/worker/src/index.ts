import dotenv from 'dotenv';
import path from 'path';


// Load .env.local first (if present), then default .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });