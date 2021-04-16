/*
 * Kitchen Timer: Gnome Shell Kitchen Timer Extension
 * Copyright (C) 2021 Steeve McCauley
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

String.prototype.format = imports.format.format;

const { Gio, GLib} = imports.gi;
const ByteArray = imports.byteArray;

var clearTimeout, clearInterval;
clearTimeout = clearInterval = GLib.Source.remove;

function logObjectPretty(obj) {
  log(JSON.stringify(obj, null, 2));
}

function setTimeout(func, delay, ...args) {
  const wrappedFunc = () => {
    func.apply(this, args);
    // never continue timeout
    return false;
  };
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

function setInterval(func, delay, ...args) {
  const wrappedFunc = () => {
    // continue timeout until func returns false
    return func.apply(this, args);
  };
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

function spawn(command, callback) {
  var [status, pid] = GLib.spawn_async(
      null,
      ['/usr/bin/env', 'bash', '-c', command],
      null,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null
  );

  if (callback) {
    GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, callback);
  }
}

/**
 * execute the given cmdargs [ cmd, arg0, arg1, ... ] synchronously
 *
 * Return [ exit_value, output ]
 *
 * - if it fails return [ -1, undefined, undefined ]
 * - otherwise return [ exit_status, stdout, stderr ]
 *
 * Normally if exit_status is 0 stderr will be empty
 *
 */
function execute(cmdargs, params={ wdir: null, envp: null, flags: GLib.SpawnFlags.SEARCH_PATH }) {
  var [ok, stdout, stderr, exit_status] = GLib.spawn_sync(
    params.wdir, // working directory
    cmdargs,  // string array
    params.envp,     // envp
    params.flags,
    null    // child setup function
  );

  if (ok) {
    stdout = ByteArray.toString(stdout);
    stderr = ByteArray.toString(stderr);
    //log(`ok=${ok} exit_status=${exit_status} stdout=${stdout} stderr=${stderr}`);
    return [ exit_status, stdout, stderr ];
  }
  // fatal
  return [ -1, undefined, "execute failed: %s".format(cmdargs.join(" ")) ];
}

function uuid(id=undefined) {
  return id === undefined || id.length === 0 ? GLib.uuid_string_random() : id;
}

function isDebugModeEnabled() {
    return new Settings().debug();
}

function addSignalsHelperMethods(prototype) {
    prototype._connectSignal = function (subject, signal_name, method) {
        if (!this._signals) this._signals = [];

        var signal_id = subject.connect(signal_name, method);
        this._signals.push({
            subject: subject,
            signal_id: signal_id
        });
    }

    prototype._disconnectSignals = function () {
        if (!this._signals) return;

        this._signals.forEach((signal) => {
            signal.subject.disconnect(signal.signal_id);
        });
        this._signals = [];
    };
}

/**
 * https://wiki.gnome.org/AndyHolmes/Sandbox/SpawningProcesses
 *
 * execCommandAsync:
 * @argv: an array of arguments
 * @input: (nullable): input text
 * @cancellable: (nullable): an optional Gio.Cancellable to cancel the execution
 *
 * A simple, asynchronous process launcher wrapped in a Promise.
 *
 * Returns: stdout text output
 */
async function execCommandAsync(argv, input = null, cancellable = null) {
    try {
        // We'll assume we want output, or that returning none is not a problem
        let flags = Gio.SubprocessFlags.STDOUT_PIPE;

        // If we aren't given any input, we don't need to open stdin
        if (input !== null)
            flags |= Gio.SubprocessFlags.STDIN_PIPE;

        let proc = new Gio.Subprocess({
            argv: argv,
            flags: flags
        });

        // Classes that implement GInitable must be initialized before use, but
        // an alternative in GJS is to just use Gio.Subprocess.new(argv, flags)
        proc.init(cancellable);

        let stdout = await new Promise((resolve, reject) => {
            proc.communicate_utf8_async(input, cancellable, (proc, res) => {
                try {
                    let [ok, stdout, stderr] = proc.communicate_utf8_finish(res);
                    resolve(stdout);
                } catch (e) {
                    reject(e);
                }
            });
        });

        return stdout;
    } catch (e) {
        logError(e);
    }
}

function exec_path(executable) {
  let path = GLib.find_program_in_path(executable);
  if (path) {
    return path;
  }
  let err='executable path not found %s'.format(executable);
  log(err);
  return null;
}
