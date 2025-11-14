
import React, { useState, useEffect, createContext, useContext, ReactNode, PropsWithChildren } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from './services/supabase';
import { Profile, UserRole, AuthContextType } from './types';
import Sidebar from './components/layout/Sidebar';

// --- Import Views ---
import DocumentsView from './components/views/DocumentsView';
import ProfileView from './components/views/ProfileView';
import AdminDocumentsView from './components/views/admin/AdminDocumentsView';
import AdminGroupsView from './components/views/admin/AdminGroupsView';
import AdminUsersView from './components/views/admin/AdminUsersView';


// --- Auth Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// FIX: Changed props to use PropsWithChildren to resolve a complex TypeScript error.
// The compiler incorrectly reported that the required 'children' prop was missing for AuthProvider.
// Making 'children' optional with PropsWithChildren satisfies the type-checker, and the app
// functions correctly as AuthProvider is always called with children components.
export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const userProfile = await getProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session on initial load:", error);
        }
        
        const session = data?.session;
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error("Critical error during initial session fetch:", e);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refetchProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = { user, profile, loading, login, logout, refetchProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


// --- Login View ---
const LoginView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await login(email, password);
      if (error) setError(error.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-red-600 text-white text-3xl font-bold rounded-md p-3 mr-4">柔</div>
          <h1 className="text-2xl font-bold text-white">Judo Academy Hub</h1>
        </div>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 mb-2" htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
          </div>
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:bg-red-800"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---
const MainApp = () => {
    const { profile, loading, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('documents');

    if (loading || !profile) {
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900"><p className="text-white">Cargando...</p></div>;
    }
    
    const renderPage = () => {
        if (profile.role === UserRole.Admin) {
            switch (currentPage) {
                case 'documents': return <DocumentsView />;
                case 'profile': return <ProfileView />;
                case 'admin-documents': return <AdminDocumentsView />;
                case 'admin-groups': return <AdminGroupsView />;
                case 'admin-users': return <AdminUsersView />;
                default: return <DocumentsView />;
            }
        }
        
        switch (currentPage) {
            case 'documents': return <DocumentsView />;
            case 'profile': return <ProfileView />;
            default: return <DocumentsView />;
        }
    };

    return (
        <div className="flex bg-gray-900 min-h-screen">
            <Sidebar profile={profile} currentPage={currentPage} onNavigate={setCurrentPage} onLogout={logout} />
            <main className="flex-1 overflow-y-auto">
                {renderPage()}
            </main>
        </div>
    );
};

// --- App Wrapper ---
// FIX: Explicitly type App as a React Functional Component (React.FC).
// This can help resolve complex type inference issues in some TypeScript configurations,
// which might be the cause of the reported error about a missing 'children' prop.
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900"><p className="text-white">Cargando sesión...</p></div>;
  }
  
  return user ? <MainApp /> : <LoginView />;
};

export default App;
