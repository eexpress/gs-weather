'use strict';

const { Adw, Gio, Gtk, GObject, Soup } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const _ = ExtensionUtils.gettext;

let list = [];

function init() {
	ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
	let page = Adw.PreferencesPage.new();
	page.add(new MyPrefs());
	window.set_default_size(500, 400);
	window.add(page);
}

class MyPrefs extends Adw.PreferencesGroup {
	static {
		GObject.registerClass(this);
	}
	constructor() {
		super();
		log(this);

		//~ this.add(new Gtk.Label({
			//~ label: _('geo coordinates').bold(),
			//~ halign: Gtk.Align.START,
			//~ use_markup: true
		//~ }));

		//~ this._longitude = new Gtk.Entry({ valign : Gtk.Align.CENTER });
		//~ this._latitude = new Gtk.Entry({ valign : Gtk.Align.CENTER });
		this._longitude = new Gtk.Entry();
		this._latitude = new Gtk.Entry();
		[
			[ this._longitude, _('longitude'), _('longitude of your city'), 'longitude' ],
			[ this._latitude, _('latitude'), _('latitude of your city'), 'latitude' ]
		].forEach(e => this.add(new MyRow(...e)));

		//~ this.add(new Gtk.Label({
			//~ label: _('search your city').bold(),
			//~ halign: Gtk.Align.START,
			//~ use_markup: true
		//~ }));

		this._input = new Gtk.Entry();
		this.add(new MyRow(this._input, _('City'), _('search your city'), ''));
		//~ this._input.connectObject('active', this._activate.bind(this), this);
		this._input.connect('activate', this.get_web.bind(this));
	}

	//~ _activate(){
		//~ log(this._input.text);
		//~ this.get_web();
	//~ };

	get_web() {
		let params = {
			appid : 'c93b4a667c8c9d1d1eb941621f899bb8',
			limit : '3',
			q : this._input.text
		};
		let url = 'https://api.openweathermap.org/geo/1.0/direct';
		try {
			const session = new Soup.SessionAsync({ timeout : 10 });
			let message = Soup.form_request_new_from_hash('GET', url, params);

			session.queue_message(message, () => {
				const response = message.response_body.data;
				const obj = JSON.parse(response);
				log("get_web OK.");
				list.forEach(k => {if(k){ this.remove(k);}});
				list = [];
				let cbg;
				if(obj[0] != null){	// 有数据
					for(let i in obj){
						const k = obj[i];
						const cb = new Gtk.CheckButton();
						cb.connect('activate', () => {
							log(k.lon+', '+k.lat);
							this._longitude.text = k.lon.toString();
							this._latitude.text = k.lat.toString();
						});
						if(i == 0) cbg = cb; else cb.set_group(cbg);
						let zh = '';
						log(i);
						if(k.local_names && k.local_names.zh != undefined) zh = k.local_names.zh;
						list[i] = new MyRow(cb,
							[k.name, k.state, k.country, zh].join(', '),
							[k.lon, k.lat].join(', '),
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
	constructor(suffix_widget, title, subtitle, schemas_key) {
		super();
		this.set_title(title);
		this.set_subtitle(subtitle);
		suffix_widget.valign = Gtk.Align.CENTER;
		this.add_suffix(suffix_widget);
		this.set_activatable_widget(suffix_widget);
		if (schemas_key) {
			this.settings = ExtensionUtils.getSettings();
			this.settings.bind(schemas_key, suffix_widget, 'text', Gio.SettingsBindFlags.DEFAULT);
		}
	}
}
