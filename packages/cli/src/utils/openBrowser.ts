import { spawn } from "node:child_process";

export interface OpenBrowserOptions {
  noOpen?: boolean;
  browserPath?: string;
  userDataDir?: string;
  remoteDebuggingPort?: number;
}

/**
 * Open a URL in the browser with the given options.
 *
 * - noOpen: skip entirely
 * - browserPath: spawn the given binary directly (enables Chrome flags)
 * - userDataDir / remoteDebuggingPort: passed as Chrome flags (requires browserPath)
 * - otherwise: fall back to the `open` package (default browser)
 */
export function openBrowser(url: string, options: OpenBrowserOptions): void {
  if (options.noOpen) return;

  if (options.browserPath) {
    const chromeArgs = [url];
    if (options.userDataDir) {
      chromeArgs.push(`--user-data-dir=${options.userDataDir}`);
    }
    if (options.remoteDebuggingPort) {
      chromeArgs.push(`--remote-debugging-port=${options.remoteDebuggingPort}`);
    }
    spawn(options.browserPath, chromeArgs, { detached: true, stdio: "ignore" }).unref();
    return;
  }

  // Chrome flags without an explicit browser path — warn and fall through
  if (options.userDataDir || options.remoteDebuggingPort) {
    console.warn(
      "  --user-data-dir and --remote-debugging-port require --browser-path to take effect.",
    );
  }

  import("open").then((mod) => mod.default(url)).catch(() => {});
}
