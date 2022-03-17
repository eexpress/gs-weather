const GETTEXT_DOMAIN = 'my-indicator-extension';

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
const size	  = 100;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Screen Weather'));

			this.add_child(new St.Icon({
				icon_name : 'face-smile-symbolic',
				style_class : 'system-status-icon',
			}));

			//~ let item = new PopupMenu.PopupMenuItem(_('Show '));
			this.box = new PopupMenu.PopupBaseMenuItem();
			const icon = new St.Icon({ gicon : this.local_gicon("1"), icon_size : size, style_class : "SunGlobe" });
			this.box.add(icon);
			//~ mlayout.addChrome(this.item);
			//~ this.menu.addMenuItem(this.item);

			//~ this.box = new St.Bin({
			//~ this.box = new Clutter.Actor({
				//~ name : 'icon',
				//~ reactive : true,
				//~ width : size,
				//~ height : size,
			//~ });
			//~ this.box.add_child(icon);
			mlayout.addChrome(this.box);
			this.box.set_position(0, 0);
			this.horizontalMove(this.box, 1000, 50);
		}

		local_gicon(str) {
			return Gio.icon_new_for_string(Me.path + "/weather-icon/" + str + ".svg");
		}

		horizontalMove(a, newX, newY) {
			//~ let [xPos, yPos]   = a.get_position();
			//~ let newX		   = (xPos === 0) ? monitor.width - size : 0;
			a.rotation_angle_z = 360;
			a.set_pivot_point(0.5, 0.5);  //旋转等的中心

			a.ease({
				x : newX,
				y : newY,
				rotation_angle_z : 0,
				duration : 2000,
				mode : Clutter.AnimationMode.EASE_OUT_BOUNCE,
				onComplete : () => {
					mlayout._queueUpdateRegions();
				}
			});
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
