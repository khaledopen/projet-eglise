import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Megaphone, AlertTriangle, Pin, Calendar, Plus } from 'lucide-react';

const Annonces = () => {
  const { user } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Formulaire d'annonce
  const [formData, setFormData] = useState({
    titre: '',
    texte: '',
    image_url: '',
    date_publication: new Date().toISOString().split('T')[0],
    date_expiration: '',
    urgent: false,
    epingler: false,
    destinataires: [{ type: 'public', targetId: null }]
  });

  // Catalogues mockés pour la cible
  const [optionsCible, setOptionsCible] = useState([]);
  const [typeDest, setTypeDest] = useState('public');
  const [cibleId, setCibleId] = useState('');

  useEffect(() => {
    chargerAnnonces();
  }, []);

  useEffect(() => {
    // Adapter les options de cible selon le type choisi
    if (typeDest === 'ceb') {
      setOptionsCible([
        { id: 1, nom: 'Sainte Famille' },
        { id: 2, nom: 'Saint Jean-Baptiste' },
        { id: 3, nom: 'Notre-Dame de la Paix' },
        { id: 4, nom: 'Saint Joseph' }
      ]);
    } else if (typeDest === 'commission') {
      setOptionsCible([
        { id: 1, nom: 'Liturgie' },
        { id: 2, nom: 'Catéchèse' },
        { id: 3, nom: 'Finance' },
        { id: 4, nom: 'Communication' },
        { id: 5, nom: 'Oeuvres Sociales' }
      ]);
    } else if (typeDest === 'groupe') {
      setOptionsCible([
        { id: 1, nom: 'Chorale Saint-Augustin' },
        { id: 2, nom: 'Jeunesse Catholique' },
        { id: 3, nom: 'Légion de Marie' },
        { id: 4, nom: 'Modération' }
      ]);
    } else {
      setOptionsCible([]);
    }
  }, [typeDest]);

  const chargerAnnonces = async () => {
    setError('');
    try {
      const res = await API.get('/communication/annonces');
      setAnnonces(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des annonces.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      destinataires: [{ type: typeDest, targetId: cibleId ? parseInt(cibleId) : null }]
    };

    try {
      await API.post('/communication/annonces', payload);
      alert('Annonce publiée avec succès !');
      setShowForm(false);
      chargerAnnonces();
      // Reset
      setFormData({
        titre: '',
        texte: '',
        image_url: '',
        date_publication: new Date().toISOString().split('T')[0],
        date_expiration: '',
        urgent: false,
        epingler: false,
        destinataires: [{ type: 'public', targetId: null }]
      });
      setTypeDest('public');
      setCibleId('');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la publication de l\'annonce.');
    }
  };

  const peutPublier = ['Administrateur', 'Secretaire', 'Responsable'].includes(user?.role);

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white bg-opacity-90 p-4 rounded-xl shadow-sm border border-stone-200 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-800 flex items-center">
            <Megaphone className="w-6 h-6 mr-2 text-stone-600" />
            Annonces Communautaires
          </h2>
          <p className="text-sm text-stone-500 font-medium">Restez informé des activités de notre paroisse</p>
        </div>
        {peutPublier && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-1 bg-blue-100 text-blue-800 border border-blue-300 py-2.5 px-4 rounded-lg font-bold transition hover:bg-blue-200 w-full sm:w-auto justify-center text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Créer une annonce</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-stone-50 border border-stone-200 rounded-xl p-6 space-y-4 shadow-md">
          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">Nouvelle Annonce</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Titre de l'Annonce</label>
              <input
                type="text"
                required
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Ex: Réunion de la chorale"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Image URL (Optionnel)</label>
              <input
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Texte de l'Annonce</label>
            <textarea
              rows="4"
              required
              value={formData.texte}
              onChange={(e) => setFormData({ ...formData, texte: e.target.value })}
              placeholder="Contenu de l'annonce..."
              className="w-full p-2 border rounded text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Date de Publication</label>
              <input
                type="date"
                required
                value={formData.date_publication}
                onChange={(e) => setFormData({ ...formData, date_publication: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Date d'Expiration</label>
              <input
                type="date"
                required
                value={formData.date_expiration}
                onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded border">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Public Ciblé</label>
              <select
                value={typeDest}
                onChange={(e) => {
                  setTypeDest(e.target.value);
                  setCibleId('');
                }}
                className="w-full p-2 border rounded bg-stone-50"
              >
                <option value="public">Toute la Communauté</option>
                <option value="ceb">Une CEB Spécifique</option>
                <option value="commission">Une Commission Spécifique</option>
                <option value="groupe">Un Groupe / Association</option>
              </select>
            </div>
            {typeDest !== 'public' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Sélectionner la cible</label>
                <select
                  required
                  value={cibleId}
                  onChange={(e) => setCibleId(e.target.value)}
                  className="w-full p-2 border rounded bg-stone-50"
                >
                  <option value="">-- Choisir --</option>
                  {optionsCible.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.nom}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex space-x-6">
            <label className="flex items-center space-x-2 font-semibold text-stone-800 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                className="w-4 h-4 text-red-600"
              />
              <span>Marquer comme Urgent</span>
            </label>
            <label className="flex items-center space-x-2 font-semibold text-stone-800 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.epingler}
                onChange={(e) => setFormData({ ...formData, epingler: e.target.checked })}
                className="w-4 h-4 text-blue-600"
              />
              <span>Épingler en haut</span>
            </label>
          </div>

          <div className="flex space-x-2 pt-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-lg text-sm">
              Publier l'Annonce
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-stone-300 hover:bg-stone-400 text-stone-800 py-2.5 px-4 rounded-lg text-sm">
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 border-l-4 border-red-700 p-3 rounded font-medium text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {annonces.length === 0 ? (
          <div className="bg-white bg-opacity-95 p-8 rounded-xl border text-center text-stone-500">
            Aucune annonce active pour le moment.
          </div>
        ) : (
          annonces.map((ann) => (
            <div
              key={ann.id}
              className={`bg-stone-50 bg-opacity-95 rounded-2xl border shadow-md overflow-hidden transition hover:shadow-lg ${
                ann.urgent 
                  ? 'border-red-300 ring-2 ring-red-100 bg-red-50 bg-opacity-90' 
                  : 'border-stone-200'
              }`}
            >
              {/* Badge Urgent ou Epinglé */}
              <div className="px-5 py-4 border-b border-stone-200 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  {ann.epingler && (
                    <span className="flex items-center text-xs font-extrabold uppercase tracking-wide text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      <Pin className="w-3.5 h-3.5 mr-1" />
                      Épinglé
                    </span>
                  )}
                  {ann.urgent && (
                    <span className="flex items-center text-xs font-extrabold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-0.5 rounded animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      Urgent
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-stone-500 font-medium">
                  <Calendar className="w-4 h-4 mr-1" />
                  Du {new Date(ann.date_publication).toLocaleDateString('fr-FR')} au {new Date(ann.date_expiration).toLocaleDateString('fr-FR')}
                </div>
              </div>

              <div className="p-5 md:p-6 space-y-3">
                <h3 className="text-xl font-black text-stone-800">{ann.titre}</h3>
                <p className="text-stone-700 whitespace-pre-wrap leading-relaxed text-base">{ann.texte}</p>
                
                {ann.image_url && (
                  <div className="mt-4 max-h-80 overflow-hidden rounded-lg border">
                    <img
                      src={ann.image_url}
                      alt={ann.titre}
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Annonces;
