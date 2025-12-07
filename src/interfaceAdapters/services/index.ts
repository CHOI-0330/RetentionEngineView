/**
 * Services exports
 * V2 Architecture - Pure Business Logic Layer
 */

// Dashboard Services
export { StudentDashboardService } from "./StudentDashboardService";
export type {
  StudentDashboardViewModel,
  ConversationViewModel,
} from "./StudentDashboardService";

export { MentorDashboardService } from "./MentorDashboardService";
export type { MentorDashboardViewModel } from "./MentorDashboardService";

// Chat Services
export { StudentChatService } from "./StudentChatService";
export type {
  StudentChatViewModel,
  MessageViewModel,
} from "./StudentChatService";

export { MentorStudentChatService } from "./MentorStudentChatService";
export type { MentorStudentChatViewModel } from "./MentorStudentChatService";

// Avatar Service
export { AvatarSettingsService } from "./AvatarSettingsService";
export type { AvatarSettingsViewModel } from "./AvatarSettingsService";

// Auth Service
export { AuthService } from "./AuthService";
export type {
  AuthRegisterViewModel,
  AuthLoginViewModel,
  AuthSessionViewModel,
  AuthViewModel,
} from "./AuthService";

// Profile Service
export { ProfileService } from "./ProfileService";
export type { MbtiInfoViewModel, ProfileViewModel } from "./ProfileService";
