"use client";

import { useMemo } from "react";
import { StudentDashboardGateway } from "../gateways/api/StudentDashboardGateway";

export interface UseStudentDashboardGatewayOptions {
  accessToken?: string;
}

export interface UseStudentDashboardGatewayResult {
  gateway: StudentDashboardGateway;
}

/**
 * StudentDashboard Gateway 훅
 */
export function useStudentDashboardGateway(
  options: UseStudentDashboardGatewayOptions = {}
): UseStudentDashboardGatewayResult {
  const { accessToken } = options;

  const gateway = useMemo(() => {
    return new StudentDashboardGateway({ accessToken });
  }, [accessToken]);

  return { gateway };
}
