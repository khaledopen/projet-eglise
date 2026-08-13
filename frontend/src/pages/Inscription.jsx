import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Inscription = () => {
  const navigate = useNavigate();
  
  // Données de formulaires
  const [formData, setFormData] = useState({
    nom: '',
    prenoms: '',
    telephone_principal: '',
    telephone_whatsapp: '',
    email: '',
    situation_matrimoniale: 'Célibataire',
    type_mariage: '',
    baptise: false,
    date_bapteme: '',
    paroisse_bapteme: '',
    date_naissance: '',
    quartier_residence: '',
    photo_url: '',
    ceb_id: '',
    commissions: [], // IDs de commissions
    groupes: [], // IDs de groupes
    mot_de_passe: '',
    consentement_rgpd: false
  });

  // Catalogues pour les listes déroulantes
  const [cebs, setCebs] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [groupes, setGroupes] = useState([]);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Charger les listes de CEB, Commissions et Groupes pour alimenter les sélections
    // (Nous utiliserons des appels non authentifiés car c'est une inscription publique)
    const chargerDonneesOptionnelles = async () => {
      try {
        const resCeb = await axios.get('http://localhost:5000/api/auth/me'); // juste pour tester l'URL ou mocker si besoin.
        // Sinon pour cette inscription publique, nous chargeons des valeurs par défaut pour éviter de casser le flux si la DB n'est pas connectée.
        setCebs([
          { id: 1, nom: 'Sainte Famille' },
          { id: 2, nom: 'Saint Jean-Baptiste' },
          { id: 3, nom: 'Notre-Dame de la Paix' },
          { id: 4, nom: 'Saint Joseph' }
        ]);
        setCommissions([
          { id: 1, nom: 'Liturgie' },
          { id: 2, nom: 'Catéchèse' },
          { id: 3, nom: 'Finance' },
          { id: 4, nom: 'Communication' },
          { id: 5, nom: 'Oeuvres Sociales' }
        ]);
        setGroupes([
          { id: 1, nom: 'Chorale Saint-Augustin' },
          { id: 2, nom: 'Jeunesse Catholique' },
          { id: 3, nom: 'Légion de Marie' },
          { id: 4, nom: 'Modération' }
        ]);
      } catch (err) {
        console.warn('Utilisation des catalogues par défaut pour l\'inscription.');
      }
    };
    chargerDonneesOptionnelles();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCommissionChange = (id) => {
    const isSelected = formData.commissions.includes(id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        commissions: prev.commissions.filter(cId => cId !== id)
      }));
    } else {
      if (formData.commissions.length >= 3) {
        alert('Vous pouvez choisir 3 commissions au maximum.');
        return;
      }
      setFormData(prev => ({
        ...prev,
        commissions: [...prev.commissions, id]
      }));
    }
  };

  const handleGroupeChange = (id) => {
    const isSelected = formData.groupes.includes(id);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        groupes: prev.groupes.filter(gId => gId !== id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        groupes: [...prev.groupes, id]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.ceb_id) {
      setError('Veuillez sélectionner une CEB.');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/membres/inscription', formData);
      setSuccessMsg(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue lors de la création de la fiche.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="bg-jesus min-h-screen flex items-center justify-center p-4">
        <div className="bg-stone-50 bg-opacity-95 shadow-2xl rounded-2xl p-8 max-w-lg w-full border border-stone-200 text-center">
          <h2 className="text-3xl font-extrabold text-blue-800 mb-4">Bienvenue !</h2>
          <p className="text-lg text-stone-700 mb-4">
            Votre fiche d'inscription a été enregistrée sous le numéro unique : 
            <br />
            <strong className="text-2xl text-blue-600 tracking-wide font-black">{successMsg.numero_membre}</strong>
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded text-left mb-6">
            <p className="text-yellow-800 text-sm font-medium">
              Important : Votre fiche a actuellement le statut <strong>« En attente de validation »</strong>. 
              Elle sera visible dans le répertoire officiel après validation par le secrétaire de la paroisse. 
              Vous pourrez ensuite vous connecter avec votre mot de passe et votre numéro de téléphone.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-block bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300 font-bold text-xl py-3 px-8 rounded-lg transition"
          >
            Retourner à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jesus min-h-screen py-8 px-4 flex justify-center">
      <div className="bg-stone-50 bg-opacity-95 shadow-2xl rounded-2xl p-6 md:p-10 max-w-2xl w-full border border-stone-200">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-stone-800">Fiche d'Inscription</h2>
          <p className="text-sm text-blue-500 font-medium mt-1">Rejoignez notre communauté chrétienne</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 border-l-4 border-red-700 p-3 rounded mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">1. Informations Personnelles (Obligatoires)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Nom</label>
              <input
                type="text"
                name="nom"
                required
                value={formData.nom}
                onChange={handleChange}
                placeholder="Votre nom"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Prénoms</label>
              <input
                type="text"
                name="prenoms"
                required
                value={formData.prenoms}
                onChange={handleChange}
                placeholder="Vos prénoms"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Téléphone Principal (Identifiant)</label>
              <input
                type="tel"
                name="telephone_principal"
                required
                value={formData.telephone_principal}
                onChange={handleChange}
                placeholder="Ex: 0102030405"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Mot de Passe (pour connexion)</label>
              <input
                type="password"
                name="mot_de_passe"
                required
                value={formData.mot_de_passe}
                onChange={handleChange}
                placeholder="Minimum 6 caractères"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">CEB (Communauté Ecclésiale)</label>
              <select
                name="ceb_id"
                required
                value={formData.ceb_id}
                onChange={handleChange}
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              >
                <option value="">Sélectionner votre CEB</option>
                {cebs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Situation Matrimoniale</label>
              <select
                name="situation_matrimoniale"
                required
                value={formData.situation_matrimoniale}
                onChange={handleChange}
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              >
                <option value="Célibataire">Célibataire</option>
                <option value="Marié">Marié(e)</option>
                <option value="Veuf">Veuf(ve)</option>
                <option value="Divorcé">Divorcé(e)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-stone-100 p-3 rounded">
            <input
              type="checkbox"
              name="baptise"
              id="baptise"
              checked={formData.baptise}
              onChange={handleChange}
              className="w-5 h-5 text-blue-600"
            />
            <label htmlFor="baptise" className="font-semibold text-stone-800 text-sm">Êtes-vous baptisé(e) ?</label>
          </div>

          <h3 className="text-lg font-bold text-stone-800 border-b pb-1">2. Informations Facultatives</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Numéro WhatsApp</label>
              <input
                type="tel"
                name="telephone_whatsapp"
                value={formData.telephone_whatsapp}
                onChange={handleChange}
                placeholder="Ex: 0102030405"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Adresse E-mail</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ex: jean@mail.com"
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          {formData.baptise && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-3 rounded">
              <div>
                <label className="block text-stone-700 font-semibold mb-1 text-sm">Date de Baptême</label>
                <input
                  type="date"
                  name="date_bapteme"
                  value={formData.date_bapteme}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-semibold mb-1 text-sm">Paroisse de Baptême</label>
                <input
                  type="text"
                  name="paroisse_bapteme"
                  value={formData.paroisse_bapteme}
                  onChange={handleChange}
                  placeholder="Nom de la paroisse"
                  className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
          )}

          {formData.situation_matrimoniale === 'Marié' && (
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Type de Mariage</label>
              <select
                name="type_mariage"
                value={formData.type_mariage}
                onChange={handleChange}
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
              >
                <option value="">Sélectionner le type</option>
                <option value="Coutumier">Coutumier</option>
                <option value="Civil">Civil</option>
                <option value="Religieux">Religieux</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Date de Naissance</label>
              <input
                type="date"
                name="date_naissance"
                value={formData.date_naissance}
                onChange={handleChange}
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-semibold mb-1 text-sm">Quartier de Résidence</label>
              <input
                type="text"
                name="quartier_residence"
                value={formData.quartier_residence}
                onChange={handleChange}
                placeholder="Ex: Angré, Cocody..."
                className="w-full p-2.5 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-2 text-sm">Commissions (3 max)</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commissions.map(c => {
                const isSelected = formData.commissions.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => handleCommissionChange(c.id)}
                    className={`p-2 rounded text-sm text-left border font-semibold transition ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800 border-blue-400' 
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {c.nom}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-2 text-sm">Groupes ou Associations</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {groupes.map(g => {
                const isSelected = formData.groupes.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => handleGroupeChange(g.id)}
                    className={`p-2 rounded text-sm text-left border font-semibold transition ${
                      isSelected 
                        ? 'bg-blue-100 text-blue-800 border-blue-400' 
                        : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {g.nom}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-stone-100 p-4 rounded space-y-3">
            <h4 className="font-bold text-stone-800 text-sm">Consentement RGPD & Confidentialité</h4>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="consentement_rgpd"
                id="consentement_rgpd"
                required
                checked={formData.consentement_rgpd}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 mt-0.5"
              />
              <label htmlFor="consentement_rgpd" className="text-stone-700 text-xs leading-relaxed">
                J'accepte que mes données personnelles soient enregistrées dans la base de données de la communauté. 
                Mes informations financières et personnelles resteront confidentielles et ne seront visibles que par 
                les administrateurs et le trésorier officiel de l'église.
              </label>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300 font-bold text-xl py-3 px-6 rounded-lg transition"
            >
              {loading ? 'Traitement...' : 'Soumettre mon inscription'}
            </button>
            <Link
              to="/login"
              className="flex items-center justify-center bg-stone-200 text-stone-800 font-semibold text-lg py-3 px-6 rounded-lg transition hover:bg-stone-300"
            >
              Retour
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inscription;
