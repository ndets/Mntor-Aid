export type Role = 'student' | 'mentor' | 'admin' | null;

export type Screen = 'welcome' | 'onboarding' | 'signin' | 'dashboard' | 'admin' | 'resources';

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  label: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'mentor' | 'admin';
  specialty: string;
  bio: string;
  skills: string[];
  avatar: string;
  hourlyRate?: number;
  company?: string;
  experience?: number;
  rating?: number;
  reviewCount?: number;
  availability?: AvailabilitySlot[];
  targetJob?: string;
  isAiBacked?: boolean;
}

export interface MentorProfile {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string | null;
  reviewNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalMentors: number;
  activeUsers: number;
  totalSessions: number;
  pendingMentors: number;
  approvedMentors: number;
  openSupportRequests: number;
}

export interface Session {
  id: string;
  mentorId: string;
  studentId: string;
  mentorName: string;
  studentName: string;
  mentorAvatar: string;
  studentAvatar: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'approved' | 'declined';
  topic: string;
  createdAt: string;
  scheduledAt?: string;
  durationMinutes?: number;
  availabilitySlotId?: string;
  notes?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface ChatContact {
  chatId: string;
  contact: Profile;
  lastMessage: string | null;
}

/** Backend API shapes */
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'mentor' | 'admin';
  specialty: string;
  bio: string;
  skills: string[];
  avatarUrl: string;
  targetJob?: string | null;
  company?: string | null;
  experience?: number | null;
  hourlyRate?: number | null;
  rating?: number;
  reviewCount?: number;
  isAiBacked?: boolean;
  availability?: AvailabilitySlot[];
  isActive?: boolean;
  mentorProfile?: MentorProfile;
}

export interface ApiSession {
  id: string;
  mentorId: string;
  studentId: string;
  mentorName: string;
  studentName: string;
  mentorAvatarUrl: string;
  studentAvatarUrl: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'pending' | 'approved' | 'declined';
  topic: string;
  createdAt: string;
  availabilitySlotId?: string | null;
}

export interface ApiMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string;
}
