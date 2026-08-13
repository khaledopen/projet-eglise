const bcrypt = require('bcryptjs');
const db = require('./db');

const seed = async () => {
  try {
    console.log('Début de l\'insertion des données de test...');

    // 1. S'assurer que les rôles existent (déjà fait par schema.sql, mais au cas où)
    const rolesRes = await db.query('SELECT * FROM roles');
    let adminRoleId;
    if (rolesRes.rows.length === 0) {
      const insRoles = await db.query(`
        INSERT INTO roles (nom, description) VALUES
        ('Membre', 'Membre de la communauté'),
        ('Responsable', 'Responsable de commission, CEB ou groupe'),
        ('Tresorier', 'Gestion financière et cotisations'),
        ('Secretaire', 'Validation des inscriptions et répertoire'),
        ('Administrateur', 'Tous les droits sur l''application')
        RETURNING id, nom
      `);
      adminRoleId = insRoles.rows.find(r => r.nom === 'Administrateur').id;
    } else {
      adminRoleId = rolesRes.rows.find(r => r.nom === 'Administrateur').id;
    }

    // 2. Créer l'administrateur par défaut
    const adminTelephone = '0102030405';
    const checkAdmin = await db.query('SELECT * FROM utilisateurs WHERE telephone = $1', [adminTelephone]);
    if (checkAdmin.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash('admin123', salt);
      
      const adminUser = await db.query(
        'INSERT INTO utilisateurs (telephone, mot_de_passe, role_id) VALUES ($1, $2, $3) RETURNING id',
        [adminTelephone, hashedPass, adminRoleId]
      );

      // Créer la fiche membre correspondante pour l'admin
      await db.query(`
        INSERT INTO membres (nom, prenoms, telephone_principal, situation_matrimoniale, baptise, statut, utilisateur_id, consentement_rgpd, numero_membre)
        VALUES ('Admin', 'Eglise', $1, 'Célibataire', true, 'actif', $2, true, 'M-2026-0001')
      `, [adminTelephone, adminUser.rows[0].id]);
      
      console.log('Administrateur par défaut créé : Téléphone = 0102030405, Mot de passe = admin123');
    }

    // 3. Insérer quelques CEB par défaut
    const cebs = ['Sainte Famille', 'Saint Jean-Baptiste', 'Notre-Dame de la Paix', 'Saint Joseph'];
    for (const c of cebs) {
      await db.query('INSERT INTO ceb (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING', [c]);
    }

    // 4. Insérer quelques Commissions par défaut
    const comms = ['Liturgie', 'Catéchèse', 'Finance', 'Communication', 'Oeuvres Sociales'];
    for (const c of comms) {
      await db.query('INSERT INTO commissions (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING', [c]);
    }

    // 5. Insérer quelques Groupes par défaut
    const grps = ['Chorale Saint-Augustin', 'Jeunesse Catholique', 'Légion de Marie', 'Modération'];
    for (const g of grps) {
      await db.query('INSERT INTO groupes (nom) VALUES ($1) ON CONFLICT (nom) DO NOTHING', [g]);
    }

    // 6. Insérer la cotisation mensuelle pour 2026
    await db.query(`
      INSERT INTO cotisations_mensuelles (annee, montant_normal, montant_reduit, date_limite)
      VALUES (2026, 2000, 1000, '2026-12-31')
      ON CONFLICT (annee) DO NOTHING
    `);

    console.log('Données initiales insérées avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du seeding:', error);
    process.exit(1);
  }
};

seed();
