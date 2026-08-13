import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(telephone, motDePasse);
    setLoading(false);

    if (result.success) {
      navigate('/parole');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="bg-jesus min-h-screen flex items-center justify-center p-4">
      <div className="bg-stone-50 bg-opacity-95 shadow-2xl rounded-2xl p-8 max-w-md w-full border border-stone-200 text-center z-10">
        <h2 className="text-3xl font-extrabold text-stone-800 mb-2">Projet EGLISE</h2>
        <p className="text-sm text-blue-500 font-medium mb-6">« Jésus, j'ai confiance en Toi »</p>

        {error && (
          <div className="bg-red-50 text-red-800 border-l-4 border-red-700 p-3 rounded mb-4 text-left font-medium text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-left">
          <div>
            <label className="block text-stone-700 font-semibold mb-1 text-base">Numéro de téléphone</label>
            <input
              type="tel"
              required
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex: 0102030405"
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg"
            />
          </div>

          <div>
            <label className="block text-stone-700 font-semibold mb-1 text-base">Mot de passe</label>
            <input
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="Votre mot de passe"
              className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-300 text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300 font-bold text-xl py-3 px-6 rounded-lg transition"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 border-t border-stone-200 pt-4">
          <p className="text-stone-600 text-base">Nouveau membre de la communauté ?</p>
          <Link
            to="/inscription"
            className="inline-block mt-2 text-blue-600 hover:text-blue-800 font-bold text-lg"
          >
            Créer ma fiche d'inscription
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
