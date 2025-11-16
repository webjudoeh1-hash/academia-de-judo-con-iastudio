import { createClient } from '@supabase/supabase-js';
// FIX: Import UserRole enum to fix type error.
import { Document, Group, Profile, UserRole } from '../types';

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
    // Step 1: Un-assign all users from this group to satisfy foreign key constraints.
    const { error: userError } = await supabase
        .from('profiles')
        .update({ group_id: null })
        .eq('group_id', groupId);
    if (userError) {
        console.error('Error un-assigning users from group:', userError);
        throw userError;
    }

    // Step 2: Un-assign all documents from this group.
    const { error: docError } = await supabase
        .from('documents')
        .update({ group_id: null })
        .eq('group_id', groupId);
    if (docError) {
        console.error('Error un-assigning documents from group:', docError);
        throw docError;
    }
    
    // Step 3: Now that there are no dependencies, delete the group itself.
    const { error: groupError } = await supabase.from('groups').delete().eq('id', groupId);
    if (groupError) {
        console.error('Error deleting group:', groupError);
        throw groupError;
    }
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

export const adminCreateUser = async (userData: Partial<Profile> & { email: string; password?: string; }) => {
    // Step 1: Create the auth user.
    // This will send a confirmation email if enabled, but the admin remains logged in.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password!,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed in authentication.');
    
    // Step 2: Create the user's profile with the data provided.
    // The admin has privileges to insert into the profiles table.
    const profileData: Omit<Profile, 'id' | 'created_at' | 'groups'> = {
        email: authData.user.email,
        full_name: userData.full_name,
        surnames: userData.surnames,
        phone: userData.phone,
        age: userData.age,
        address: userData.address,
        tutor_name: userData.tutor_name,
        belt: userData.belt,
        group_id: userData.group_id === '' ? null : userData.group_id,
        // FIX: Replaced string literal 'user' with UserRole.User enum to satisfy TypeScript type checking.
        role: userData.role || UserRole.User,
        is_active: true,
    };
    
    const { error: profileError } = await supabase.from('profiles').update(profileData).eq('id', authData.user.id);
    if (profileError) {
        // Optional: Attempt to clean up the created auth user if profile creation fails.
        // This requires an admin client, so we'll just throw the error here.
        console.error("Auth user was created, but profile creation failed.", profileError);
        throw profileError;
    }
    
    return authData.user;
};

export const setUserActiveStatus = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
    
    if (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
}