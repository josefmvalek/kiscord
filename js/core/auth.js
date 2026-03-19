import { supabase } from './supabase.js';

/**
 * Supabase Auth Module
 * Handles sign in, sign out, and session state.
 */

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.reload(); // Hard refresh to clear state
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return null;
    return user;
}

export function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}

export function isJosef(user) {
    if (!user || !user.email) return false;
    return user.email.toLowerCase().includes('josef') || user.email.toLowerCase().includes('jozk');
}
