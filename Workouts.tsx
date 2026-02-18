import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { Plus, Calendar as CalendarIcon, CheckCircle2, Dumbbell, X, Search, Save, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { Exercise, ScheduledWorkout, WorkoutExercise } from '../types';
import { supabase, getWorkouts, saveWorkout, toggleExerciseStatus, checkAndSavePR, getWorkoutTemplates } from '../services/supabaseClient';

const INITIAL_EXERCISES: Exercise[] = [
  { id: 'e1', name: 'Barbell Squat', description: 'Compound leg exercise', suggestedEquipment: 'Barbell', defaultSets: 4, defaultReps: 8 },
  { id: 'e2', name: 'Bench Press', description: 'Compound chest exercise', suggestedEquipment: 'Barbell', defaultSets: 3, defaultReps: 10 },
  { id: 'e3', name: 'Deadlift', description: 'Full body compound', suggestedEquipment: 'Barbell', defaultSets: 3, defaultReps: 5 },
  { id: 'e4', name: 'Pull Ups', description: 'Back and biceps', suggestedEquipment: 'Bar', defaultSets: 3, defaultReps: 12 },
  { id: 'e5', name: 'Dumbbell Lunge', description: 'Unilateral leg work', suggestedEquipment: 'Dumbbells', defaultSets: 3, defaultReps: 12 },
  { id: 'e6', name: 'Plank', description: 'Core stability', suggestedEquipment: 'Mat', defaultSets: 3, defaultReps: 60 },
  { id: 'e7', name: 'Push Ups', description: 'Chest and triceps', suggestedEquipment: 'Bodyweight', defaultSets: 3, defaultReps: 15 },
  { id: 'e8', name: 'Lat Pulldown', description: 'Back width', suggestedEquipment: 'Cable Machine', defaultSets: 3, defaultReps: 12 },
  { id: 'e9', name: 'Leg Press', description: 'Leg strength', suggestedEquipment: 'Machine', defaultSets: 4, defaultReps: 12 },
  { id: 'e10', name: 'Shoulder Press', description: 'Shoulder strength', suggestedEquipment: 'Dumbbells', defaultSets: 3, defaultReps: 10 },
];

interface WorkoutsProps {
  athleteId?: string;
  isCoachView?: boolean;
  onBack?: () => void;
}

export const Workouts: React.FC<WorkoutsProps> = ({ athleteId, isCoachView, onBack }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>(INITIAL_EXERCISES);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentAthleteId, setCurrentAthleteId] = useState<string | null>(athleteId || null);
  const [showPR, setShowPR] = useState(false);
  const [prDetails, setPrDetails] = useState({ name: '', weight: 0 });
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Form State for Adding Exercise
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);

  // Form State for Custom Exercise
  const [customName, setCustomName] = useState('');
  const [customEquip, setCustomEquip] = useState('');

  // Calendar Generation
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  useEffect(() => {
    if (!currentAthleteId) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) setCurrentAthleteId(data.user.id);
      });
    }
  }, [athleteId]);

  useEffect(() => {
    if (currentAthleteId) {
      fetchWeekWorkouts();
    }
  }, [currentAthleteId, startDate.toISOString()]);

  const fetchWeekWorkouts = async () => {
    if (!currentAthleteId) return;
    setLoading(true);
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(addDays(startDate, 6), 'yyyy-MM-dd');

    const { data, error } = await getWorkouts(currentAthleteId, startStr, endStr);

    if (data) {
      const formattedWorkouts: ScheduledWorkout[] = data.map((w: any) => ({
        id: w.id,
        athleteId: w.athlete_id,
        date: w.date,
        completed: w.completed,
        exercises: w.exercises.map((ex: any) => ({
          id: ex.id,
          workoutId: ex.workout_id,
          exerciseName: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          completed: ex.completed
        }))
      }));
      setScheduledWorkouts(formattedWorkouts);
    }
    setLoading(false);
  };

  const getCurrentWorkout = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return scheduledWorkouts.find(w => w.date === dateStr);
  };

  const currentWorkout = getCurrentWorkout();

  // Handlers
  const handleOpenLibrary = () => {
    setIsLibraryOpen(true);
  };

  const handleCreateCustomExercise = () => {
    if (!customName.trim()) return;
    const newEx: Exercise = {
      id: `custom_${Date.now()}`,
      name: customName.trim(),
      description: 'Custom exercise',
      suggestedEquipment: customEquip.trim() || 'Other',
      defaultSets: 3,
      defaultReps: 10
    };
    setExercises(prev => [...prev, newEx]);
    setCustomName('');
    setCustomEquip('');
    setIsCreatingCustom(false);
    handleSelectExercise(newEx);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setSets(exercise.defaultSets);
    setReps(exercise.defaultReps);
    setWeight(0);
  };

  const handleSaveToWorkout = async () => {
    if (!editingExercise || !currentAthleteId) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newExercise: WorkoutExercise = {
      exerciseName: editingExercise.name,
      sets,
      reps,
      weight,
      completed: false
    };

    const updatedExercises = currentWorkout
      ? [...currentWorkout.exercises, newExercise]
      : [newExercise];

    const { error } = await saveWorkout(currentAthleteId, dateStr, updatedExercises);

    if (!error) {
      fetchWeekWorkouts();
      setEditingExercise(null);
      setIsLibraryOpen(false);
    }
  };

  const toggleExerciseComplete = async (exercise: WorkoutExercise) => {
    if (isCoachView || !exercise.id) return;

    const { error } = await toggleExerciseStatus(exercise.id, !exercise.completed);
    if (!error) {
      if (!exercise.completed && exercise.weight > 0 && currentAthleteId) {
        checkAndSavePR(currentAthleteId, exercise.exerciseName, exercise.weight).then(({ isNewPR }) => {
          if (isNewPR) {
            setPrDetails({ name: exercise.exerciseName, weight: exercise.weight });
            setShowPR(true);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
        });
      }

      setScheduledWorkouts(prev => prev.map(w => ({
        ...w,
        exercises: w.exercises.map(ex => ex.id === exercise.id ? { ...ex, completed: !ex.completed } : ex)
      })));
    }
  };

  const removeExercise = async (index: number) => {
    if (!currentWorkout || !currentAthleteId) return;

    const updatedExercises = currentWorkout.exercises.filter((_, i) => i !== index);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { error } = await saveWorkout(currentAthleteId, dateStr, updatedExercises);
    if (!error) fetchWeekWorkouts();
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await getWorkoutTemplates(user.id);
      if (data) setTemplates(data);
      setShowTemplateModal(true);
    }
  };

  const applyTemplate = async (template: any) => {
    if (!currentAthleteId || !template.exercises) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Convert template exercises to workout exercises
    // Assuming template.exercises is Array of objects
    const newExercises = template.exercises.map((ex: any) => ({
      exerciseName: ex.name,
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      weight: 0,
      completed: false
    }));

    const { error } = await saveWorkout(currentAthleteId, dateStr, newExercises);
    if (!error) {
      fetchWeekWorkouts();
      setShowTemplateModal(false);
    }
  };

  // -- Library Rendering --
  if (isLibraryOpen) {
    return (
      <div className="pb-24 animate-fade-in min-h-screen bg-zinc-950 absolute inset-0 z-50 overflow-y-auto">
        <div className="sticky top-0 bg-zinc-950/90 backdrop-blur p-4 border-b border-zinc-800 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2 w-full mr-4">
            <Search size={20} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white w-full outline-none placeholder:text-zinc-600 font-medium"
            />
          </div>
          <button onClick={() => setIsLibraryOpen(false)} className="bg-zinc-800 p-2 rounded-full text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!isCreatingCustom ? (
            <button onClick={() => setIsCreatingCustom(true)} className="w-full py-4 bg-zinc-900 rounded-2xl text-lime-400 font-bold border border-zinc-800 hover:border-lime-400 transition-colors flex items-center justify-center space-x-2">
              <Plus size={20} />
              <span>Create Custom Exercise</span>
            </button>
          ) : (
            <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-700 animate-slide-up space-y-3">
              <h4 className="text-white font-bold mb-1">New Exercise Details</h4>
              <input type="text" placeholder="Exercise Name" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full bg-black p-3 rounded-xl text-white outline-none border border-zinc-800 focus:border-lime-400" autoFocus />
              <input type="text" placeholder="Equipment (Optional)" value={customEquip} onChange={(e) => setCustomEquip(e.target.value)} className="w-full bg-black p-3 rounded-xl text-white outline-none border border-zinc-800 focus:border-lime-400" />
              <div className="flex space-x-2 pt-2">
                <button onClick={handleCreateCustomExercise} disabled={!customName.trim()} className="flex-1 bg-lime-400 text-black font-bold py-3 rounded-xl disabled:opacity-50">Save & Configure</button>
                <button onClick={() => setIsCreatingCustom(false)} className="flex-1 bg-zinc-800 text-white font-bold py-3 rounded-xl">Cancel</button>
              </div>
            </div>
          )}

          <h3 className="text-zinc-500 font-bold text-sm uppercase tracking-wider ml-1">Library</h3>
          {filteredExercises.map(ex => (
            <div key={ex.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center group active:scale-95 transition-transform cursor-pointer hover:border-zinc-600" onClick={() => handleSelectExercise(ex)}>
              <div>
                <h3 className="font-bold text-white text-lg">{ex.name}</h3>
                <p className="text-zinc-400 text-sm">{ex.suggestedEquipment}</p>
              </div>
              <button className="bg-zinc-800 text-lime-400 p-2 rounded-full"><Plus size={20} /></button>
            </div>
          ))}
        </div>

        {editingExercise && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end justify-center z-50 animate-slide-up">
            <div className="bg-zinc-900 w-full rounded-t-3xl p-6 border-t border-zinc-800 shadow-2xl pb-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{editingExercise.name}</h3>
                  <p className="text-zinc-400 text-sm">Configure for {format(selectedDate, 'MMM d')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={handleSaveToWorkout} className="bg-lime-400 text-black font-bold px-4 py-2 rounded-xl text-sm hover:brightness-110 transition-all shadow-lg shadow-lime-400/20 flex items-center space-x-1">
                    <Save size={16} />
                    <span>{isCoachView ? 'Assign' : 'Add'}</span>
                  </button>
                  <button onClick={() => setEditingExercise(null)} className="text-zinc-400 p-2 bg-zinc-800 rounded-full hover:text-white"><X size={20} /></button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-black p-4 rounded-2xl text-center border border-zinc-800">
                  <label className="text-zinc-500 text-xs font-bold uppercase block mb-2">Sets</label>
                  <div className="flex items-center justify-center space-x-3">
                    <button onClick={() => setSets(s => Math.max(1, s - 1))} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">-</button>
                    <span className="text-2xl font-bold text-white w-8">{sets}</span>
                    <button onClick={() => setSets(s => s + 1)} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">+</button>
                  </div>
                </div>
                <div className="bg-black p-4 rounded-2xl text-center border border-zinc-800">
                  <label className="text-zinc-500 text-xs font-bold uppercase block mb-2">Reps</label>
                  <div className="flex items-center justify-center space-x-3">
                    <button onClick={() => setReps(r => Math.max(1, r - 1))} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">-</button>
                    <span className="text-2xl font-bold text-white w-8">{reps}</span>
                    <button onClick={() => setReps(r => r + 1)} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">+</button>
                  </div>
                </div>
                <div className="bg-black p-4 rounded-2xl text-center border border-zinc-800">
                  <label className="text-zinc-500 text-xs font-bold uppercase block mb-2">Weight</label>
                  <div className="flex items-center justify-center space-x-3">
                    <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">-</button>
                    <span className="text-2xl font-bold text-white w-12">{weight}</span>
                    <button onClick={() => setWeight(w => w + 2.5)} className="text-lime-400 text-xl font-bold w-8 h-8 flex items-center justify-center bg-lime-400/10 rounded-full">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -- Main View Rendering --
  return (
    <div className="pb-24 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white">{isCoachView ? 'Assign Workouts' : 'My Workouts'}</h1>
            <p className="text-zinc-400 text-sm">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          {onBack && (
            <button onClick={onBack} className="bg-zinc-900 p-2 rounded-full text-zinc-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex justify-between items-center bg-zinc-900 p-2 rounded-2xl border border-zinc-800">
          <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 text-zinc-500"><ChevronLeft size={20} /></button>
          {dates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const dateStr = format(date, 'yyyy-MM-dd');
            const hasWorkout = scheduledWorkouts.some(w => w.date === dateStr && w.exercises.length > 0);

            return (
              <button key={date.toString()} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all ${isSelected ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                <span className="text-[10px] font-bold uppercase">{format(date, 'EEE')}</span>
                <span className={`text-lg font-bold ${isSelected ? 'text-black' : 'text-zinc-400'}`}>{format(date, 'd')}</span>
                {hasWorkout && !isSelected && <div className="w-1 h-1 bg-lime-400 rounded-full mt-1"></div>}
              </button>
            );
          })}
          <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 text-zinc-500"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-lime-400/20 border-t-lime-400 rounded-full animate-spin"></div>
            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Fetching schedule...</p>
          </div>
        ) : currentWorkout && currentWorkout.exercises.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-lg">{isCoachView ? 'Planned Program' : 'Daily Plan'}</h3>
              <span className="text-lime-400 text-xs font-bold bg-lime-400/10 px-3 py-1 rounded-full">
                {currentWorkout.exercises.filter(e => e.completed).length}/{currentWorkout.exercises.length} {isCoachView ? 'Items' : 'Completed'}
              </span>
            </div>

            {currentWorkout.exercises.map((item, index) => (
              <div key={index} className={`bg-zinc-900 p-4 rounded-3xl border ${item.completed ? 'border-lime-500/30 bg-lime-900/10' : 'border-zinc-800'} transition-all group`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-2xl ${item.completed ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${item.completed ? 'text-lime-400' : 'text-white'}`}>{item.exerciseName}</h4>
                      <p className="text-zinc-500 text-xs">{item.sets} Sets × {item.reps} Reps • {item.weight > 0 ? item.weight + 'kg' : 'Bodyweight'}</p>
                    </div>
                  </div>
                  {isCoachView ? (
                    <button onClick={() => removeExercise(index)} className="text-zinc-600 hover:text-red-400 p-2 transition-colors">
                      <X size={18} />
                    </button>
                  ) : (
                    <button onClick={() => toggleExerciseComplete(item)} className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${item.completed ? 'bg-lime-400 border-lime-400 text-black' : 'border-zinc-600 text-transparent hover:border-lime-400'}`}>
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button onClick={handleOpenLibrary} className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-400 font-bold hover:border-lime-400 hover:text-lime-400 transition-colors flex items-center justify-center space-x-2">
              <Plus size={20} />
              <span>{isCoachView ? 'Add Exercise' : 'Add Custom Exercise'}</span>
            </button>
            {isCoachView && (
              <button onClick={handleOpenTemplates} className="w-full py-4 mt-2 rounded-2xl bg-zinc-800 text-zinc-400 font-bold hover:bg-zinc-700 hover:text-white transition-colors flex items-center justify-center space-x-2">
                <Copy size={20} />
                <span>Load from Template</span>
              </button>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-6 text-center p-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-2">
              <CalendarIcon size={40} className="text-zinc-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{isCoachView ? 'No Plan Set' : 'No Workout Planned'}</h2>
              <p className="text-zinc-400">{isCoachView ? `Assign a program for ${format(selectedDate, 'EEEE')}.` : `Take a rest day or create a plan for ${format(selectedDate, 'EEEE')}.`}</p>
            </div>
            <button onClick={handleOpenLibrary} className="bg-lime-400 text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-lime-400/20">
              {isCoachView ? 'Build Day Plan' : 'Create Plan for Today'}
            </button>
            {isCoachView && (
              <button onClick={handleOpenTemplates} className="mt-4 text-zinc-400 text-sm font-bold flex items-center gap-2 hover:text-white">
                <Copy size={16} /> Load Template
              </button>
            )}
          </div>
        )}
      </div>

      {showPR && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowPR(false)}>
          <div className="bg-zinc-900 border border-lime-400 p-8 rounded-3xl text-center shadow-2xl shadow-lime-400/20 transform scale-100 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">New Record!</h2>
            <p className="text-zinc-400 mb-6">You just crushed your PR for</p>
            <div className="bg-lime-400/10 p-4 rounded-xl border border-lime-400/30 mb-6">
              <h3 className="text-xl font-bold text-white">{prDetails.name}</h3>
              <div className="text-4xl font-black text-lime-400 mt-1">{prDetails.weight} <span className="text-lg text-lime-400/70">kg</span></div>
            </div>
            <button onClick={() => setShowPR(false)} className="bg-lime-400 text-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform">Awesome!</button>
          </div>
        </div>
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-zinc-900 w-full max-w-md rounded-3xl p-6 border border-zinc-800 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Select Template</h3>
              <button onClick={() => setShowTemplateModal(false)}><X className="text-zinc-500" /></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {templates.length === 0 ? (
                <p className="text-zinc-500 text-center">No templates found.</p>
              ) : (
                templates.map(t => (
                  <button key={t.id} onClick={() => applyTemplate(t)} className="w-full text-left bg-black p-4 rounded-xl border border-zinc-800 hover:border-lime-400 transition-colors">
                    <h4 className="font-bold text-white">{t.name}</h4>
                    <p className="text-zinc-500 text-xs">{t.description}</p>
                    <p className="text-zinc-600 text-[10px] mt-1">{t.exercises?.length || 0} Exercises</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};