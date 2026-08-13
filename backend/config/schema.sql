-- Schéma de base de données PostgreSQL pour l'application EGLISE

-- Suppression des tables si elles existent (ordre respectant les clés étrangères)
DROP TABLE IF EXISTS journal_activites CASCADE;
DROP TABLE IF EXISTS parametres CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS recus CASCADE;
DROP TABLE IF EXISTS contributions_exceptionnelles CASCADE;
DROP TABLE IF EXISTS membres_groupes_collecte CASCADE;
DROP TABLE IF EXISTS groupes_collecte CASCADE;
DROP TABLE IF EXISTS collectes_exceptionnelles CASCADE;
DROP TABLE IF EXISTS annulations_paiements CASCADE;
DROP TABLE IF EXISTS details_paiements CASCADE;
DROP TABLE IF EXISTS paiements CASCADE;
DROP TABLE IF EXISTS cotisations_mensuelles CASCADE;
DROP TABLE IF EXISTS paroles_du_jour CASCADE;
DROP TABLE IF EXISTS destinataires_annonces CASCADE;
DROP TABLE IF EXISTS annonces CASCADE;
DROP TABLE IF EXISTS membre_groupes CASCADE;
DROP TABLE IF EXISTS groupes CASCADE;
DROP TABLE IF EXISTS membre_commissions CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS membres CASCADE;
DROP TABLE IF EXISTS ceb CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 1. Table des Rôles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL, -- 'Membre', 'Responsable', 'Tresorier', 'Secretaire', 'Administrateur'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les rôles par défaut
INSERT INTO roles (nom, description) VALUES
('Membre', 'Membre de la communauté'),
('Responsable', 'Responsable de commission, CEB ou groupe'),
('Tresorier', 'Gestion financière et cotisations'),
('Secretaire', 'Validation des inscriptions et répertoire'),
('Administrateur', 'Tous les droits sur l''application');

-- 2. Table des Utilisateurs (pour la connexion)
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    telephone VARCHAR(20) UNIQUE NOT NULL, -- Identifiant unique de connexion
    mot_de_passe VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    dernier_acces TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des CEB (Communautés Ecclésiales de Base)
