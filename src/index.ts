// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as MobReader from 'alt1/targetmob';
import * as OCR from 'alt1/ocr';
import * as sauce from './a1sauce';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/styles.css';


function getByID(id: string) {
	return document.getElementById(id);
}

let recentlyDetected = false;

let helperItems = {
	Output: getByID('output'),
	Canvas: <HTMLCanvasElement>getByID('Canvas'),
	Map: getByID('Map'),
	Mob: getByID('Mob'),
	Loot: getByID('Loot'),
	settings: getByID('Settings'),
};

var dataImages = a1lib.webpackImages({
	homeTeleport: require('./asset/data/map-corner.data.png'),
	lootButton: require('./asset/data/lootbutton.data.png'),
	runBorder: require('./asset/data/map-border-corner.data.png'),
	scrollTop: require('./asset/data/scrolltop.data.png'),
	resetButton: require('./asset/data/reset.data.png'),
	lootText: require('./asset/data/loottext.data.png'),
	dropText: require('./asset/data/droptext.data.png'),
});

var font = require('./asset/data/fonts/chatbox/12pt.fontmeta.json');

async function tryFindMap() {
	let client_screen = a1lib.captureHoldFullRs();

	let homeTeleport = {
		screenPosition: client_screen.findSubimage(dataImages.homeTeleport),
	};

	let runIcon = {
		screenPosition: client_screen.findSubimage(dataImages.runBorder),
	}

	if (homeTeleport.screenPosition[0] !== undefined && runIcon.screenPosition[0] !== undefined) {
		let mapPosition = {
			x: homeTeleport.screenPosition[0].x,
			y: homeTeleport.screenPosition[0].y + 28,
		};

		let runPosition = {
			x: runIcon.screenPosition[0].x + dataImages.runBorder.width,
			y: runIcon.screenPosition[0].y,
		};

		alt1.overLaySetGroup('Map');
		alt1.overLayRect(
			a1lib.mixColor(255, 255, 255),
			mapPosition.x,
			runPosition.y,
			runPosition.x - mapPosition.x,
			mapPosition.y,
			200,
			2
		);

		captureMap(
			mapPosition.x,
			runPosition.y,
			runPosition.x - mapPosition.x,
			mapPosition.y
		);
		setTimeout(function () {
			recentlyDetected = false;
		}, 300);
	} else {
		console.log('No match found');
	}
}

let mobReader = new MobReader.default();

async function tryFindMonster() {
	if (mobReader) {
		mobReader.read();
		if (mobReader.state !== null)
			helperItems.Mob.innerText = mobReader.read().name;
	}
}

async function tryFindLoot() {
	let client_screen = a1lib.captureHoldFullRs();

	let dropText = {
		screenPosition: client_screen.findSubimage(dataImages.dropText),
	};

	let resetButton = {
		screenPosition: client_screen.findSubimage(dataImages.resetButton),
	};

	if (
		dropText.screenPosition[0] !== undefined &&
		resetButton.screenPosition[0] !== undefined
	) {
		let dropTextPosition = {
			x: dropText.screenPosition[0].x,
			y: dropText.screenPosition[0].y,
		};

		let resetButtonPosition = {
			x: resetButton.screenPosition[0].x,
			y: resetButton.screenPosition[0].y,
		};

		alt1.overLaySetGroup('Loot');
		alt1.overLayRect(
			a1lib.mixColor(255, 255, 255),
			dropTextPosition.x,
			dropTextPosition.y,
			resetButtonPosition.x - dropTextPosition.x + 28,
			resetButtonPosition.y - dropTextPosition.y - 4,
			200,
			2
		);

		captureLoot(
			dropTextPosition.x,
			dropTextPosition.y,
			resetButtonPosition.x + 28,
			resetButtonPosition.y - 4
		);
		setTimeout(function () {
			recentlyDetected = false;
		}, 300);
	} else {
		console.log('No match found');
	}
}

async function captureMap(x, y, w, h) {
		let mapImage = a1lib.captureHold(x, y, w, h);
		let img = document.createElement('img');
			img.id = 'MapImage';
			img.src = 'data:image/png;base64,' + mapImage.toData().toPngBase64();
			if (helperItems.Map.querySelectorAll('img').length == 0) {
				helperItems.Map.appendChild(img);
			} else {
				helperItems.Map.querySelector('#MapImage').setAttribute(
					'src',
					'data:image/png;base64,' + mapImage.toData().toPngBase64()
				);
			}
}

async function captureLoot(x, y, x2, y2) {
	let lootImage = a1lib.captureHold(x, y, x2 - x, y2 - y);
	let lootData = lootImage.toData();
	//readLoot(lootData);
	let img = document.createElement('img');
	img.id = 'LootImage';
	img.src = 'data:image/png;base64,' + lootData.toPngBase64();
	if (helperItems.Loot.querySelectorAll('img').length == 0) {
		helperItems.Loot.appendChild(img);
	} else {
		helperItems.Loot.querySelector('#LootImage').setAttribute(
			'src',
			'data:image/png;base64,' + lootData.toPngBase64()
		);
	}
}

// var fontcolors: OCR.ColortTriplet[] = [
// 	[255, 255, 255], //white
// 	[29, 244, 2], //green2
// 	[102, 152, 255], //blue
// 	[163, 53, 238], //purple //TODO currently buggy
// 	[255, 128, 0], //orange (1b+ and boss pets)
// ];

// async function readLoot(imgData: ImageData) {
// 	OCR.debug.printcharscores = true;
// 	OCR.debug.trackread = true;
// 		for (var y = 44; y + 5 < imgData.height; y += 18) {
// 			var itemstr = OCR.readLine(
// 				imgData,
// 				font,
// 				fontcolors,
// 				6,
// 				y,
// 				false,
// 				false
// 			);
// 			var amount = OCR.readLine(
// 				imgData,
// 				font,
// 				fontcolors,
// 				218,
// 				y,
// 				false,
// 				false
// 			);
// 			console.log(itemstr);
// 			if (itemstr.text && amount.text) {
// 				var name = itemstr.text;
// 				var item = this.items[name];
// 				if (!item) {
// 					item = this.items[name] = { amount: 0 };
// 				}
// 				var n = +amount.text.replace(/,/g, '');
// 				var d = n - item.amount;
// 				if (d == 0) {
// 					break;
// 				}
// 				item.amount = n;
// 				console.log(item);
// 			}
// 		}
// }

export function startApp() {
	if (!window.alt1) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}

	setInterval(tryFindMap, 3000);
	setInterval(tryFindLoot, 3000);
	setInterval(tryFindMonster, 50);
}

const settingsObject = {
	settingsHeader: sauce.createHeading('h2', 'Settings'),
};

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed

		alt1.identifyAppUrl('./appconfig.json');
		Object.values(settingsObject).forEach((val) => {
			helperItems.settings.before(val);
		});
		startApp();
	} else {
		let addappurl = `alt1://addapp/${
			new URL('./appconfig.json', document.location.href).href
		}`;
		helperItems.Output.insertAdjacentHTML(
			'beforeend',
			`
			Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
		`
		);
	}
};
