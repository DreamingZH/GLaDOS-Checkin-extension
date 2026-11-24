# GLaDOS Check-in Assistant

[![Release](https://img.shields.io/github/v/release/DreamingZH/GLaDOS-Checkin-extension)](https://github.com/DreamingZH/GLaDOS-Checkin-extension/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A Chrome extension (Manifest V3) that automates the daily check-in on
[GLaDOS](https://glados.rocks/console/checkin). It can run on demand, on a daily
schedule, or as a single catch-up attempt when a scheduled run was missed.

## Features

| Feature | Description |
| --- | --- |
| Manual check-in | Opens the GLaDOS check-in page in a background tab, triggers the check-in button and reports the result. |
| Daily schedule | Runs the check-in once per day at a configurable time (default `09:30`). Changes are saved automatically and persist across restarts. |
| Startup catch-up | If a scheduled run was missed — for example, the browser was closed — one catch-up attempt is made on the next startup. |
| Status reporting | The toolbar icon and popup indicate success, failure or an unconfirmed result, and whether a schedule is active. |
| Activity log | Lists the steps and outcome of the most recent attempt with timestamps. |
| Localization | Interface available in English, Simplified Chinese and Traditional Chinese. Unsupported browser languages fall back to English. |

## Requirements

- Google Chrome or a Chromium-based browser with Manifest V3 support.

## Installation

### From a release

1. Download `GLaDOS-Checkin-extension-<version>.zip` from
   [Releases](https://github.com/DreamingZH/GLaDOS-Checkin-extension/releases).
2. Extract the archive.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**
   and select the extracted folder.

### From source

```bash
git clone https://github.com/DreamingZH/GLaDOS-Checkin-extension.git
```

Then load the repository folder as an unpacked extension as described above.

### Updating

Overwrite the files in the extension directory and click **Reload** on the
extensions page. Do not uninstall the extension first: uninstalling removes all
saved settings.

## Usage

1. Click the extension icon to open the popup.
2. Select **Check in** to run a check-in immediately, or **Open website** to
   inspect the result on the GLaDOS site.
3. Enable **Daily schedule** and choose a time. The value is saved automatically.

If the website requests a human verification (captcha), complete it manually.
The extension does not attempt to bypass it.

## Privacy and Permissions

The extension does not collect, transmit or sell any data. It contains no
analytics, telemetry, remote code or third-party requests.

- **Permissions.** Only `storage` and `alarms` are requested. The extension does
  not hold the `tabs`, `cookies`, `history` or `webRequest` permissions and
  declares no host permissions, so it cannot read browsing history, cookie
  contents or credentials.
- **Scope.** The content script is restricted to
  `https://glados.rocks/console/checkin*`. It is injected only into that page and
  remains idle unless the extension has started a check-in job.
- **Local data.** The following values are stored in `chrome.storage.local` on
  the user's device and are never uploaded:

  | Key | Purpose |
  | --- | --- |
  | `scheduleEnabled`, `scheduleTime`, `next` | Daily schedule |
  | `result`, `resultDay`, `lastSuccessDay`, `lastFailureDay`, `last` | Current status and cooldown |
  | `logs` | Steps of the latest check-in attempt |
  | `job`, `page` | Temporary background tab used for the current run |
  | `statusMessage`, `catchupAttemptDay`, `scheduleErrorKey` | Interface state |

  All data is removed when the extension is uninstalled.
- **Authentication.** The extension does not request, read or store GLaDOS
  credentials. It opens the check-in page in the browser and relies on the
  session that is already signed in, exactly as a normal page visit would.
- **Network.** The only destination is `glados.rocks`, which serves the check-in
  page itself.

## Discount Code

GLaDOS plans paid with **Alipay** can be discounted by entering the following
code at checkout:

```
WELCOME10
```

The code grants 10% off. It is also displayed in the extension popup with a
copy button. The extension only displays the code; it does not process payments.

## Project Structure

```
.
├── manifest.json          # Manifest V3 definition
├── background.js          # Service worker: scheduling, job orchestration
├── content.js             # Check-in automation on the GLaDOS page
├── popup.html/css/js      # Extension popup
├── _locales/              # en, zh_CN, zh_TW message catalogues
├── icons/                 # Toolbar and popup icons
└── .github/workflows/     # Release automation
```

## Releasing

Releases are built by GitHub Actions (`.github/workflows/release.yml`):

1. Update `version` in `manifest.json`. Extension versions may contain up to four
   numeric components, for example `1.2.4.11`.
2. Commit the change and push a matching tag:

   ```bash
   git commit -am "Release 1.2.4.11"
   git tag v1.2.4.11
   git push origin main --tags
   ```

3. The workflow verifies that the tag matches `manifest.json`, builds
   `GLaDOS-Checkin-extension-<version>.zip` containing the extension files and
   the license, and publishes it as a GitHub release with generated notes.

Running the workflow manually from the **Actions** tab builds the archive and
stores it as a workflow artifact without creating a release.

## Limitations

- The schedule follows the local time zone of the computer.
- Check-ins performed manually, on the website or from another device, cannot be
  detected while offline; the page status is re-checked once it loads.
- Site markup changes may require updates to the selectors used by
  `content.js`.
- Automated checks are provided as-is. The extension has not been validated
  against every GLaDOS account or browser version.

## License

Released under the [MIT License](LICENSE).

## Disclaimer

This project is an unofficial helper and is not affiliated with, endorsed by or
sponsored by GLaDOS. Use it at your own risk and in accordance with the
website's terms of service.
