import React, { useState, useEffect } from 'react';
import { Profile, Group, UserRole } from '../../../types';
import { getAllProfiles, getAllGroups, updateUserProfile, createAuthUser, deleteUserProfile } from '../../../services/supabase';
import Modal from '../../ui/Modal';
import { SpinnerIcon, PlusIcon, EditIcon, DeleteIcon } from '../../icons';

const BELT_OPTIONS = [
  "Blanco", "Blanco-Amarillo", "Amarillo", "Amarillo-Naranja", "Naranja", "Naranja-Verde",
  "Verde", "Verde-Azul", "Azul", "Azul-Marrón", "Marrón", "Negro"
];

const AdminUsersView = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentProfile, setCurrentProfile] = useState<Partial<Profile> | null>(null);
    const [newUser, setNewUser] = useState({ email: '', password: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesData, groupsData] = await Promise.all([getAllProfiles(), getAllGroups()]);
            setProfiles(profilesData);
            setGroups(groupsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditModal = (profile: Profile) => {
        setCurrentProfile({ ...profile, group_id: profile.group_id || '' });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentProfile?.id) return;
        setIsSaving(true);
        try {
            // Explicitly create the update object to avoid sending joined/read-only data
            const { id, created_at, email, groups, ...updates } = currentProfile;
            
            if (updates.group_id === '') {
                updates.group_id = null;
            }

            await updateUserProfile(id, updates);
            await fetchData();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("No se pudo actualizar el perfil.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await createAuthUser(newUser.email, newUser.password);
            alert(`Usuario creado. Se ha enviado un email de confirmación a ${newUser.email}. El nuevo usuario aparecerá en la lista después de confirmar su cuenta y podrá ser editado.`);
            setNewUser({ email: '', password: '' });
            setIsCreateModalOpen(false);
        } catch (error: any) {
            console.error("Error creating user:", error);
            alert(`No se pudo crear el usuario: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (profile: Profile) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar a ${profile.full_name || profile.email}? Esta acción eliminará su perfil de la aplicación.`)) {
            try {
                await deleteUserProfile(profile.id);
                await fetchData();
            } catch (error) {
                console.error("Error deleting profile:", error);
                alert("No se pudo eliminar el perfil.");
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><SpinnerIcon className="w-12 h-12"/></div>;
    }

    return (
        <div className="p-8 bg-gray-900 text-white min-h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
                    <p className="text-gray-400">Administra los accesos de los miembros de la academia</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Crear Usuario
                </button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Lista de Usuarios</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Grupo</th>
                                <th className="p-3">Rol</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map(p => (
                                <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-semibold">{p.full_name || <span className="text-gray-500">Sin nombre</span>}</td>
                                    <td className="p-3 text-gray-400">{p.email}</td>
                                    <td className="p-3">{p.groups?.name || <span className="text-gray-400">Sin asignar</span>}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 text-xs rounded-full ${p.role === UserRole.Admin ? 'bg-red-800' : 'bg-blue-800'}`}>
                                        {p.role}
                                      </span>
                                    </td>
                                    <td className="p-3 flex justify-end gap-2">
                                        <button onClick={() => openEditModal(p)} className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-600"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(p)} className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600"><DeleteIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {profiles.length === 0 && <p className="text-center text-gray-500 py-10">No hay usuarios registrados.</p>}
            </div>

            {/* Edit User Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Usuario">
                <form onSubmit={handleEditSubmit} className="text-gray-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block mb-1">Nombre *</label><input type="text" value={currentProfile?.full_name || ''} onChange={e => setCurrentProfile(prev => ({...prev, full_name: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" required/></div>
                        <div><label className="block mb-1">Apellidos</label><input type="text" value={currentProfile?.surnames || ''} onChange={e => setCurrentProfile(prev => ({...prev, surnames: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded"/></div>
                        <div><label className="block mb-1">Grupo</label><select value={currentProfile?.group_id || ''} onChange={e => setCurrentProfile(prev => ({...prev, group_id: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded"><option value="">Sin asignar</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                        <div><label className="block mb-1">Rol</label><select value={currentProfile?.role || 'user'} onChange={e => setCurrentProfile(prev => ({...prev, role: e.target.value as UserRole}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded"><option value="user">Usuario</option><option value="admin">Administrador</option></select></div>
                        <div><label className="block mb-1">Cinturón</label><select value={currentProfile?.belt || ''} onChange={e => setCurrentProfile(prev => ({...prev, belt: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded"><option value="">Seleccionar cinturón...</option>{BELT_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                        {/* Add other fields as needed */}
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-800 flex items-center">
                            {isSaving && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </Modal>
            
            {/* Create User Modal */}
             <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Crear Nuevo Usuario">
                <form onSubmit={handleCreateSubmit} className="text-gray-300">
                    <p className="text-sm bg-blue-900/50 border border-blue-700 text-blue-200 p-3 rounded-lg mb-4">Se enviará un correo de confirmación al nuevo usuario para que establezca su cuenta. Después de confirmar, aparecerá en la lista y podrás editar su perfil para asignarle un grupo y otros detalles.</p>
                    <div className="mb-4">
                        <label className="block mb-1">Email del Usuario *</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" required/>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Contraseña Temporal *</label>
                        <input type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded" required/>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-800 flex items-center">
                            {isSaving && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            Crear y Enviar Invitación
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminUsersView;