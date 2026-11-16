const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

/** JSON transport only; feature-specific endpoints belong to features/<name>/api. */
export async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, options);
  if (!response.ok) throw new Error(`API trả mã ${response.status}`);
  return response.json() as Promise<T>;
}
