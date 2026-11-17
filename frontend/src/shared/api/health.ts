import { requestJson } from './http-client';

export interface HealthResponse {
  status: string;
  stage: string;
  database: string;
}

// Operational endpoint shared by the application shell; not a business feature.
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return requestJson<HealthResponse>('health', { signal, auth: false });
}
