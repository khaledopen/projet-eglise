import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chargerUtilisateur = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          console.error('Erreur de chargement profil:', error);
          logout();
        }
      }
      setLoading(false);
    };

    chargerUtilisateur();
  }, [token]);

  const login = async (telephone, motDePasse) => {
    try {
      const res = await API.post('/auth/login', { telephone, mot_de_passe: motDePasse });
      const { token: tokenRecu, utilisateur } = res.data;
      localStorage.setItem('token', tokenRecu);
      setToken(tokenRecu);
      setUser(utilisateur);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Identifiants ou mot de passe incorrect.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
