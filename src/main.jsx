import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const params = new URLSearchParams(window.location.search);
const isReceiver = params.get('receiver') === '1';
const startAt = Number(params.get('start') || 0);
const role = params.get('role') || 'Rear Left';
const frequency = Math.min(1000, Math.max(100, Number(params.get('hz') || 440)));

function playTone(context, when, hz, duration = 0.45) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = hz;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.16, when + 0.025);
  gain.gain.setValueAtTime(0.16, when + duration - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + duration);
}

function Receiver() {
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState('Tap below to enable audio');
  const [countdown, setCountdown] = useState('');
  const contextRef = useRef(null);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!armed || !startAt) return undefined;
    let timer;
    const tick = () => {
      const remaining = startAt - Date.now();
      if (remaining > 0) {
        setCountdown(`${(remaining / 1000).toFixed(1)} seconds`);
        timer = window.setTimeout(tick, Math.min(100, remaining));
      } else if (!playedRef.current) {
        playedRef.current = true;
        setCountdown('Scheduled time reached');
        const context = contextRef.current;
        if (context && context.state === 'running') {
          // Browser clocks and audio hardware introduce some jitter; this is not sample-accurate sync.
          playTone(context, context.currentTime + 0.06, frequency);
          setStatus('Test tone played');
        } else {
          setStatus('Audio context is not running. Reload and enable audio again.');
        }
      }
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [armed]);

  async function enableAudio() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported by this browser.');
      const context = new AudioContextClass();
      await context.resume();
      contextRef.current = context;
      setArmed(true);
      setStatus(startAt > Date.now() ? 'Armed — waiting for the scheduled tone' : 'This link has expired. Generate fresh links on the laptop.');
    } catch (error) {
      setStatus(error.message || 'Could not start audio. Check browser sound permissions.');
    }
  }

  return <main className="shell receiver-shell">
    <div className="brand"><span className="brand-mark">◖</span> PHONE SURROUND <span className="version">PROTOTYPE 0.1</span></div>
    <section className="receiver-card">
      <div className="eyebrow">PHONE RECEIVER</div>
      <h1>{role}</h1>
      <p className="muted">This page plays a short test tone at a scheduled time so we can check the basics on your phone.</p>
      <div className="status-box"><span className={`dot ${armed ? 'live' : ''}`}></span><div><strong>{status}</strong><small>{countdown || 'Tap the button to allow browser audio'}</small></div></div>
      <button className="primary full" onClick={enableAudio}>{armed ? 'Audio enabled' : 'Enable audio'}</button>
      <p className="fineprint">Keep this page open and the phone awake. This prototype does not yet stream movie audio or extract surround channels.</p>
      <a className="back-link" href={window.location.pathname}>← Back to controller</a>
    </section>
  </main>;
}

function Controller() {
  const [leftRole, setLeftRole] = useState('Rear Left');
  const [rightRole, setRightRole] = useState('Rear Right');
  const [hz, setHz] = useState(440);
  const [links, setLinks] = useState(null);
  const [copied, setCopied] = useState('');

  function createLinks() {
    // Allow time for both phones to open their link and explicitly enable audio.
    const start = Date.now() + 60000;
    const base = window.location.origin + window.location.pathname;
    setLinks({
      start,
      left: `${base}?receiver=1&role=${encodeURIComponent(leftRole)}&start=${start}&hz=${hz}`,
      right: `${base}?receiver=1&role=${encodeURIComponent(rightRole)}&start=${start}&hz=${hz}`
    });
    setCopied('');
  }

  async function copyLink(which, link) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(which);
    } catch {
      window.prompt('Copy this receiver link:', link);
    }
  }

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">◖</span> PHONE SURROUND <span className="version">PROTOTYPE 0.1</span></div>
      <span className="pill"><span className="dot"></span> Browser-only</span>
    </header>
    <section className="hero">
      <div className="eyebrow">YOUR LAPTOP + TWO ANDROID PHONES</div>
      <h1>Give your room<br/><span>another dimension.</span></h1>
      <p className="muted lead">First milestone: test scheduled playback on two phones. Live movie audio and discrete surround routing are separate, harder milestones.</p>
      <div className="device-layout">
        <div className="phone-device"><div className="phone-icon">▯</div><b>Phone 1</b><small>Rear left</small></div>
        <div className="laptop-device"><div className="screen-icon">▱</div><b>Windows laptop</b><small>Front L / R speakers</small></div>
        <div className="phone-device"><div className="phone-icon">▯</div><b>Phone 2</b><small>Rear right</small></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><div className="eyebrow">MILESTONE 01</div><h2>Synchronized tone test</h2></div><span className="step">01 / 03</span></div>
      <p className="muted">Create two links, open one on each phone, and tap “Enable audio” before the countdown ends. Both phones schedule a tone using their own browser clock.</p>
      <div className="controls">
        <label>Phone 1 channel<select value={leftRole} onChange={e => setLeftRole(e.target.value)}><option>Rear Left</option><option>Rear Right</option><option>Test Speaker A</option></select></label>
        <label>Phone 2 channel<select value={rightRole} onChange={e => setRightRole(e.target.value)}><option>Rear Right</option><option>Rear Left</option><option>Test Speaker B</option></select></label>
        <label className="frequency">Test tone <strong>{hz} Hz</strong><input type="range" min="220" max="880" step="110" value={hz} onChange={e => setHz(Number(e.target.value))}/></label>
      </div>
      <button className="primary" onClick={createLinks}>Create synchronized test links <span>↗</span></button>
      {links && <div className="links">
        <div className="link-row"><div><strong>Phone 1 · {leftRole}</strong><small>Scheduled start in 60 seconds</small></div><button className="secondary" onClick={() => copyLink('left', links.left)}>{copied === 'left' ? 'Copied!' : 'Copy link'}</button></div>
        <div className="link-row"><div><strong>Phone 2 · {rightRole}</strong><small>Same scheduled start timestamp</small></div><button className="secondary" onClick={() => copyLink('right', links.right)}>{copied === 'right' ? 'Copied!' : 'Copy link'}</button></div>
        <div className="notice">Open each link on the matching phone and tap Enable audio before the 60-second timer expires. If the timer expires, generate fresh links.</div>
      </div>}
    </section>

    <section className="limits">
      <div className="limit"><span className="limit-icon">✓</span><div><b>Included in this prototype</b><p>Responsive control page, phone receiver pages, user-initiated Web Audio, and scheduled test tones.</p></div></div>
      <div className="limit"><span className="limit-icon warning">!</span><div><b>Not included yet</b><p>Live laptop audio streaming, persistent device pairing, automatic latency calibration, or 5.1 channel extraction.</p></div></div>
      <div className="limit"><span className="limit-icon warning">!</span><div><b>Browser and DRM limitations</b><p>A website cannot silently capture all Windows system audio. Tab/screen audio capture requires user permission and browser support; protected services such as Netflix may block capture or return muted audio.</p></div></div>
    </section>
    <footer>PHONE SURROUND · Experimental browser-only prototype · This test does not upload audio</footer>
  </main>;
}

function App() { return isReceiver ? <Receiver /> : <Controller />; }

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
