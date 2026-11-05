import { execFileSync } from 'node:child_process';
import { describe, it } from 'vitest';

describe('economic prerecorded audio production tools', () => {
  it('validates approved profiles, caching, provenance, and strict independent comparisons', () => {
    execFileSync(process.platform === 'win32' ? 'python' : 'python3', [
      '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'economic_audio_tools_test.py',
    ], {
      encoding: 'utf8',
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONIOENCODING: 'utf-8' },
      timeout: 30_000,
      stdio: 'pipe',
    });
  }, 35_000);
});
