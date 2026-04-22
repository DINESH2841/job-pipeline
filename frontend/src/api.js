const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export async function fetchJobsFromApi() {
  const res = await fetch(`${BACKEND_BASE_URL}/api/jobs`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend API error: ${res.status} ${text}`);
  }

  return res.json();
}
