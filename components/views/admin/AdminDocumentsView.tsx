import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../App';
import { Document, Group } from '../../../types';
import { getAllDocuments, getAllGroups, createDocument, updateDocument, deleteDocument, uploadDocumentFile } from '../../../services/supabase';
import Modal from '../../ui/Modal';
import { SpinnerIcon, PlusIcon, EditIcon, DeleteIcon, SearchIcon } from '../../icons';

const AdminDocumentsView = ({ initialFilter }: { initialFilter?: any }) => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentDoc, setCurrentDoc] = useState<Partial<Document> | null>(null);
    const [file, setFile] = useState<File | null>(null);
    
    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'document' | 'image'>('all');
    const [groupFilter, setGroupFilter] = useState('all');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docsData, groupsData] = await Promise.all([getAllDocuments(), getAllGroups()]);
            setDocuments(docsData);
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

    useEffect(() => {
        if (initialFilter && initialFilter.group) {
            setGroupFilter(initialFilter.group);
        }
    }, [initialFilter]);

    const filteredDocuments = useMemo(() => {
        return documents
            .filter(doc => typeFilter === 'all' || doc.file_type === typeFilter)
            .filter(doc => groupFilter === 'all' || doc.group_id === groupFilter || (groupFilter === 'none' && !doc.group_id))
            .filter(doc =>
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [documents, searchTerm, typeFilter, groupFilter]);

    const openModal = (doc: Partial<Document> | null = null) => {
        setCurrentDoc(doc ? { ...doc } : { title: '', description: '', file_type: 'document', group_id: '' });
        setFile(null);
        setIsModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentDoc || !user) return;

        setIsSaving(true);
        setIsUploading(false);

        try {
            if (!currentDoc.id) { // Creating a new document
                if (!file) {
                    alert('Por favor, selecciona un archivo para subir.');
                    setIsSaving(false);
                    return;
                }
                setIsUploading(true);
                const uploadData = await uploadDocumentFile(file);
                const filePath = uploadData.path;
                setIsUploading(false);

                // Explicitly construct the object to ensure no extra properties are sent.
                const newDocData: Partial<Document> = {
                    title: currentDoc.title || '',
                    description: currentDoc.description,
                    file_type: currentDoc.file_type || 'document',
                    file_path: filePath,
                    uploader_id: user.id,
                    uploader_email: user.email,
                    group_id: currentDoc.group_id === '' ? null : currentDoc.group_id,
                };
                await createDocument(newDocData);

            } else { // Updating an existing document
                // Explicitly pick only the fields that should be updated.
                // This prevents sending joined data ('groups') or read-only fields.
                const updatedDocData: Partial<Document> = {
                    title: currentDoc.title,
                    description: currentDoc.description,
                    file_type: currentDoc.file_type,
                    group_id: currentDoc.group_id === '' ? null : currentDoc.group_id,
                };
                await updateDocument(currentDoc.id, updatedDocData);
            }

            await fetchData();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving document:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`No se pudo guardar el documento. Error: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (doc: Document) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar "${doc.title}"? Esta acción no se puede deshacer.`)) {
            try {
                await deleteDocument(doc.id, doc.file_path);
                await fetchData();
                alert('Documento eliminado correctamente.');
            } catch (error: any) {
                console.error("Error deleting document:", error);
                alert(`No se pudo eliminar el documento: ${error.message}`);
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
                    <h1 className="text-3xl font-bold">Panel de Administración</h1>
                    <p className="text-gray-400">Gestiona los documentos e imágenes de la academia</p>
                </div>
                <button onClick={() => openModal()} className="flex items-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                    <PlusIcon className="w-5 h-5 mr-2"/>
                    Subir Archivo
                </button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4">Documentos Subidos</h2>
                
                {/* Filters */}
                <div className="mb-6">
                    <div className="relative mb-4">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por título o descripción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setTypeFilter('all')} className={`${typeFilter === 'all' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white px-4 py-2 rounded-lg font-semibold`}>Todos</button>
                        <button onClick={() => setTypeFilter('document')} className={`${typeFilter === 'document' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-gray-300 px-4 py-2 rounded-lg font-semibold`}>Documentos</button>
                        <button onClick={() => setTypeFilter('image')} className={`${typeFilter === 'image' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-gray-300 px-4 py-2 rounded-lg font-semibold`}>Imágenes</button>
                        <select
                            value={groupFilter}
                            onChange={e => setGroupFilter(e.target.value)}
                            className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value="all">Todos los grupos</option>
                            <option value="none">Para todos (sin grupo)</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="p-3">Título</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Grupo</th>
                                <th className="p-3">Subido el</th>
                                <th className="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map(doc => (
                                <tr key={doc.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="p-3 font-semibold">{doc.title}</td>
                                    <td className="p-3">{doc.file_type === 'image' ? 'Imagen' : 'Documento'}</td>
                                    <td className="p-3">{doc.groups?.name || <span className="text-gray-400">Para todos</span>}</td>
                                    <td className="p-3 text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td className="p-3 flex justify-end gap-2">
                                        <button onClick={() => openModal(doc)} className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-gray-600"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(doc)} className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-gray-600"><DeleteIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {filteredDocuments.length === 0 && <p className="text-center text-gray-500 py-10">No se encontraron documentos con los filtros actuales.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentDoc?.id ? "Editar Documento" : "Subir Nuevo Archivo"}>
                <form onSubmit={handleSubmit} className="text-gray-300">
                    <div className="mb-4">
                        <label className="block mb-1">Título *</label>
                        <input type="text" value={currentDoc?.title || ''} onChange={e => setCurrentDoc(prev => ({...prev, title: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white" required/>
                    </div>
                     <div className="mb-4">
                        <label className="block mb-1">Descripción</label>
                        <textarea value={currentDoc?.description || ''} onChange={e => setCurrentDoc(prev => ({...prev, description: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white" rows={3}></textarea>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block mb-1">Tipo *</label>
                            <select value={currentDoc?.file_type || 'document'} onChange={e => setCurrentDoc(prev => ({...prev, file_type: e.target.value as 'document' | 'image'}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                                <option value="document">Documento</option>
                                <option value="image">Imagen</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1">Grupo</label>
                            <select value={currentDoc?.group_id || ''} onChange={e => setCurrentDoc(prev => ({...prev, group_id: e.target.value}))} className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                                <option value="">Para todos (ningún grupo)</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>
                    {!currentDoc?.id && (
                        <div className="mb-4">
                            <label className="block mb-1">Archivo *</label>
                            <input type="file" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-800 file:text-red-100 hover:file:bg-red-700"/>
                        </div>
                    )}
                    <div className="mt-6 flex justify-end gap-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:bg-red-800 flex items-center">
                            {isSaving && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            {isUploading ? "Subiendo archivo..." : (isSaving ? "Guardando..." : "Guardar Cambios")}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
};

export default AdminDocumentsView;