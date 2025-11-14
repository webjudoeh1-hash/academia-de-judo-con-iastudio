
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../App';
import { Document, Group } from '../../types';
import { getAllDocuments, getDocumentDownloadUrl, getAllGroups } from '../../services/supabase';
import { DocumentIcon, ImageIcon, SearchIcon, DownloadIcon, SpinnerIcon } from '../icons';

// FIX: Explicitly type DocumentCard as a React Functional Component (React.FC).
// This correctly types the component's props to be compatible with React's special props like `key`,
// resolving the error about 'key' not existing on the defined prop type.
const DocumentCard: React.FC<{ doc: Document, searchTerm: string }> = ({ doc, searchTerm }) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const url = await getDocumentDownloadUrl(doc.file_path);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('No se pudo descargar el archivo.');
        } finally {
            setIsDownloading(false);
        }
    };

    const highlightText = (text: string | undefined, highlight: string) => {
        if (!text) return '';
        if (!highlight.trim()) {
            return <span>{text}</span>;
        }
        // Escape special characters in highlight string for regex
        const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedHighlight})`, 'gi');
        const parts = text.split(regex);

        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <mark key={i} className="bg-red-500 text-white px-1 rounded-sm">
                            {part}
                        </mark>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };
    
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 flex flex-col justify-between transition-transform hover:scale-105 duration-300">
            <div>
                <div className="flex justify-center items-center h-32 bg-gray-700 rounded-md mb-4">
                    {doc.file_type === 'document' ? <DocumentIcon className="w-16 h-16 text-gray-500" /> : <ImageIcon className="w-16 h-16 text-gray-500" />}
                </div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg break-all">{highlightText(doc.title, searchTerm)}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${doc.file_type === 'document' ? 'bg-blue-600' : 'bg-purple-600'}`}>{doc.file_type === 'document' ? 'Doc' : 'Imagen'}</span>
                </div>
                <p className="text-gray-400 text-sm mb-2 h-10 overflow-hidden">{highlightText(doc.description, searchTerm)}</p>
                <div className="flex items-center text-xs text-red-400 font-semibold">
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: doc.groups?.color || '#6b7280' }}></div>
                  {doc.groups?.name || 'Para todos'}
                </div>
            </div>
            <div className="mt-4">
                <div className="pt-4 border-t border-gray-700 text-xs text-gray-500 mb-4">
                    <p>{new Date(doc.created_at).toLocaleDateString()}</p>
                    <p>{doc.uploader_email}</p>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded transition duration-300 flex items-center justify-center disabled:bg-red-800"
                >
                    {isDownloading ? <SpinnerIcon className="w-5 h-5" /> : <DownloadIcon className="w-5 h-5 mr-2" />}
                    {isDownloading ? 'Descargando...' : 'Descargar'}
                </button>
            </div>
        </div>
    );
};

const DocumentsView = () => {
    const { profile } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'document' | 'image'>('all');
    const [groupFilter, setGroupFilter] = useState('all');

    useEffect(() => {
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
        fetchData();
    }, []);

    const filteredDocuments = useMemo(() => {
        return documents
            .filter(doc => typeFilter === 'all' || doc.file_type === typeFilter)
            .filter(doc => groupFilter === 'all' || doc.group_id === groupFilter || (groupFilter === 'none' && !doc.group_id))
            .filter(doc =>
                doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [documents, searchTerm, typeFilter, groupFilter]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><SpinnerIcon className="w-12 h-12"/></div>
    }

    return (
        <div className="p-8 bg-gray-900 text-white min-h-full">
            <div className="bg-gray-800 p-6 md:p-8 rounded-lg border border-gray-700" style={{ background: 'linear-gradient(145deg, rgba(45, 9, 13, 1) 0%, rgba(26, 26, 26, 1) 100%)' }}>
                <h1 className="text-3xl font-bold mb-2">Documentos y Recursos</h1>
                <p className="text-gray-400 mb-6">Material exclusivo para miembros de la academia</p>
                {profile?.role === 'user' && profile.groups && (
                  <p className="text-sm text-white mb-6 p-3 bg-red-800/50 border border-red-700 rounded-lg">Estás viendo los documentos para tu grupo: <span className="font-bold">{profile.groups.name}</span></p>
                )}

                <div className="relative mb-6">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar documentos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
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

                {filteredDocuments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDocuments.map(doc => <DocumentCard key={doc.id} doc={doc} searchTerm={searchTerm} />)}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-10">No se encontraron documentos con los filtros actuales.</p>
                )}
            </div>
        </div>
    );
};

export default DocumentsView;
