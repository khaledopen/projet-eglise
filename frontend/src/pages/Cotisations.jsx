import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { DollarSign, Printer, Plus, AlertCircle, XCircle } from 'lucide-react';

const Cotisations = () => {
  const { user } = useAuth();
  
  // États principaux
  const [membreIdCible, setMembreIdCible] = useState('');
  const [anneeCible, setAnneeCible] = useState(new Date().getFullYear());
  const [membres, setMembres] = useState([]);
  const [gridPaye, setGridPaye] = useState(null);
  
  const [collectes, setCollectes] = useState([]);
  
  // Modals / Formulaires
  const [showPayForm, setShowPayForm] = useState(false);
  const [showCollecteForm, setShowCollecteForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [paiementIdAnnulation, setPaiementIdAnnulation] = useState('');
  const [motifAnnulation, setMotifAnnulation] = useState('');

  // Formulaire d'enregistrement cotisation
  const [payFormData, setPayFormData] = useState({
    membre_id: '',
    annee: new Date().getFullYear(),
    mois_list: [],
    montant_total: '',
    mode_paiement: 'Espèces',
    reference_transaction: '',
    observation: ''
  });

  // Formulaire contribution exceptionnelle
  const [contribFormData, setContribFormData] = useState({
    collecte_id: '',
    membre_id: '',
    montant: '',
    mode_paiement: 'Espèces',
    reference_transaction: ''
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const estPersonnel = user?.role === 'Membre';
  const estTresorierOuAdmin = ['Tresorier', 'Administrateur'].includes(user?.role);

  useEffect(() => {
    if (estPersonnel && user?.membre?.id) {
      setMembreIdCible(user.membre.id);
    } else if (estTresorierOuAdmin) {
      chargerMembres();
      chargerCollectes();
    }
  }, [user]);

  useEffect(() => {
    if (membreIdCible) {
      chargerGridAnnuel();
    }
  }, [membreIdCible, anneeCible]);

  const chargerMembres = async () => {
    try {
      const res = await API.get('/membres');
      setMembres(res.data.membres);
    } catch (err) {
      console.error(err);
    }
  };

  const chargerCollectes = async () => {
    try {
      const res = await API.get('/finance/collectes');
      setCollectes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const chargerGridAnnuel = async () => {
    setError('');
    try {
      const res = await API.get(`/finance/membre/annuel?membre_id=${membreIdCible}&annee=${anneeCible}`);
      setGridPaye(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des cotisations.');
      setGridPaye(null);
    }
  };

  const handleMoisSelect = (mois) => {
    const isSelected = payFormData.mois_list.includes(mois);
    if (isSelected) {
      setPayFormData(prev => ({
        ...prev,
        mois_list: prev.mois_list.filter(m => m !== mois)
      }));
    } else {
      setPayFormData(prev => ({
        ...prev,
        mois_list: [...prev.mois_list, mois]
      }));
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await API.post('/finance/cotisations', payFormData);
      setMessage(`Paiement enregistré avec succès ! Reçu N°: ${res.data.numero_recu}`);
      setShowPayForm(false);
      chargerGridAnnuel();
      // Reset form
      setPayFormData({
        membre_id: membreIdCible,
        annee: anneeCible,
        mois_list: [],
        montant_total: '',
        mode_paiement: 'Espèces',
        reference_transaction: '',
        observation: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    }
  };

  const handleContribSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await API.post('/finance/contribuer', contribFormData);
      setMessage(`Contribution enregistrée avec succès ! Reçu N°: ${res.data.numero_recu}`);
      setShowCollecteForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    }
  };

  const handleAnnulationSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await API.post('/finance/annuler', { paiement_id: paiementIdAnnulation, motif: motifAnnulation });
      setMessage('Le paiement a été annulé avec succès.');
      setShowCancelForm(false);
      chargerGridAnnuel();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'annulation.');
    }
  };

  const moisNom = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white bg-opacity-90 p-4 rounded-xl shadow-sm border border-stone-200 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-800 flex items-center">
            <DollarSign className="w-6 h-6 mr-1 text-stone-600" />
            Suivi des Cotisations
          </h2>
          <p className="text-sm text-stone-500 font-medium">Visualisez vos versements et cotisations</p>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {estTresorierOuAdmin && (
            <select
              value={membreIdCible}
              onChange={(e) => {
                setMembreIdCible(e.target.value);
                setPayFormData(prev => ({ ...prev, membre_id: e.target.value }));
                setContribFormData(prev => ({ ...prev, membre_id: e.target.value }));
              }}
              className="p-2 border border-stone-300 rounded font-semibold text-stone-700 bg-stone-50 text-sm focus:outline-none"
            >
              <option value="">-- Choisir un membre --</option>
              {membres.map(m => (
                <option key={m.id} value={m.id}>{m.nom} {m.prenoms} ({m.numero_membre})</option>
              ))}
            </select>
          )}

          <select
            value={anneeCible}
            onChange={(e) => setAnneeCible(parseInt(e.target.value))}
            className="p-2 border border-stone-300 rounded font-semibold text-stone-700 bg-stone-50 text-sm focus:outline-none"
          >
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 text-green-800 border-l-4 border-green-700 p-3 rounded font-medium text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-700 p-3 rounded font-medium text-sm">
          {error}
        </div>
      )}

      {/* Boutons d'actions Trésorier */}
      {estTresorierOuAdmin && membreIdCible && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPayFormData(prev => ({ ...prev, membre_id: membreIdCible, annee: anneeCible }));
              setShowPayForm(true);
            }}
            className="bg-blue-100 text-blue-800 border-2 border-blue-300 font-bold py-2.5 px-4 rounded-lg transition hover:bg-blue-200 text-sm"
          >
            Enregistrer une cotisation
          </button>
          <button
            onClick={() => {
              setContribFormData(prev => ({ ...prev, membre_id: membreIdCible }));
              setShowCollecteForm(true);
            }}
            className="bg-stone-200 text-stone-800 font-bold py-2.5 px-4 rounded-lg transition hover:bg-stone-300 text-sm"
          >
            Contribuer à une collecte
          </button>
        </div>
      )}

      {/* Modals Cotisation */}
      {showPayForm && (
        <form onSubmit={handlePaySubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4 shadow-md">
          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">Enregistrer Cotisation Mensuelle</h3>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Mois à payer</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {moisNom.map((name, index) => {
                const moisId = index + 1;
                const isSelected = payFormData.mois_list.includes(moisId);
                return (
                  <button
                    type="button"
                    key={moisId}
                    onClick={() => handleMoisSelect(moisId)}
                    className={`p-2 rounded text-xs border font-semibold text-center transition ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800 border-blue-400' 
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Montant Total Versé (FCFA)</label>
              <input
                type="number"
                required
                value={payFormData.montant_total}
                onChange={(e) => setPayFormData({ ...payFormData, montant_total: e.target.value })}
                placeholder="Ex: 6000"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mode de Paiement</label>
              <select
                value={payFormData.mode_paiement}
                onChange={(e) => setPayFormData({ ...payFormData, mode_paiement: e.target.value })}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="Espèces">Espèces</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="GeniusPay">GeniusPay (Simulation)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Référence Transaction</label>
              <input
                type="text"
                value={payFormData.reference_transaction}
                onChange={(e) => setPayFormData({ ...payFormData, reference_transaction: e.target.value })}
                placeholder="Ex: TXN12345"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Observation</label>
            <input
              type="text"
              value={payFormData.observation}
              onChange={(e) => setPayFormData({ ...payFormData, observation: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex space-x-2 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg text-sm">
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowPayForm(false)} className="bg-stone-300 hover:bg-stone-400 text-stone-800 py-2.5 px-4 rounded-lg text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Modal Collecte */}
      {showCollecteForm && (
        <form onSubmit={handleContribSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4 shadow-md">
          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">Contribuer à une Collecte Exceptionnelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Sélectionner la Collecte</label>
              <select
                required
                value={contribFormData.collecte_id}
                onChange={(e) => setContribFormData({ ...contribFormData, collecte_id: e.target.value })}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="">-- Choisir la collecte --</option>
                {collectes.map(col => (
                  <option key={col.id} value={col.id}>{col.titre} (Objectif: {col.objectif_financier} FCFA)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Montant Versé (FCFA)</label>
              <input
                type="number"
                required
                value={contribFormData.montant}
                onChange={(e) => setContribFormData({ ...contribFormData, montant: e.target.value })}
                placeholder="Ex: 5000"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Mode de Paiement</label>
              <select
                value={contribFormData.mode_paiement}
                onChange={(e) => setContribFormData({ ...contribFormData, mode_paiement: e.target.value })}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="Espèces">Espèces</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="GeniusPay">GeniusPay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Référence Transaction</label>
              <input
                type="text"
                value={contribFormData.reference_transaction}
                onChange={(e) => setContribFormData({ ...contribFormData, reference_transaction: e.target.value })}
                placeholder="Référence..."
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="flex space-x-2 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg text-sm">
              Enregistrer contribution
            </button>
            <button type="button" onClick={() => setShowCollecteForm(false)} className="bg-stone-300 hover:bg-stone-400 text-stone-800 py-2.5 px-4 rounded-lg text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Modal Annulation */}
      {showCancelForm && (
        <form onSubmit={handleAnnulationSubmit} className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4 shadow-md">
          <h3 className="text-lg font-bold text-red-950 flex items-center">
            <AlertCircle className="w-5 h-5 mr-1 text-red-700" />
            Annuler le paiement
          </h3>
          <p className="text-xs text-red-800 font-semibold">
            Attention: Cette action enregistrera une écriture d'annulation inverse. Le paiement d'origine sera marqué comme annulé.
          </p>
          <div>
            <label className="block text-xs font-semibold text-red-950 mb-1">Motif de l'annulation (Obligatoire)</label>
            <input
              type="text"
              required
              value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)}
              placeholder="Ex: Erreur de saisie de montant"
              className="w-full p-2 border border-red-300 rounded"
            />
          </div>
          <div className="flex space-x-2 pt-2">
            <button type="submit" className="bg-red-800 hover:bg-red-950 text-white font-bold py-2.5 px-6 rounded-lg text-sm">
              Confirmer l'annulation
            </button>
            <button type="button" onClick={() => setShowCancelForm(false)} className="bg-stone-300 hover:bg-stone-400 text-stone-800 py-2.5 px-4 rounded-lg text-sm">
              Fermer
            </button>
          </div>
        </form>
      )}

      {/* Grille Annuelle */}
      {gridPaye ? (
        <div className="bg-stone-50 bg-opacity-95 rounded-2xl border shadow-xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xl font-black text-stone-800">Grille des Cotisations - Année {gridPaye.annee}</h3>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded">
              Tarif Mensuel : {gridPaye.cotisation_mensuelle} FCFA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gridPaye.statut_mensuel.map((sm) => (
              <div
                key={sm.mois}
                className={`p-4 rounded-xl border flex flex-col justify-between h-28 shadow-sm ${
                  sm.statut === 'payé'
                    ? 'bg-green-50 border-green-200'
                    : sm.statut === 'partiellement payé'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-stone-800 text-base">{moisNom[sm.mois - 1]}</span>
                  <span className={`text-2xs font-extrabold uppercase px-2 py-0.5 rounded ${
                    sm.statut === 'payé'
                      ? 'bg-green-200 text-green-800'
                      : sm.statut === 'partiellement payé'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-red-200 text-red-800'
                  }`}>
                    {sm.statut}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div>
                    <p className="text-xs text-stone-500 font-semibold">Payé : {sm.montant_paye} FCFA</p>
                    <p className="text-xs text-stone-500 font-semibold">Dû : {sm.montant_du} FCFA</p>
                  </div>
                  {sm.statut === 'impayé' && (
                    <span className="text-xs text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">En retard</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Table d'historique de paiements */}
          {gridPaye.statut_mensuel.some(m => m.montant_paye > 0) && (
            <div className="pt-6 border-t">
              <h4 className="font-bold text-stone-800 text-base mb-3">Reçus et transactions</h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-100 font-bold text-stone-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Mode</th>
                      <th className="px-4 py-3 text-left">Référence</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {/* Pour des besoins de simulation, nous montrons un bouton d'annulation sur la transaction fictive */}
                    <tr>
                      <td className="px-4 py-3 text-stone-600">Aujourd'hui</td>
                      <td className="px-4 py-3 text-stone-600">Espèces</td>
                      <td className="px-4 py-3 text-stone-600">Direct</td>
                      <td className="px-4 py-3 text-stone-800 font-bold text-right">
                        {gridPaye.statut_mensuel.reduce((sum, m) => sum + m.montant_paye, 0)} FCFA
                      </td>
                      <td className="px-4 py-3 text-center flex justify-center space-x-2">
                        <button
                          onClick={() => alert('Impression du reçu...')}
                          className="p-1 bg-stone-100 text-stone-600 border rounded hover:bg-stone-200 transition"
                          title="Imprimer Reçu"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {estTresorierOuAdmin && (
                          <button
                            onClick={() => {
                              setPaiementIdAnnulation('1'); // ID fictif
                              setShowCancelForm(true);
                            }}
                            className="p-1 bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition"
                            title="Annuler Paiement"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white bg-opacity-95 p-8 rounded-xl border text-center text-stone-500">
          Veuillez sélectionner un membre pour visualiser sa grille des cotisations.
        </div>
      )}
    </div>
  );
};

export default Cotisations;
