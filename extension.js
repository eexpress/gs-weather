const GETTEXT_DOMAIN = 'weather';

const { GObject, Clutter, St, Gio, Soup} = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _		  = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main			 = imports.ui.main;
const PanelMenu		 = imports.ui.panelMenu;
const PopupMenu		 = imports.ui.popupMenu;

const Me	  = ExtensionUtils.getCurrentExtension();
const mlayout = Main.layoutManager;
const monitor = mlayout.primaryMonitor;
const size	  = 300;
let myX		  = 0;
let myY		  = 0;
let box		  = [];
const dMax	  = 8;
const dMin	  = 3;
const weather = ["晴","","","","","阴","","多云转小雨,阵雨转多云","小雨","","雾霾","多云",];

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Screen Weather'));

			this.stock_icon = new St.Icon({ gicon : this.local_gicon("1") });
			this.add_child(this.stock_icon);
			this.connect("button-press-event", this.click.bind(this));
			this.connect("scroll-event", this.scroll.bind(this));

			//~ box.push(this.createBox("2"));
			//~ box.push(this.createBox("3"));
			//~ box.push(this.createBox("3"));
			//~ box.push(this.createBox("2"));
			//~ box.push(this.createBox("3"));
			this.get_web();
		}

		click(actor, event){
			if (myX == 0) {	 //点击一次后，才能算出面板图标的中心点座标。
				const [x, y]	   = global.get_pointer();
				const [op, x0, y0] = this.transform_stage_point(x, y);
				if (!op) return false;
				myX = x - x0 + this.width / 2;
				myY = y - y0 + this.height / 2;
			}
			switch (event.get_button()) {
				case 1:	//show
					this.arrayBox();
					break;
				case 2:	//refresh
					this.get_web();
					break;
				case 3:	//dismiss
					this.dismissBox();
					break;
			}
			return Clutter.EVENT_STOP;

		};

		scroll(actor, event){
			switch (event.get_scroll_direction()) {
				case Clutter.ScrollDirection.UP:
				case Clutter.ScrollDirection.LEFT:
					if(box.length<dMax){
						box.push(this.createBox("2"));
						this.arrayBox();
					}
					break;
				case Clutter.ScrollDirection.DOWN:
				case Clutter.ScrollDirection.RIGHT:
					if(box.length>dMin){
						const c = box.pop();
						c.destroy();
						this.arrayBox();
					}
					break;
				default:
					return Clutter.EVENT_PROPAGATE;
			}
		};

		arrayBox() {
			const i = box.length;
			if (i < 1) return;
			const w	 = (i - 1) * size / 2 + size / 6 + size / 2;  //第一个的中心到最后一个的右侧。
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
			mlayout.addChrome(_box);
			return _box;
		};

		parseWeather(xmlText) {
			if(!xmlText) return;
			//~ const ByteArray = imports.byteArray;
			for(let i of box){		i.destroy();	}
			box = [];
			for (let l of xmlText.split("\n")) {
				if (!l.match(/20\d\d-\d/)) continue;
				const a = l.replace(/<br\/>/gi, ':').replace(/<\/b>/gi, ':').replace(/<b>/gi, '\n').split('\n').filter((value, index) => value).slice(0, dMax);
				for(let s of a){
					log(s);
					const array = s.split(':');
					log('==>'+array[2]);
					const ss = array[2];
					log(typeof ss);
					//~ const ss = ByteArray.toString(array[2]);
					let r = 2;
					//~ let re = new RegExp('\b'+array[2]+'\b');
					//~ let re = new RegExp('[^,]'+array[2]+'[,$]');
					let re = new RegExp("[,^]+"+array[2]+"[,$]+");
						log(re);
					for(let i in weather){
						//~ if(weather[i].includes(array[2])){
						if(!weather[i]) continue;
						//~ log(weather[i]);
						if(re.test(weather[i])){
						//~ if(weather[i].match(re)){
							r = i;
							break;
						}
					}
					log("---->"+r);
					box.push(this.createBox(r.toString()));
				}
			}
		};

		get_web() {
			let web="http://qq.ip138.com/weather/hunan/ChangSha.wml";
			//~ http://pv.sohu.com/cityjson?ie=utf-8
			//~ var returnCitySN = {"cip": "120.227.20.213", "cid": "CN", "cname": "CHINA"};

			try {
				const session = new Soup.SessionAsync({ timeout : 10 });
				let message = Soup.Message.new('GET', web);

				session.queue_message(message, () => {
					const response = message.response_body.data;
					this.parseWeather(response);
				});
			} catch (e) { throw e; }
		}

		local_gicon(str) {
			return Gio.icon_new_for_string(Me.path + "/weather-icon/" + str + ".svg");
		}

		easeMove(a, v, newX, newY) {
			a.visible		   = true;
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
			mlayout.removeChrome(this.box);
			super.destroy();  // Extension point conflict if no destroy.
		}
	});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
	}

	enable() {
		this._indicator = new Indicator();
		Main.panel.addToStatusArea(this._uuid, this._indicator);
	}

	disable() {
		this._indicator.destroy();
		this._indicator = null;
	}
}

function init(meta) {
	return new Extension(meta.uuid);
}
