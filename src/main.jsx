import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const params = new URLSearchParams(window.location.search);
const isReceiver = params.get('receiver') === '1';
const startAt = Number(params.get('start') || 0);
const role = params.get('role') || 'Rear Left';
const frequency = Math.min(1000, Math.max(100, Number(params.get('hz') || 440)));
const volumeFromUrl = Math.min(100, Math.max(1, Number(params.get('vol') || 35)));

function playTone(context, when, hz, volume = 35, pan = 0, duration = 0.55) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner ? context.createStereoPanner() : null;
  oscillator.type = 'sine';
  oscillator.frequency.value = hz;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume / 100) * 0.22, when + 0.025);
  gain.gain.setValueAtTime(Math.max(0.001, volume / 100) * 0.22, when + duration - 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  if (panner) {
    panner.pan.value = pan;
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(context.destination);
  } else {
    oscillator.connect(gain);
    gain.connect(context.destination);
  }
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
          playTone(context, context.currentTime + 0.06, frequency, volumeFromUrl);
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
    <div className="brand"><span className="brand-mark">◖</span> PHONE SURROUND <span className="version">PROTOTYPE 0.2</span></div>
    <section className="receiver-card">
      <div className="eyebrow">PHONE RECEIVER</div>
      <h1>{role}</h1>
      <p className="muted">This page plays a scheduled test tone using your selected channel and volume settings.</p>
      <div className="status-box"><span className={`dot ${armed ? 'live' : ''}`}></span><div><strong>{status}</strong><small>{countdown || 'Tap the button to allow browser audio'}</small></div></div>
      <button className="primary full" onClick={enableAudio}>{armed ? 'Audio enabled' : 'Enable audio'}</button>
      <p className="fineprint">Keep this page open and the phone awake. This browser prototype does not yet stream movie audio or extract discrete surround channels.</p>
      <a className="back-link" href={window.location.pathname}>← Back to controller</a>
    </section>
  </main>;
}

