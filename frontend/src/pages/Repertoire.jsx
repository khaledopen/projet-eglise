import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Search, UserCheck, UserX, FileSpreadsheet, FileText, CheckCircle, XCircle } from 'lucide-react';

const Repertoire = () => {
  const { user } = useAuth();
  
  // États répertoire
  const [membres, setMembres] = useState([]);
  const [stats, setStats] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [cebFiltre, setCebFiltre] = useState('');
  const [comFiltre, setComFiltre] = useState('');
  const [statutFiltre, setStatutFiltre] = useState('actif'); // Par défaut les membres actifs

  // Fiches en attente (Secrétaire / Admin)
  const [membresAttente, setMembresAttente] = useState([]);
  const [ongletActif, setOngletActif] = useState('repertoire'); // 'repertoire' ou 'attente'

  // Fiche détaillée sélectionnée
  const [membreSelectionne, setMembreSelectionne] = useState(null);

  const estPrivilegie = ['Secretaire', 'Administrateur'].includes(user?.role);

  useEffect(() => {
    chargerRepertoire();
    if (estPrivilegie) {
      chargerAttente();
    }
  }, [recherche, cebFiltre, comFiltre, statutFiltre]);

  const chargerRepertoire = async () => {
    try {
      const qParams = [];
      if (recherche) qParams.push(`recherche=${recherche}`);
      if (cebFiltre) qParams.push(`ceb_id=${cebFiltre}`);
      if (comFiltre) qParams.push(`commission_id=${comFiltre}`);
      if (estPrivilegie && statutFiltre) qParams.push(`statut=${statutFiltre}`);

      const queryStr = qParams.length > 0 ? `?${qParams.join('&')}` : '';
      const res = await API.get(`/membres${queryStr}`);
      setMembres(res.data.membres);
      setStats(res.data.statistiques);
    } catch (err) {
      console.error('Erreur chargement répertoire:', err);
    }
  };

  const chargerAttente = async () => {
    try {
      const res = await API.get('/membres/attente');
      setMembresAttente(res.data);
    } catch (err) {
      console.error('Erreur chargement attente:', err);
    }
  };

  const handleValidation = async (id, statut, motif = '') => {
    try {
      await API.post(`/membres/valider/${id}`, { statut, motif });
      alert(`Fiche membre mise à jour : ${statut}`);
      chargerRepertoire();
      chargerAttente();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors du traitement.');
    }
  };

  const handleVoirFiche = async (id) => {
    try {
      const res = await API.get(`/membres/details/${id}`);
      setMembreSelectionne(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center bg-white bg-opacity-90 p-4 rounded-xl shadow-sm border border-stone-200">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-800">Répertoire Officiel</h2>
          <p className="text-sm text-stone-500 font-medium">Gestion et recherche des membres de la communauté</p>
        </div>
      </div>

      {/* Onglets Secrétaire / Admin */}
      {estPrivilegie && (
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setOngletActif('repertoire')}
            className={`py-2 px-4 font-bold text-base border-b-2 transition ${
              ongletActif === 'repertoire'
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-stone-600 hover:text-stone-800'
            }`}
          >
            Répertoire Officiel ({membres.length})
          </button>
          <button
            onClick={() => setOngletActif('attente')}
            className={`py-2 px-4 font-bold text-base border-b-2 transition flex items-center ${
              ongletActif === 'attente'
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-stone-600 hover:text-stone-800'
            }`}
          >
            Inscriptions en attente
            {membresAttente.length > 0 && (
              <span className="ml-1.5 bg-red-800 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                {membresAttente.length}
              </span>
            )}
          </button>
        </div>
      )}

      {ongletActif === 'repertoire' ? (
        <div className="space-y-6">
          {/* Outils de recherche et de filtrage */}
          <div className="bg-stone-50 bg-opacity-95 p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Barre de recherche */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, téléphone..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300 text-lg bg-white"
                />
              </div>

              {/* CEB et Commission filtres */}
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <select
                  value={cebFiltre}
                  onChange={(e) => setCebFiltre(e.target.value)}
                  className="p-3 border rounded-lg font-semibold text-stone-700 bg-white text-base focus:outline-none flex-1 md:w-44"
                >
                  <option value="">Toutes les CEB</option>
                  <option value="1">Sainte Famille</option>
                  <option value="2">Saint Jean-Baptiste</option>
                  <option value="3">Notre-Dame de la Paix</option>
                  <option value="4">Saint Joseph</option>
                </select>

                <select
                  value={comFiltre}
                  onChange={(e) => setComFiltre(e.target.value)}
                  className="p-3 border rounded-lg font-semibold text-stone-700 bg-white text-base focus:outline-none flex-1 md:w-44"
                >
                  <option value="">Toutes les commissions</option>
                  <option value="1">Liturgie</option>
                  <option value="2">Catéchèse</option>
                  <option value="3">Finance</option>
                  <option value="4">Communication</option>
                  <option value="5">Oeuvres Sociales</option>
                </select>

                {estPrivilegie && (
                  <select
                    value={statutFiltre}
                    onChange={(e) => setStatutFiltre(e.target.value)}
                    className="p-3 border rounded-lg font-semibold text-stone-700 bg-white text-base focus:outline-none flex-1 md:w-40"
                  >
                    <option value="actif">Actifs</option>
                    <option value="en sommeil">En sommeil</option>
                    <option value="refusé">Refusés</option>
                    <option value="archivé">Archivés</option>
                  </select>
                )}
              </div>
            </div>

            {/* Boutons d'export */}
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => alert('Exportation Excel en cours...')}
                className="flex items-center space-x-1.5 bg-green-50 hover:bg-green-100 border border-green-300 text-green-800 font-bold px-3 py-1.5 rounded text-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={() => alert('Exportation PDF en cours...')}
                className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 border border-red-300 text-red-800 font-bold px-3 py-1.5 rounded text-sm transition"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Statistiques rapides */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                <p className="text-xs text-stone-500 font-extrabold uppercase">Effectif total actif</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{stats.effectif_total_actif}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-xs text-stone-500 font-extrabold uppercase text-center">Breakdown par CEB</p>
                <div className="text-xs text-stone-600 mt-2 space-y-1">
                  {stats.par_ceb.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between font-medium">
                      <span>{c.nom}</span>
                      <span className="font-bold">{c.total}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border shadow-sm hidden md:block">
                <p className="text-xs text-stone-500 font-extrabold uppercase text-center">Breakdown par Commission</p>
                <div className="text-xs text-stone-600 mt-2 space-y-1">
                  {stats.par_commission.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex justify-between font-medium">
                      <span>{c.nom}</span>
                      <span className="font-bold">{c.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Liste des membres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {membres.length === 0 ? (
              <div className="col-span-full bg-white bg-opacity-95 p-8 rounded-xl border text-center text-stone-500">
                Aucun membre trouvé dans le répertoire avec ces filtres.
              </div>
            ) : (
              membres.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleVoirFiche(m.id)}
                  className="bg-stone-50 bg-opacity-95 p-4 rounded-2xl border border-stone-200 shadow-sm cursor-pointer hover:shadow-md transition flex space-x-3 items-center"
                >
                  <div className="w-14 h-14 bg-stone-200 rounded-full flex items-center justify-center font-black text-stone-600 text-lg uppercase">
                    {m.nom.charAt(0)}{m.prenoms.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-stone-800 text-base truncate">{m.nom} {m.prenoms}</h4>
                    <p className="text-xs text-blue-500 font-bold">{m.numero_membre || 'Sans numéro'}</p>
                    <p className="text-xs text-stone-600 mt-1 font-semibold">CEB: {m.ceb_nom || 'N/A'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Inscriptions en attente */
        <div className="space-y-4">
          {membresAttente.length === 0 ? (
            <div className="bg-white bg-opacity-95 p-8 rounded-xl border text-center text-stone-500">
              Aucune inscription en attente de validation.
            </div>
          ) : (
            membresAttente.map((m) => (
              <div
                key={m.id}
                className="bg-stone-50 bg-opacity-95 p-4 rounded-2xl border border-stone-200 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <h4 className="font-black text-stone-800 text-lg">{m.nom} {m.prenoms}</h4>
                  <p className="text-sm text-stone-600 font-semibold mt-1">
                    Téléphone: <strong className="text-stone-800">{m.telephone_principal}</strong> | CEB: <strong>{m.ceb_nom || 'Non spécifié'}</strong>
                  </p>
                  <p className="text-xs text-stone-500 mt-1">Mariage: {m.situation_matrimoniale} | Baptisé: {m.baptise ? 'Oui' : 'Non'}</p>
                </div>
                <div className="flex space-x-2 w-full md:w-auto">
                  <button
                    onClick={() => handleValidation(m.id, 'actif')}
                    className="flex-1 md:flex-none flex items-center justify-center space-x-1 bg-green-100 hover:bg-green-200 border border-green-400 text-green-800 font-bold px-4 py-2.5 rounded-lg text-sm transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Valider</span>
                  </button>
                  <button
                    onClick={() => {
                      const motif = prompt('Motif du refus :');
                      if (motif) handleValidation(m.id, 'refusé', motif);
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center space-x-1 bg-red-100 hover:bg-red-200 border border-red-400 text-red-800 font-bold px-4 py-2.5 rounded-lg text-sm transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Refuser</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Drawer / Modal Détails Fiche Membre */}
      {membreSelectionne && (
        <div className="fixed inset-0 bg-stone-900 bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setMembreSelectionne(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 text-2xl font-bold"
            >
              &times;
            </button>
            
            <div className="flex items-center space-x-4 border-b pb-4">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl">
                {membreSelectionne.nom.charAt(0)}{membreSelectionne.prenoms.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-stone-800">{membreSelectionne.nom} {membreSelectionne.prenoms}</h3>
                <p className="text-sm text-blue-600 font-bold tracking-wide">{membreSelectionne.numero_membre}</p>
                <p className="text-xs text-stone-500 font-medium">Statut : <span className="font-extrabold text-blue-500 capitalize">{membreSelectionne.statut}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm leading-relaxed text-stone-700">
              <div>
                <p className="font-bold text-stone-500 text-2xs uppercase">Téléphone</p>
                <p className="font-semibold text-stone-800">{membreSelectionne.telephone_principal}</p>
              </div>
              <div>
                <p className="font-bold text-stone-500 text-2xs uppercase">CEB</p>
                <p className="font-semibold text-stone-800">{membreSelectionne.ceb_nom || 'N/A'}</p>
              </div>
              <div>
                <p className="font-bold text-stone-500 text-2xs uppercase">Situation Matrimoniale</p>
                <p className="font-semibold text-stone-800">{membreSelectionne.situation_matrimoniale}</p>
              </div>
              <div>
                <p className="font-bold text-stone-500 text-2xs uppercase">Baptisé</p>
                <p className="font-semibold text-stone-800">{membreSelectionne.baptise ? 'Oui' : 'Non'}</p>
              </div>
              {membreSelectionne.date_naissance && (
                <div>
                  <p className="font-bold text-stone-500 text-2xs uppercase">Né(e) le</p>
                  <p className="font-semibold text-stone-800">{new Date(membreSelectionne.date_naissance).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              {membreSelectionne.quartier_residence && (
                <div>
                  <p className="font-bold text-stone-500 text-2xs uppercase">Quartier</p>
                  <p className="font-semibold text-stone-800">{membreSelectionne.quartier_residence}</p>
                </div>
              )}
            </div>

            {/* Historique Financier (uniquement si disponible pour l'utilisateur connecté) */}
            {membreSelectionne.historiqueFinancier ? (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-bold text-stone-800 text-base">Historique des cotisations récentes</h4>
                {membreSelectionne.historiqueFinancier.cotisations.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">Aucune cotisation enregistrée.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2 bg-stone-50">
                    {membreSelectionne.historiqueFinancier.cotisations.slice(0, 5).map((cot, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span className="font-semibold text-stone-700">Mois {cot.mois}/{cot.annee} ({cot.mode_paiement})</span>
                        <span className="font-bold text-stone-800">{cot.montant_attribue} FCFA</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-stone-50 p-3 rounded border text-center text-xs text-stone-500 italic">
                Informations financières confidentielles.
              </div>
            )}

            <button
              onClick={() => setMembreSelectionne(null)}
              className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300 font-bold py-2.5 px-4 rounded-lg transition"
            >
              Fermer la fiche
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Repertoire;
