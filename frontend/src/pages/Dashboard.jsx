import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { LayoutDashboard, Users, UserPlus, HelpCircle, DollarSign, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [journal, setJournal] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    chargerStats();
    chargerJournal();
  }, []);

  const chargerStats = async () => {
    try {
      const res = await API.get('/dashboard');
      setStats(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques du tableau de bord.');
    }
  };

  const chargerJournal = async () => {
    try {
      const res = await API.get('/dashboard/journal?limite=10');
      setJournal(res.data.logs || []);
    } catch (err) {
      // Ignorer si pas admin (puisque /journal est restreint à Admin uniquement)
      console.warn('Le journal d\'activités est réservé aux administrateurs.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex justify-between items-center bg-white bg-opacity-90 p-4 rounded-xl shadow-sm border border-stone-200">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-800 flex items-center">
            <LayoutDashboard className="w-6 h-6 mr-2 text-stone-600" />
            Tableau de Bord
          </h2>
          <p className="text-sm text-stone-500 font-medium">Synthèse globale des activités et finances</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-700 p-3 rounded font-medium text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Cartes statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xs text-stone-500 font-extrabold uppercase">Membres Actifs</p>
                <p className="text-2xl font-black text-stone-800">{stats.effectif_total_actif}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xs text-stone-500 font-extrabold uppercase">Inscrits du mois</p>
                <p className="text-2xl font-black text-stone-800">{stats.inscriptions_ce_mois}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xs text-stone-500 font-extrabold uppercase">En attente</p>
                <p className="text-2xl font-black text-stone-800">{stats.fiches_en_attente}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center space-x-3">
              <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xs text-stone-500 font-extrabold uppercase">Encaissé ce mois</p>
                <p className="text-2xl font-black text-stone-800 truncate">{stats.encaisse_ce_mois} FCFA</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Répartition par CEB */}
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-black text-stone-800 text-base border-b pb-2">Membres par CEB</h3>
              <div className="space-y-3">
                {stats.repartition_ceb.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-stone-600">{c.nom}</span>
                    <span className="bg-stone-100 text-stone-800 px-3 py-0.5 rounded-full font-bold">{c.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Répartition par Commission */}
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-black text-stone-800 text-base border-b pb-2">Membres par Commission</h3>
              <div className="space-y-3">
                {stats.repartition_commission.map((com, i) => (
                  <div key={i} className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-stone-600">{com.nom}</span>
                    <span className="bg-stone-100 text-stone-800 px-3 py-0.5 rounded-full font-bold">{com.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Collectes en cours */}
          {stats.collectes_en_cours.length > 0 && (
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-black text-stone-800 text-base border-b pb-2">Collectes Exceptionnelles en Cours</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.collectes_en_cours.map((col) => {
                  const progress = col.objectif_financier > 0 
                    ? Math.round((parseFloat(col.total_collecte) / parseFloat(col.objectif_financier)) * 100) 
                    : 0;
                  return (
                    <div key={col.id} className="p-4 border rounded-xl bg-stone-50 space-y-2">
                      <h4 className="font-bold text-stone-800 text-sm truncate">{col.titre}</h4>
                      <p className="text-xs text-stone-500 font-medium">Motif : {col.motif}</p>
                      
                      {/* Barre de progression */}
                      <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-blue-600 h-full transition-all" 
                          style={{ width: `${Math.min(100, progress)}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-stone-700 mt-1">
                        <span>{progress}%</span>
                        <span>{col.total_collecte} / {col.objectif_financier} FCFA</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Journal d'activités (Admin uniquement) */}
          {journal.length > 0 && (
            <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
              <h3 className="font-black text-stone-800 text-base border-b pb-2 flex items-center">
                <Activity className="w-5 h-5 mr-1 text-stone-600" />
                Journal d'Activité Récent (Derniers évènements)
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full divide-y divide-stone-200 text-xs">
                  <thead className="bg-stone-100 font-extrabold text-stone-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Utilisateur</th>
                      <th className="px-4 py-2 text-left">Action</th>
                      <th className="px-4 py-2 text-left">Entité</th>
                      <th className="px-4 py-2 text-left">Date et heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 bg-white">
                    {journal.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-2 text-stone-600 font-medium">{log.utilisateur_telephone || 'Public'}</td>
                        <td className="px-4 py-2 text-stone-800 font-bold capitalize">{log.action.replace('_', ' ')}</td>
                        <td className="px-4 py-2 text-stone-600">{log.element_concerne}</td>
                        <td className="px-4 py-2 text-stone-500 font-medium">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
