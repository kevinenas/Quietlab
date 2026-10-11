# QuietLab user guide

Open **Start QuietLab.cmd** on Windows. With Node.js installed it serves http://127.0.0.1:4173; leave its terminal open while using the app. Otherwise it opens `dist/index.html` directly. You can also open that HTML file yourself: all dependencies are included and no internet connection is needed. Browser storage behavior for file URLs varies; use Export JSON as a backup.

Cross-platform: install Node.js, open this folder in a terminal, run `npm start`, and visit http://127.0.0.1:4173. No package installation or build is required. `npm test` runs the numerical checks. If the port is occupied, choose another PORT environment variable or use the HTML file directly.

## Use

1. Adjust the geometry sliders or numeric inputs. Drag the 3D rotor to orbit; scroll to zoom; use Front or Perspective to reset the view. Focus the canvas and use arrow keys for keyboard rotation. Run fan uses actual configured RPM. Preview sound starts rotation automatically; Pause fan or Stop sound stops the linked preview. Choose Slow motion ×0.02 to inspect the blades while keeping audio at actual RPM. High-speed animation can alias at display refresh rates; it is not an acoustic phase simulation. Pausing the preview does not change the configured operating-point estimates.
2. Set the required CFM and static pressure in Pa. Delivered flow is computed at that pressure, not free air. Save a named baseline.
3. Start Preview sound and adjust the low initial playback volume. This is a synthetic relative timbre demonstration, not a recording or calibrated SPL reproduction. Broadband synthesis approximates the plotted distribution with a bandpass noise source.
4. Run Find quieter designs. The deterministic search samples 1,600 geometries and solves RPM at each one. It holds your envelope, hub, thickness, clearance and shroud fixed. Apply a result, then save it to compare. Saved geometry is now evaluated using the current shared airflow target, pressure and thermal rig. Loading a fan preserves these shared conditions. The RPM plot overlays the first five saved designs and current geometry.
5. Configure the shared cooling rig: inlet air temperature, heat load, no-flow and minimum thermal resistance, flow scale/exponent, the fraction of air reaching the heatsink, baseline delivered airflow and CPU temperature limit. The defaults give an 80°C baseline at 100 W and 25°C inlet. Thermal setup persists locally.
6. Select Best cooling / loudness score to maximize ΔT / 2^((dBA − 30)/10) while meeting airflow and CPU-temperature constraints. The search solves the minimum feasible RPM, then samples 12 higher speeds per geometry. Lowest noise mode preserves the original airflow-constrained objective and does not enforce CPU temperature.
7. Inspect Cooling–noise tradeoff: upper-left means more cooling with less noise. Curves sweep RPM for the current fan and first five saved fans; dots mark their operating points and current search candidates. Hollow dots miss a target. The dashed line connects non-dominated feasible displayed operating points only.
8. Export JSON to keep the current parameters and saved designs. This release exports parameter data, shared thermal setup and selected objective; it has no import or fabrication/CAD export.

## What this does and does not establish

This is a working interactive prototype with a WebGL 3D mesh and software fallback, reduced-order flow/pressure estimates, spectral energy summation and A-weighting. It is **not CFD, CAA, a structural solver, or a calibrated PC-fan prediction tool**. The noise reference and geometry coefficients are illustrative. Absolute dBA and even the relative ranking of different geometries require measurements. There are no claimed accuracy bounds. A search result is the best of sampled candidates under this model, not a physically verified optimum.

The Model section inside the app documents equations and primary references. It includes affinity-law behavior, six blade-passing tones, broadband energy and pressure loading. Missing effects include motor/bearing noise, mounts, case/grille interactions, actual airfoil boundary layers, turbulence, material strength and overspeed. A 5,000 RPM setting does not imply the geometry is safe to manufacture or run.

Suggested validation: measure flow/pressure curves and 1 m spectra for a baseline fan at several RPMs, fit coefficients on part of that data, then assess different geometries on held-out measurements before making design claims.

## Cooling and noise metrics (v1.1)

Thermal resistance is a deliberately simple saturating curve:

Rθ = Rmin + (Rno-flow − Rmin) / [1 + (captured CFM / flow scale)^exponent].

Estimated CPU temperature = inlet temperature + heat load × Rθ. Cooling improvement is the shared baseline temperature minus the estimated CPU temperature. Negative improvement is retained when a fan underperforms the baseline.

Three scores are available:

- Simple ΔT/dBA: descriptive only; undefined for nonpositive dBA.
- Main ΔT / 2^((dBA−30)/10): cooling per relative loudness penalty, using 30 dBA as the fixed reference. A 10 dB increase doubles the penalty. This is a heuristic, not standardized loudness in sones.
- Energy-index ΔT / 10^((dBA−30)/10): cooling per relative A-weighted mean-square sound-pressure index. This is not acoustic watts or motor efficiency.

All fan estimates remain uncalibrated. The thermal curve is also uncalibrated; no real CPU temperature or numerical accuracy is guaranteed. CPU throttling, transient heating and case recirculation are not modeled. Flow capture is an adjustable surrogate for placement/ducting, and pressure remains an imposed constant rather than a radiator system curve. The baseline can exceed realistic operating limits because throttling is intentionally absent. Validate the same rig with measured airflow, power, temperatures and spectra before drawing physical design conclusions.

The approximate loudness interpretation is informed by the [NIOSH Industrial Noise Control Manual](https://www.cdc.gov/niosh/docs/75-183/pdfs/75-183.pdf); the dependence on heat load and ventilation is consistent with [Noctua's CPU-temperature guidance](https://www.noctua.at/en/support/faqs/why-is-my-cpu-temperature-so-high). Neither source validates these coefficients.

## Files

- `dist/index.html`, `style.css`, `app.js`: user interface, 3D mesh, plots and audio.
- `dist/model.js`: documented screening equations and constrained search.
- `dist/thermal.js`: shared thermal model, logarithmic noise penalties, Pareto comparison and angular-speed math.
- `server.cjs`: loopback-only static server using built-in Node modules.
- `test.cjs`: physical consistency and optimizer feasibility checks.

All design state stays in this browser. No telemetry, remote scripts, API keys or account is used. Reference links are optional external reading.

## Studio redesign (v1.2)

The workspace now has Design studio, Cooling, Acoustics and Compare tabs. Start with Balanced 120, Quiet 140, Pressure 120 or Compact 80. These are generic editable concepts, not measured commercial products; names describe intended starting points rather than guaranteed performance. Presets change geometry/RPM but preserve the shared airflow and pressure targets. Saved designs from earlier versions remain readable.

The main model uses a local WebGL renderer with smooth blade meshes, rounded edges, a bevelled housing, rear supports and fastener details. It uses the editor dimensions; blade tips follow the requested rotor radius. Model finish, wireframe and exploded view affect appearance only. The software preview remains available when WebGL is unavailable, though advanced display options require WebGL. No network library is needed.

Drag to orbit, use Front / 3D / Side for camera positions, and use the +/− buttons or scroll to zoom. Slow motion is selected initially to make geometry visible. Sound remains at actual configured RPM. Blade details and advanced heatsink coefficients are collapsed until needed. Save this design adds the current parameters to the Compare view.

The better visual mesh does not add CFD, structural validation or calibrated acoustics. Thermal and noise equations are unchanged.

