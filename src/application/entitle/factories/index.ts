/**
 * Factories exports
 * V2 Architecture - Service Creation Layer
 */

// Dashboard Factories
export { createStudentDashboardService } from "./StudentDashboardFactory";
export type { StudentDashboardFactoryConfig } from "./StudentDashboardFactory";

export { createMentorDashboardService } from "./MentorDashboardFactory";
export type { MentorDashboardFactoryConfig } from "./MentorDashboardFactory";

// Chat Factories
export { createStudentChatService } from "./StudentChatFactory";
export type { StudentChatFactoryConfig } from "./StudentChatFactory";

export { createMentorStudentChatService } from "./MentorStudentChatFactory";
export type { MentorStudentChatFactoryConfig } from "./MentorStudentChatFactory";

// Avatar Factory
export { createAvatarSettingsService } from "./AvatarSettingsFactory";
export type { AvatarSettingsFactoryConfig } from "./AvatarSettingsFactory";
