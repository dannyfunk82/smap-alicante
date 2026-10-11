export async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Il server ha restituito una risposta non valida (${response.status}). ${text.slice(0, 80)}`);
  }
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Errore HTTP ${response.status}`);
  return body;
}
