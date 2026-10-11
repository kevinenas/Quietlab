# Publish QuietLab on GitHub Pages

1. Extract QuietLab-GitHub.zip.
2. Create a public GitHub repository named `quietlab`. Leave the generated README, license and gitignore options unchecked; these files are already included.
3. Choose Add file → Upload files. Upload the extracted folder's **contents**, including `.github`, `dist`, `docs`, `windows`, README.md and LICENSE. Commit the files to `main`. Do not upload the ZIP itself or put all files inside an extra parent folder.
4. Open Settings → Pages. Set Source to **GitHub Actions**.
5. Open Actions → Publish website → Run workflow, selecting `main`.
6. Wait for the workflow to succeed. Open its deployment link or return to Settings → Pages for the public URL.

If Publish website is missing, verify `.github/workflows/pages.yml` was uploaded. You can create that file manually using Add file → Create new file, copying its contents from this package.

The public URL normally looks like `https://YOUR-USERNAME.github.io/quietlab/`. Use the exact URL GitHub returns. Anyone with that URL can use the app without installing it. Each browser stores its own saved designs. There is no shared database or account system.

The workflow runs the model checks and publishes only `dist/`. Later pushes to `main` update the website. Windows executables are separate downloadable Release assets.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

QuietLab estimates remain reduced-order screening, not calibrated CFD/CAA or measured fan ratings.
