const KEY = "foreman-projects";

export function loadProjects() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveProjects(projects) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}

export function createProject({ name }) {
  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    createdAt: new Date().toISOString(),
  };
}
