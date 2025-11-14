import React, { useState, useEffect } from 'react';
import { Group } from '../../../types';
import { getAllGroups, createGroup, updateGroup, deleteGroup, getGroupUserCount, getGroupDocumentCount } from '../../../services/supabase';
import Modal from '../../ui/Modal';
import { SpinnerIcon, PlusIcon, EditIcon, DeleteIcon, UserIcon, DocumentIcon } from '../../icons';

const GROUP_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];

interface GroupWithCounts extends Group {
    userCount: number;
    docCount: number;
}

interface AdminGroupsViewProps {
    onNavigate: (page: string, filters?: any) => void;
}

const AdminGroupsView: React.FC<AdminGroupsViewProps> = ({ onNavigate }) => {
    const [groups, setGroups] = useState<GroupWithCounts[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentGroup, setCurrentGroup] = useState<Partial<GroupWithCounts> | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const groupsData = await getAllGroups();
            const groupsWithCounts = await Promise.all(
                groupsData.map(async (group) => {
                    const [userCount, docCount] = await Promise.all([
                        getGroupUserCount(group.id),
                        getGroupDocumentCount(group.id)
                    ]);
                    return { ...group, userCount, docCount };
                })
            );
            setGroups(groupsWithCounts);
        } catch (error) {
            console.error("Failed to fetch groups:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (group: Partial<GroupWithCounts> | null = null) => {
        setCurrentGroup(group ? { ...group } : { name: '', description: '', color: GROUP_COLORS[0] });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentGroup) return;

        setIsSaving(true);
        try {
            // Strip calculated properties before saving
            const { userCount, docCount, ...groupData } = currentGroup;

            if (groupData.id) {
                await updateGroup(groupData.id, groupData);
            } else {
                await createGroup(groupData);
            }
            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving group:", error);
            alert("No se pudo guardar el grupo.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async (group: Group) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar el grupo "${group.name}"? Los usuarios y documentos de este grupo quedarán sin asignar.`)) {
            try {
                await deleteGroup(group.id);
                await fetchData();
                alert('Grupo eliminado correctamente.');
            } catch (error: any) {
                console.error("Error deleting group:", error);
                alert(`No se pudo eliminar el grupo: ${error.message}`);
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
                    <h1 className="text-3xl font-bold">Gestión de Grupos</h1>
                    <p className="text-gray-400">Organiza usuarios y documentos por grupos</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Crear Grupo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                    <div key={group.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                                <div className="w-4 h-4 rounded-full mr-3" style={{backgroundColor: group.color}}></div>
                                <h2 className="text-xl font-bold">{group.name}</h2>
                            </div>
                             <div className="flex gap-1">
                                <button onClick={() => openModal(group)} className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(group)} className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-700"><DeleteIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 flex-grow">{group.description || 'Sin descripción'}</p>
                        <div className="flex justify-around pt-4 border-t border-gray-700">
                            <button onClick={() => onNavigate('admin-users', { group: group.id })} className="text-center group hover:bg-gray-700 p-2 rounded-lg transition-colors">
                                <p className="flex items-center gap-2 text-gray-300 group-hover:text-white"><UserIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" /> Usuarios</p>
                                <p className="text-2xl font-bold group-hover:text-white">{group.userCount}</p>
                            </button>
                            <button onClick={() => onNavigate('admin-documents', { group: group.id })} className="text-center group hover:bg-gray-700 p-2 rounded-lg transition-colors">
                                <p className="flex items-center gap-2 text-gray-300 group-hover:text-white"><DocumentIcon className="w-4 h-4 text-gray-500 group-hover:text-gray-300" /> Documentos</p>
                                <p className="text-2xl font-bold group-hover:text-white">{group.docCount}</p>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
             {groups.length === 0 && <div className="bg-gray-800 p-10 rounded-lg border border-gray-700"><p className="text-center text-gray-500">No hay grupos creados.</p></div>}


            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentGroup?.id ? "Editar Grupo" : "Crear Nuevo Grupo"}>
                <form onSubmit={handleSubmit} className="text-gray-300">
                    <div className="mb-4">
                        <label className="block mb-1">Nombre del Grupo *</label>
                        <input type="text" value={currentGroup?.name || ''} onChange={e => setCurrentGroup(prev => ({...prev, name: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white" required/>
                    </div>
                     <div className="mb-4">
                        <label className="block mb-1">Descripción</label>
                        <textarea value={currentGroup?.description || ''} onChange={e => setCurrentGroup(prev => ({...prev, description: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white" rows={3}></textarea>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-1">Color</label>
                        <div className="flex gap-2">
                            {GROUP_COLORS.map(color => (
                                <button type="button" key={color} onClick={() => setCurrentGroup(prev => ({...prev, color: color}))} className={`w-8 h-8 rounded-full border-2 ${currentGroup?.color === color ? 'border-white' : 'border-transparent'}`} style={{backgroundColor: color}}></button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancelar</button>
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

export default AdminGroupsView;