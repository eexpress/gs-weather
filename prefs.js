'use strict';

const { Adw, Gio, Gtk,  GObject} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

function init() {
	ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
    return new MyPrefs();
}

function fillPreferencesWindow(window){
	let page = Adw.PreferencesPage.new();
	page.add(new MyPrefs());
	window.set_default_size(500, 200);
	window.add(page);
}
//~ https://gjs.guide/extensions/upgrading/gnome-shell-42.html#fillpreferenceswindow

class MyPrefs extends Adw.PreferencesGroup {
    static {
        GObject.registerClass(this);
    }
	constructor() {
		super();
		this.settings = ExtensionUtils.getSettings();
		log(this.settings.get_string('longitude'));
		log(this.settings.get_string('latitude'));
//~ Romain: While your window is opened, You can use the GTK inspector to interactively try properties changes on your widgets, press Ctrl+Shift+D, then you'll be able to pick your widgets and change the properties.
		this._longitude = new Gtk.Entry({valign: Gtk.Align.CENTER});
		this._latitude = new Gtk.Entry({valign: Gtk.Align.CENTER});
		this.add(new PrefRow(this._longitude,_('longitude'),_('longitude of your city')));
		this.add(new PrefRow(this._latitude,_('latitude'),_('latitude of your city')));
		this.settings.bind('longitude', this._longitude, 'text', Gio.SettingsBindFlags.DEFAULT);
		this.settings.bind('latitude', this._latitude, 'text', Gio.SettingsBindFlags.DEFAULT);
	}
}

class PrefRow extends Adw.ActionRow {
    static {
        GObject.registerClass(this);
    }
    constructor(...args) {
        super();
        let [prefix, title, subtitle] = args;
        this.set_title(title);
        this.set_subtitle(subtitle);
        this.add_suffix(prefix);
        this.set_activatable_widget(prefix);
	}
}
