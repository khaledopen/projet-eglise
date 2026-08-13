import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Inscription from './pages/Inscription';
import Parole from './pages/Parole';
import Annonces from './pages/Annonces';
import Cotisations from './pages/Cotisations';
import Repertoire from './pages/Repertoire';
import Dashboard from './pages/Dashboard';

// Composant de protection des routes (vérifie si l'utilisateur est connecté)
const RouteProtegee = ({ children, rolesAutorises }) => {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-xl font-bold text-stone-600">Chargement...</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (rolesAutorises && user && !rolesAutorises.includes(user.role)) {
    // Si rôle non autorisé, rediriger vers la Parole du Jour (page par défaut)
    return <Navigate to="/parole" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />
          <Route path="/inscription" element={<Inscription />} />

          {/* Routes sécurisées (tous rôles connectés) */}
          <Route 
            path="/parole" 
            element={
              <RouteProtegee>
                <Parole />
              </RouteProtegee>
            } 
          />
          <Route 
            path="/annonces" 
            element={
              <RouteProtegee>
                <Annonces />
              </RouteProtegee>
            } 
          />

          {/* Routes financières (Membre pour ses données, Trésorier/Admin pour tout) */}
          <Route 
            path="/cotisations" 
            element={
              <RouteProtegee rolesAutorises={['Membre', 'Tresorier', 'Administrateur']}>
                <Cotisations />
              </RouteProtegee>
            } 
          />

          {/* Routes gestion (Responsable, Trésorier, Secrétaire, Admin) */}
          <Route 
            path="/repertoire" 
            element={
              <RouteProtegee rolesAutorises={['Responsable', 'Tresorier', 'Secretaire', 'Administrateur']}>
                <Repertoire />
              </RouteProtegee>
            } 
          />

          {/* Routes administration & supervision (Secrétaire, Trésorier, Admin) */}
          <Route 
            path="/dashboard" 
            element={
              <RouteProtegee rolesAutorises={['Tresorier', 'Secretaire', 'Administrateur']}>
                <Dashboard />
              </RouteProtegee>
            } 
          />

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
