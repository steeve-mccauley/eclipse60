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

const { GLib, Gio, GObject, St, Shell } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GETTEXT_DOMAIN = 'eclipse-60-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

const Clippie = Me.imports.clippie.Clippie;
const ClippieMenu = Me.imports.menus.ClippieMenu;
const Logger = Me.imports.logger.Logger;
const Utils = Me.imports.utils;

var ClippieIndicator = GObject.registerClass(
class ClippieIndicator extends PanelMenu.Button {
  _init() {
    super._init(0.0, 'eclipse');

    // settings lives in Clippie singleton
    this._clippie = new Clippie();

    this.logger = new Logger('cl_indicator', this.settings);
    this.logger.debug('Initializing extension');

    let clippie_icon_path = GLib.build_filenamev([Me.path, 'icons', 'clippie_icon.svg']);
    let gicon = Gio.icon_new_for_string(clippie_icon_path);

    let box = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
    box.add_child(new St.Icon({
        //icon_name: 'view-paged-symbolic',
        gicon: gicon,
        style_class: 'system-status-icon',
        icon_size: 20
    }));
    //box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));
    this.add_child(box);

    // systemctl --user status org.gnome.GPaste
    if (Utils.isGnome40() || Utils.isGnome3_38()) {
      // failed on GS 3.36
      Shell.util_start_systemd_unit('org.gnome.GPaste.service', 'replace', null, (src, res) => {
        let ok = Shell.util_start_systemd_unit_finish(res);
        this.logger.debug('org.gnome.GPaste started %s', ok);
        let msg;
        if (ok) {
          msg=this.logger.debug("successfully started systemd service org.gnome.GPaste version %s", this.clippie.dbus_gpaste.version);
          this._clippie.attach(this);
          this._clippie_menu = new ClippieMenu(this.menu, this.clippie);
        } else {
          msg = this.logger.error('Failed to start systemd unit org.gnome.GPaste.service');
          Main.notifyError(msg, 'Ensure that gpaste is installed, for example,\nsudo dnf install gpaste, or\nsudo apt install gpaste');
        }
      });
    } else {
      this._clippie.attach(this);
      this._clippie_menu = new ClippieMenu(this.menu, this.clippie);
    }

    // set the filter to an empty string to prevent refreshing on startup
    //this._clippie_menu.build("");

    this.connect('destroy', () => {
      this.logger.debug("Panel indicator button being destroyed");
      this.clippie.detach();
    });
  }

  get settings() {
    return this.clippie.settings;
  }

  get clippie() {
    return this._clippie;
  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  rebuild_menu(filter=undefined) {
    this.clippie_menu.build(filter);
  }
});
