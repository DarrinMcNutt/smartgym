# 🚀 GymSmart - Setup Instructions

## ⚡ Quick Start

You now have two powerful new features ready to use:
1. **Message Edit & Delete** - Full chat message management
2. **Workout Plan System** - Coach-to-athlete workout assignment

---

## 📝 Step 1: Run Database Migrations

### Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Run Messages Migration

Copy and paste the entire contents of [`messages_migration.sql`](file:///C:/Users/HASSAN/Desktop/antigravity/messages_migration.sql) and click **Run**.

✅ This adds edit/delete functionality to your chat system.

### Run Workout Plans Migration

Copy and paste the entire contents of [`workout_plans_migration.sql`](file:///C:/Users/HASSAN/Desktop/antigravity/workout_plans_migration.sql) and click **Run**.

✅ This creates the workout plan system.

---

## 🔧 Step 2: Verify Installation

### Check Tables

In Supabase Dashboard → **Table Editor**, verify:

- ✅ `messages` table has new columns: `edited_at`, `edited_text`, `is_deleted`, etc.
- ✅ `workout_plans` table exists
- ✅ `plan_exercises` table exists

### Check RLS Policies

In each table, click **Policies** tab:

- ✅ Multiple policies should be visible
- ✅ RLS should be enabled (green toggle)

---

## 🎨 Step 3: Integration (Optional)

The components are ready to use! To fully integrate them into your app:

### Add to App.tsx

```typescript
import { WorkoutPlanCreator } from './components/WorkoutPlanCreator';
import { AssignedWorkouts } from './components/AssignedWorkouts';

// Add state
const [showWorkoutCreator, setShowWorkoutCreator] = useState(false);
const [selectedAthlete, setSelectedAthlete] = useState<{id: string, name: string} | null>(null);

// In CoachDashboard props
onAssignWorkout={(athleteId) => {
  // Get athlete name from your data
  const athlete = athletes.find(a => a.id === athleteId);
  setSelectedAthlete({ id: athleteId, name: athlete?.name || 'Athlete' });
  setShowWorkoutCreator(true);
}}

// Render modal
{showWorkoutCreator && selectedAthlete && (
  <WorkoutPlanCreator
    coachId={user.id}
    athleteId={selectedAthlete.id}
    athleteName={selectedAthlete.name}
    onClose={() => setShowWorkoutCreator(false)}
    onSuccess={() => {
      setShowWorkoutCreator(false);
      // Optionally refresh data
    }}
  />
)}
```

### Add Athlete View

For athletes to see their workouts, add a navigation option:

```typescript
// In athlete navigation
{currentView === AppView.ASSIGNED_WORKOUTS && (
  <AssignedWorkouts
    athleteId={user.id}
    onBack={() => setCurrentView(AppView.DASHBOARD)}
  />
)}
```

---

## ✨ Features Overview

### Message Edit & Delete

**For Users:**
- Hover over your sent messages → click ⋮ menu
- Choose "Edit Message" to modify text
- Choose "Delete Message" for two options:
  - **Delete for me**: Only you won't see it
  - **Delete for everyone**: Removes for both sides

**Automatic Features:**
- "Edited" label appears on edited messages
- Deleted messages show "This message was deleted"
- Real-time sync across devices

### Workout Plan System

**For Coaches:**
- Click "Assign Workout" on athlete cards
- Select date and add exercises from library
- Configure sets, reps, weight, and rest time
- Add optional coach notes
- Save and assign

**For Athletes:**
- View weekly calendar of assigned workouts
- See all exercise details
- Mark exercises as complete
- Track progress with visual bar
- Read coach notes

---

## 🧪 Testing

### Test Message Edit
1. Send a message in chat
2. Click ⋮ → Edit Message
3. Change text → Save
4. Verify "Edited" label appears

### Test Workout Plan
1. As coach, assign a workout
2. As athlete, view assigned workouts
3. Mark an exercise complete
4. Verify progress updates

---

## 📁 Files Reference

### Database
- `messages_migration.sql` - Chat edit/delete schema
- `workout_plans_migration.sql` - Workout system schema

### Components
- `components/MessageMenu.tsx` - Message dropdown menu
- `components/WorkoutPlanCreator.tsx` - Coach workout creator
- `components/AssignedWorkouts.tsx` - Athlete workout viewer
- `components/Chat.tsx` - Updated with edit/delete

### Services
- `services/workoutPlanService.ts` - Workout CRUD operations

### Types
- `types.ts` - Updated with new interfaces

---

## 🎯 What's Working

✅ Message editing with history
✅ Flexible message deletion
✅ Workout plan creation
✅ Exercise library (15+ exercises)
✅ Athlete workout viewing
✅ Exercise completion tracking
✅ Real-time synchronization
✅ Permission-based access
✅ Progress visualization

---

## 🆘 Troubleshooting

### Messages not editing?
- Check Supabase logs for RPC errors
- Verify `edit_message` function exists
- Ensure user is message sender

### Workout plans not showing?
- Verify migrations ran successfully
- Check RLS policies are enabled
- Confirm coach-athlete relationship exists

### Real-time not working?
- Enable real-time in Supabase project settings
- Check browser console for subscription errors

---

## 📖 Full Documentation

See [`walkthrough.md`](file:///C:/Users/HASSAN/.gemini/antigravity/brain/91d00e49-54ee-492f-b677-b6d71b491534/walkthrough.md) for:
- Detailed architecture
- Complete testing guide
- Security implementation
- Integration examples

---

**Status**: ✅ Ready to Use
**Last Updated**: February 16, 2026

Happy coding! 🎉
