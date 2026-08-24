/**
 * VUT FIT Study Planner Store, Data Persistence & Grading Calculations
 */

import { supabase } from '@core/supabase.js';

let activeTab = 'points'; // 'points' | 'deadlines'
let subjectsData = [];
let deadlinesData = [];

export function getActiveTab() {
    return activeTab;
}

export function setActiveTab(tab) {
    activeTab = tab;
}

export function getSubjectsData() {
    return subjectsData;
}

export function setSubjectsData(data) {
    subjectsData = data;
}

export function getDeadlinesData() {
    return deadlinesData;
}

export function setDeadlinesData(data) {
    deadlinesData = data;
}

export async function loadSubjects() {
    try {
        const { data, error } = await supabase.from('school_subjects').select('*').order('created_at');
        if (!error && data) subjectsData = data;
    } catch (e) {
        console.warn("[StudyPlanner] Subjects load fallback:", e);
    }
    return subjectsData;
}

export async function loadDeadlines() {
    try {
        const { data, error } = await supabase.from('school_deadlines').select('*');
        if (!error && data) deadlinesData = data;
    } catch (e) {
        console.warn("[StudyPlanner] Deadlines load fallback:", e);
    }
    return deadlinesData;
}

export function calculateGrade(totalPoints) {
    if (totalPoints >= 90) return { letter: 'A', color: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' };
    if (totalPoints >= 80) return { letter: 'B', color: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300' };
    if (totalPoints >= 70) return { letter: 'C', color: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' };
    if (totalPoints >= 60) return { letter: 'D', color: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' };
    if (totalPoints >= 50) return { letter: 'E', color: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' };
    return { letter: 'F', color: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' };
}

export function getDeadlineTypeBadge(type) {
    switch (type) {
        case 'Projekt':
            return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        case 'Půlsemestrálka':
            return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
        case 'Zkouška':
            return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
        default:
            return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    }
}
