import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Test expected compiled images', () => {
  const rootDir = path.resolve(__dirname, '../'); // Root directory of the project
  const buildDir = path.join(rootDir, 'tests/build'); // Build output directory
  const isDist = process.env.NODE_ENV === 'dist';

  const getAllBuildFiles = () => {
    return fs.readdirSync(buildDir);
  };

  beforeAll(() => {
    execSync(isDist ? 'yarn test-build-dist' : 'yarn test-build', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  });

  it('should compile all expected asset files', () => {
    const files = getAllBuildFiles();
    [
      'block.svg',
      'building.png',
      'circle.svg',
      'coffee.png',
      'desert.png',
      'folder.svg',
      'gear.svg',
      'la.png',
      'rome.png',
      'sofa.png',
      'venice.png',
    ].forEach(asset => {
      expect(files.includes(asset)).toBe(true);
    });
  });

  it('should not make duplicates', () => {
    const files = getAllBuildFiles();
    expect(files.includes('la2.png')).toBe(false);
  });

  afterAll(() => {
    // Clean up the build directory
    fs.rmSync(buildDir, { recursive: true, force: true });
  });
});
