# QuietLab v1.2.0

First open-source release package.

## Included

- Interactive axial-fan geometry editor with four generic presets.
- Smooth WebGL models, finishes, wireframe, exploded view and camera controls.
- RPM-linked motion and synthetic tonal/broadband sound.
- Reduced-order flow, pressure, spectrum, dBA/SPL and thermal estimates.
- Shared-rig cooling/noise comparisons and constrained geometry search.
- Browser-local saved designs and JSON export.
- MIT-licensed source, model documentation, screenshots and contribution guidance.
- `QuietLab.exe`: single-file Windows launcher with embedded web assets; Node.js is not required.
- Automated model/geometry checks and Windows launcher integration checks.

## Windows use

Extract the Windows archive and open `QuietLab.exe`. Keep the launcher window open while using the browser studio. Stop and close ends its local server. Windows 10/11 with .NET Framework 4.x and a current browser are the target environment. The executable is unsigned; verify the published SHA-256 against the downloaded file. A hash establishes package integrity, not publisher identity.

## Known limits

Estimates are uncalibrated screening results, not CFD/CAA, measured thermal results or structural validation. The app has no JSON import or manufacturing/CAD export. Browser storage is origin-specific, including the local port; use JSON export for backups. Acoustic playback is not calibrated SPL.

## Validation

Release preparation runs all model/mesh checks and verifies that every executable-embedded web asset exactly matches the source, plus root, missing route, HEAD and rejected POST behavior. Browser captures are screenshots of the actual app.
