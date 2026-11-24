(async () => {
    if (location.pathname.replace(/\/$/, '') !== '/console/checkin') return;
    const send = (k, x = {}) => chrome.runtime.sendMessage({k, ...x});
    if (!await send('ready')) return;
    let clicked = false;
    const end = Date.now() + 120000;
    while (Date.now() < end) {
        const bs = [...document.querySelectorAll('button.ckb')].filter(b => b.getClientRects().length && getComputedStyle(b).visibility === 'visible'),
            label = b => b.textContent.replace(/\s+/g, ' ').trim();
        const done = bs.find(b => b.matches('.is-done:disabled') || /^Checkin!\s*Got\s*\d+(?:\.\d+)?\s*Points?$/i.test(label(b)) || /^(今日已签到|今天已签到|已签到|签到成功)$/.test(label(b)));
        if (done) {
            const n = label(done).match(/Got\s*(\d+(?:\.\d+)?)\s*Points?/i);
            await send('done', {ok: true, points: n ? n[1] : null});
            return;
        }
        const hits = bs.filter(b => /^(签到|Check\s*in!?)$/i.test(label(b)) && !b.matches(':disabled,[aria-disabled="true"]'));
        if (!clicked && hits.length === 1) {
            const b = hits[0];
            b.scrollIntoView({block: 'center'});
            const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            if (t && (t === b || b.contains(t)) && await send('click')) {
                clicked = true;
                if (b.isConnected && !b.disabled) b.click();
            }
        }
        await new Promise(r => setTimeout(r, 700));
    }
    await send('done', {ok: false});
})().catch(console.error);