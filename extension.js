const GETTEXT_DOMAIN = 'weather';

const { GObject, Clutter, St, Gio } = imports.gi;

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

const xmlText = `
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE wml PUBLIC "-//WAPFORUM//DTD WML 1.1//EN" "http://www.wapforum.org/DTD/wml_1.1.xml">
<wml>
<head>
<meta http-equiv="Cache-Control" content="max-age=0"/>
<meta http-equiv="Refresh" content="3; url=/41/changsha/tianqi/" />
</head>
<card title="湖南长沙天气预报">
<p>
湖南长沙天气预报<br/>
<b>2022-3-17 星期四</b><br/>阵雨转多云<br/>8C～15C<br/>北风 3-4级转3-4级<br/><br/><b>2022-3-18 星期五</b><br/>多云<br/>10C～17C<br/>南风转东南风 <3级<br/><br/><b>2022-3-19 星期六</b><br/>多云转小雨<br/>12C～24C<br/>东风转北风 <3级<br/><br/><b>2022-3-20 星期日</b><br/>小雨<br/>10C～15C<br/>西北风 <3级<br/><br/><b>2022-3-21 星期一</b><br/>小雨<br/>7C～11C<br/>西北风 <3级<br/><br/><b>2022-3-22 星期二</b><br/>小雨<br/>8C～9C<br/>西北风 <3级<br/><br/><b>2022-3-23 星期三</b><br/>小雨转中雨<br/>10C～10C<br/>西北风 <3级<br/><br/><b>2022-3-24 星期四</b><br/>雨转多云<br/>7C～15C<br/>西北风转北风 <3级<br/><br/><b>2022-3-25 星期五</b><br/>阴转雨<br/>9C～14C<br/>西北风 <3级<br/><br/><b>2022-3-26 星期六</b><br/>雨<br/>9C～16C<br/>东风转北风 <3级<br/><br/><b>2022-3-27 星期日</b><br/>雨<br/>8C～12C<br/>北风转西北风 <3级<br/><br/><b>2022-3-28 星期一</b><br/>雨转阴<br/>7C～10C<br/>西北风转北风 <3级<br/><br/><b>2022-3-29 星期二</b><br/>多云转晴<br/>8C～19C<br/>北风 <3级<br/><br/><b>2022-3-30 星期三</b><br/>阴<br/>11C～22C<br/>东北风转北风 <3级<br/><br/><b>2022-3-31 星期四</b><br/>多云转阴<br/>12C～22C<br/>西北风转东风 <3级<br/><br/>
<br/><a href="/weather/weather_prov.wml">&gt;按省份查询天气</a><br/><a href="/weather/weather_zone.wml">&gt;按邮编区号查询天气</a><br/><a href="/weather/weather_addr.wml">&gt;按地名查询天气</a><br/><a href="/weather/index.wml">&gt;天气预报首页</a><br/><a href="http://wap.ip138.com/">&gt;Wap首页</a>
</p>
</card>
</wml>
`;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Screen Weather'));

			this.stock_icon = new St.Icon({ gicon : this.local_gicon("1") });
			this.add_child(this.stock_icon);
			this.connect("button-press-event", (actor, event) => {
				if (myX == 0) {	 //点击一次后，才能算出面板图标的中心点座标。
					const [x, y]	   = global.get_pointer();
					const [op, x0, y0] = this.transform_stage_point(x, y);
					if (!op) return false;
					myX = x - x0 + this.width / 2;
					myY = y - y0 + this.height / 2;
				}
				this.easeMove(this.box, myX, myY + size / 2 + this.height / 2);
				return Clutter.EVENT_STOP;
			});

			this.icon = new St.Icon({ gicon : this.local_gicon("1"), icon_size : size, style_class : "SunGlobe" });
			this.box  = new Clutter.Actor({ name : 'icon', reactive : true, width : size, height : size });
			this.box.add_child(this.icon);
			mlayout.addChrome(this.box);
			//~ this.box.set_position(0, monitor.width - size);
			this.box.set_position(0, 0);
			//~ this.easeMove(this.box, 1000, 50);
			//~ let parser = XMLParser(xml);
			//~ log(parse);
			//~ let xmlParsed = parseXML(xmlText);
			//~ print(JSON.stringify(xmlParsed, null, 2));
			this.parseWeather(xmlText);
		}

		parseWeather(xmlText) {
			for (let l of xmlText.split("\n")) {
				if (!l.match(/20\d\d-\d/)) continue;
				const a = l.replace(/<br\/>/gi, ':').replace(/<\/b>/gi, ':').replace(/<b>/gi, '\n').split('\n').filter((value, index) => value).slice(0, 3);
				//~ for()

				log(a[0]);
				log(a[1]);
				log(a[2]);
				log("--------------");
				//~ log(r.length);
				//~ log(typeof r);
				//~ const s = r.join();
				//~ log(r[1]);
				//~ log(r[4]);
				//~ log(s);
			}
		};

		local_gicon(str) {
			return Gio.icon_new_for_string(Me.path + "/weather-icon/" + str + ".svg");
		}

		easeMove(a, newX, newY) {
			a.rotation_angle_z = 360;
			newX -= a.width / 2;  //中心点移动
			newY -= a.height / 2;
			a.set_pivot_point(0.5, 0.5);  //旋转等的中心

			a.ease({ x : newX, y : newY, rotation_angle_z : 0, duration : 1000, mode : Clutter.AnimationMode.EASE_OUT_BOUNCE, onComplete : () => {
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
