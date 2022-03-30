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

const { GObject, St, Clutter } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const GETTEXT_DOMAIN = 'eclipse-60-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const LockItemModalDialog = Me.imports.dialog.LockItemModalDialog;
const EncryptModalDialog = Me.imports.dialog.EncryptModalDialog;
const DecryptModalDialog = Me.imports.dialog.DecryptModalDialog;
const ReEncryptModalDialog = Me.imports.dialog.ReEncryptModalDialog;
const Logger = Me.imports.logger.Logger;
const Utils = Me.imports.utils;

const logger = new Logger('cl_menus');

const ICON_SIZE = {
  DEFAULT: 16,
  MEDIUM:  20,
  LARGE:   24,
  HOVER:   28
};

var ClippieMenu = class ClippieMenu {
  constructor(menu, clippie) {
    log("");
    this._menu = menu;
    this._items = [];

    this._clippie = clippie;
    this._show_eclips = false;

    this._search_item_index = 0;
    this._item_index = 1;

    logger.settings = clippie.settings;

    this.rebuild(false, false);
    this.estimate_max_entries();

    // this._searchItem = new ClippieSearchItem(this);
    // this._historyMenu = new PopupMenu.PopupSubMenuMenuItem(_("Histories"), { reactive: false, can_focus: true } );
    // this.menu.addMenuItem(this._historyMenu);
    // this._createHistory = new ClippieCreateHistoryItem(this);

    this.menu.connect('open-state-changed', (self, open) => {
      logger.debug("menu open="+open);
      if (open) {
        this.rebuild();
        this.estimate_max_entries();
        global.stage.set_key_focus(this._searchItem.entry);
        //this._searchItem.entry.get_clutter_text().grab_key_focus();
      } else {
        this.items.length = 0;
        this.clippie.cur_clip = 0;
        global.stage.set_key_focus(null);
        this._show_eclips = false;
      }
    });

    //logger.debug("menu style=%s", this.menu.box.style_class);
    //this.menu.box.style_class = 'eclipse-menu-content';
  }

  estimate_max_entries() {
    // Shell.Global/Meta.Display
    let monitor = global.display.get_current_monitor();
    let rect = global.display.get_monitor_geometry(monitor);
    let monitor_height = rect.height;
    logger.debug('monitor=%d height=%d', monitor, monitor_height);

    this.clippie.settings.entries_max = Math.floor(monitor_height/this.searchItem.height) - 4;
    logger.debug('search_height=%d entries_max=%d', this.searchItem.height, this.clippie.settings.entries_max);
  }

  add_item(clip) {
    let menu = this.menu;

    let len = this.items.length;
    let max = this.clippie.settings.entries;
    if (len === max) {
      this.more = new PopupMenu.PopupSubMenuMenuItem(_("More…"), { reactive: false } );
      menu.addMenuItem(this.more);
      menu = this.more.menu;
    } else if (len > max) {
      menu = this.more.menu;
    } else {
      this.more = undefined;
    }
    let item = new ClipMenuItem(clip, menu, this);
    this.items.push(item);
  }

  rebuild(load=true, history=true) {
    this.menu.removeAll();

    if (history && this.clippie.settings.show_histories) {
      this._historyMenu = new ClippieHistoryMenu(this);
      this.search_item_index = 1;
    }
    this._searchItem = new ClippieSearchItem(this);
    this.item_index = this.search_item_index + 1;

    this.items = [];
    if (load) {
      logger.debug('Refreshing all menu items');
      this.menu.open();
      this.clippie.refresh_dbus(this);
    }
  }

  build(filter=undefined) {
    logger.debug("Building clippie menu filter=[%s]", filter === undefined ? filter : "undefined");

    let menu = this.menu;

    if (filter === undefined) {
      this.rebuild(true, true);
      return;
    }

    //log(Error().stack);
    logger.debug("items=%d", this.items.length);
    for (let i=0; i < this.items.length; i++) {
      let item = this.items[i];
      item.destroy();
    }
    // destroy more after the items
    if (this.more) {
      this.more.destroy();
      this.more = undefined;
    }
    this.items = [];

    // if filter is empty string
    let entries = this.clippie.search(filter);
    logger.debug("found %d entries with filter=[%s]", entries.length, filter);

    for (let i=0; i < entries.length; i++) {
      let clip=entries[i];
      this.add_item(clip);
    }
  }

  // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  _addSeparator() {
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  }

  get search_item_index() {
    return this._search_item_index;
  }

  set search_item_index(idx) {
    this._search_item_index = idx;
  }

  get item_index() {
    return this._item_index;
  }

  set item_index(idx) {
    this._item_index = idx;
  }

  get items() {
    return this._items;
  }

  set items(array) {
    this._items = array;
  }

  get show_eclips() {
    return this._show_eclips;
  }

  set show_eclips(bool) {
    this._show_eclips = bool;
  }

  get menu() {
    return this._menu;
  }

  get clippie() {
    return this._clippie;
  }

  get searchItem() {
    return this._searchItem;
  }

  get historyMenu() {
    return this._historyMenu;
  }

  toggle_eclips() {
    this.show_eclips = !this.show_eclips;
    if (this.clippie.settings.save_eclips) {
      if (this.show_eclips) {
        this._eclipsItem = new EclipsMenu(this);
        //this._addSeparator();
        this.item_index = this.search_item_index+2;
      } else if (this._eclipsItem) {
        this._eclipsItem.destroy();
        this._eclipsItem = undefined;
        this.item_index = this.search_item_index+1;
      }
    }
  }

  trash(item) {
    var index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
    }
  }

  open(params={history:false}) {
    if (params.history) {
      this.rebuild(false, true);
      this.menu.open();
      this.history_menu_open(true);
    } else {
      this.menu.open();
    }
  }

  history_menu_open(open=true) {
    this.menu.open();
    if (!this.historyMenu) {
      this._historyMenu = new ClippieHistoryMenu(this);
    }
    this.historyMenu.setSubmenuShown(open);
  }

  select(item) {
    if (this.items.includes(item)) {
      this.menu.moveMenuItem(item, this._item_index);
    }
  }
}

