import * as configurations from './configurations';
import { Vehicle } from './Vehicle';
import { clamp } from './util/clamp';

let loaded = false;
let activeConfig: string = 'bac_mono';

/* Vehicle */
const vehicle = new Vehicle();
const engine = vehicle.engine;
const drivetrain = vehicle.drivetrain;

/* DOM refs */
const startBtn = document.getElementById('start_btn') as HTMLButtonElement;
const dashboard = document.getElementById('dashboard') as HTMLDivElement;
const configSelect = document.getElementById('configSelect') as HTMLSelectElement;
const rpmDisplay = document.getElementById('rpmDisplay') as HTMLDivElement;
const gearDisplay = document.getElementById('gearDisplay') as HTMLDivElement;
const throttleDisplay = document.getElementById('throttleDisplay') as HTMLDivElement;
const throttleFill = document.getElementById('throttleFill') as HTMLDivElement;
const configDisplay = document.getElementById('configDisplay') as HTMLDivElement;
const tachoNeedle = document.getElementById('tachoNeedle')! as unknown as SVGGElement;
const tachoArc = document.getElementById('tachoArc')! as unknown as SVGPathElement;

/* Events */
const keys: Record<string, boolean> = {}

document.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (!loaded) return;

    if (e.code === 'ArrowUp') drivetrain.nextGear();
    if (e.code === 'ArrowDown') drivetrain.prevGear();
    if (e.code.startsWith('Digit')) {
        drivetrain.changeGear(+e.key);
    }
});

document.addEventListener('keyup', e => {
    if (e.code.startsWith('Digit') || e.code === 'ArrowUp' || e.code === 'ArrowDown') return;
    keys[e.code] = false;
});

/* Initialization */
startBtn?.addEventListener('click', start, {once: true});
configSelect?.addEventListener('change', () => {
    if (loaded) return;
    activeConfig = configSelect.value;
});

async function start() {
    // @ts-ignore
    await vehicle.init(configurations[activeConfig]);

    loaded = true;

    startBtn.style.display = 'none';
    dashboard.classList.add('active');

    const label = configSelect.options[configSelect.selectedIndex].text;
    configDisplay.textContent = label;
}

/* Update loop */
let lastTime = (new Date()).getTime();
let currentTime = 0;
let dt = 0;

function update(time: DOMHighResTimeStamp): void {
    requestAnimationFrame(time => { update(time); });

    currentTime = (new Date()).getTime();
    dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (dt === 0 || !loaded) return;

    if (drivetrain.downShift) {
        engine.throttle = 0.8;
    } else {
        if (keys['Space']) {
            engine.throttle = clamp(engine.throttle += 0.2, 0, 1);
        } else {
            engine.throttle = clamp(engine.throttle -= 0.2, 0, 1);
        }
    }

    if (keys['KeyB']) {
        drivetrain.omega -= 0.3;
    }

    vehicle.update(time, dt);

    /* Update UI */
    const rpm = Math.round(engine.rpm);
    rpmDisplay.textContent = rpm.toLocaleString();

    const maxRpm = engine.limiter || 9000;
    const pct = clamp(rpm / maxRpm, 0, 1);

    /* Needle rotation: -140deg (idle) to +140deg (redline) */
    const needleAngle = -140 + pct * 280;
    tachoNeedle.style.transform = `rotate(${needleAngle}deg)`;

    /* Arc fill */
    const arcLength = 408.4;
    tachoArc.style.strokeDasharray = `${pct * arcLength} ${arcLength}`;
    tachoArc.style.stroke = rpm > engine.soft_limiter * 0.95 ? 'var(--accent)' : '#0a84ff';

    /* Gear */
    gearDisplay.textContent = drivetrain.gear === 0 ? 'N' : String(drivetrain.gear);

    /* Throttle */
    const tpct = Math.round(engine.throttle * 100);
    throttleDisplay.textContent = `${tpct}%`;
    throttleFill.style.width = `${tpct}%`;
}

requestAnimationFrame(time => { update(time); });
