import { AppMetadata } from '@/lib/debug/types';
import packageJson from '../../../package.json';

// Type assertion for package.json structure
const pkg = packageJson as typeof packageJson & {
  author?: string | { name?: string }
  repository?: string | { url?: string }
}

export const APP_METADATA: AppMetadata = {
  version: pkg.version,
  releaseDate: process.env.NEXT_PUBLIC_RELEASE_DATE || new Date().toISOString().split('T')[0],
  developers: pkg.author
    ? [typeof pkg.author === 'string' ? pkg.author : pkg.author.name || 'Unknown Developer']
    : ['PaintMixr Development Team'],
  githubUrl: (typeof pkg.repository === 'object' && pkg.repository !== null && 'url' in pkg.repository)
    ? (pkg.repository.url as string).replace(/^git\+/, '').replace(/\.git$/, '')
    : process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com/unknown/paintmixr',
};
