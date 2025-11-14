
import React from 'react';
import { DocumentIcon, UserIcon, AdminIcon, UserGroupIcon, UsersIcon, LogoutIcon } from '../icons';
import { Profile, UserRole } from '../../types';

interface SidebarProps {
  profile: Profile | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ profile, currentPage, onNavigate, onLogout }) => {
  // FIX: Changed JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
  const NavItem = ({ icon, label, page }: { icon: React.ReactNode; label: string; page: string }) => (
    <li
      className={`flex items-center p-3 rounded-lg cursor-pointer ${
        currentPage === page ? 'bg-red-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
      onClick={() => onNavigate(page)}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </li>
  );
  
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="w-64 bg-gray-800 h-screen flex flex-col p-4 border-r border-gray-700">
      <div className="flex items-center mb-8">
        <div className="bg-red-600 text-white text-2xl font-bold rounded-md p-2 mr-3">柔</div>
        <span className="text-xl font-semibold text-white">Portal Privado</span>
      </div>
      
      <ul className="space-y-2 flex-grow">
        <NavItem icon={<DocumentIcon className="w-5 h-5"/>} label="Documentos" page="documents" />
        <NavItem icon={<UserIcon className="w-5 h-5"/>} label="Mi Perfil" page="profile" />
        {profile?.role === UserRole.Admin && (
          <>
            <hr className="border-gray-600 my-2" />
            <NavItem icon={<AdminIcon className="w-5 h-5"/>} label="Panel Admin" page="admin-documents" />
            <NavItem icon={<UserGroupIcon className="w-5 h-5"/>} label="Grupos" page="admin-groups" />
            <NavItem icon={<UsersIcon className="w-5 h-5"/>} label="Usuarios" page="admin-users" />
          </>
        )}
      </ul>

      <div className="mt-auto">
        <div className="p-4 bg-gray-700 rounded-lg text-center mb-4">
            <div className="w-12 h-12 bg-red-600 rounded-full mx-auto flex items-center justify-center text-xl font-bold mb-2">
                {getInitials(profile?.full_name)}
            </div>
            <p className="font-bold text-white">{profile?.full_name || 'Usuario'}</p>
            {profile?.role === UserRole.Admin && (
              <p className="text-xs bg-red-800 text-white rounded-full px-2 py-1 inline-block mt-1">ADMINISTRADOR</p>
            )}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center w-full p-3 rounded-lg text-red-400 hover:bg-red-800 hover:text-white"
        >
          <LogoutIcon className="w-5 h-5" />
          <span className="ml-3">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
