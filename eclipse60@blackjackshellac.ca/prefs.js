/*
 * eclipse GPaste interface with encryption
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

//const { Gio, Gtk, GLib, Gdk } = imports.gi;
//const ByteArray = imports.byteArray;
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk';

//const GETTEXT_DOMAIN = 'eclipse-60-blackjackshellac';
//const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
//const _ = Gettext.gettext;
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

//const Main = imports.ui.main;
//import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

//const Me = ExtensionUtils.getCurrentExtension();
////Before GNOME 45
//const Me = imports.misc.extensionUtils.getCurrentExtension();
//const MyModule = Me.imports.MyModule;
//
//// GNOME 45
//import * as MyModule from './MyModule.js';

//const Settings = Me.imports.settings.Settings;
//const Utils = Me.imports.utils;
//const Logger = Me.imports.logger.Logger;
//const DBusGPaste = Me.imports.dbus.DBusGPaste;
//const KeyboardShortcutDialog = Me.imports.kb_shortcuts_dialog.KeyboardShortcutDialog;
//const HMS = Me.imports.hms.HMS;

//import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';
import * as Settings from './settings/Settings.js';
import * as Utils from './utils.js';
import * as Logger from './logger/Logger.js';
import * as DBusGPaste from './dbus/DBusGPaste.js';
import * as KeyboardShortcutDialog from './kb_shortcuts_dialog/KeyboardShortcutDialog.js';
import * as HMS from './hms/HMS.js';

class PreferencesBuilder {
  constructor() {
    this._settings = new Settings();
    this._builder = new Gtk.Builder();
    this.logger = new Logger('cl_prefs', this._settings);

    this.logger.debug('PreferencesBuilder');

    this._gsettings = Utils.exec_path('gsettings');
    this._gpaste_client = Utils.exec_path('gpaste-client');

    if (this._gsettings === null) {
      this.logger.error('gsettings not found');
      this._gsettings = 'gsettings';
    }

    // gsettings get org.gnome.GPaste track-changes
    // gsettings set org.gnome.GPaste track-changes false
    // gpaste-client daemon-reexec
    this.command_args = {
      get_track_changes: (this.gsettings+' get org.gnome.GPaste track-changes').split(/\s+/),
      set_track_changes_true:  (this.gsettings+' set org.gnome.GPaste track-changes true').split(/\s+/),
      set_track_changes_false: (this.gsettings+' set org.gnome.GPaste track-changes false').split(/\s+/)
    };

    if (Utils.isGnome40()) {
      let iconPath = Me.dir.get_child("icons").get_path();
      let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
      iconTheme.add_search_path(iconPath);
    }
  }

  get gsettings() {
    return this._gsettings;
  }

  show() {
    if (Utils.isGnome3x()) {
      this._widget.show_all();
    }
  }

  build() {
    this.logger.info("Create preferences widget gnome shell version %s: %s",
      Utils.gnomeShellVersion, Utils.isGnome3x() ? "less than 40" : "40 or more");

    let ui = Utils.isGnome3x() ? 'prefs3x.ui' : 'prefs40.ui';

    this._builder.add_from_file(GLib.build_filenamev( [Me.path, 'ui', ui] ));
    this._prefs_box = this._builder.get_object('prefs_box');

    this._viewport = new Gtk.Viewport();
    this._widget = new Gtk.ScrolledWindow();
    if (Utils.isGnome3x()) {
      this._viewport.add(this._prefs_box);
      this._widget.add(this._viewport);
    } else {
      this._viewport.set_child(this._prefs_box);
      this._widget.set_child(this._viewport);
    }

    this._bind();

    // https://gjs-docs.gnome.org/gtk30~3.24.26/gtk.widget#signal-key-press-event
    // https://gjs-docs.gnome.org/gdk30/gdk.eventkey
    // this._widget.connect('key-press-event', (w, event) => {
    //   this.logger.debug("key-press-event, w=%s event=%s", Utils.logObjectPretty(w), Utils.logObjectPretty(event));
      // propogate if false

    //   return false;
    // });

    //this._clippie_grid = this._bo('clippie_grid');
    this._eclips_grid = this._bo('eclips_grid');
    this._shortcuts_grid = this._bo('shortcuts_grid');
    this._gpaste_grid = this._bo('gpaste_grid');
    this._msg_text = this._bo('msg_text');

    if (Utils.isGnome40()) {
      // this._prefs_box.append(this._title);
      // grids are inside of frames now in prefs.ui
      // this._prefs_box.append(this._clippie_grid);
      // this._prefs_box.append(this._gpaste_grid);

      let provider = new Gtk.CssProvider();

      provider.load_from_path(Me.dir.get_path() + '/prefs.css');
      Gtk.StyleContext.add_provider_for_display(
        Gdk.Display.get_default(),
        provider,
        Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

      this._title = this._bo('title');
      this._title.add_css_class('prefs-title');
    }

    // col, row, col_span, row_span
    //this._clippie_grid.attach(this._bo('show_histories_text'), 0, 0, 1, 1); // row 0
    //this._clippie_grid.attach(this._bo('show_histories'),      1, 0, 1, 1);

    //this._clippie_grid.attach(this._bo('debug_text'),          0, 1, 1, 1); // row 1
    //this._clippie_grid.attach(this._bo('debug'),               1, 1, 1, 1);

    this._save_eclips = this._bo('save_eclips');
    this._save_eclips_path = this._bo('save_eclips_path');
    this._cache_password_timeout = this._bo('cache_password_timeout');
    this._timeout_gpaste_password = this._bo('timeout_gpaste_password');

    // col, row, col_span, row_span
    this._eclips_grid.attach(this._bo('cache_password_text'),         0, 0, 1, 1);
    this._eclips_grid.attach(this._bo('cache_password'),              1, 0, 1, 1);
    this._eclips_grid.attach(this._bo('cache_password_timeout_text'), 0, 1, 1, 1);
    this._eclips_grid.attach(this._cache_password_timeout,            1, 1, 1, 1);
    this._eclips_grid.attach(this._bo('timeout_gpaste_password_text'),0, 2, 1, 1);
    this._eclips_grid.attach(this._timeout_gpaste_password,           1, 2, 1, 1);
    this._eclips_grid.attach(this._bo('cache_eclips_text'),           0, 3, 1, 1);
    this._eclips_grid.attach(this._bo('cache_eclips'),                1, 3, 1, 1);
    this._eclips_grid.attach(this._bo('save_eclips_text'),            0, 4, 1, 1);
    this._eclips_grid.attach(this._save_eclips,                       1, 4, 1, 1);
    this._eclips_grid.attach(this._save_eclips_path,                  0, 5, 2, 1);

    this._eclips_grid.attach(new Gtk.Separator({orientation: Gtk.Orientation.HORIZONTAL}), 0, 6, 2, 1);
    this._eclips_grid.attach(this._bo('show_histories_text'),               0, 7, 1, 1); // row 0
    this._eclips_grid.attach(this._bo('show_histories'),                    1, 7, 1, 1);

    this._eclips_grid.attach(this._bo('debug_text'),                        0, 8, 1, 1); // row 1
    this._eclips_grid.attach(this._bo('debug'),                             1, 8, 1, 1);

    let hms = new HMS(this.settings.cache_password_timeout);
    this._cache_password_timeout.set_text(hms.toTimeString());
    this._cache_password_timeout.connect('notify::text', (ctext) => {
      let text = ctext.get_text().trim();
      if (text.length === 0) { return; }

      let hms = HMS.fromString(text);
      let secs;
      if (hms === undefined) {
        return;
      }

      secs = hms.toSeconds();
      // TODO parse
      if (secs === 0) {
        ctext.secondary_icon_name = 'appointment-missed-symbolic';
      } else {
        ctext.secondary_icon_name = 'alarm-symbolic';
      }
      this.settings.cache_password_timeout = secs;
    });

    this._cache_password_timeout.connect('activate', (ctext) => {
      let secs = undefined;
      let hms = undefined;
      let text = ctext.get_text().trim();
      if (text.length > 0) {
        hms = HMS.fromString(text);
        if (hms !== undefined) {
          secs = hms.toSeconds();
        }
      }
      if (secs === undefined) {
        secs = this.settings.cache_password_timeout;
      }
      if (hms === undefined) {
        hms = new HMS(secs);
      }
      ctext.set_text(hms.toTimeString());
    });

    hms = new HMS(this.settings.timeout_gpaste_password);
    this._timeout_gpaste_password.set_text(hms.toTimeString());
    this._timeout_gpaste_password.connect('notify::text', (ctext) => {
      let text = ctext.get_text().trim();
      if (text.length === 0) { return; }

      let hms = HMS.fromString(text);
      let secs;
      if (hms === undefined) {
        return;
      }

      secs = hms.toSeconds();
      // TODO parse
      if (secs === 0) {
        ctext.secondary_icon_name = 'appointment-missed-symbolic';
      } else {
        ctext.secondary_icon_name = 'alarm-symbolic';
      }
      this.settings.timeout_gpaste_password = secs;
    });

    this._timeout_gpaste_password.connect('activate', (ctext) => {
      let secs = undefined;
      let hms = undefined;
      let text = ctext.get_text().trim();
      if (text.length > 0) {
        hms = HMS.fromString(text);
        if (hms !== undefined) {
          secs = hms.toSeconds();
        }
      }
      if (secs === undefined) {
        secs = this.settings.timeout_gpaste_password;
      }
      if (hms === undefined) {
        hms = new HMS(secs);
      }
      ctext.set_text(hms.toTimeString());
    });

    this._save_eclips.connect('notify::active', (sw) => {
      let active = sw.get_active();
      if (active) {
        this.select_eclips_folder();
      } else {
        this.settings.save_eclips_path = "";
        this._save_eclips_path.set_text("");
      }
    });

    if (this._save_eclips.get_active()) {
      if (GLib.file_test(this.settings.save_eclips_path, GLib.FileTest.IS_DIR)) {
        this._save_eclips_path.set_text(this.settings.save_eclips_path);
      } else {
        this.logger.warn('eclipse directory not found %s', this.settings.save_eclips_path);
        this._save_eclips.set_active(false);
      }
    }

    this._save_eclips_path.connect('icon-press', (entry, icon_pos, event) => {
      let path = this._save_eclips_path.get_text();
      Utils.spawn_argv(['nautilus', path]);
    });

    this._accel_enable = this._bo('accel_enable');
    // keyboard shortcut buttons
    this._accel_menu = this._bo('accel_menu');
    this._accel_menu_value = this._bo('accel_menu_value');

    this._accel_history = this._bo('accel_history');
    this._accel_history_value = this._bo('accel_history_value');

    this._accel_next = this._bo('accel_next');
    this._accel_next_value = this._bo('accel_next_value');


    this._accel_menu.set_active(this.settings.accel_show_menu.length > 0);
    this._accel_menu_value.set_text(this.settings.accel_show_menu);

    this._accel_history.set_active(this.settings.accel_show_history.length > 0);
    this._accel_history_value.set_text(this.settings.accel_show_history);

    this._accel_next.set_active(this.settings.accel_next.length > 0);
    this._accel_next_value.set_text(this.settings.accel_next);

    this._accel_menu.connect('notify::active', (sw) => {
      let active = sw.get_active();
      if (active) {
        let dialog = new KeyboardShortcutDialog( ( { binding, mask, keycode, keyval }) => {
          if (binding === undefined) {
            // no change
          } else if (binding.length > 0) {
            this.settings.accel_show_menu = binding;
            this._accel_menu_value.set_text(binding);
          } else {
            sw.set_active(false);
          }
        });

        let toplevel = Utils.isGnome3x() ? this._widget.get_toplevel() : this._widget.get_root();
        dialog.set_transient_for(toplevel);
        dialog.present();
        this.logger.debug('top level=%s', toplevel);
      } else {
        this.settings.accel_show_menu = "";
        this._accel_menu_value.set_text(_("<disabled>"));
      }
    });

    this._accel_history.connect('notify::active', (sw) => {
      let active = sw.get_active();
      if (active) {
        let dialog = new KeyboardShortcutDialog( ( { binding, mask, keycode, keyval }) => {
          if (binding === undefined) {
            // no change
          } else if (binding.length > 0) {
            this.settings.accel_show_history = binding;
            this._accel_history_value.set_text(binding);
          } else {
            sw.set_active(false);
          }
        });

        let toplevel = Utils.isGnome3x() ? this._widget.get_toplevel() : this._widget.get_root();
        dialog.set_transient_for(toplevel);
        dialog.present();
        this.logger.debug('top level=%s', toplevel);
      } else {
        this.settings.accel_show_history = "";
        this._accel_history_value.set_text(_("<disabled>"));
      }
    });

    this._accel_next.connect('notify::active', (sw) => {
      let active = sw.get_active();
      if (active) {
        let dialog = new KeyboardShortcutDialog( ( { binding, mask, keycode, keyval }) => {
          if (binding === undefined) {
            // no change
          } else if (binding.length > 0) {
            this.settings.accel_next = binding;
            this._accel_next_value.set_text(binding);
          } else {
            sw.set_active(false);
          }
        });

        let toplevel = Utils.isGnome3x() ? this._widget.get_toplevel() : this._widget.get_root();
        dialog.set_transient_for(toplevel);
        dialog.present();
        this.logger.debug('top level=%s', toplevel);
      } else {
        this.settings.accel_next = "";
        this._accel_next_value.set_text(_("<disabled>"));
      }
    });

    // col, row, col_span, row_span
    this._shortcuts_grid.attach(this._bo('accel_enable_text'),   0, 0, 1, 1); // row 0
    this._shortcuts_grid.attach(this._accel_enable,              1, 0, 1, 1);

    this._shortcuts_grid.attach(this._bo('accel_menu_text'),     0, 1, 1, 1); // row 1
    this._shortcuts_grid.attach(this._accel_menu,                1, 1, 1, 1);
    this._shortcuts_grid.attach(this._accel_menu_value,          2, 1, 1, 1);

    this._shortcuts_grid.attach(this._bo('accel_history_text'),  0, 2, 1, 1);
    this._shortcuts_grid.attach(this._accel_history,             1, 2, 1, 1);
    this._shortcuts_grid.attach(this._accel_history_value,       2, 2, 1, 1);

    this._shortcuts_grid.attach(this._bo('accel_next_text'),     0, 3, 1, 1);
    this._shortcuts_grid.attach(this._accel_next,                1, 3, 1, 1);
    this._shortcuts_grid.attach(this._accel_next_value,          2, 3, 1, 1);

    this._track_changes = this._bo('track_changes');
    this._daemon_reexec = this._bo('daemon_reexec');
    this._gpaste_ui = this._bo('gpaste_ui');

    this._gpaste_grid.attach(this._bo('track_changes_text'),  0, 0, 1, 1);
    this._gpaste_grid.attach(this._track_changes,             1, 0, 1, 1);
    this._gpaste_grid.attach(this._daemon_reexec,             0, 1, 2, 1);
    this._gpaste_grid.attach(this._gpaste_ui,                 0, 2, 2, 1);

    this._track_changes.connect('notify::active', (sw) => {
      let active = sw.get_active();
      this._gpaste_track_changes(active);
    });

    Utils.execCommandAsync(this.command_args.get_track_changes).then((result) => {
      let [ ok, stdout, stderr, exit_status ] = result;
      if (exit_status === 0) {
        let active = stdout.trim() === 'true';
        this.logger.debug('gsettings get org.gnome.GPaste track-changes => %s', stdout);
        if (this.settings.track_changes) {
          if (active === false) {
            this._gpaste_track_changes(true);
          }
        } else {
          this._msg_text.set_label('Warning: not tracking changes');
        }
      } else {
        let msg = this.logger.error(_("failed to get track changes state from gpaste: %d"), exit_status);
        this._msg_text.set_label(msg);
      }
    });

    this._daemon_reexec.connect('clicked', (btn) => {
      this.logger.debug('Run dbus gpaste method Reexecute()');
      this.dbus_gpaste.daemonReexec();
      this._msg_text.set_label(_("GPaste deamon restarted"));
    });

    this._gpaste_ui.connect('clicked', (btn) => {
      this.logger.debug('Launch the GPaste preferences UI');
      Utils.execCommandAsync([this._gpaste_client, "ui"]).then((result) => {
        let [ok, stdout, stderr, exit_status ] = result;
        if (ok) {
          this._msg_text.set_label(_("Launched gpaste-client ui"));
        } else {
          let msg = this.logger.error(_("gpaste-client ui returned %d: make sure gpaste-ui is installed"), exit_status);
          this._msg_text.set_label(msg);
        }
      });
    });

    this._accel_enable.connect('notify::active', (sw) => {
      this.logger.debug('accel_enable=%s', sw.get_active());
      return true;
    });

    if (this._bo('show_histories').grab_focus()) {
      this.logger.debug('set focus to history switch');
    }

    this._bo('version').set_text("Version "+Me.metadata.version);
    this._bo('description').set_text(Me.metadata.description.split('\n')[0]);

    // About box
    this._about_clicks = 0;
    if (Utils.isGnome3x()) {

      this.timer_icon = this._bo('clippie_icon');

      this.timer_icon.connect('button-press-event', () => {
        this._about_clicks = this._spawn_dconf_config(this._about_clicks);
      });
    } else {
      this.timer_icon_button = this._bo('clippie_icon_button');

      this.timer_icon_button.connect('clicked', (btn) => {
        this._about_clicks = this._spawn_dconf_config(this._about_clicks);
      });
    }
    return this._widget;
  }

  _gpaste_track_changes(active=true) {
    let cmdargs = active ? this.command_args.set_track_changes_true : this.command_args.set_track_changes_false;
    this.logger.debug(cmdargs.join(' '));
    Utils.execCommandAsync(cmdargs).then((result) => {
      let msg;
      let [ ok, stdout, stderr, exit_status ] = result;
      if (exit_status !== 0) {
        msg = this.logger.debug('failed to set track-changes: %d - %s', exit_status, stderr);
      } else {
        msg = active ? 'GPaste tracking clipboard changes' : 'GPaste not tracking clipboard updates';
      }
      this._msg_text.set_label(msg);
    });
  }

  _spawn_dconf_config(clicks) {
    if (clicks === 2) {
      var cmd = Me.path+"/bin/dconf-editor.sh";
      this.logger.debug("execute %s", cmd);
      Utils.spawn_argv( [ cmd ] );
      clicks = 0;
    } else {
      clicks++;
    }
    return clicks;
  }

  // https://stackoverflow.com/questions/54487052/how-do-i-add-a-save-button-to-the-gtk-filechooser-dialog
  select_eclips_folder() {
    // import/export settings
    var select_folder_dialog = new Gtk.FileChooserDialog( {
      title: _("Select eclips folder"),
      action: Gtk.FileChooserAction.SELECT_FOLDER,
      create_folders: true
    });

    //select_folder_dialog.set_transient_for(this._widget);

    let default_path = (this.settings.save_eclips_path.length === 0)
      ? GLib.build_filenamev( [ GLib.get_user_config_dir(), 'eclipse' ] )
      : this.settings.save_eclips_path;
    default_path = GLib.build_filenamev( [default_path, 'eclips'] );

    this.logger.debug("default path=%s", default_path);
    select_folder_dialog.current_folder = default_path;
    let result = GLib.mkdir_with_parents(default_path, 0o700);
    this.logger.debug('mkdir = %d', result);

    let settings_json = 'kitchen_timer_settings.json';

    select_folder_dialog.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
    select_folder_dialog.add_button(_('Ok'), Gtk.ResponseType.OK);

    if (Utils.isGnome3x()) {
      select_folder_dialog.set_current_folder(default_path);
      select_folder_dialog.set_local_only(false);
    } else {
      select_folder_dialog.set_current_folder(Gio.File.new_for_path(default_path));
    }

    select_folder_dialog.connect('response', (dialog, response_id) => {
      if (response_id === Gtk.ResponseType.OK) {
       // outputs "-5"
        this.logger.debug("response_id=%d", response_id);

        var file = dialog.get_file();

        this.logger.debug(file.get_path());

        this.settings.save_eclips_path = file.get_path();
        this._save_eclips_path.set_text(file.get_path());

      } else {
        this.logger.debug("response_id not handled: %d", response_id);
      }

      // destroy the dialog regardless of the response when we're done.
      dialog.destroy();
    });

    select_folder_dialog.show();
  }

  get dbus_gpaste() {
    if (!this._dbus_gpaste) {
      this._dbus_gpaste = new DBusGPaste(this.settings);
    }
    return this._dbus_gpaste;
  }

  /**
   * Get Gtk Builder object by id
   */
  _bo(id) {
    return this._builder.get_object(id);
  }

  /**
   * Bind setting to builder object
   */
  _ssb(key, object, property, flags=Gio.SettingsBindFlags.DEFAULT) {
    if (object) {
      this._settings.settings.bind(key, object, property, flags);
    } else {
      this.logger.error(`object is null for key=${key}`);
    }
  }

  _bo_ssb(id, property, flags=Gio.SettingsBindFlags.DEFAULT) {
    let object = this._bo(id);
    let key=id.replace(/_/g, '-');
    this._ssb(key, object, property, flags);
  }

  _bind() {
    //this._bo_ssb('accel_enable', 'active');
    this._bo_ssb('debug', 'active');
    this._bo_ssb('show_histories', 'active');
    this._bo_ssb('accel_enable', 'active');
    this._bo_ssb('cache_eclips', 'active');
    this._bo_ssb('cache_password', 'active');
    this._bo_ssb('save_eclips', 'active');
    this._bo_ssb('track_changes', 'active');
  }

  get settings() {
    return this._settings;
  }
}

function init() {

}

function getTopLevelWindow(w) {
  while(true) {
    let t=w.get_parent();
    if (t) {
      w=t;
      continue;
    }
    return w;
  }
}

function buildPrefsWidget() {
  ExtensionUtils.initTranslations(GETTEXT_DOMAIN);

  var preferencesBuilder = new PreferencesBuilder();
  var widget = preferencesBuilder.build();
  preferencesBuilder.show();

  widget.connect('realize', () => {
    let window = Utils.isGnome3x() ? widget.get_toplevel() : widget.get_root();
    preferencesBuilder.logger.debug('window=%s', window);
    //window.default_width = 700;
    //window.default_height = 900;
    //window.set_default_icon_name('view-paged-symbolic');
    if (Utils.isGnome3x()) {
      window.set_position(Gtk.WindowPosition.CENTER);
    } else {
      //window.set_transient_for(null);
      //window.set_halign(Gtk.Align.CENTER);
      //window.add_css_class('center-me');
      //let classes = window.get_css_classes();
      //window.default_width *= 1.1;
    }
  });
  return widget;
}

