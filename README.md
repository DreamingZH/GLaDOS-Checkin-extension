# GLaDOS Check-in Assistant

A small Chrome extension (Manifest V3) that performs the daily check-in on
[GLaDOS](https://glados.rocks/console/checkin) for you: on demand, on a daily
schedule, or as a one-time catch-up if a scheduled run was missed.

## Features

- **Website check-in** — opens the GLaDOS check-in page in a background tab,
  clicks the check-in button, waits for the result and reports the points earned.
- **Daily schedule** — pick a time (default `09:30`) and the extension runs the
  check-in every day. The time is saved automatically as you type and survives
  browser restarts.
- **Startup catch-up** — if a scheduled run was missed (for example the browser
  was closed), one catch-up attempt is made on the next startup.
- **Status at a glance** — the toolbar icon and popup show success, failure /
  unconfirmed, and whether a schedule is active.
- **Activity log** — the last runs are listed with their timestamps.
- **Localized UI** — Simplified Chinese, Traditional Chinese and English
  (follows the browser language).

## Install

1. Download or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

To update an existing installation, overwrite the files in the extension folder
and click **Reload** on the extensions page. Do not uninstall first — uninstalling
clears the saved settings.

## Usage

1. Click the toolbar icon to open the popup.
2. Press **Check in** to run a check-in immediately, or **Open website** to review
   the result on the GLaDOS site yourself.
3. Turn on **Daily schedule**, choose a time and it is saved automatically.

If the site asks for a human verification (captcha), complete it on the website
manually — the extension does not attempt to bypass it.

## Coupon — 10% off with Alipay

Paying for a GLaDOS plan with **Alipay**? Enter the coupon code below at checkout
to get **10% off**:

```
WELCOME10
```

The same code is shown in the extension popup with a one-click copy button.

## Notes

- The schedule follows the local time zone of your computer.
- Check-ins done manually on the website or from another device cannot be
  detected offline; the extension re-checks the page status after loading it.
- The extension keeps its state locally (`chrome.storage.local`) and talks to
  nothing except `glados.rocks`.

## Release notes — 1.2.4.10

- Full extension build; replaces every file in the previous extension folder.
- Keeps i18n (Simplified Chinese, Traditional Chinese, English), automatic time
  saving, the daily schedule, one catch-up check-in after a missed schedule at
  startup, and local state persistence.
- Toolbar and popup share transparent, rounded-corner icon files; the status bar
  is flush, full width and free of borders or padding, matching the bottom
  corners. A single status is full width; result and schedule split the bar.
- Colors: dark green for success, dark red for failure / unconfirmed, dark blue
  for a scheduled run. The rest of the color scheme is unchanged.
- Adds the WELCOME10 coupon hint (10% off, Alipay) to the popup and README.
- Not tested in a real browser with a real account.

## Disclaimer

This is an unofficial helper and is not affiliated with GLaDOS. Use it at your own
risk and in line with the website's terms of service.
