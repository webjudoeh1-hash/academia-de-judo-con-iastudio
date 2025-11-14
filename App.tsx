
import React, { useState, useEffect, createContext, useContext, ReactNode, PropsWithChildren } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from './services/supabase';
import { Profile, UserRole, AuthContextType } from './types';
import Sidebar from './components/layout/Sidebar';
import { MenuIcon, SpinnerIcon } from './components/icons';
import Modal from './components/ui/Modal';


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
    setLoading(true);

    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
            fetchProfile(session.user.id);
        } else {
            setProfile(null);
        }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    }
    // The onAuthStateChange listener will handle clearing user and profile state.
  };

  const refetchProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };
  
  const sendPasswordResetEmail = async (email: string) => supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Users will be redirected here after password reset
  });

  const value: AuthContextType = { user, profile, loading, login, logout, refetchProfile, sendPasswordResetEmail };

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
  const { login, sendPasswordResetEmail } = useAuth();
  
  // State for password reset modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

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
  
  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSendingReset(true);
      setResetMessage('');
      setResetError('');
      try {
        const { error } = await sendPasswordResetEmail(resetEmail);
        if (error) {
          setResetError(error.message);
        } else {
          setResetMessage('Si existe una cuenta con ese email, recibirás las instrucciones para restablecer tu contraseña.');
        }
      } catch (e: any) {
        setResetError(e.message);
      } finally {
        setIsSendingReset(false);
      }
    };
    
  const openResetModal = () => {
    setIsResetModalOpen(true);
    setResetEmail('');
    setResetMessage('');
    setResetError('');
  }


  return (
    <>
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
            <div className="mb-2">
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
             <div className="text-right mb-4">
                <button type="button" onClick={openResetModal} className="text-sm text-red-400 hover:underline focus:outline-none">
                    ¿Olvidaste tu contraseña?
                </button>
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
      
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Restablecer Contraseña">
          <form onSubmit={handleResetPassword}>
            <p className="text-gray-300 mb-4">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
            <div className="mb-4">
                <label className="block text-gray-300 mb-2" htmlFor="reset-email">Email</label>
                <input
                    type="email"
                    id="reset-email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                />
            </div>
            {resetMessage && <p className="text-green-400 text-center mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg">{resetMessage}</p>}
            {resetError && <p className="text-red-400 text-center mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">{resetError}</p>}
            <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                <button type="submit" disabled={isSendingReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-800 flex items-center">
                    {isSendingReset && <SpinnerIcon className="w-5 h-5 mr-2" />}
                    {isSendingReset ? 'Enviando...' : 'Enviar Instrucciones'}
                </button>
            </div>
          </form>
      </Modal>
    </>
  );
};

// --- Main App Component ---
const MainApp = () => {
    const { profile, loading, logout } = useAuth();
    const [currentPage, setCurrentPage] = useState('documents');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewFilters, setViewFilters] = useState<Record<string, any>>({});

    if (loading || !profile) {
        return <div className="h-screen w-screen flex items-center justify-center bg-gray-900"><p className="text-white">Cargando...</p></div>;
    }
    
    const handleNavigate = (page: string, filters?: any) => {
        if (filters) {
            setViewFilters({ [page]: filters });
        } else {
             setViewFilters({});
        }
        setCurrentPage(page);
        setIsSidebarOpen(false); // Close sidebar on mobile navigation
    };

    const renderPage = () => {
        const initialFilter = viewFilters[currentPage];
        
        if (profile.role === UserRole.Admin) {
            switch (currentPage) {
                case 'documents': return <DocumentsView />;
                case 'profile': return <ProfileView />;
                case 'admin-documents': return <AdminDocumentsView initialFilter={initialFilter} />;
                case 'admin-groups': return <AdminGroupsView onNavigate={handleNavigate} />;
                case 'admin-users': return <AdminUsersView initialFilter={initialFilter} />;
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
        <div className="bg-gray-900 min-h-screen lg:flex">
            <Sidebar 
                profile={profile} 
                currentPage={currentPage} 
                onNavigate={handleNavigate} 
                onLogout={logout}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden bg-gray-800 sticky top-0 z-20 border-b border-gray-700 p-4 flex items-center">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 rounded-md hover:bg-gray-700">
                        <MenuIcon className="w-6 h-6"/>
                    </button>
                    <div className="flex items-center mx-auto">
                        <div className="bg-red-600 text-white text-xl font-bold rounded-md p-1 mr-2">柔</div>
                        <span className="text-lg font-semibold text-white">Portal Privado</span>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    {renderPage()}
                </main>
            </div>
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