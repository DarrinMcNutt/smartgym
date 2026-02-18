import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Plus, Trash2, Edit, Copy, ChevronDown, ChevronUp, Save, X, Dumbbell, Flame, Activity } from 'lucide-react';

interface Template {
    id: string;
    name: string;
    description: string;
    exercises: any[]; // JSON
}

export const WorkoutTemplates: React.FC<{ coachId: string }> = ({ coachId }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [newTemplate, setNewTemplate] = useState({ name: '', description: '', exercises: [] as any[] });

    // Exercise Form State
    const [exName, setExName] = useState('');
    const [exSets, setExSets] = useState(3);
    const [exReps, setExReps] = useState(10);

    useEffect(() => {
        fetchTemplates();
    }, [coachId]);

    const fetchTemplates = async () => {
        const { data } = await supabase
            .from('workout_templates')
            .select('*')
            .eq('coach_id', coachId);
        if (data) setTemplates(data);
    };

    const handleCreateOrUpdate = async () => {
        const templateData = editingTemplate || newTemplate;
        if (!templateData.name) return;

        if (editingTemplate) {
            const { error } = await supabase.from('workout_templates').update({
                name: templateData.name,
                description: templateData.description,
                exercises: templateData.exercises
            }).eq('id', editingTemplate.id);

            if (!error) {
                setEditingTemplate(null);
                fetchTemplates();
            }
        } else {
            const { error } = await supabase.from('workout_templates').insert({
                coach_id: coachId,
                name: templateData.name,
                description: templateData.description,
                exercises: templateData.exercises
            });

            if (!error) {
                setIsCreating(false);
                setNewTemplate({ name: '', description: '', exercises: [] });
                fetchTemplates();
            }
        }
    };

    const deleteTemplate = async (id: string) => {
        if (confirm('Delete this template?')) {
            await supabase.from('workout_templates').delete().eq('id', id);
            fetchTemplates();
        }
    };

    const addExerciseToTemplate = () => {
        if (!exName) return;
        const newEx = { name: exName, sets: exSets, reps: exReps };
        if (editingTemplate) {
            setEditingTemplate({ ...editingTemplate, exercises: [...editingTemplate.exercises, newEx] });
        } else {
            setNewTemplate({ ...newTemplate, exercises: [...newTemplate.exercises, newEx] });
        }
        setExName('');
        setExSets(3);
        setExReps(10);
    };

    const removeExerciseFromTemplate = (index: number) => {
        if (editingTemplate) {
            const newExs = [...editingTemplate.exercises];
            newExs.splice(index, 1);
            setEditingTemplate({ ...editingTemplate, exercises: newExs });
        } else {
            const newExs = [...newTemplate.exercises];
            newExs.splice(index, 1);
            setNewTemplate({ ...newTemplate, exercises: newExs });
        }
    };

    const openEdit = (t: Template) => {
        setEditingTemplate(t);
    };

    const activeTemplate = editingTemplate || (isCreating ? newTemplate : null);

    return (
        <div className="space-y-4 pb-24">
            {/* Quick Create Presets */}
            {/* Quick Create Presets Removed */}

            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Your Templates</h2>
                {!activeTemplate && (
                    <button onClick={() => setIsCreating(true)} className="bg-zinc-800 text-white p-2 rounded-full hover:bg-zinc-700 transition-colors">
                        <Plus size={20} />
                    </button>
                )}
            </div>

            {activeTemplate && (
                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-700 animate-slide-up space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-white">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
                        <button onClick={() => { setIsCreating(false); setEditingTemplate(null); }}><X className="text-zinc-500" /></button>
                    </div>

                    <input
                        className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white"
                        placeholder="Template Name"
                        value={activeTemplate.name}
                        onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, name: e.target.value }) : setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                    <input
                        className="w-full bg-black border border-zinc-800 p-3 rounded-lg text-white"
                        placeholder="Description"
                        value={activeTemplate.description}
                        onChange={e => editingTemplate ? setEditingTemplate({ ...editingTemplate, description: e.target.value }) : setNewTemplate({ ...newTemplate, description: e.target.value })}
                    />

                    <div className="bg-black p-3 rounded-lg border border-zinc-800 space-y-3">
                        <h4 className="text-zinc-400 text-xs uppercase font-bold">Exercises</h4>
                        {activeTemplate.exercises.length === 0 && <p className="text-zinc-600 text-sm italic">No exercises added.</p>}
                        {activeTemplate.exercises.map((ex, i) => (
                            <div key={i} className="flex justify-between items-center bg-zinc-900 p-2 rounded border border-zinc-800">
                                <div>
                                    <p className="font-bold text-white text-sm">{ex.name}</p>
                                    <p className="text-zinc-500 text-xs">{ex.sets} Sets x {ex.reps} Reps</p>
                                </div>
                                <button onClick={() => removeExerciseFromTemplate(i)} className="text-zinc-600 hover:text-red-400"><X size={16} /></button>
                            </div>
                        ))}

                        <div className="flex gap-2 items-end pt-2 border-t border-zinc-800 mt-2">
                            <div className="flex-1">
                                <label className="text-[10px] text-zinc-500 uppercase">Exercise</label>
                                <input className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white text-sm" value={exName} onChange={e => setExName(e.target.value)} placeholder="Name" />
                            </div>
                            <div className="w-16">
                                <label className="text-[10px] text-zinc-500 uppercase">Sets</label>
                                <input type="number" className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white text-sm" value={exSets} onChange={e => setExSets(Number(e.target.value))} />
                            </div>
                            <div className="w-16">
                                <label className="text-[10px] text-zinc-500 uppercase">Reps</label>
                                <input type="number" className="w-full bg-zinc-900 border border-zinc-700 p-2 rounded text-white text-sm" value={exReps} onChange={e => setExReps(Number(e.target.value))} />
                            </div>
                            <button onClick={addExerciseToTemplate} className="bg-zinc-800 text-lime-400 p-2 rounded hover:bg-zinc-700 mb-[1px]"><Plus size={20} /></button>
                        </div>
                    </div>

                    <button onClick={handleCreateOrUpdate} className="w-full bg-lime-400 text-black font-bold py-3 rounded-xl hover:scale-105 transition-transform">
                        {editingTemplate ? 'Update Template' : 'Create Template'}
                    </button>
                </div>
            )}

            {!activeTemplate && (
                <div className="space-y-3">
                    {templates.map(t => (
                        <div key={t.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center group hover:border-lime-500/30 transition-colors">
                            <div>
                                <h3 className="font-bold text-white">{t.name}</h3>
                                <p className="text-zinc-500 text-xs">{t.description || 'No description'}</p>
                                <p className="text-zinc-600 text-[10px] mt-1">{t.exercises?.length || 0} Exercises</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEdit(t)} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white"><Edit size={16} /></button>
                                <button onClick={() => deleteTemplate(t.id)} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <p className="text-center text-zinc-500 py-8">No templates found. Create one to get started.</p>
                    )}
                </div>
            )}
        </div>
    );
};
