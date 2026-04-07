export async function apiFetch<T>(url: string, options?: RequestInit, maxRetries = 3): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError;
}
