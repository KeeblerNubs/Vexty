# vEXTY + FLAKE Suite

Electron-based creative suite containing:

- vEXTY — Typographic Vector Animation Engine (SVG, GIF, MP4)
- FLAKE — Geometric Pattern & Noise Engine (PNG export)

## Install

```bash
npm install
```

## Run

```bash
npm run start
```

This opens the launcher. From there you can open vEXTY or FLAKE.

## Build

```bash
npm run make
```

## Release (automated Windows executable)

Publishing a tagged release automatically installs dependencies, builds the Windows installer, and attaches the generated `.exe` to the GitHub release:

1. Ensure your changes are committed and pushed.
2. Create a version tag (for example `v1.0.0`):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions will run the **Build and Release Windows Executable** workflow, run `npm install`, package the app with `npm run make`, and upload the installer from `out/make/squirrel.windows/x64` as the release asset.
