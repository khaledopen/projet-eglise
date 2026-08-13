import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Megaphone, 
  DollarSign, 
  Users, 
  LayoutDashboard, 
  LogOut,
  User
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Parole', path: '/parole', icon: BookOpen, roles: ['Membre', 'Responsable', 'Tresorier', 'Secretaire', 'Administrateur'] },
    { label: 'Annonces', path: '/annonces', icon: Megaphone, roles: ['Membre', 'Responsable', 'Tresorier', 'Secretaire', 'Administrateur'] },
    { label: 'Cotisations', path: '/cotisations', icon: DollarSign, roles: ['Membre', 'Tresorier', 'Administrateur'] },
    { label: 'Répertoire', path: '/repertoire', icon: Users, roles: ['Responsable', 'Tresorier', 'Secretaire', 'Administrateur'] },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Tresorier', 'Secretaire', 'Administrateur'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div className="bg-jesus min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 bg-stone-100 border-r border-stone-200 flex-col justify-between shrink-0 shadow-lg z-10">
        <div>
          <div className="p-6 text-center border-b border-stone-200 bg-white">
            <h1 className="text-xl font-bold text-stone-800 tracking-wider">EGLISE</h1>
            <p className="text-xs text-blue-500 font-medium mt-1">« Jésus, j'ai confiance en Toi »</p>
          </div>
          <nav className="p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-lg font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-stone-200 bg-stone-50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-stone-800 text-sm truncate">
                {user?.membre?.nom ? `${user.membre.nom} ${user.membre.prenoms}` : user?.telephone}
              </p>
              <p className="text-xs text-stone-500 font-medium capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-red-800 hover:bg-red-950 text-white py-2 px-4 rounded-lg font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Header - Mobile */}
        <header className="md:hidden bg-stone-100 border-b border-stone-200 p-4 flex items-center justify-between shadow-sm z-10">
          <div>
            <h1 className="text-lg font-bold text-stone-800">EGLISE</h1>
            <p className="text-2xs text-blue-500 font-medium">« Jésus, j'ai confiance en Toi »</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-5xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom Bar - Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-100 border-t border-stone-200 flex justify-around py-2 z-10 shadow-lg">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center space-y-0.5 px-3 py-1 rounded-lg transition ${
                  isActive ? 'text-blue-600 font-semiboldScale' : 'text-stone-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-2xs">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
