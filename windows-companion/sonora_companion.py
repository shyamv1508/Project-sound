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
FRAMES = 1024
ROOT = Path(__file__).resolve().parent
PIN = secrets.token_urlsafe(5)
CLIENTS = set()
CLIENT_QUEUES = {}
CLIENTS_LOCK = threading.Lock()
QUEUE_CHUNKS = 4
STOP = threading.Event()
LOOP = None
CAPTURE_THREAD = None


def get_lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def queue_audio(client, payload):
    """Run on the asyncio loop; discard stale unsent chunks to bound latency."""
    queue = CLIENT_QUEUES.get(client)
    if queue is None or client.closed:
        return
    if queue.full():
        try:
            queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
    try:
        queue.put_nowait(payload)
    except asyncio.QueueFull:
        pass


async def sender_loop(client, queue):
    try:
        while not client.closed:
            payload = await queue.get()
            await client.send_bytes(payload)
    except (ConnectionError, RuntimeError, asyncio.CancelledError):
        pass


def capture_loopback():
    try:
        speaker = sc.default_speaker()
        if speaker is None:
            print("No default Windows playback device found.")
            return
        # SoundCard captures Windows loopback through a loopback microphone,
        # not through the speaker object itself.
        loopback = sc.get_microphone(id=str(speaker.name), include_loopback=True)
        if loopback is None:
            print("Could not find a loopback capture device for: " + speaker.name)
            return
        with loopback.recorder(samplerate=RATE, channels=2, blocksize=FRAMES) as recorder:
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
                    # Queue insertion is handled on the event loop; each client
                    # has a tiny bounded queue so slow receivers cannot build seconds of lag.
                    LOOP.call_soon_threadsafe(queue_audio, client, payload)
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
    queue = asyncio.Queue(maxsize=QUEUE_CHUNKS)
    CLIENT_QUEUES[ws] = queue
    with CLIENTS_LOCK:
        CLIENTS.add(ws)
    sender_task = asyncio.create_task(sender_loop(ws, queue))
    print("Receiver connected (" + channel + "). Active: " + str(len(CLIENTS)))
    try:
        async for _ in ws:
            pass
    finally:
        CLIENT_QUEUES.pop(ws, None)
        sender_task.cancel()
        with CLIENTS_LOCK:
            CLIENTS.discard(ws)
        print("Receiver disconnected. Active: " + str(len(CLIENTS)))
    return ws


async def status(request):
    return web.json_response({"app": "Sonora", "status": "running",
                              "receivers": len(CLIENTS), "audio_saved": False})


async def on_startup(app):
    global LOOP, CAPTURE_THREAD
    LOOP = asyncio.get_running_loop()
    CAPTURE_THREAD = threading.Thread(target=capture_loopback, name="sonora-loopback", daemon=True)
    CAPTURE_THREAD.start()


async def on_shutdown(app):
    STOP.set()
    if CAPTURE_THREAD:
        await asyncio.to_thread(CAPTURE_THREAD.join, 2)


def main():
    if sys.platform != "win32":
        print("This prototype is for Windows 10/11.")
        return 1
    print("\nSONORA — Windows system-audio companion (prototype)")
    print("Audio is streamed locally and is not saved. No driver is installed.")
    if input("Type START to permit system-audio capture, or anything else to quit: ").strip() != "START":
        print("No audio was captured.")
        return 0

    app = web.Application()
    app.router.add_get("/", phone_page)
    app.router.add_get("/phone", phone_page)
    app.router.add_get("/audio", audio_socket)
    app.router.add_get("/status", status)
    app.on_startup.append(on_startup)
    app.on_shutdown.append(on_shutdown)
    ip = get_lan_ip()
    print("\nLeft phone:  http://" + ip + ":" + str(PORT) + "/phone?channel=L&pin=" + PIN)
    print("Right phone: http://" + ip + ":" + str(PORT) + "/phone?channel=R&pin=" + PIN)
    print("Keep this window open. Press Ctrl+C to stop.")
    print("Use only a trusted private network; do not share the pairing links.")
    web.run_app(app, host="0.0.0.0", port=PORT, print=None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