function Controller() {
  const [leftRole, setLeftRole] = useState('Rear Left');
  const [rightRole, setRightRole] = useState('Rear Right');
  const [laptopLeftRole, setLaptopLeftRole] = useState('Front Left');
  const [laptopRightRole, setLaptopRightRole] = useState('Front Right');
  const [hz, setHz] = useState(440);
  const [volume, setVolume] = useState(35);
  const [links, setLinks] = useState(null);
  const [copied, setCopied] = useState('');
  const [laptopStatus, setLaptopStatus] = useState('Laptop test tone is ready');

  async function testLaptop(side) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
      const context = new AudioContextClass();
      await context.resume();
      playTone(context, context.currentTime + 0.05, hz, volume, side === 'left' ? -1 : 1);
      setLaptopStatus(`Playing on laptop ${side} output — assigned as ${side === 'left' ? laptopLeftRole : laptopRightRole}`);
      window.setTimeout(() => context.close().catch(() => {}), 1200);
    } catch (error) {
      setLaptopStatus(error.message || 'Could not play laptop test tone.');
    }
  }

  function createLinks() {
    const start = Date.now() + 60000;
    const base = window.location.origin + window.location.pathname;
    const common = `start=${start}&hz=${hz}&vol=${volume}`;
    setLinks({
      start,
      left: `${base}?receiver=1&role=${encodeURIComponent(leftRole)}&${common}`,
      right: `${base}?receiver=1&role=${encodeURIComponent(rightRole)}&${common}`
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

  const roleOptions = ['Front Left', 'Front Right', 'Center', 'Subwoofer', 'Rear Left', 'Rear Right', 'Side Left', 'Side Right', 'Height Left', 'Height Right'];

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark">◖</span> PHONE SURROUND <span className="version">PROTOTYPE 0.2</span></div>
      <span className="pill"><span className="dot"></span> Browser-only</span>
    </header>
    <section className="hero">
      <div className="eyebrow">YOUR LAPTOP + TWO ANDROID PHONES</div>
      <h1>Give your room<br/><span>another dimension.</span></h1>
      <p className="muted lead">Customize the logical speaker layout, test laptop left/right output, and generate synchronized phone receiver links.</p>
      <div className="device-layout">
        <div className="phone-device"><div className="phone-icon">▯</div><b>Phone 1</b><small>{leftRole}</small></div>
        <div className="laptop-device"><div className="screen-icon">▱</div><b>Windows laptop</b><small>{laptopLeftRole} / {laptopRightRole}</small></div>
        <div className="phone-device"><div className="phone-icon">▯</div><b>Phone 2</b><small>{rightRole}</small></div>
      </div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><div className="eyebrow">CUSTOMIZE YOUR SETUP</div><h2>Speaker assignments</h2></div><span className="step">01 / 03</span></div>
      <p className="muted">Assign logical surround roles to each device. These labels customize your layout; a normal laptop headphone/speaker output is still stereo, not a true multichannel Windows device.</p>
      <div className="controls">
        <label>Phone 1 channel<select value={leftRole} onChange={e => setLeftRole(e.target.value)}>{roleOptions.filter(x => x !== rightRole).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Phone 2 channel<select value={rightRole} onChange={e => setRightRole(e.target.value)}>{roleOptions.filter(x => x !== leftRole).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Laptop physical left output<select value={laptopLeftRole} onChange={e => setLaptopLeftRole(e.target.value)}>{roleOptions.filter(x => x !== laptopRightRole).map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Laptop physical right output<select value={laptopRightRole} onChange={e => setLaptopRightRole(e.target.value)}>{roleOptions.filter(x => x !== laptopLeftRole).map(x => <option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="button-row">
        <button className="secondary" onClick={() => testLaptop('left')}>Test laptop left</button>
        <button className="secondary" onClick={() => testLaptop('right')}>Test laptop right</button>
      </div>
      <p className="inline-status">{laptopStatus}</p>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><div className="eyebrow">TEST SETTINGS</div><h2>Tone & volume</h2></div><span className="step">02 / 03</span></div>
      <div className="controls">
        <label className="frequency">Test tone <strong>{hz} Hz</strong><input type="range" min="220" max="880" step="55" value={hz} onChange={e => setHz(Number(e.target.value))}/></label>
        <label className="frequency">Test volume <strong>{volume}%</strong><input type="range" min="5" max="80" step="5" value={volume} onChange={e => setVolume(Number(e.target.value))}/></label>
      </div>
      <button className="primary" onClick={createLinks}>Create synchronized phone links <span>↗</span></button>
      {links && <div className="links">
        <div className="link-row"><div><strong>Phone 1 · {leftRole}</strong><small>Scheduled start in 60 seconds · {hz} Hz · {volume}%</small></div><button className="secondary" onClick={() => copyLink('left', links.left)}>{copied === 'left' ? 'Copied!' : 'Copy link'}</button></div>
        <div className="link-row"><div><strong>Phone 2 · {rightRole}</strong><small>Same scheduled start · {hz} Hz · {volume}%</small></div><button className="secondary" onClick={() => copyLink('right', links.right)}>{copied === 'right' ? 'Copied!' : 'Copy link'}</button></div>
        <div className="notice">Open each link on the matching phone and tap Enable audio before the 60-second timer expires. If the timer expires, generate fresh links.</div>
      </div>}
    </section>

    <section className="limits">
      <div className="limit"><span className="limit-icon">✓</span><div><b>Now included</b><p>Custom logical channel labels for both phones and both laptop stereo sides, separate left/right laptop tone tests, adjustable tone frequency and volume, and scheduled phone test tones.</p></div></div>
      <div className="limit"><span className="limit-icon warning">!</span><div><b>Important limitation</b><p>Changing a label does not physically turn a stereo laptop speaker into a discrete rear/center/subwoofer output. The left/right test buttons check stereo separation. True 5.1 routing and live movie-audio streaming are still future milestones.</p></div></div>
      <div className="limit"><span className="limit-icon warning">!</span><div><b>Browser and DRM limitations</b><p>A website cannot silently capture all Windows system audio. Tab/screen capture requires user permission and browser support; protected services such as Netflix may block capture or return muted audio.</p></div></div>
    </section>
    <footer>PHONE SURROUND · Experimental browser-only prototype · Test tones only; no audio is uploaded</footer>
  </main>;
}

function App() { return isReceiver ? <Receiver /> : <Controller />; }

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
