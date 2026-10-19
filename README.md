# Sonora — Windows System Audio Companion

Sonora streams a Windows laptop's system audio to Android phones on the same trusted private Wi-Fi network. Each phone opens one link and can select Stereo, Left, Right, or Mono.

## Run it without installing Python

1. Open the [Build Sonora Portable for Windows workflow](https://github.com/shyamv1508/Project-sound/actions/workflows/build-sonora-portable.yml).
2. Open the latest successful run on the `system-audio-prototype` branch.
3. Under **Artifacts**, download **Sonora-Portable-Windows**.
4. Extract the ZIP to a normal folder.
5. Double-click `Start-Sonora.bat`, type `START` in the console, and open the printed phone link on your phone.
6. Keep the laptop and phone(s) on the same trusted private Wi-Fi network.

The portable build is for **64-bit Windows 10/11 laptops**. It does not require a separate Python installation. The first run may trigger Windows Firewall or SmartScreen warnings; only allow private-network access if you trust the source.

## Build

GitHub Actions builds `Sonora.exe` from the source in `windows-companion/` and publishes a downloadable ZIP artifact. A new build is triggered by changes to that folder or the workflow file. You can also start a build manually from the Actions page using **Run workflow**.

## Run from source

Requires 64-bit Windows 10/11 and Python 3.11 or newer:

```powershell
cd windows-companion
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python sonora_companion.py
```

Type `START` only when you intend to stream system audio.

## Safety and limitations

- Use only a trusted private Wi-Fi network. Do not use public Wi-Fi or port-forward port 8765.
- Anyone with the pairing link may be able to listen while Sonora is running; do not share it.
- Audio is streamed over the local network and is not intentionally saved.
- This prototype captures the default Windows playback device. It does not guarantee synchronized surround sound across phones.
