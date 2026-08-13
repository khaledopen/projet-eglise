const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Initialisation de la base de données...');
    await pool.query(sql);
    console.log('Base de données initialisée avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
};

initDb();
