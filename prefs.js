'use strict';

const { Adw, Gio, Gtk, GObject } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

function init() {
	ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
	let page = Adw.PreferencesPage.new();
	page.add(new MyPrefs());
	window.set_default_size(500, 200);
	window.add(page);
}

class MyPrefs extends Adw.PreferencesGroup {
	static {
		GObject.registerClass(this);
	}
	constructor() {
		super();
		this._longitude = new Gtk.Entry({ valign : Gtk.Align.CENTER });
		this._latitude = new Gtk.Entry({ valign : Gtk.Align.CENTER });
		[
			[ this._longitude, _('longitude'), _('longitude of your city'), 'longitude' ],
			[ this._latitude, _('latitude'), _('latitude of your city'), 'latitude' ]
		].forEach(e => this.add(new MyRow(...e)));
	}
}

class MyRow extends Adw.ActionRow {
	static {
		GObject.registerClass(this);
	}
	constructor(suffix_widget, title, subtitle, schemas_key) {
		super();
		this.set_title(title);
		this.set_subtitle(subtitle);
		this.add_suffix(suffix_widget);
		this.set_activatable_widget(suffix_widget);
		this.settings = ExtensionUtils.getSettings();
		this.settings.bind(schemas_key, suffix_widget, 'text', Gio.SettingsBindFlags.DEFAULT);
	}
}
