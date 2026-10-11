# Contributing to QuietLab

QuietLab is an exploratory tool for fan geometry and reduced-order cooling/noise comparisons. Contributions to usability, geometry, numerical consistency and calibration are welcome.

## Run locally

Install Node.js 20 or newer, then run `npm start`. No dependency installation is required. Open the printed loopback address. Use `npm test` to run the physical consistency, scoring and mesh checks.

The app also runs by opening `dist/index.html` directly. For reliable browser-local storage and audio behavior, prefer the local server. The Windows release is built from exactly the same `dist` assets.

## Changes

- Describe the problem, the final behavior and the verification in your pull request.
- Keep geometry controls connected to both the visible mesh and the relevant model inputs.
- Keep model units explicit and avoid mixing free-air flow with delivered flow at pressure.
- Keep saved fans under shared thermal and pressure conditions when comparing them.
- Treat all noise and temperature numbers as uncalibrated until independently validated.
- If coefficients change, document the data, operating envelope and held-out validation. A better visual mesh alone does not establish better physical accuracy.
- Keep the browser app dependency-free unless a clear need outweighs offline portability.

## Verification

```sh
npm test
```

For interface changes, check the four tabs, presets, keyboard controls, saving, sound/motion and a narrow mobile viewport. Capture actual app screenshots with no personal browser content.

On Windows, build and check the executable:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File windows/build.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File windows/test.ps1
```

The launcher uses the .NET Framework compiler shipped with Windows and built-in framework libraries. Generated binaries belong in release assets, not the source tree. The compiler may produce different binary timestamps across builds; this is a source build procedure, not a claim of bit-for-bit reproducibility.

## License

Contributions are provided under the project's MIT license. Include sources and reuse rights when contributing measurements or third-party material.
