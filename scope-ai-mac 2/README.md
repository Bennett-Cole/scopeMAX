# Scope AI for Mac — desktop prototype (0.1.0)

A first conversion step from the supplied Scope browser extension into a standalone macOS floating desktop app. It carries the supplied Scope icon forward and uses Gemini for visual Q&A.

## Prototype features
- Floating, always-on-top macOS window with Scope branding.
- User-triggered desktop screen capture preview.
- Gemini visual Q&A with streamed text responses.
- Settings for Gemini API key, model, and response language.
- API key persisted locally; Electron `safeStorage` encryption is used when available.
- Copy answer to clipboard for pasting into a browser.

## Not yet ported
- Scope Firebase sign-in and membership/tier verification.
- Automatic typing/clicking inside Safari, Chrome, and other browsers. This needs a macOS Accessibility-based automation helper and explicit permissions.
- Live/continuous screen monitoring (prototype captures on demand).
- Browser DOM/text extraction adapters and Apple signing/notarization.

## Get a Mac installer without installing Node on your Mac
This repository includes a GitHub Actions workflow that builds the `.dmg` and `.zip` on a hosted macOS runner. You only need to use GitHub's website to upload the project files and trigger the workflow; Node.js is installed on the hosted build machine, not your computer.

1. Create a GitHub repository from GitHub's website.
2. Upload the contents of this project (the files and folders inside this directory) to the repository. Ensure `.github/workflows/build-macos.yml` is included.
3. Open the repository's **Actions** tab.
4. Select **Build Scope AI for macOS** and click **Run workflow**.
5. When the run completes, open the run and download **Scope-AI-macOS-installer** from **Artifacts**.
6. On your Mac, unzip the downloaded artifact if needed, open `Scope AI-0.1.0.dmg`, and drag Scope AI to Applications.

The initial unsigned build may prompt macOS Gatekeeper. This build is not Apple Developer ID signed or notarized. To distribute it broadly with smoother install behavior, a Developer ID certificate and notarization setup are needed.

## Developer build (optional)
Requires macOS, Node.js 20+ and npm.

```sh
npm install
npm start
npm run dist
```

## Privacy
Screen capture is user-triggered in this prototype. Images are sent to the configured Gemini API for the requested analysis. The Gemini API key is stored on the local Mac user account. Do not capture sensitive pages unless you intend to send their image to Gemini.
