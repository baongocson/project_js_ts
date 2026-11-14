const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export async function getHealth(signal?: AbortSignal): Promise<{ status: string; stage: string; database: string }> {
  const response = await fetch(`${baseUrl}/health`, { signal });
  if (!response.ok) throw new Error(`API trả mã ${response.status}`);
  return response.json();
}
// Bổ sung Bearer token trong bộ nhớ và single-flight refresh trước khi gọi API có xác thực.
