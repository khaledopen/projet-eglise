import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Share2, Plus, Calendar, BookOpen } from 'lucide-react';

const Parole = () => {
  const { user } = useAuth();
  const [parole, setParole] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [error, setError] = useState('');
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [dateSelectionnee, setDateSelectionnee] = useState(new Date().toISOString().split('T')[0]);

  // Formulaire d'édition pour l'admin
  const [formData, setFormData] = useState({
    date_liturgique: new Date().toISOString().split('T')[0],
    saint_du_jour: '',
    references_lectures: '',
    textes_lectures: '',
    evangile: '',
    meditation: '',
    intention_priere: ''
  });

  useEffect(() => {
    chargerParole();
    chargerHistorique();
  }, [dateSelectionnee]);

  const chargerParole = async () => {
    setError('');
    try {
      const res = await API.get(`/communication/parole?date=${dateSelectionnee}`);
      setParole(res.data);
      // Mettre en cache locale pour consultation hors-ligne (les 7 derniers jours par exemple)
      localStorage.setItem(`parole_${dateSelectionnee}`, JSON.stringify(res.data));
    } catch (err) {
      // Tenter de lire depuis le cache local si hors-ligne ou erreur API
      const cached = localStorage.getItem(`parole_${dateSelectionnee}`);
      if (cached) {
        setParole(JSON.parse(cached));
      } else {
        setError('Aucune Parole du Jour disponible en ligne ou hors-connexion.');
        setParole(null);
      }
    }
  };

  const chargerHistorique = async () => {
    try {
      const res = await API.get('/communication/paroles/7jours');
      setHistorique(res.data);
      localStorage.setItem('paroles_7jours', JSON.stringify(res.data));
    } catch (err) {
      const cached = localStorage.getItem('paroles_7jours');
      if (cached) setHistorique(JSON.parse(cached));
    }
  };

  const handleShare = () => {
    if (!parole) return;
    const text = `*Parole du Jour* - ${parole.date_liturgique}\n*Saint du Jour:* ${parole.saint_du_jour || 'N/A'}\n\n*Évangile:* ${parole.evangile}\n\n*Méditation:* ${parole.meditation}\n\n*Intention de prière:* ${parole.intention_priere || 'Union de prière'}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    try {
      await API.post('/communication/parole', formData);
      alert('Parole du Jour publiée avec succès.');
      setShowAdminForm(false);
      chargerParole();
      chargerHistorique();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la publication.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white bg-opacity-90 p-4 rounded-xl shadow-sm border border-stone-200 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-800">La Parole du Jour</h2>
          <p className="text-sm text-stone-500 font-medium">Méditez la parole divine au quotidien</p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <input
            type="date"
            value={dateSelectionnee}
            onChange={(e) => setDateSelectionnee(e.target.value)}
            className="p-2 border border-stone-300 rounded font-semibold text-stone-700 bg-stone-50 text-sm focus:outline-none"
          />
          {user?.role === 'Administrateur' && (
            <button
              onClick={() => {
                setFormData(prev => ({ ...prev, date_liturgique: dateSelectionnee }));
                setShowAdminForm(!showAdminForm);
              }}
              className="flex items-center space-x-1 bg-blue-100 text-blue-800 border border-blue-300 py-2 px-3 rounded text-sm font-bold transition hover:bg-blue-200"
            >
              <Plus className="w-4 h-4" />
              <span>Saisir</span>
            </button>
          )}
        </div>
      </div>

      {showAdminForm && (
        <form onSubmit={handleSubmitAdmin} className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4 shadow-md text-left">
          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">Saisie/Modification de la Parole Divine</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Date Liturgique</label>
              <input
                type="date"
                required
                value={formData.date_liturgique}
                onChange={(e) => setFormData({ ...formData, date_liturgique: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Saint du Jour</label>
              <input
                type="text"
                value={formData.saint_du_jour}
                onChange={(e) => setFormData({ ...formData, saint_du_jour: e.target.value })}
                placeholder="Ex: Saint Augustin"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Références des Lectures (ex: 1 Rois 19, 1-8 ; Ps 33)</label>
            <input
              type="text"
              value={formData.references_lectures}
              onChange={(e) => setFormData({ ...formData, references_lectures: e.target.value })}
              placeholder="Lectures..."
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Textes des Lectures (Optionnel)</label>
            <textarea
              rows="3"
              value={formData.textes_lectures}
              onChange={(e) => setFormData({ ...formData, textes_lectures: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Texte de l'Évangile (Obligatoire)</label>
            <textarea
              rows="4"
              required
              value={formData.evangile}
              onChange={(e) => setFormData({ ...formData, evangile: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Courte Méditation (Obligatoire)</label>
            <textarea
              rows="4"
              required
              value={formData.meditation}
              onChange={(e) => setFormData({ ...formData, meditation: e.target.value })}
              className="w-full p-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Intention de Prière de la Communauté</label>
            <input
              type="text"
              value={formData.intention_priere}
              onChange={(e) => setFormData({ ...formData, intention_priere: e.target.value })}
              placeholder="Pour les malades, les familles..."
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex space-x-2 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-6 rounded text-sm">
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowAdminForm(false)} className="bg-stone-300 hover:bg-stone-400 text-stone-800 py-2 px-4 rounded text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded text-yellow-800 text-sm font-medium">
          {error}
        </div>
      )}

      {parole && (
        <div className="bg-stone-50 bg-opacity-95 rounded-2xl border border-stone-200 shadow-xl overflow-hidden text-left">
          {/* Header Parole */}
          <div className="bg-blue-50 border-b border-stone-200 p-6 flex justify-between items-start">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                {parole.saint_du_jour ? `Fête : ${parole.saint_du_jour}` : 'Parole Divine'}
              </span>
              <h3 className="text-2xl font-black text-stone-800 mt-2 flex items-center">
                <Calendar className="w-6 h-6 mr-2 text-stone-600" />
                {new Date(parole.date_liturgique).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-300 font-bold px-4 py-2 rounded-lg transition"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {parole.references_lectures && (
              <div>
                <h4 className="text-lg font-bold text-stone-800 mb-1.5 flex items-center border-b pb-0.5">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                  Lectures du Jour
                </h4>
                <p className="text-stone-700 italic font-semibold text-lg">{parole.references_lectures}</p>
                {parole.textes_lectures && (
                  <p className="text-stone-600 mt-2 whitespace-pre-wrap bg-stone-100 p-4 rounded text-sm leading-relaxed">{parole.textes_lectures}</p>
                )}
              </div>
            )}

            <div>
              <h4 className="text-lg font-bold text-stone-800 mb-1.5 flex items-center border-b pb-0.5">
                <BookOpen className="w-5 h-5 mr-2 text-red-500" />
                Saint Évangile
              </h4>
              <p className="text-stone-700 whitespace-pre-wrap bg-red-50 bg-opacity-50 p-4 rounded-lg text-base border border-red-100 italic leading-relaxed">
                {parole.evangile}
              </p>
            </div>

            <div>
              <h4 className="text-lg font-bold text-stone-800 mb-1.5 flex items-center border-b pb-0.5">
                Méditation
              </h4>
              <p className="text-stone-800 text-base leading-relaxed whitespace-pre-wrap pl-3 border-l-4 border-blue-500">
                {parole.meditation}
              </p>
            </div>

            {parole.intention_priere && (
              <div className="bg-blue-50 bg-opacity-70 p-4 rounded-xl border border-blue-100">
                <h4 className="text-base font-bold text-blue-900 mb-1">
                  Intention de Prière Communautaire
                </h4>
                <p className="text-blue-800 text-sm italic font-medium">
                  « {parole.intention_priere} »
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique des 7 derniers jours */}
      {historique.length > 0 && (
        <div className="bg-white bg-opacity-90 p-6 rounded-xl border border-stone-200 shadow-sm text-left">
          <h4 className="text-lg font-bold text-stone-800 mb-4 border-b pb-1">Lectures des 7 derniers jours</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {historique.map(p => (
              <button
                key={p.id}
                onClick={() => setDateSelectionnee(p.date_liturgique.split('T')[0])}
                className={`p-3 rounded-lg border text-sm text-left transition font-semibold ${
                  dateSelectionnee === p.date_liturgique.split('T')[0]
                    ? 'bg-blue-100 border-blue-400 text-blue-900'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <p className="text-xs text-stone-500">
                  {new Date(p.date_liturgique).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </p>
                <p className="font-bold truncate mt-0.5">
                  {new Date(p.date_liturgique).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-2xs text-stone-500 truncate mt-1">
                  {p.saint_du_jour || 'Férial'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Parole;