var ClipMenuItem = GObject.registerClass(
class ClipMenuItem extends PopupMenu.PopupMenuItem {
  _init(clip, menu, clippie_menu) {
      super._init("", { reactive: true });

      this._clip = clip;
      this._menu = menu;
      this._clippie_menu = clippie_menu;

      clip.menu_item = this;

      var box = new St.BoxLayout({
        x_expand: true,
        x_align: St.Align.START,
        pack_start: false,
        style_class: 'eclipse-menu-layout'
      });

      this.add(box);

      let ltext = clip.preview;
      //logger.debug("Adding clip %s", ltext);
      this.label = new St.Label({
        style_class: 'eclipse-menu-content',
        x_expand: true,
        track_hover: false,
        x_align: St.Align.START,
        text: ltext
      });

      if (clip.eclip) {
        box.add_child(new ClipItemControlButton(clip, 'edit'));
        box.add_child(new ClipItemControlButton(clip, 'decrypt'));
      } else if (clip.lock) {
        box.add_child(new ClipItemControlButton(clip, clip.lock ? 'lock' : 'unlock'));
      } else {
        box.add_child(new ClipItemControlButton(clip, 'encrypt'));
      }
      //box.add_child(new ClipItemControlButton(clip, 'edit'));
      box.add_child(this.label);
      box.add_child(new ClipItemControlButton(clip, 'delete'));

      this.connect('activate', (mi) => {
        logger.debug("Selected %s", mi.clip.uuidx);
        if (mi.clip.select()) {
          mi.menu.moveMenuItem(mi, mi.clippie_menu.item_index);
          if (mi.clip.isEclipsed()) {
            // decrypt as password entry
            let dialog = new DecryptModalDialog(mi.clip);
            dialog.open();
          }
        }
      });

      this.menu.addMenuItem(this);
  }

  get clip() {
    return this._clip;
  }

  get menu() {
    return this._menu;
  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  trash_self() {
    this.clippie_menu.trash(this);
    this.destroy();
  }

  select() {
    this.clip.select();
    this.clippie_menu.select(this);
  }
});

var CICBTypes = {
  'lock': { icon: 'changes-prevent-symbolic', style: 'eclipse-menu-lock-icon' },
  'unlock': { icon: 'changes-allow-symbolic', style: 'eclipse-menu-lock-icon' },
  'delete' :  { icon: 'edit-delete-symbolic'    , style: 'eclipse-menu-delete-icon' },
  'edit' : { icon: 'document-edit-symbolic', style: 'eclipse-menu-edit-icon' },
  'encrypt' : { icon: 'changes-allow-symbolic', style: 'eclipse-menu-lock-icon' },
  'decrypt' : { icon: 'dialog-password-symbolic', style: 'eclipse-menu-lock-icon' }
}

var ClipItemControlButton = GObject.registerClass(
class ClipItemControlButton extends St.Button {
    _init(clip, type) {
        super._init();

        this._type = type;
        this._clip = clip;

        // 'media-playback-stop-symbolic'
        // 'edit-delete-symbolic'
        this.child = this.get_icon(type);

        this.connect_type();
    }

    get_icon(type) {
      var icon = new St.Icon({
          icon_name: CICBTypes[type].icon,
          style_class: CICBTypes[type].style
      });
      icon.set_icon_size(ICON_SIZE.DEFAULT);
      return icon;
    }

    connect_type() {
        switch(this.type) {
        case 'edit':
          if (this.clip.eclip) {
            this.connect('clicked', (cb) => {
              let dialog = new ReEncryptModalDialog(this.clip);
              dialog.open(global.get_current_time());
            });
          }
          break;
        case 'encrypt':
          this.connect('clicked', (cb) => {
            let dialog = new EncryptModalDialog(this.clip);
            dialog.open(global.get_current_time());
          });
          break;
        case 'decrypt':
          this.connect('clicked', (cb) => {
            //let dialog = new ReEncryptModalDialog(this.clip);
            let dialog = new DecryptModalDialog(this.clip);
            dialog.open(global.get_current_time());
          });
          break;
        case 'lock':
        case 'unlock':
          this.connect('clicked', (cb) => {
            let dialog = new LockItemModalDialog(this.clip);
            dialog.open(global.get_current_time());
          });
          break;
        case 'delete':
          this.connect('clicked', (cb) => {
            let item = this.clip.menu_item;
            item.trash_self();
            // item.destroy();
            // this.clip.clippie.indicator.clippie_menu.trash(item);
            //this.clip.menu_item.destroy();
            //this.clip.menu_item._menu.trash(this.clip.menu_item);
            this.clip.delete();
            //this.rebuild();
          });
          break;
        }
    }

    get clip() {
      return this._clip;
    }

    get type() {
      return this._type;
    }

    get icon() {
      return this.child;
    }

    rebuild() {
      this.clip.clippie.indicator.rebuild_menu();
    }
});

var ClippieSearchItem = GObject.registerClass(
class ClippieSearchItem extends PopupMenu.PopupMenuItem {
  _init(clippie_menu) {
    super._init("", { reactive: false, can_focus: true });

    this._menu = clippie_menu.menu;
    this._clippie_menu = clippie_menu;
    this._clippie = clippie_menu.clippie;

    this._menu.addMenuItem(this);

    logger.settings = this.clippie.settings;

    var layout = new St.BoxLayout({
      style_class: 'eclipse-item-layout',
      pack_start: false,
      x_expand: true,
      y_expand: false,
      x_align: St.Align.START,
      vertical: false
    });

    this.add(layout);

    // name: 'searchEntry',
    // style_class: 'search-entry',
    // can_focus: true,
    // hint_text: _('Type here to search…'),
    // track_hover: true,
    // x_expand: true,

    this._search_icon = new St.Icon( {
      x_expand: false,
      y_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'edit-find-symbolic',
      icon_size: ICON_SIZE.DEFAULT,
      style_class: 'eclipse-search-icon'
    });

    this._entry = new St.Entry( {
      x_expand: true,
      y_expand: false,
      can_focus: true,
      track_hover: true,
      primary_icon: this._search_icon,
      style_class: 'eclipse-search-entry',
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER,
      hint_text: _("Search")
    });
    this._entry.set_track_hover(true);

    let entry_text = this._entry.get_clutter_text();
    entry_text.set_activatable(true);
    entry_text.set_editable(true);

    if (this.clippie.settings.save_eclips) {
      let key_icon = new St.Icon( {
        x_expand: false,
        y_align: Clutter.ActorAlign.CENTER,
        icon_name: 'dialog-password-symbolic',
        icon_size: ICON_SIZE.LARGE,
      });

      this._eclips = new St.Button( {
        x_expand: false,
        y_expand: false,
        can_focus: true,
        x_align: St.Align.END,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'eclipse-eclips-button',
        child: key_icon
      });

      this._eclips.connect('clicked', (btn, clicked_button) => {
        logger.debug("mouse button pressed %d", clicked_button);
        this.clippie_menu.toggle_eclips();
      });

      this._eclips.connect('enter_event', (btn, event) => {
        //btn.get_child().icon_name = 'preferences-system-symbolic';
        btn.get_child().icon_size = ICON_SIZE.HOVER;
      });

      this._eclips.connect('leave_event', (btn, event) => {
        //btn.get_child().icon_name = 'open-menu-symbolic';
        btn.get_child().icon_size = ICON_SIZE.LARGE;
      });
    }

    this._icon = new St.Icon( {
      x_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'preferences-system-symbolic',
      icon_size: ICON_SIZE.LARGE,
    });

    this._prefs = new St.Button( {
      x_expand: false,
      y_expand: false,
      can_focus: true,
      x_align: St.Align.END,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'eclipse-prefs-button',
      child: this._icon
    });

    this._prefs.connect('clicked', (btn, clicked_button) => {
      logger.debug("mouse button pressed %d", clicked_button);
      ExtensionUtils.openPrefs();
      this.clippie_menu.menu.close();
      global.stage.set_key_focus(null);
    });

    this._prefs.connect('enter_event', (btn, event) => {
      //btn.get_child().icon_name = 'preferences-system-symbolic';
      btn.get_child().icon_size = ICON_SIZE.HOVER;
    })

    this._prefs.connect('leave_event', (btn, event) => {
      //btn.get_child().icon_name = 'open-menu-symbolic';
      btn.get_child().icon_size = ICON_SIZE.LARGE;
    })

    //this._prefs.set_child(this._icon);

    if (this._eclips) {
      layout.add_child(this._eclips);
    }
    layout.add_child(this._entry);
    layout.add_child(this._prefs);

    // entry_text.connect('activate', (e) => {
    //   var entry = e.get_text();
    //   logger.debug('activate: '+entry);
    // });

    // entry_text.connect('key-focus-out', (e) => {
    //   var entry = e.get_text();
    //   if (entry.length > 0) {
    //     logger.debug('key out hours: '+entry);
    //   }
    // });

    entry_text.connect('text-changed', (e) => {
      var entry = e.get_text().trim();
      logger.debug('text-changed: '+entry);
      this.clippie_menu.build(entry);
    });

  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  get menu() {
    return this._menu;
  }

  get clippie() {
    return this._clippie;
  }

  get entry() {
    return this._entry;
  }

});

var EclipsMenu = GObject.registerClass(
class EclipsMenu extends PopupMenu.PopupSubMenuMenuItem {
  _init(clippie_menu) {
    super._init("eclips", true);

    this.icon.set_icon_name('dialog-password-symbolic');
    this.icon.set_icon_size(ICON_SIZE.MEDIUM);

    this.setOrnament(PopupMenu.Ornament.NONE);

    logger.debug("Creating eclips SubMenu popup");

    this._clippie_menu = clippie_menu;

    clippie_menu.menu.addMenuItem(this, this.clippie_menu.search_item_index+1);

    this.menu.connect('open-state-changed', (self, open) => {
      if (open) {
        logger.debug("eclips menu open");
      } else {
        logger.debug("eclips menu closed");
      }
    });

    this.clippie.refresh_eclips_async(this);
  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  get clippie() {
    return this.clippie_menu.clippie;
  }

  add_eclip_item(clip) {
    new ClipMenuItem(clip, this.menu, this.clippie_menu);
    this.setSubmenuShown(true);
  }

});

var ClippieHistoryMenu = GObject.registerClass(
class ClippieHistoryMenu extends PopupMenu.PopupSubMenuMenuItem {
  _init(clippie_menu) {
    super._init(_("History [")+clippie_menu.clippie.dbus_gpaste.getHistoryName()+"]");

    logger.debug("Creating History SubMenu popup");

    // default
    //this.add_style_class_name('popup-submenu-menu-item');

    this._clippie_menu = clippie_menu;
    this._clippie = this.clippie_menu.clippie;

    clippie_menu.menu.addMenuItem(this);

    new ClippieCreateHistoryItem(this);

    this.menu.connect('open-state-changed', (self, open) => {
      logger.debug("history menu open="+open);
      if (open) {
        this.rebuild();
        //global.stage.set_key_focus(this._entry);
      } else {
        //global.stage.set_key_focus(null);
        this.menu.removeAll();
        new ClippieCreateHistoryItem(this);
      }
    });
  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  get clippie() {
    return this._clippie;
  }

  rebuild() {
    let list = this.clippie.dbus_gpaste.listHistories().sort();
    let current = this.clippie.dbus_gpaste.getHistoryName();
    //Utils.logObjectPretty(list);
    for (let i=0; i < list.length; i++) {
      let item = new ClippieHistoryItem(list[i], this.menu, this, current === list[i]);
      //this.menu.addMenuItem(item);
    }
  }

});

var ClippieCreateHistoryItem = GObject.registerClass(
class ClippieCreateHistoryItem extends PopupMenu.PopupMenuItem {
  _init(history_menu) {
    super._init("", { reactive: false, can_focus: false });

    this._clippie_menu = history_menu.clippie_menu;
    this._menu = history_menu.menu;
    this._clippie = this.clippie_menu.clippie;

    var layout = new St.BoxLayout({
      style_class: 'eclipse-history-menu-item',
      pack_start: false,
      x_expand: true,
      y_expand: false,
      x_align: St.Align.START,
      vertical: false
    });

    this._entry = new St.Entry( {
      x_expand: true,
      y_expand: false,
      can_focus: true,
      track_hover: true,
      style_class: 'eclipse-create-history-entry',
      x_align: St.Align.START,
      y_align: St.Align.START, // Clutter.ActorAlign.CENTER,
      hint_text: _("Create history")
    });

    let etext = this._entry.get_clutter_text();

    etext.set_activatable(true);
    etext.set_editable(true);
    etext.connect('activate', (etext) => {
      let name=etext.get_text();
      if (this.clippie.dbus_gpaste.switchHistory(name)) {
        logger.debug("Created new history %s", name);
        this.clippie_menu.rebuild(true);
      }
    });

    layout.add_child(this._entry);
    this.add(layout);

    history_menu.menu.addMenuItem(this);
  }


  get clippie_menu() {
    return this._clippie_menu;
  }

  get menu() {
    return this._menu;
  }

  get clippie() {
    return this._clippie;
  }

  get entry() {
    return this._entry;
  }

});

var ClippieHistoryItem = GObject.registerClass(
class ClippieHistoryItem extends PopupMenu.PopupMenuItem {
  _init(name, menu, clippie_menu, current) {
    super._init("", { reactive: true, can_focus: true });

    this._menu = menu;
    this._clippie_menu = clippie_menu;
    this._clippie = clippie_menu.clippie;

    var layout = new St.BoxLayout({
      style_class: 'eclipse-item-layout',
      pack_start: false,
      x_expand: true,
      y_expand: false,
      x_align: St.Align.START,
      vertical: false
    });

    this.add(layout);

    let size=this.clippie.dbus_gpaste.getHistorySize(name);
    if (size === undefined) {
      size=0;
    }
    this._size = new St.Label({
      style_class: 'eclipse-history-size',
      x_expand: false,
      y_expand: false,
      track_hover: false,
      can_focus: false,
      x_align: St.Align.START,
      text: ""+size
    });
    this._size.set_text("%03d".format(size));

    this._name = new St.Label({
      style_class: 'eclipse-menu-content',
      x_expand: true,
      y_expand: false,
      track_hover: false,
      x_align: St.Align.START,
      text: name
    });

    this._clear_icon = new St.Icon( {
      x_expand: false,
      y_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'edit-clear-symbolic',
      icon_size: ICON_SIZE.LARGE
    });

    this._clear = new St.Button( {
      x_expand: false,
      y_expand: false,
      can_focus: true,
      x_align: St.Align.END,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'eclipse-history-clear-icon',
      child: this._clear_icon
    });

    this._clear.connect('enter_event', (btn, event) => {
      btn.set_label(_("Clear"));
    });

    this._clear.connect('leave_event', (btn, event) => {
      //btn.set_label(undefined);
      btn.set_label('');
      btn.set_child(this._clear_icon);
    });

    this._clear.connect('button_press_event', (btn, event) => {
      //btn.set_label(undefined);
      btn.set_label('');
      btn.set_child(this._clear_icon);
    });

    this._clear.connect('clicked', (btn) => {
      let name = this._name.get_text();
      if (this.clippie.dbus_gpaste.emptyHistory(name)) {
        logger.debug("cleared %s", name);
      }
    });

    this._delete_icon = new St.Icon( {
      x_expand: false,
      y_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'edit-delete-symbolic',
      icon_size: ICON_SIZE.LARGE
    });

    this._delete = new St.Button( {
      x_expand: false,
      y_expand: false,
      can_focus: true,
      x_align: St.Align.END,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'eclipse-history-delete-icon',
      child: this._delete_icon
    });

    this._delete.connect('enter_event', (btn, event) => {
      btn.set_label(_('Delete'));
    });

    this._delete.connect('leave_event', (btn, event) => {
      btn.set_label('');
      btn.set_child(this._delete_icon);
    });

    this._delete.connect('button_press_event', (btn, event) => {
      //btn.set_label(undefined);
      btn.set_label('');
      btn.set_child(this._delete_icon);
    });

    this._delete.connect('clicked', (btn) => {
      let name = this._name.get_text();
      if (this.clippie.dbus_gpaste.deleteHistory(name)) {
        logger.debug("deleted %s", name);
        this.destroy();
      }
    });

    layout.add_child(this._size);
    layout.add_child(this._name);
    layout.add_child(this._clear);
    layout.add_child(this._delete);

    this._menu.addMenuItem(this);

    this.connect('activate', (self) => {
      let name = this._name.get_text();
      let current = this.clippie.dbus_gpaste.getHistoryName();
      if (name !== current) {
        logger.debug("clicked item=%s", name);
        this.clippie.dbus_gpaste.switchHistory(name);
        this.clippie.reset();
        this.clippie.indicator.clippie_menu.history_menu_open(false);
        this.clippie.indicator.clippie_menu.rebuild();
      } else {
        // don't switch histories if there is no change
        // mostly to avoid deleting password
      }
    });
  }

  get clippie_menu() {
    return this._clippie_menu;
  }

  get clippie() {
    return this._clippie;
  }
});


