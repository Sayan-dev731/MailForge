import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const CERTIFICATES_DIR = path.join(__dirname, '..', 'certificates');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Database files
const DB_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    campaigns: path.join(DATA_DIR, 'campaigns.json'),
    settings: path.join(DATA_DIR, 'settings.json'),
};

// Initialize database
export function initializeDatabase() {
    // Create directories
    [DATA_DIR, UPLOADS_DIR, CERTIFICATES_DIR, LOGS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Initialize JSON files
    Object.entries(DB_FILES).forEach(([name, file]) => {
        if (!fs.existsSync(file)) {
            const initialData = name === 'users' ? [] : name === 'campaigns' ? [] : {};
            fs.writeFileSync(file, JSON.stringify(initialData, null, 2));
        }
    });

    console.log('✅ Database initialized');
}

// Read from database
export function readDB(dbName) {
    try {
        const file = DB_FILES[dbName];
        if (!fs.existsSync(file)) {
            return dbName === 'settings' ? {} : [];
        }
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${dbName}:`, error);
        return dbName === 'settings' ? {} : [];
    }
}

// Write to database
export function writeDB(dbName, data) {
    try {
        const file = DB_FILES[dbName];
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${dbName}:`, error);
        return false;
    }
}

// Add item to database
export function addToDB(dbName, item) {
    const data = readDB(dbName);
    data.push(item);
    return writeDB(dbName, data);
}

// Update item in database
export function updateInDB(dbName, id, updates) {
    const data = readDB(dbName);
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        return writeDB(dbName, data);
    }
    return false;
}

// Delete from database
export function deleteFromDB(dbName, id) {
    const data = readDB(dbName);
    const filtered = data.filter(item => item.id !== id);
    return writeDB(dbName, filtered);
}

// Find in database
export function findInDB(dbName, query) {
    const data = readDB(dbName);
    return data.find(item => {
        return Object.entries(query).every(([key, value]) => item[key] === value);
    });
}
