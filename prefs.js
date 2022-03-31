'use strict';

const { Adw, Gio, Gtk, GObject, Soup, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

let list = [];
let funcPG;

function init() {
	ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
	let page = Adw.PreferencesPage.new();
	funcPG = new MyPrefs();
	page.add(funcPG);
	window.set_default_size(500, 400);
	window.add(page);
}

class MyPrefs extends Adw.PreferencesGroup {
	static {
		GObject.registerClass(this);
	}
	constructor() {
		super();

		this._longitude = new Gtk.Entry();
		this._latitude = new Gtk.Entry();
		//~ this._longitude.connect('icon-press', this.icon_press.bind(this));
		//~ this._latitude.connect('icon-press', this.icon_press.bind(this));
		[
			[ this._longitude, true, _('longitude'), _('longitude of your city'), 'longitude' ],
			[ this._latitude, true, _('latitude'), _('latitude of your city'), 'latitude' ]]
			.forEach(e => this.add(new MyRow(...e)));

		this._input = new Gtk.Entry({
			secondary_icon_name : 'folder-saved-search-symbolic',
		});
		this.add(new MyRow(this._input, true, _('City'), _('search your city'), ''));
		this._input.connect('activate', this.get_web.bind(this));
		//~ this._input.connect('icon-press', this.icon_press.bind(this));
	}

	//~ icon_press(obj, pos, event){
		//~ if (pos == Gtk.EntryIconPosition.PRIMARY) obj.text = '';
		//~ else {
			//~ if (obj.secondary_icon_activatable) this.get_web();
		//~ }
	//~ };

	get_web() {	//调用 PreferencesGroup 控件多，不能移到类的外部。
		const city = this._input.text;
		if (city == '' || city.length < 3) return;
		let params = {
			appid : 'c93b4a667c8c9d1d1eb941621f899bb8',
			limit : '3',
			q : city
		};
		let url = 'https://api.openweathermap.org/geo/1.0/direct';
		try {
			const session = new Soup.SessionAsync({ timeout : 10 });
			let message = Soup.form_request_new_from_hash('GET', url, params);

			session.queue_message(message, () => {
				const response = message.response_body.data;
				const obj = JSON.parse(response);
				list.forEach(k => {if(k){ this.remove(k);} });
				list = [];
				let cbg;
				let locale = GLib.get_language_names()[0];	 // zh_CN 或者本地语种
				locale = locale.replace(/_.*$/, '');
				if (obj[0] != null) {  // 有数据
					for (let i in obj) {
						const k = obj[i];
						const cb = new Gtk.CheckButton();
						cb.connect('activate', () => {
							//~ log(k.lon + ', ' + k.lat);
							this._longitude.text = k.lon.toString();
							this._latitude.text = k.lat.toString();
						});
						if (i == 0) cbg = cb;
						else cb.set_group(cbg);

						let ln = '';
						if (k.local_names && k.local_names[locale]) ln = k.local_names[locale];
						//~ const ln = k.local_names[locale] || '';	//k.local_names is undefined
						list[i] = new MyRow(cb,
							false,
							[ k.name, k.state, k.country, ln ].join(', '),
							[ k.lon, k.lat ].join(', '),
							'');
						this.add(list[i]);
					}
				}
			});
		} catch (e) { throw e; }
	}
}

class MyRow extends Adw.ActionRow {
	static {
		GObject.registerClass(this);
	}
	constructor(suffix_widget, isEntry, title, subtitle, schemas_key) {
		super();
		this.set_title(title);
		this.set_subtitle(subtitle);
		suffix_widget.valign = Gtk.Align.CENTER;
		if (isEntry) {
			suffix_widget.primary_icon_name = 'edit-clear-all-symbolic';
			suffix_widget.connect('icon-press', (obj, pos, event) => {
				if (pos == Gtk.EntryIconPosition.PRIMARY) obj.text = '';
				else {
					if (obj.secondary_icon_activatable) funcPG.get_web();
				}
			});
		}
		this.add_suffix(suffix_widget);
		this.set_activatable_widget(suffix_widget);
		if (schemas_key) {
			this.settings = ExtensionUtils.getSettings();
			this.settings.bind(schemas_key, suffix_widget, 'text', Gio.SettingsBindFlags.DEFAULT);
		}
	}
}
