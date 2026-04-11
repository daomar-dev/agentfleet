import * as https from 'https';
import * as http from 'http';

export interface VersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
}

export interface VersionCheckerDependencies {
  currentVersion?: string;
  fetchFn?: (url: string) => Promise<string>;
}

export class VersionChecker {
  private readonly deps: VersionCheckerDependencies;

  constructor(deps: VersionCheckerDependencies = {}) {
    this.deps = deps;
  }

  async checkVersion(): Promise<VersionInfo> {
    const current = this.deps.currentVersion ?? this._loadCurrentVersion();
    const fetchFn = this.deps.fetchFn ?? this._defaultFetch;

    try {
      const body = await fetchFn('https://registry.npmjs.org/@daomar%2fagentfleet/latest');
      const data = JSON.parse(body);
      const latest = data.version;
      return {
        current,
        latest,
        updateAvailable: this._isNewer(latest, current),
      };
    } catch {
      return { current, latest: null, updateAvailable: false };
    }
  }

  private _loadCurrentVersion(): string {
    try {
      return require('../../package.json').version;
    } catch {
      return 'unknown';
    }
  }

  private _isNewer(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((latestParts[i] || 0) > (currentParts[i] || 0)) return true;
      if ((latestParts[i] || 0) < (currentParts[i] || 0)) return false;
    }
    return false;
  }

  private _defaultFetch(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
  }
}
