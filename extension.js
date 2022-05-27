const { GObject, Clutter, St, Gio, GLib, Soup, PangoCairo, Pango } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();
const _domain = Me.metadata['gettext-domain'];
const _ = ExtensionUtils.gettext;
const Cairo = imports.cairo;

const mlayout = Main.layoutManager;
const monitor = mlayout.primaryMonitor;
const ByteArray = imports.byteArray;
const size = 300;
let myX = 0;
let myY = 0;
const dMax = 10;
const dDef = 6;	 //解析数据时，第一次显示的缺省个数。
const dMin = 3;
let box = [];  //实际显示的图标，长度可变。
let w_icon = [];  //保留天气的图标序号，Int，长度是 dMax。
let w_desc = [];  //保留天气的描述，Text，长度是 dMax。
let w_temp = [];  //保留天气的温度，Text，长度是 dMax。
let xMsg;
let boxindex = 0;	//当前hover的位置索引。

let longitude = '112.903736';  //经度 longitude
let latitude = '28.218743';	 //纬度 latitude

function lg(s) { log("===" + _domain + "===>" + s); }

const useJsonOrSchemas = false;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Screen Weather'));

			this.locale = GLib.get_language_names()[0].split('.')[0];	 // zh_CN
			this.settings = ExtensionUtils.getSettings();
			this.settings.connect('changed::latitude', () => {
				this.get_web();
			});

			this.get_web();

			this.stock_icon = new St.Icon({ gicon : this.local_gicon("1"), style_class : 'system-status-icon' });
			this.add_child(this.stock_icon);
			this.connect("button-press-event", this.click.bind(this));
			this.connect("scroll-event", this.scroll.bind(this));

			xMsg = new Clutter.Actor({
				name : 'xMsg',
				reactive : false,
				width : 120,
				height : 60,
			});
			this._canvas = new Clutter.Canvas();
			this._canvas.connect('draw', this.on_draw.bind(this));
			this._canvas.set_size(xMsg.width, xMsg.height);
			xMsg.set_content(this._canvas);
			xMsg.visible = false;

		}

		on_draw(canvas, ctx, width, height) {
			ctx.setOperator(Cairo.Operator.CLEAR);
			ctx.paint();
			ctx.setOperator(Cairo.Operator.SOURCE);
			ctx.setSourceRGBA(0, 0, 0, 1);
			ctx.rectangle(0,0,xMsg.width,xMsg.height);
			ctx.fill();
			ctx.setSourceRGBA(1, 1, 1, 1);
			ctx.moveTo(xMsg.width/2, 10);
			this.align_show(ctx, w_desc[boxindex]);
			ctx.moveTo(xMsg.width/2, 30);
			this.align_show(ctx, w_temp[boxindex]);
		}

		align_show(ctx, showtext, font = "Sans Bold 10") {
			let pl = PangoCairo.create_layout(ctx);
			pl.set_text(showtext, -1);
			pl.set_font_description(Pango.FontDescription.from_string(font));
			PangoCairo.update_layout(ctx, pl);
			let [w, h] = pl.get_pixel_size();
			ctx.relMoveTo(-w / 2, 0);
			PangoCairo.show_layout(ctx, pl);
			ctx.relMoveTo(w / 2, 0);
		}

		enter(actor, event) {
			const i = box.indexOf(actor);
			if(i >= 0) {
				boxindex = i;
				this._canvas.invalidate();
			}
			xMsg.set_position(actor.x+actor.width/2-xMsg.width/2, actor.y+actor.height);
			xMsg.visible = true;
		}

		leave(actor, event) {
			xMsg.visible = false;
		}

		click(actor, event) {
			if (myX == 0) {	 //点击一次后，才能算出面板图标的中心点座标。
				const [x, y] = global.get_pointer();
				const [op, x0, y0] = this.transform_stage_point(x, y);
				if (!op) return false;
				myX = x - x0 + this.width / 2;
				myY = y - y0 + this.height / 2;
			}
			switch (event.get_button()) {
			case 1:	 // show
				this.arrayBox();
				break;
			case 2:	 // refresh
				this.get_web();
				break;
			case 3:	 // dismiss
				this.dismissBox();
				break;
			}
			return Clutter.EVENT_STOP;
		};

		scroll(actor, event) {
			if (box.length < dMin) return Clutter.EVENT_STOP;
			switch (event.get_scroll_direction()) {
			case Clutter.ScrollDirection.UP:
			case Clutter.ScrollDirection.LEFT:
				if (box.length < dMax) {
					box.push(this.createBox(w_icon[box.length].toString()));
					this.arrayBox();
				}
				break;
			case Clutter.ScrollDirection.DOWN:
			case Clutter.ScrollDirection.RIGHT:
				if (box.length > dMin) {
					const c = box.pop();
					c.destroy();
					this.arrayBox();
				}
				break;
			default:
			}
			return Clutter.EVENT_PROPAGATE;
		};

		arrayBox() {
			const i = box.length;
			if (i < 1) return;
			const w = (i - 1) * size / 2 + size / 6 + size / 2;	 //第一个的中心到最后一个的右侧。
			let offX = myX;
			if (myX + w - size / 4 > monitor.width) {
				offX = monitor.width - w + size / 4;
			}
			if (offX < size / 2) offX = size / 2;
			for (let i in box) {
				this.easeMove(box[i], true, offX + (i == 0 ? 0 : size / 6) + i * size / 2, myY + size / 2 + this.height / 2);
			}
		};

		dismissBox() {
			if (box.length < 1) return;
			let offX;
			for (let a of box) {
				offX = Math.ceil(Math.random() * monitor.width);
				this.easeMove(a, false, offX, monitor.height);
			}
		};

		createBox(iconname) {
			let _size = size;
			if (box.length > 0) _size = size / 2;
			const icon = new St.Icon({ gicon : this.local_gicon(iconname), icon_size : _size });
			const _box = new Clutter.Actor({ name : iconname, reactive : true, width : _size, height : _size });
			_box.add_child(icon);
			_box.set_position(Math.ceil(Math.random() * monitor.width), monitor.height);
			_box.visible = false;
			_box.connect("button-press-event", this.click.bind(this));
			_box.connect("scroll-event", this.scroll.bind(this));
			_box.connect("enter-event", this.enter.bind(this));
			_box.connect("leave-event", this.leave.bind(this));
			mlayout.addChrome(_box);
			return _box;
		};

		parseWeather(json) {
			if (!json) return;
			for (let i of box)
				i.destroy();
			box = [];
			//~ lg("====>"+JSON.stringify(json.list[0].weather[0].icon, null, 4));
			w_icon = [];
			for (let i = 0; i < dMax; i++) {
				const jsonicon = json.list[i].weather[0].icon;
				const jsondesc = json.list[i].weather[0].description;
				const jsontemp = json.list[i].temp.min + "℃ - " + json.list[i].temp.max + "℃";
				if (jsonicon) {
					const d = parseInt(jsonicon);
					w_icon.push(d);
					w_desc.push(jsondesc);
					w_temp.push(jsontemp);
					if (box.length < dDef) box.push(this.createBox(d.toString()));
					if (i == 0) this.stock_icon.set_gicon(this.local_gicon(d.toString()));
				} else break;
			}
		};

		get_coord(){
			if (useJsonOrSchemas) {
				try {  // 在配置界面实现全兼容前，使用文件设置经纬度。
					const coordfile = Me.path + '/coord.json';
					if (GLib.file_test(coordfile, GLib.FileTest.IS_REGULAR)) {
						const [ok, content] = GLib.file_get_contents(coordfile);
						if (ok) {
							const obj = JSON.parse(ByteArray.toString(content));
							if (obj.latitude) latitude = obj.latitude;
							if (obj.longitude) longitude = obj.longitude;
						}
					}
				} catch (e) { throw e; }
			} else {
				latitude = this.settings.get_string('latitude');
				longitude = this.settings.get_string('longitude');
			}
		};

		get_web() {
			this.get_coord();
			if (! latitude || ! longitude) return;	//null, 0, ''
			let params = {
				APPID : 'c93b4a667c8c9d1d1eb941621f899bb8',
				exclude : 'minutely,hourly,alerts,flags',
				lat : latitude,		//纬度 latitude
				lon : longitude,	//经度 longitude
				lang : this.locale,
				units : 'metric',
				cnt : dMax.toString()
			};
			let url = 'https://api.openweathermap.org/data/2.5/forecast/daily';
			try {
				const session = new Soup.SessionAsync({ timeout : 10 });
				let message = Soup.form_request_new_from_hash('GET', url, params);
//~ https://api.openweathermap.org/data/2.5/forecast/daily?APPID=c93b4a667c8c9d1d1eb941621f899bb8&lat=28.2302056&lon=112.9335861&units=metric&cnt=13&lang=zh_cn
				session.queue_message(message, () => {
					const response = message.response_body.data;
					const obj = JSON.parse(response);
					if (obj.list[0].weather[0].icon) {
						lg("get:\tlongitude: " + longitude + "; latitude: " + latitude);
						//~ lg(JSON.stringify(obj, null, 4));
						this.parseWeather(obj);
					}
				});
			} catch (e) { throw e; }
		}

		local_gicon(str) {
			return Gio.icon_new_for_string(Me.path + "/weather-icon/" + str + ".svg");
		}

		easeMove(a, v, newX, newY) {
			a.visible = true;
			a.rotation_angle_z = 360;
			newX -= a.width / 2;  //中心点移动
			newY -= a.height / 2;
			a.set_pivot_point(0.5, 0.5);  //旋转等的中心

			a.ease({ x : newX, y : newY, rotation_angle_z : 0, duration : 1000, mode : Clutter.AnimationMode.EASE_OUT_BOUNCE, onComplete : () => {
						if (!v) a.visible = false;
						mlayout._queueUpdateRegions();
					} });
		}

		destroy() {
			for (let i of box) {
				mlayout.removeChrome(i);
				i.destroy();
			}
			box = [];  //全局变量，如果没清，重载时，会出 Object Clutter.Actor (0x557e77eb98f0), has been already deallocated
			super.destroy();  // Extension point conflict if no destroy.
		}
	});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations();
	}

	enable() {
		this._indicator = new Indicator();
		Main.panel.addToStatusArea(this._uuid, this._indicator);
		mlayout.addChrome(xMsg);
	}

	disable() {
		this._indicator.destroy();
		this._indicator = null;
		mlayout.removeChrome(xMsg);
		xMsg = null;
	}
}

function init(meta) {
	return new Extension(meta.uuid);
}
