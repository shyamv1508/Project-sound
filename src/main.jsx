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

function Brand() {
  return <a className="brand" href={window.location.pathname} aria-label="Phone Surround home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 10v12M10 6v20M15 11v10M20 4v24M25 9v14" /></svg></span>
    <span className="brand-copy"><strong>sonora</strong><small>PHONE SURROUND LAB</small></span>
  </a>;
}

function Receiver() {
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState('Ready when you are');
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
          setStatus('Test tone played successfully');
        } else {
          setStatus('Audio is not running. Reload and enable audio again.');
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
      if (contextRef.current) await contextRef.current.close().catch(() => {});
      const context = new AudioContextClass();
      await context.resume();
      contextRef.current = context;
      playedRef.current = false;
      setArmed(true);
      setStatus(startAt > Date.now() ? 'Receiver armed — waiting for the scheduled tone' : 'This link has expired. Generate fresh links on your laptop.');
    } catch (error) {
      setStatus(error.message || 'Could not start audio. Check browser sound permissions.');
    }
  }

  return <main className="receiver-page">
    <header className="topbar"><Brand /><span className="topbar-tag"><span className="status-dot" /> RECEIVER MODE</span></header>
    <section className="receiver-card">
      <div className="receiver-visual"><div className="receiver-orbit orbit-one" /><div className="receiver-orbit orbit-two" /><div className="receiver-phone">♫</div></div>
      <span className="eyebrow">YOUR PHONE IS A RECEIVER</span>
      <h1>{role}</h1>
      <p className="muted">Keep this page open to play its scheduled synchronization test tone.</p>
      <div className="status-box"><span className={`status-dot ${armed ? 'is-live' : ''}`} /><div><strong>{status}</strong><small>{countdown || 'Audio starts after you give browser permission'}</small></div></div>
      <button className="primary full" onClick={enableAudio}>{armed ? 'Enable audio again' : 'Enable phone audio'} <span aria-hidden="true">↗</span></button>
      <div className="receiver-tip"><span>i</span><p>For best results, keep the phone awake and its media volume at a comfortable level. This prototype plays test tones only.</p></div>
      <a className="back-link" href={window.location.pathname}>← Return to setup</a>
    </section>
    <footer className="site-footer">SONORA · EXPERIMENTAL AUDIO LAB</footer>
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
  const [laptopStatus, setLaptopStatus] = useState('Ready to test your laptop stereo output');

  async function testLaptopStereo() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
      const context = new AudioContextClass();
      await context.resume();
      const now = context.currentTime + 0.12;
      playTone(context, now, hz, volume, -1, 0.45);
      playTone(context, now + 0.8, hz, volume, 1, 0.45);
      setLaptopStatus(`Stereo check running · Left (${laptopLeftRole}), then right (${laptopRightRole})`);
      window.setTimeout(() => context.close().catch(() => {}), 1800);
    } catch (error) {
      setLaptopStatus(error.message || 'Could not play laptop stereo test.');
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

  return <main className="app-shell">
    <header className="topbar">
      <Brand />
      <div className="header-right"><span className="topbar-tag"><span className="status-dot" /> BROWSER-BASED</span><a className="github-link" href="https://github.com/shyamv1508/Project-sound" target="_blank" rel="noreferrer">View project <span>↗</span></a></div>
    </header>

    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="eyebrow-line" /> PERSONAL AUDIO SETUP</span>
        <h1>Sound that moves<br />beyond the <span>screen.</span></h1>
        <p className="muted lead">Turn your laptop and two phones into a synchronized test setup. Configure your layout, tune the sound, and get both receivers ready.</p>
        <a className="text-link" href="#setup">Configure your setup <span>↓</span></a>
      </div>
      <div className="sound-stage" aria-label="Illustration of laptop and two phone receivers">
        <div className="stage-glow" />
        <div className="sound-wave wave-a" /><div className="sound-wave wave-b" />
        <div className="stage-device phone-stage phone-stage-left"><div className="phone-notch" /><span>♫</span><small>PHONE 01</small></div>
        <div className="stage-device laptop-stage"><div className="laptop-screen"><div className="screen-wave">〰</div><div className="screen-caption">STEREO LAB</div></div><div className="laptop-base" /><small>YOUR LAPTOP</small></div>
        <div className="stage-device phone-stage phone-stage-right"><div className="phone-notch" /><span>♫</span><small>PHONE 02</small></div>
        <div className="stage-caption"><span className="status-dot is-live" /> 3 DEVICES · 1 SETUP</div>
      </div>
    </section>

    <section className="quick-stats">
      <div><span className="stat-number">01</span><span><strong>Configure</strong><small>Assign channel roles</small></span></div>
      <div><span className="stat-number">02</span><span><strong>Calibrate</strong><small>Test tone and volume</small></span></div>
      <div><span className="stat-number">03</span><span><strong>Synchronize</strong><small>Prepare both phones</small></span></div>
    </section>

    <section className="section-heading" id="setup"><div><span className="eyebrow">CONTROL CENTER</span><h2>Build your listening setup</h2><p className="muted">A few settings, then your devices are ready to test.</p></div><span className="setup-badge"><span className="status-dot" /> TEST MODE</span></section>

    <section className="panel">
      <div className="panel-heading"><div className="step-number">01</div><div className="panel-title"><span className="eyebrow">DEVICE CONFIGURATION</span><h3>Speaker assignments</h3><p className="muted">Choose the logical channel each device represents.</p></div></div>
      <div className="device-assignment-grid">
        <div className="assignment-card">
          <div className="assignment-head"><span className="device-symbol phone-symbol">▯</span><div><strong>Phone 1</strong><small>Wireless receiver</small></div><span className="mini-status">READY</span></div>
          <label>Channel role<select value={leftRole} onChange={e => setLeftRole(e.target.value)}>{roleOptions.filter(x => x !== rightRole).map(x => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="assignment-card">
          <div className="assignment-head"><span className="device-symbol phone-symbol">▯</span><div><strong>Phone 2</strong><small>Wireless receiver</small></div><span className="mini-status">READY</span></div>
          <label>Channel role<select value={rightRole} onChange={e => setRightRole(e.target.value)}>{roleOptions.filter(x => x !== leftRole).map(x => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="assignment-card laptop-assignment">
          <div className="assignment-head"><span className="device-symbol laptop-symbol">▱</span><div><strong>Windows laptop</strong><small>Built-in stereo output</small></div><span className="mini-status">STEREO</span></div>
          <div className="controls laptop-controls">
            <label>Left side<select value={laptopLeftRole} onChange={e => setLaptopLeftRole(e.target.value)}>{roleOptions.filter(x => x !== laptopRightRole).map(x => <option key={x}>{x}</option>)}</select></label>
            <label>Right side<select value={laptopRightRole} onChange={e => setLaptopRightRole(e.target.value)}>{roleOptions.filter(x => x !== laptopLeftRole).map(x => <option key={x}>{x}</option>)}</select></label>
          </div>
          <p className="field-note">Tone is automatically panned left, then right. Role names are labels, not extra physical speakers.</p>
        </div>
      </div>
      <div className="panel-action-row"><div className="action-copy"><strong>Check your laptop channels</strong><small>Listen for the left tone, then the right tone.</small></div><button className="secondary" onClick={testLaptopStereo}><span>▶</span> Run stereo test</button></div>
      <p className="inline-status" role="status">{laptopStatus}</p>
    </section>

    <section className="panel">
      <div className="panel-heading"><div className="step-number">02</div><div className="panel-title"><span className="eyebrow">AUDIO CALIBRATION</span><h3>Tone & volume</h3><p className="muted">Choose a comfortable test tone before creating the receiver links.</p></div></div>
      <div className="slider-grid">
        <label className="slider-card"><span className="slider-label">TEST FREQUENCY <strong>{hz} <small>Hz</small></strong></span><input type="range" min="220" max="880" step="55" value={hz} onChange={e => setHz(Number(e.target.value))}/><span className="range-labels"><small>Low · 220 Hz</small><small>High · 880 Hz</small></span></label>
        <label className="slider-card"><span className="slider-label">TEST VOLUME <strong>{volume}<small>%</small></strong></span><input type="range" min="5" max="80" step="5" value={volume} onChange={e => setVolume(Number(e.target.value))}/><span className="range-labels"><small>Quiet · 5%</small><small>Loud · 80%</small></span></label>
      </div>
      <div className="tone-summary"><span className="tone-icon">♫</span><span><strong>Your test profile</strong><small>{hz} Hz sine tone · {volume}% volume · Shared settings for both phones</small></span></div>
    </section>

    <section className="panel sync-panel">
      <div className="panel-heading"><div className="step-number">03</div><div className="panel-title"><span className="eyebrow">PAIR YOUR DEVICES</span><h3>Create synchronized links</h3><p className="muted">Generate a separate receiver link for each phone, with a shared start time.</p></div></div>
      <button className="primary create-button" onClick={createLinks}>Generate phone links <span>↗</span></button>
      {links && <div className="links">
        <div className="links-intro"><span className="status-dot is-live" /><div><strong>Receiver links generated</strong><small>Both test tones are scheduled for the same time.</small></div><span className="countdown-tag">+60 SEC</span></div>
        <div className="link-row"><div className="link-device-icon">01</div><div className="link-details"><strong>Phone 1 <span>· {leftRole}</span></strong><small>{hz} Hz · {volume}% volume</small></div><button className="secondary copy-button" onClick={() => copyLink('left', links.left)}>{copied === 'left' ? '✓ Copied' : 'Copy link'}</button></div>
        <div className="link-row"><div className="link-device-icon">02</div><div className="link-details"><strong>Phone 2 <span>· {rightRole}</span></strong><small>{hz} Hz · {volume}% volume</small></div><button className="secondary copy-button" onClick={() => copyLink('right', links.right)}>{copied === 'right' ? '✓ Copied' : 'Copy link'}</button></div>
        <div className="notice"><span>i</span><p>Open each link on its matching phone and tap <strong>Enable phone audio</strong> before the 60-second timer expires. Generate fresh links if the timer runs out.</p></div>
      </div>}
    </section>

    <section className="limitations">
      <div className="limit-card"><span className="limit-icon good">✓</span><div><strong>What works today</strong><p>Custom channel labels, automatic left-to-right laptop test tones, adjustable frequency and volume, and synchronized phone test tones.</p></div></div>
      <div className="limit-card"><span className="limit-icon caution">!</span><div><strong>What is still in development</strong><p>Streaming movie audio to phones and extracting true surround channels are not implemented yet. The website can test its own audio but cannot silently reroute all Windows audio. Protected services such as Netflix may block browser capture.</p></div></div>
    </section>
    <footer className="site-footer"><Brand /><span>EXPERIMENTAL AUDIO LAB · TEST TONES ONLY · NO AUDIO UPLOADS</span></footer>
  </main>;
}

function App() { return isReceiver ? <Receiver /> : <Controller />; }

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
