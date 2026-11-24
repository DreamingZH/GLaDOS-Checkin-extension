const S = chrome.storage.local, U = 'https://glados.rocks/console/checkin';
let queue = Promise.resolve();
const serial = f => {
    const r = queue.then(f);
    queue = r.catch(console.error);
    return r;
};

function day() {
    return new Date().toLocaleDateString('sv-SE');
}

function valid(v) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '');
}

function scheduledToday(v) {
    if (!valid(v)) throw Error('invalidTime');
    const [h, m] = v.split(':').map(Number), d = new Date();
    d.setHours(h, m, 0, 0);
    return +d;
}

function success(s) {
    return s.lastSuccessDay === day() || (s.resultDay === day() && s.result === 'success');
}

function logs(v) {
    return (Array.isArray(v) ? v : []).flatMap(e => {
        const t = Array.isArray(e) ? e[0] : e?.at, x = Array.isArray(e) ? e[1] : e?.message;
        return Number.isFinite(t) && (typeof x === 'string' || x && typeof x.key === 'string') ? [[t, x]] : [];
    });
}

async function log(key, args = []) {
    const s = await S.get('logs'), msg = {key, args};
    await S.set({statusMessage: msg, logs: [...logs(s.logs), [Date.now(), msg]].slice(-25)});
}

async function paint() {
    const s = await S.get(null);
    let result = s.resultDay === day() ? s.result : '';
    if (!s.resultDay && s.lastSuccessDay === day()) result = 'success';
    if (!['success', 'failure'].includes(result)) result = 'none';
    await chrome.action.setIcon({path: 'icons/' + result + (s.scheduleEnabled ? '-timer' : '') + '.png'});
    await chrome.action.setBadgeText({text: ''});
}

async function plan() {
    const s = await S.get(null);
    await chrome.alarms.clear('daily');
    if (!s.scheduleEnabled) {
        await S.set({next: null});
        return;
    }
    let when = scheduledToday(s.scheduleTime || '09:30');
    if (when <= Date.now()) {
        const d = new Date(when);
        d.setDate(d.getDate() + 1);
        when = +d;
    }
    await chrome.alarms.create('daily', {when});
    await S.set({next: when});
}

async function midnight() {
    const d = new Date();
    d.setHours(24, 0, 1, 0);
    await chrome.alarms.create('midnight', {when: +d});
}

async function finish(key, ok, args = []) {
    await S.remove('job');
    await chrome.alarms.clear('timeout');
    await S.set({
        result: ok ? 'success' : 'failure', resultDay: day(), ...(ok ? {
            lastSuccessDay: day(),
            lastFailureDay: null
        } : {lastFailureDay: day()})
    });
    await log(key, args);
    await paint();
}

async function start(reason = 'manual') {
    const s = await S.get(null);
    if (s.job || reason !== 'manual' && success(s) || Date.now() - (Number(s.last) || 0) < 60000) return false;
    await S.set({last: Date.now(), logs: []});
    await log(reason === 'catchup' ? 'catchup' : 'open');
    try {
        const t = await chrome.tabs.create({url: 'about:blank', active: false});
        await S.set({page: t.id, job: {id: t.id, clicked: false, started: Date.now()}});
        await chrome.alarms.create('timeout', {when: Date.now() + 180000});
        await chrome.tabs.update(t.id, {url: U});
        return true;
    } catch {
        await finish('openFailed', false);
        return false;
    }
}

async function catchup() {
    const s = await S.get(null);
    if (!s.scheduleEnabled || !valid(s.scheduleTime) || success(s) || s.catchupAttemptDay === day() || Date.now() < scheduledToday(s.scheduleTime) || s.job) return;
    const remaining = (Number(s.last) || 0) + 60000 - Date.now();
    if (remaining > 0) {
        await chrome.alarms.create('catchup', {when: Date.now() + remaining + 500});
        return;
    }
    await S.set({catchupAttemptDay: day()});
    await start('catchup');
}

async function restore(startup = false) {
    const s = await S.get(null);
    if (s.job) {
        let live = false;
        if (!startup) {
            try {
                await chrome.tabs.get(s.job.id);
                live = Number(s.job.started) > Date.now() - 180000;
            } catch {
            }
        }
        if (!live) await finish('interrupted', false); else await chrome.alarms.create('timeout', {when: s.job.started + 180000});
    }
    try {
        await plan();
    } catch {
        await S.set({scheduleEnabled: false, next: null, scheduleErrorKey: 'invalidSaved'});
        await chrome.alarms.clear('daily');
    }
    await paint();
    await midnight();
    if (startup) await catchup();
}

chrome.runtime.onInstalled.addListener(() => serial(() => restore(false)));
chrome.runtime.onStartup.addListener(() => serial(() => restore(true)));
chrome.alarms.onAlarm.addListener(a => serial(async () => {
    if (a.name === 'midnight') {
        await paint();
        await midnight();
    }
    if (a.name === 'daily') {
        const s = await S.get(null);
        if (s.scheduleEnabled) {
            await plan();
            await start('daily');
        }
    }
    if (a.name === 'catchup') await catchup();
    if (a.name === 'timeout' && (await S.get('job')).job) await finish('timeout', false);
}));
chrome.tabs.onRemoved.addListener(id => serial(async () => {
    if ((await S.get('job')).job?.id === id) await finish('closed', false);
}));
chrome.runtime.onMessage.addListener((m, s, reply) => {
    serial(async () => {
        if (s.url === chrome.runtime.getURL('popup.html')) {
            if (m.k === 'start') await start(); else if (m.k === 'schedule') {
                scheduledToday(m.time);
                await S.set({scheduleEnabled: !!m.on, scheduleTime: m.time, scheduleError: '', scheduleErrorKey: ''});
                if (!m.on) await chrome.alarms.clear('catchup');
                await plan();
                await paint();
            }
            return {ok: true};
        }
        const {job} = await S.get('job');
        let u;
        try {
            u = new URL(s.url);
        } catch {
            return false;
        }
        if (!job || s.tab?.id !== job.id || s.frameId !== 0 || u.origin !== 'https://glados.rocks' || u.pathname.replace(/\/$/, '') !== '/console/checkin') return false;
        if (m.k === 'ready') {
            await log('checking');
            return true;
        }
        if (m.k === 'click' && !job.clicked) {
            await S.set({job: {...job, clicked: true}});
            await log('clicked');
            return true;
        }
        if (m.k === 'done') {
            const ok = m.ok === true, n = String(m.points || '');
            await finish(ok ? (/^\d+(\.\d+)?$/.test(n) ? 'points' : 'done') : 'unknown', ok, [n]);
            return true;
        }
        return false;
    }).then(reply, e => reply({ok: false, error: e.message}));
    return true;
});