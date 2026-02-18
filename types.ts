export enum UserRole {
  ATHLETE = 'ATHLETE',
  COACH = 'COACH',
  ADMIN = 'ADMIN'
}

// Extended User Interface
// Entities
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  avatarUrl: string;
  gymId?: string;
  selectedCoachId?: string; // For athletes
  streak: number;
  points: number;
  gymCode?: string;
  membershipStart?: string; // ISO Date string
  membershipEnd?: string;   // ISO Date string
  lastCheckIn?: string;      // ISO Date string
}

export interface Coach {
  id: string;
  name: string;
  bio: string;
  specialty: string;
  avatarUrl: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  suggestedEquipment: string; // Changed from targetMuscles for simplicity or added
  defaultSets: number;
  defaultReps: number;
  imageUrl?: string;
  targetMuscles?: string[]; // Keep if needed
}

export interface WorkoutExercise {
  id?: string;
  workoutId?: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  completed: boolean;
}

export interface ScheduledWorkout {
  id: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  exercises: WorkoutExercise[];
  completed: boolean;
}

export interface Attendance {
  id: string;
  userId: string;
  checkInTime: string; // ISO Date string
}

export interface Challenge {
  id: string;
  name: string; // Changed from title
  description: string;
  startDate: Date;
  endDate: Date;
  type: 'ATTENDANCE' | 'WORKOUT_COUNT' | 'STREAK';
  targetValue: number;
}

export interface LeaderboardEntry {
  athleteId: string;
  name: string;
  avatarUrl: string;
  attendanceCount: number;
  completedWorkoutCount: number;
  streak: number;
  totalScore: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: Date;
  isAi: boolean;
  // Edit/Delete fields
  editedAt?: Date;
  editedText?: string;
  isDeleted?: boolean;
  deletedForSender?: boolean;
  deletedForReceiver?: boolean;
  deletedAt?: Date;
}

export interface RiskAlert {
  id: string;
  userId: string;
  type: 'MISSED_WORKOUTS' | 'INJURY_RISK' | 'LOW_ATTENDANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  date: Date;
}

export interface MealAnalysis {
  foodName: string;
  ingredients: string[];
  portionSize: string;
  weight: number; // in grams
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  healthScore: number; // 0-100
  advice: string;
  imageUrl?: string;
  timestamp: Date;
}

export interface WorkoutPlan {
  id: string;
  coachId: string;
  athleteId: string;
  date: string; // YYYY-MM-DD
  weekRange?: string;
  notes?: string;
  exercises: PlanExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface PlanExercise {
  id: string;
  planId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  restTime: number; // in seconds
  notes?: string;
  orderIndex: number;
  completed: boolean;
  completedAt?: Date;
}


export enum AppView {
  DASHBOARD = 'dashboard',
  WORKOUTS = 'workouts',
  CHALLENGES = 'challenges',
  MEAL_SCAN = 'meal_scan',
  PROFILE = 'profile',
  STATS = 'stats',
  CHAT = 'chat',
  LEADERBOARD = 'leaderboard',
  ATHLETES = 'athletes',
  ALERTS = 'alerts',
  ASSIGNED_WORKOUTS = 'assigned_workouts',
  WORKOUT_HISTORY = 'workout_history',
  TIMER = 'timer'
}