CREATE TABLE ceb (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des Membres
CREATE TYPE statut_membre AS ENUM ('en attente', 'actif', 'refusé', 'en sommeil', 'archivé');

CREATE TABLE membres (
    id SERIAL PRIMARY KEY,
    numero_membre VARCHAR(50) UNIQUE, -- Généré automatiquement (ex: M-2026-0001)
    nom VARCHAR(100) NOT NULL,
    prenoms VARCHAR(100) NOT NULL,
    telephone_principal VARCHAR(20) UNIQUE NOT NULL,
    telephone_whatsapp VARCHAR(20),
    email VARCHAR(100),
    situation_matrimoniale VARCHAR(50) NOT NULL, -- Célibataire, Marié, Veuf, Divorcé
    type_mariage VARCHAR(50), -- Coutumier, Civil, Religieux
    baptise BOOLEAN DEFAULT FALSE,
    date_bapteme DATE,
    paroisse_bapteme VARCHAR(150),
    date_naissance DATE,
    quartier_residence VARCHAR(100),
    photo_url VARCHAR(255),
    ceb_id INTEGER REFERENCES ceb(id) ON DELETE SET NULL,
    statut statut_membre DEFAULT 'en attente',
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    consentement_rgpd BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des Commissions
CREATE TABLE commissions (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison Membre <-> Commissions (Max 3 commissions géré par trigger/code applicatif)
CREATE TABLE membre_commissions (
    membre_id INTEGER REFERENCES membres(id) ON DELETE CASCADE,
    commission_id INTEGER REFERENCES commissions(id) ON DELETE CASCADE,
    PRIMARY KEY (membre_id, commission_id)
);

-- 6. Table des Groupes et Associations
CREATE TABLE groupes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison Membre <-> Groupes
CREATE TABLE membre_groupes (
    membre_id INTEGER REFERENCES membres(id) ON DELETE CASCADE,
    groupe_id INTEGER REFERENCES groupes(id) ON DELETE CASCADE,
    PRIMARY KEY (membre_id, groupe_id)
);

-- 7. Table des Annonces
CREATE TABLE annonces (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    texte TEXT NOT NULL,
    image_url VARCHAR(255),
    date_publication TIMESTAMP WITH TIME ZONE NOT NULL,
    date_expiration TIMESTAMP WITH TIME ZONE NOT NULL,
    urgent BOOLEAN DEFAULT FALSE,
    epingler BOOLEAN DEFAULT FALSE,
    auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison pour cibler le public de l'annonce
CREATE TABLE destinataires_annonces (
    id SERIAL PRIMARY KEY,
    annonce_id INTEGER REFERENCES annonces(id) ON DELETE CASCADE,
    type_destinataire VARCHAR(50) NOT NULL, -- 'public', 'ceb', 'commission', 'groupe'
    cible_id INTEGER -- ID de la CEB, commission ou groupe ciblé (NULL si public)
);

-- 8. Table de la Parole du Jour
CREATE TABLE paroles_du_jour (
    id SERIAL PRIMARY KEY,
    date_liturgique DATE UNIQUE NOT NULL,
    saint_du_jour VARCHAR(150),
    references_lectures TEXT,
    textes_lectures TEXT,
    evangile TEXT NOT NULL,
    meditation TEXT NOT NULL,
    intention_priere TEXT,
    auteur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Table des Paramètres de Cotisations Mensuelles
CREATE TABLE cotisations_mensuelles (
    id SERIAL PRIMARY KEY,
    annee INTEGER NOT NULL,
    montant_normal NUMERIC(12, 2) NOT NULL,
    montant_reduit NUMERIC(12, 2) NOT NULL, -- Étudiants, jeunes, cas sociaux
    date_limite DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (annee)
);

-- 10. Table des Paiements (Suivi des cotisations)
CREATE TABLE paiements (
    id SERIAL PRIMARY KEY,
    membre_id INTEGER REFERENCES membres(id) ON DELETE RESTRICT,
    montant_total NUMERIC(12, 2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL, -- Espèces, Mobile Money, GeniusPay, etc.
    reference_transaction VARCHAR(100),
    date_paiement TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enregistre_par INTEGER REFERENCES utilisateurs(id) ON DELETE RESTRICT,
    observation TEXT,
    statut VARCHAR(50) DEFAULT 'valide' -- 'valide', 'annule'
);

-- Détail du paiement par mois
CREATE TABLE details_paiements (
    id SERIAL PRIMARY KEY,
    paiement_id INTEGER REFERENCES paiements(id) ON DELETE CASCADE,
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL, -- 1 à 12
    montant_attribue NUMERIC(12, 2) NOT NULL,
    type_tarif VARCHAR(20) DEFAULT 'normal' -- 'normal', 'reduit'
);

-- Table des Annulations de Paiements (Écritures inverses)
CREATE TABLE annulations_paiements (
    id SERIAL PRIMARY KEY,
    paiement_id INTEGER REFERENCES paiements(id) ON DELETE RESTRICT,
    date_annulation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    motif TEXT NOT NULL,
    annule_par INTEGER REFERENCES utilisateurs(id) ON DELETE RESTRICT
);

-- 11. Table des Collectes Exceptionnelles
CREATE TABLE collectes_exceptionnelles (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    motif TEXT NOT NULL,
    description TEXT,
    objectif_financier NUMERIC(12, 2),
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    repartition_mode VARCHAR(50) NOT NULL, -- 'manuel', 'automatique_age', 'automatique_statut', 'choix_membre'
    statut VARCHAR(20) DEFAULT 'actif', -- 'actif', 'cloture'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Groupes de contributeurs pour la collecte
CREATE TABLE groupes_collecte (
    id SERIAL PRIMARY KEY,
    collecte_id INTEGER REFERENCES collectes_exceptionnelles(id) ON DELETE CASCADE,
    nom_groupe VARCHAR(100) NOT NULL,
    montant_attendu NUMERIC(12, 2) NOT NULL
);

-- Liaison Membre <-> Groupe de collecte
CREATE TABLE membres_groupes_collecte (
    membre_id INTEGER REFERENCES membres(id) ON DELETE CASCADE,
    groupe_collecte_id INTEGER REFERENCES groupes_collecte(id) ON DELETE CASCADE,
    PRIMARY KEY (membre_id, groupe_collecte_id)
);

-- Contributions aux collectes exceptionnelles
CREATE TABLE contributions_exceptionnelles (
    id SERIAL PRIMARY KEY,
    collecte_id INTEGER REFERENCES collectes_exceptionnelles(id) ON DELETE RESTRICT,
    membre_id INTEGER REFERENCES membres(id) ON DELETE RESTRICT,
    montant NUMERIC(12, 2) NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL,
    reference_transaction VARCHAR(100),
    date_contribution TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    enregistre_par INTEGER REFERENCES utilisateurs(id) ON DELETE RESTRICT
);

-- 12. Table des Reçus
CREATE TABLE recus (
    id SERIAL PRIMARY KEY,
    numero_recu VARCHAR(50) UNIQUE NOT NULL, -- ex: REC-2026-00001
    paiement_id INTEGER REFERENCES paiements(id) ON DELETE SET NULL,
    contribution_id INTEGER REFERENCES contributions_exceptionnelles(id) ON DELETE SET NULL,
    pdf_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Table des Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    destinataire_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    lu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Table des Paramètres de l'application
CREATE TABLE parametres (
    id SERIAL PRIMARY KEY,
    cle VARCHAR(100) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des paramètres par défaut
INSERT INTO parametres (cle, valeur, description) VALUES
('heure_notification_quotidienne', '07:00', 'Heure de notification de la Parole du Jour'),
('geniuspay_simuler', 'true', 'Simuler les transactions GeniusPay sans API réelle');

-- 15. Table du Journal d'Activité
CREATE TABLE journal_activites (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'connexion', 'creation_membre', 'validation_membre', etc.
    element_concerne VARCHAR(100), -- nom de la table ou entité modifiée
    ancienne_valeur JSONB,
    nouvelle_valeur JSONB,
    adresse_ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour optimiser les performances de recherche
CREATE INDEX idx_membres_nom_prenom ON membres(nom, prenoms);
CREATE INDEX idx_membres_telephone ON membres(telephone_principal);
CREATE INDEX idx_membres_statut ON membres(statut);
CREATE INDEX idx_paiements_membre ON paiements(membre_id);
CREATE INDEX idx_details_paiements_annee_mois ON details_paiements(annee, mois);
CREATE INDEX idx_journal_action ON journal_activites(action);
