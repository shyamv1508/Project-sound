# Phone Surround — prototype 0.1

A browser-only starter for experimenting with a Windows laptop plus two Android phones as extra sound sources.

## Included in this milestone
- Responsive controller page.
- Unique receiver links for two phones.
- User-tap audio enablement via Web Audio API.
- A scheduled test tone on each receiver using the same target timestamp.
- Vite + React setup and Vercel SPA rewrite configuration.

## Important limitations
- This is a scheduled-tone test, not sample-accurate synchronization. Each phone has its own clock, audio hardware, and browser scheduling jitter.
- It does not stream live Windows/system/browser audio.
- It does not extract Netflix, YouTube, or other 5.1 channels.
- A website cannot silently capture all Windows system audio. Tab/screen audio capture requires explicit user permission and browser support.
- Protected streaming services may block capture or return muted/black output.
- True discrete surround may require a Windows audio-routing helper or a multichannel output path, which is outside the website-only constraint.

## Run locally
Install Node.js, then:

```bash
npm install
npm run dev
```

Open the local URL on the laptop. For phone testing, the dev server is configured to listen on the LAN; phones must be able to reach the laptop's local IP and port. For easiest testing, deploy to HTTPS first.

## Deploy on Vercel
1. Create a GitHub repository named `project-sound` (GitHub repository names use hyphens rather than spaces).
2. Upload/push the project files to the repository root.
3. In Vercel, select **Add New → Project**, import the GitHub repository, and deploy.
4. Framework preset: Vite. Build command: `npm run build`; output directory: `dist`.
5. Subsequent pushes to the connected branch trigger deployments automatically.

## Next milestone
Add a signaling service and WebRTC audio transport for a user-selected, non-DRM test source. Browser tab capture can be explored with explicit user permission. Reliable independent 5.1 channel routing from arbitrary browser playback is not guaranteed by a website alone.
