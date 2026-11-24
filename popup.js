const LEGACY = {
    "GLaDOS 签到助手": "name",
    "官网签到、每日预约与启动补签。": "description",
    "官网流程": "flow",
    "开始签到": "start",
    "查看官网": "page",
    "每日定时": "daily",
    "重启保留 · 错过预约时补签一次": "scheduleHint",
    "每天": "every",
    "已保存": "saved",
    "已自动保存": "autoSaved",
    "待自动保存": "pending",
    "保存中…": "saving",
    "保存失败，请重试": "saveFailed",
    "请输入完整时间（00:00–23:59）": "invalidTime",
    "下次预约：": "next",
    "定时未开启": "disabled",
    "运行记录": "records",
    "暂无记录": "empty",
    "成功": "success",
    "失败／未确认": "failure",
    "有定时任务": "timer",
    "需要验证时，请在官网手动完成。": "verify",
    "待运行": "idle",
    "运行中": "running",
    "冷却 $1 秒": "cooldown",
    "打开官网": "open",
    "已过预约时间，启动补签": "catchup",
    "检查签到状态": "checking",
    "已点击，等待结果": "clicked",
    "页面显示已签到": "done",
    "签到成功，获得 $1 Points": "points",
    "结果未确认，请查看官网": "unknown",
    "超时，请查看官网": "timeout",
    "任务页面已关闭，结果未确认": "closed",
    "任务中断，请核对官网": "interrupted",
    "无法打开官网，请检查": "openFailed",
    "读取失败，请重新加载扩展": "readFailed",
    "时间无效，定时已关闭": "invalidSaved"
};
const $ = id => document.getElementById(id), S = chrome.storage.local,
    T = (k, a = []) => chrome.i18n.getMessage(k, a) || k;
// Only English, Simplified and Traditional Chinese are translated; other
// browser languages fall back to English for both text and number/date formats.
const uiLanguage = chrome.i18n.getUILanguage() || 'en',
    locale = /^zh/i.test(uiLanguage) ? (/hant|tw|hk|mo/i.test(uiLanguage) ? 'zh-TW' : 'zh-CN') : 'en';
document.documentElement.lang = locale;
document.title = T('name');
document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = T(e.dataset.i18n));
$('enabled').setAttribute('aria-label', T('daily'));
let dirty = false, initial = false, saving = false, pending = false, busy = false, timer, copyTimer, rendering = false;
const valid = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v), day = () => new Date().toLocaleDateString('sv-SE'),
    clock = t => new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(t);

function text(x) {
    if (x && typeof x === 'object' && x.key) return T(x.key, x.args || []);
    if (typeof x !== 'string') return T('idle');
    if (LEGACY[x]) return T(LEGACY[x]);
    const n = x.match(/签到成功，获得 (\d+(?:\.\d+)?) Points/);
    return n ? T('points', [n[1]]) : x;
}

async function save() {
    clearTimeout(timer);
    if (!initial) return;
    if (!valid($('time').value)) {
        $('saved').textContent = T('invalidTime');
        return;
    }
    if (saving) {
        pending = true;
        return;
    }
    saving = true;
    const time = $('time').value, on = $('enabled').checked;
    $('saved').textContent = T('saving');
    try {
        const r = await chrome.runtime.sendMessage({k: 'schedule', time, on});
        if (!r?.ok) throw Error(r?.error || 'saveFailed');
        if (time === $('time').value && on === $('enabled').checked) {
            dirty = false;
            $('saved').textContent = T('autoSaved');
        } else pending = true;
    } catch (e) {
        dirty = true;
        $('saved').textContent = T('saveFailed');
        console.error(e);
    } finally {
        saving = false;
        if (pending) {
            pending = false;
            void save();
        }
        void draw();
    }
}

function edit() {
    if (!initial) return;
    dirty = true;
    $('saved').textContent = T('pending');
    clearTimeout(timer);
    timer = setTimeout(save, 350);
}

async function draw() {
    if (rendering) return;
    rendering = true;
    try {
        const s = await S.get(null);
        if (!initial) {
            $('time').value = valid(s.scheduleTime) ? s.scheduleTime : '09:30';
            $('enabled').checked = !!s.scheduleEnabled;
            initial = true;
        } else if (!dirty && !saving && document.activeElement !== $('time') && document.activeElement !== $('enabled')) {
            $('time').value = valid(s.scheduleTime) ? s.scheduleTime : '09:30';
            $('enabled').checked = !!s.scheduleEnabled;
        }
        $('state').textContent = text(s.statusMessage || s.text || {key: 'idle'});
        $('progress').hidden = !s.job;
        const n = Math.max(0, Math.ceil(((Number(s.last) || 0) + 60000 - Date.now()) / 1000));
        $('start').disabled = busy || !!s.job || n > 0;
        $('start').textContent = s.job ? T('running') : n ? T('cooldown', [String(n)]) : T('start');
        $('next').textContent = s.scheduleEnabled && s.next ? T('next') + new Date(s.next).toLocaleDateString(locale) + ' ' + clock(s.next) : T('disabled');
        $('error').hidden = !s.scheduleErrorKey;
        $('error').textContent = s.scheduleErrorKey ? T(s.scheduleErrorKey) : '';
        $('logs').textContent = (Array.isArray(s.logs) ? s.logs : []).flatMap(e => {
            const t = Array.isArray(e) ? e[0] : e?.at, x = Array.isArray(e) ? e[1] : e?.message;
            return Number.isFinite(t) && Number.isFinite(new Date(t).getTime()) && x ? [clock(t) + '  ' + text(x)] : [];
        }).join('\n') || T('empty');
        let result = s.resultDay === day() ? s.result : '';
        if (!s.resultDay && s.lastSuccessDay === day()) result = 'success';
        if (!['success', 'failure'].includes(result)) result = 'none';
        $('icon').src = 'icons/' + result + (s.scheduleEnabled ? '-timer' : '') + '.png';
    } catch (e) {
        $('state').textContent = T('readFailed');
        console.error(e);
    } finally {
        rendering = false;
    }
}

$('time').addEventListener('input', edit);
$('time').addEventListener('change', () => {
    dirty = true;
    void save();
});
$('time').addEventListener('blur', () => {
    if (dirty) void save();
});
$('enabled').addEventListener('change', () => {
    dirty = true;
    void save();
});
$('start').onclick = async () => {
    if (busy || $('start').disabled) return;
    busy = true;
    try {
        await chrome.runtime.sendMessage({k: 'start'});
    } catch (e) {
        console.error(e);
    } finally {
        busy = false;
        void draw();
    }
};
$('page').onclick = async () => {
    try {
        const {page} = await S.get('page');
        if (Number.isInteger(page)) {
            try {
                const t = await chrome.tabs.update(page, {active: true});
                await chrome.windows.update(t.windowId, {focused: true});
                return;
            } catch {
            }
        }
        await chrome.tabs.create({url: 'https://glados.rocks/console/checkin'});
    } catch (e) {
        console.error(e);
    }
};
$('copy').onclick = async () => {
    const code = $('coupon').textContent.trim();
    try {
        await navigator.clipboard.writeText(code);
    } catch (e) {
        console.error(e);
        const r = document.createRange(), sel = getSelection();
        r.selectNodeContents($('coupon'));
        sel.removeAllRanges();
        sel.addRange(r);
        if (!document.execCommand('copy')) return;
    }
    $('copy').textContent = T('copied');
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => $('copy').textContent = T('copy'), 1600);
};
chrome.storage.onChanged.addListener(() => void draw());
void draw();
setInterval(() => void draw(), 1000);