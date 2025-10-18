import {
  SupabaseFeedbackGateway,
  SupabaseFeedbackLookupGateway,
  SupabaseMentorAssignmentGateway,
  SupabaseMentorDashboardGateway,
  SupabaseMessageGateway,
} from "./index";

export const createSupabaseGateways = () => ({
  messagePort: new SupabaseMessageGateway(),
  feedbackPort: new SupabaseFeedbackGateway(),
  mentorAssignmentPort: new SupabaseMentorAssignmentGateway(),
  feedbackLookupPort: new SupabaseFeedbackLookupGateway(),
  dashboardPort: new SupabaseMentorDashboardGateway(),
});

