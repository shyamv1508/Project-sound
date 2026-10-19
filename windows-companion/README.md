# Sonora Windows Companion (prototype)

This is experimental source code, **not a signed installer**.

## Safety and privacy
- Uses the existing Windows playback device's loopback capture; no audio driver is installed.
- Does not change Windows audio settings or require administrator privileges.
- Requires typing \`START\` in the terminal before audio capture begins.
- Audio is streamed in memory on the local network and is not written to files or sent to a cloud service.
- A random pairing code protects receiver connections.
- Stop with Ctrl+C. Use only a trusted private Wi-Fi network.
- The prototype uses plain HTTP/WebSocket on your LAN. Anyone with a pairing link may listen while it runs. Never port-forward it or use it on public Wi-Fi.

## Requirements
Windows 10/11, 64-bit Python 3.11+, and both phones on the same trusted Wi-Fi network.

## Run from source
In PowerShell, opened in this folder:

\`\`\`powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python sonora_companion.py
\`\`\`

Read the console output and type START only when you intend to capture system audio. Open the printed Left phone and Right phone links on the Android phones, then tap Connect. If Windows Firewall asks, allow Python only on trusted Private networks, not Public networks.

## Known limitations
This early prototype has not yet been validated across different Windows audio devices and phones. It captures the default playback device, not a chosen app. Separate phone clocks and Wi-Fi buffering can cause delay/drift, so synchronized surround is not guaranteed. DRM media may not be capturable in every app. No installer is included; review the source before running it.
