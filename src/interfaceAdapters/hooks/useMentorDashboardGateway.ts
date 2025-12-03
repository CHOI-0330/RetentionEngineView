"use client";

import { useMemo } from "react";
import { MentorDashboardGateway } from "../gateways/api/MentorDashboardGateway";

export interface UseMentorDashboardGatewayOptions {
  accessToken?: string;
}

export interface UseMentorDashboardGatewayResult {
  gateway: MentorDashboardGateway;
}

/**
 * MentorDashboard Gateway 훅
 */
export function useMentorDashboardGateway(
  options: UseMentorDashboardGatewayOptions = {}
): UseMentorDashboardGatewayResult {
  const { accessToken } = options;

  const gateway = useMemo(() => {
    return new MentorDashboardGateway({ accessToken });
  }, [accessToken]);

  return { gateway };
}
