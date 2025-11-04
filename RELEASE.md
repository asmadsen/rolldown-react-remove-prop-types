# Release Process

This document outlines the process for releasing new versions of `rolldown-react-remove-prop-types`.

## Prerequisites

1. **npm Account Setup**
   - Create account at https://www.npmjs.com
   - Generate access token at https://www.npmjs.com/settings/asmadsen/tokens
   - Choose "Automation" token type for CI/CD

2. **GitHub Repository Setup**
   - Add `NPM_TOKEN` secret:
     - Go to `Settings` → `Secrets and variables` → `Actions`
     - Click `New repository secret`
     - Name: `NPM_TOKEN`
     - Value: Your npm automation token

## Release Steps

### 1. Prepare the Release

```bash
# Ensure you're on master and up to date
git checkout master
git pull origin master

# Ensure all tests pass
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Verify build output
ls -la dist/
```

### 2. Update Version

Follow [Semantic Versioning](https://semver.org/):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

```bash
# Update version in package.json
pnpm version patch  # or minor, or major
# This creates a git commit and tag automatically

# Push the commit and tag
git push origin master
git push origin --tags
```

### 3. Create GitHub Release

**Option A: GitHub Web UI**
1. Go to https://github.com/asmadsen/rolldown-react-remove-prop-types/releases
2. Click "Create a new release"
3. Select the tag you just pushed (e.g., `v0.1.0`)
4. Release title: Same as tag (e.g., `v0.1.0`)
5. Description: Summarize changes (see template below)
6. Click "Publish release"

**Option B: GitHub CLI**
```bash
# Install gh if needed: brew install gh
gh release create v0.1.0 --title "v0.1.0" --notes "$(cat CHANGELOG.md)"
```

### 4. Automated Publishing

Once the release is created:
- GitHub Actions automatically triggers the `publish.yml` workflow
- The workflow runs: lint → typecheck → test → build → publish
- Package is published to npm with provenance
- Monitor: https://github.com/asmadsen/rolldown-react-remove-prop-types/actions

### 5. Verify Publication

```bash
# Check on npm
pnpm view rolldown-react-remove-prop-types

# Install from npm to verify
pnpm add rolldown-react-remove-prop-types@latest
```

## Release Notes Template

When creating a GitHub release, use this template:

```markdown
## 🚀 Features
- Add new feature X
- Improve Y performance

## 🐛 Bug Fixes
- Fix issue with Z

## 📚 Documentation
- Update README with examples

## 🔧 Internal
- Refactor code structure
- Update dependencies

## Breaking Changes
<!-- Only for major versions -->
- **BREAKING**: Changed API signature for X

## Migration Guide
<!-- Only if needed -->
See [MIGRATION.md](./MIGRATION.md) for upgrade instructions.
```

## Rollback a Release

If you need to rollback:

```bash
# Deprecate the bad version on npm
pnpm deprecate rolldown-react-remove-prop-types@0.1.1 "Version deprecated due to critical bug"

# Publish a new patch version with the fix
pnpm version patch
git push origin master --tags
# Create new GitHub release
```

## Troubleshooting

### Build Fails in CI
- Check GitHub Actions logs
- Run `pnpm build` locally to debug
- Ensure all dependencies are in `package.json`

### NPM Publish Fails
- Verify `NPM_TOKEN` secret is set correctly
- Check token hasn't expired
- Ensure version number hasn't been published before
- Check npm status: https://status.npmjs.org

### Version Already Published
```bash
# Increment version again
pnpm version patch
git push origin master --tags
# Create new release
```

## Best Practices

1. **Always test locally** before releasing
2. **Use semantic versioning** consistently
3. **Write clear release notes** for users
4. **Keep CHANGELOG.md updated** (if you add one)
5. **Monitor CI/CD logs** during publication
6. **Announce releases** in relevant channels
7. **Tag pre-releases** with `-alpha`, `-beta`, `-rc` suffixes

## Pre-releases

For testing before official release:

```bash
# Create pre-release version
pnpm version prerelease --preid=beta
# Example: 0.1.0 → 0.1.1-beta.0

# Tag and push
git push origin master --tags

# Create GitHub release and mark as "pre-release"
```

Users can install with:
```bash
pnpm add rolldown-react-remove-prop-types@beta
```
