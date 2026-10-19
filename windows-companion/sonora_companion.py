"""Sonora Windows companion: early LAN-only system-audio prototype."""
import asyncio
import secrets
import socket
import sys
import threading
import time
from pathlib import Path

import numpy as np
import soundcard as sc
from aiohttp import web

PORT = 8765
RATE = 48000
FRAMES = 2048
ROOT = Path(__file__).resolve().parent
PIN = secrets.token_urlsafe(5)
CLIENTS = set()
CLIENTS_LOCK = threading.Lock()
STOP = threading.Event()
LOOP = None


def get_lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 80))  # local route lookup; no application data sent
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


async def send_chunk(client, payload):
    if not client.closed:
        try:
            await client.send_bytes(payload)
        except (ConnectionError, RuntimeError):
            pass


def capture_loopback():
    try:
        speaker = sc.default_speaker()
        if speaker is None:
            print("No default Windows playback device found.")
            return
        with speaker.recorder(samplerate=RATE, channels=2, blocksize=FRAMES) as recorder:
            print("Capturing system audio from: " + speaker.name)
            while not STOP.is_set():
                with CLIENTS_LOCK:
                    clients = list(CLIENTS)
                if not clients:
                    time.sleep(0.1)
                    continue
                audio = np.asarray(recorder.record(numframes=FRAMES), dtype=np.float32)
                if audio.ndim != 2 or audio.shape[1] < 2:
                    continue
                payload = np.ascontiguousarray(audio[:, :2], dtype="<f4").tobytes()
                for client in clients:
                    asyncio.run_coroutine_threadsafe(send_chunk(client, payload), LOOP)
    except Exception as exc:
        print("Audio capture stopped: " + str(exc))
        print("Check the Windows output device, then restart the companion.")


async def phone_page(request):
    return web.FileResponse(ROOT / "phone.html")


async def audio_socket(request):
    if request.query.get("pin", "") != PIN:
        raise web.HTTPForbidden(text="Pairing code is incorrect.")
    channel = request.query.get("channel", "L").upper()
    if channel not in ("L", "R", "STEREO"):
        raise web.HTTPBadRequest(text="Invalid channel.")
    ws = web.WebSocketResponse(heartbeat=20, max_msg_size=1024)
    await ws.prepare(request)
    with CLIENTS_LOCK:
        CLIENTS.add(ws)
    print("Receiver connected (" + channel + "). Active: " + str(len(CLIENTS)))
    try:
        async for _ in ws:
            pass
    finally:
        with CLIENTS_LOCK:
            CLIENTS.discard(ws)
        print("Receiver disconnected. Active: " + str(len(CLIENTS)))
    return ws


async def status(request):
    return web.json_response({"app": "Sonora", "status": "running",
                              "receivers": len(CLIENTS), "audio_saved": False})


def main():
    global LOOP
    if sys.platform != "win32":
        print("This prototype is for Windows 10/11.")
        return 1
    print("\nSONORA — Windows system-audio companion (prototype)")
    print("Audio is streamed locally and is not saved. No driver is installed.")
    if input("Type START to permit system-audio capture, or anything else to quit: ").strip() != "START":
        print("No audio was captured.")
        return 0

    LOOP = asyncio.new_event_loop()
    asyncio.set_event_loop(LOOP)
    thread = threading.Thread(target=capture_loopback, name="sonora-loopback", daemon=True)
    thread.start()
    app = web.Application()
    app.router.add_get("/", phone_page)
    app.router.add_get("/phone", phone_page)
    app.router.add_get("/audio", audio_socket)
    app.router.add_get("/status", status)
    ip = get_lan_ip()
    print("\nLeft phone:  http://" + ip + ":" + str(PORT) + "/phone?channel=L&pin=" + PIN)
    print("Right phone: http://" + ip + ":" + str(PORT) + "/phone?channel=R&pin=" + PIN)
    print("Keep this window open. Press Ctrl+C to stop.")
    print("Use only a trusted private network; do not share the pairing links.")
    try:
        web.run_app(app, host="0.0.0.0", port=PORT, print=None)
    except KeyboardInterrupt:
        pass
    finally:
        STOP.set()
        thread.join(timeout=2)
        LOOP.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
