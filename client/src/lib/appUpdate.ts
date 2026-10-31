const REPO = 'brandonxf/LifeOS-2.0';
const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 6; // cada 6h alcanza, no hace falta pegarle a GitHub en cada apertura
const LAST_CHECK_KEY = 'lifeos:update-check:last';

export interface AvailableUpdate {
  version: string;
  apkUrl: string;
}

function parseSemver(v: string): [number, number, number] {
  const [major = 0, minor = 0, patch = 0] = v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  return [major, minor, patch];
}

/** true si `remote` es más nueva que `current`. */
function isNewer(remote: string, current: string): boolean {
  const r = parseSemver(remote);
  const c = parseSemver(current);
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true;
    if (r[i] < c[i]) return false;
  }
  return false;
}

/** Compara la versión instalada contra el último release (no-prerelease) de
 *  GitHub. Devuelve null si no hay actualización, el check falla, o ya se
 *  consultó hace menos de `CHECK_INTERVAL_MS`. */
export async function checkForUpdate(currentVersion: string): Promise<AvailableUpdate | null> {
  try {
    const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return null;
  } catch {
    /* localStorage puede fallar (modo privado, storage bloqueado) — seguimos sin cache */
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();

  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    /* no-op */
  }

  const apk = (data.assets as any[])?.find((a) => (a.name as string).endsWith('.apk'));
  const remoteVersion = (data.tag_name as string)?.replace(/^v/, '');
  if (!apk || !remoteVersion) return null;

  if (!isNewer(remoteVersion, currentVersion)) return null;

  return { version: remoteVersion, apkUrl: apk.browser_download_url };
}
