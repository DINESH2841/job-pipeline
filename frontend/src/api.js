const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const RANGE = import.meta.env.VITE_GOOGLE_SHEET_RANGE || "Jobs!A:G";

export async function fetchJobsFromSheet() {
  if (!SHEET_ID) {
    throw new Error("Missing VITE_GOOGLE_SHEET_ID in frontend env.");
  }

  // Use backend proxy endpoint instead of direct API call
  const encodedRange = encodeURIComponent(RANGE);
  const url = `/api/sheets/${SHEET_ID}/values/${encodedRange}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const rows = data.values || [];

  return rows.slice(1).map((row, index) => ({
    id: `${row[0] || "ts"}-${row[5] || index}`,
    timestamp: row[0] || "",
    title: row[1] || "Untitled",
    company: row[2] || "Unknown",
    location: row[3] || "Unknown",
    score: Number(row[4] || 0),
    link: row[5] || "#",
    group: row[6] || "Low"
  }));
}
