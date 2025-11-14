
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import { updateUserProfile } from '../../services/supabase';
import { Profile } from '../../types';
import { SpinnerIcon } from '../icons';
import Modal from '../ui/Modal';

const BELT_OPTIONS = [
  "Blanco", "Blanco-Amarillo", "Amarillo", "Amarillo-Naranja", "Naranja", "Naranja-Verde",
  "Verde", "Verde-Azul", "Azul", "Azul-Marrón", "Marrón", "Negro"
];

const ProfileView = () => {
    const { profile, loading: authLoading, refetchProfile } = useAuth();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if(profile) {
            setFormData(profile);
        }
    }, [profile]);
    
    if (authLoading || !profile) {
        return <div className="flex justify-center items-center h-full"><SpinnerIcon className="w-12 h-12"/></div>;
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        
        setIsSaving(true);
        try {
            const ageValue = formData.age;
            const parsedAge = parseInt(String(ageValue), 10);

            const updates = {
                full_name: formData.full_name,
                surnames: formData.surnames,
                phone: formData.phone,
                // FIX: The comparison `ageValue === ''` caused a type error because `ageValue` is typed as `number` but was compared to a `string`.
                // The `isNaN(parsedAge)` check correctly handles empty strings, so the explicit check is redundant.
                age: (ageValue == null || isNaN(parsedAge)) ? null : parsedAge,
                address: formData.address,
                tutor_name: formData.tutor_name,
                belt: formData.belt,
            };

            await updateUserProfile(profile.id, updates);
            await refetchProfile();
            alert("Perfil actualizado correctamente.");
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("No se pudo actualizar el perfil.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="p-8 bg-gray-900 text-white min-h-full">
            <div className="bg-gray-800 p-8 rounded-lg border border-gray-700" style={{background: 'linear-gradient(145deg, rgba(45, 9, 13, 1) 0%, rgba(26, 26, 26, 1) 100%)'}}>
                <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
                <p className="text-gray-400 mb-6">Información personal y detalles de tu cuenta</p>
                
                <div className="bg-gray-700/50 p-6 rounded-lg mb-6 flex items-center">
                    <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-4xl font-bold mr-6">
                        {getInitials(profile.full_name)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{profile.full_name} {profile.surnames}</h2>
                        <p className={`text-sm font-semibold rounded-full px-3 py-1 inline-block mt-2 ${profile.role === 'admin' ? 'bg-red-800' : 'bg-blue-600'}`}>
                            {profile.role === 'admin' ? 'Administrador' : 'Usuario'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-700/50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold mb-4 border-b border-gray-600 pb-2">Información de Contacto</h3>
                        <p><strong className="text-gray-400">Email:</strong> {profile.email}</p>
                        <p><strong className="text-gray-400">Teléfono:</strong> {profile.phone || 'No especificado'}</p>
                        <p><strong className="text-gray-400">Dirección:</strong> {profile.address || 'No especificado'}</p>
                    </div>
                    <div className="bg-gray-700/50 p-6 rounded-lg">
                        <h3 className="text-lg font-bold mb-4 border-b border-gray-600 pb-2">Información Personal</h3>
                        <p><strong className="text-gray-400">Fecha de registro:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
                        <p><strong className="text-gray-400">Edad:</strong> {profile.age || 'No especificado'}</p>
                        <p><strong className="text-gray-400">Cinturón:</strong> {profile.belt || 'No especificado'}</p>
                        <p><strong className="text-gray-400">Tutor (menores):</strong> {profile.tutor_name || 'No aplica'}</p>
                        <p><strong className="text-gray-400">Grupo:</strong> {profile.groups?.name || 'Sin asignar'}</p>
                    </div>
                </div>
                
                <button onClick={() => setIsEditModalOpen(true)} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                    Editar Perfil
                </button>
            </div>
            
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Perfil">
                <form onSubmit={handleSaveChanges}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                        <div>
                            <label className="block mb-1">Nombre *</label>
                            <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white" required/>
                        </div>
                        <div>
                            <label className="block mb-1">Apellidos</label>
                            <input type="text" name="surnames" value={formData.surnames || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                        </div>
                        <div>
                            <label className="block mb-1">Teléfono</label>
                            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                        </div>
                        <div>
                            <label className="block mb-1">Edad</label>
                            <input type="number" name="age" value={formData.age || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block mb-1">Dirección</label>
                            <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                        </div>
                        <div>
                            <label className="block mb-1">Tutor (para menores)</label>
                            <input type="text" name="tutor_name" value={formData.tutor_name || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"/>
                        </div>
                        <div>
                            <label className="block mb-1">Cinturón</label>
                            <select name="belt" value={formData.belt || ''} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                                <option value="">Seleccionar cinturón...</option>
                                {BELT_OPTIONS.map(belt => <option key={belt} value={belt}>{belt}</option>)}
                            </select>
                        </div>
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
        </div>
    );
};

export default ProfileView;
