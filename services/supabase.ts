import { createClient } from '@supabase/supabase-js';
import { Document, Group, Profile } from '../types';

const supabaseUrl = 'https://wlrrzuucbjhxsbjgnogd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndscnJ6dXVjYmpoeHNiamdub2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjMyMzEsImV4cCI6MjA3ODYzOTIzMX0.DIM6mYVUOC9Ub9qyThgx9dZBjJj10k8cfrYdCGRmiqw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('*, groups(*)').eq('id', userId).single();
  if (error) throw error;
  return data as Profile;
};

export const getAllProfiles = async () => {
  const { data, error } = await supabase.from('profiles').select('*, groups(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data as Profile[];
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
    // FIX: Removed .select().single() to prevent potential recursion issues with RLS policies.
    // The calling components refetch data manually, so the return value is not needed.
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId);
    if (error) throw error;
    return data;
}

export const getAllDocuments = async () => {
    // RLS in Supabase will automatically filter this for non-admin users
    const { data, error } = await supabase.from('documents').select('*, groups(*)').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Document[];
};

export const getDocumentDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage.from('judo_resources').createSignedUrl(filePath, 60); // URL valid for 60 seconds
    if (error) throw error;
    return data.signedUrl;
};

export const uploadDocumentFile = async (file: File) => {
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const { data, error } = await supabase.storage.from('judo_resources').upload(fileName, file);
    if (error) throw error;
    return data;
};

export const createDocument = async (doc: Partial<Document>) => {
    // FIX: Removed .select().single() to fix "stack depth limit exceeded" error.
    // This server-side error is likely caused by recursive RLS policies when the DB
    // tries to return the inserted row. Removing .select() makes this a "fire-and-forget"
    // insert, and the UI relies on a subsequent fetch to update.
    const { data, error } = await supabase.from('documents').insert([doc]);
    if (error) throw error;
    return data;
};

export const updateDocument = async (docId: string, updates: Partial<Document>) => {
    // FIX: Removed .select().single() to prevent potential recursion issues with RLS policies.
    const { data, error } = await supabase.from('documents').update(updates).eq('id', docId);
    if (error) throw error;
    return data;
};


export const deleteDocument = async (docId: string, filePath: string) => {
    const { error: storageError } = await supabase.storage.from('judo_resources').remove([filePath]);
    if(storageError) throw storageError;

    const { error: dbError } = await supabase.from('documents').delete().eq('id', docId);
    if(dbError) throw dbError;
}

export const getAllGroups = async () => {
    const { data, error } = await supabase.from('groups').select('*').order('name');
    if (error) throw error;
    return data as Group[];
}

export const createGroup = async (group: Partial<Group>) => {
    // FIX: Removed .select().single() to prevent potential recursion issues with RLS policies.
    const { data, error } = await supabase.from('groups').insert([group]);
    if (error) throw error;
    return data;
}

export const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    // FIX: Removed .select().single() to prevent potential recursion issues with RLS policies.
    const { data, error } = await supabase.from('groups').update(updates).eq('id', groupId);
    if (error) throw error;
    return data;
}

export const deleteGroup = async (groupId: string) => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) throw error;
}

export const getGroupUserCount = async (groupId: string) => {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
    if (error) throw error;
    return count || 0;
}

export const getGroupDocumentCount = async (groupId: string) => {
    const { count, error } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('group_id', groupId);
    if (error) throw error;
    return count || 0;
}

export const createAuthUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
};

export const deleteUserProfile = async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
        console.error("Error deleting profile:", error);
        throw error;
    }
    // Deleting the auth user requires admin privileges (service_role key)
    // and should be done from a secure backend to avoid exposing keys.
    // For this example, we only delete the profile data.
    console.warn(`Profile for user ${userId} deleted. The auth user still exists.`);
}