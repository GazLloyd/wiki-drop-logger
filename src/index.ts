// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as MobReader from './MobReaderExtended';
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

const lastKnownMapPosition = {mapPosition: {x: undefined, y: undefined}, runPosition: {x: undefined, y: undefined}};
async function tryFindMap() {
	if (lastKnownMapPosition.mapPosition.x === undefined) {
		let client_screen = a1lib.captureHoldFullRs();

		let homeTeleport = {
			screenPosition: client_screen.findSubimage(dataImages.homeTeleport),
		};

		let runIcon = {
			screenPosition: client_screen.findSubimage(dataImages.runBorder),
		};

		if (
			homeTeleport.screenPosition[0] !== undefined &&
			runIcon.screenPosition[0] !== undefined
		) {
			let mapPosition = {
				x: homeTeleport.screenPosition[0].x,
				y: homeTeleport.screenPosition[0].y + 28,
			};

			let runPosition = {
				x: runIcon.screenPosition[0].x + dataImages.runBorder.width,
				y: runIcon.screenPosition[0].y,
			};
			lastKnownMapPosition.mapPosition = mapPosition;
			lastKnownMapPosition.runPosition = runPosition;

			alt1.overLaySetGroup('Map');
			alt1.overLayRect(
				a1lib.mixColor(255, 255, 255),
				lastKnownMapPosition.mapPosition.x,
				lastKnownMapPosition.runPosition.y,
				lastKnownMapPosition.runPosition.x -
					lastKnownMapPosition.mapPosition.x,
				lastKnownMapPosition.mapPosition.y,
				500,
				2
			);
		}
	} else {
		captureMap(
			lastKnownMapPosition.mapPosition.x,
			lastKnownMapPosition.runPosition.y,
			lastKnownMapPosition.runPosition.x -
				lastKnownMapPosition.mapPosition.x,
			lastKnownMapPosition.mapPosition.y
		);
	}
}

let mobReader = new MobReader.default();

async function tryFindMonster() {
	if (mobReader) {
		mobReader.read();
		if (mobReader.state !== null) {
			try {
				helperItems.Mob.innerText = mobReader.state.name;
				helperItems.Mob.setAttribute('data-found', "true");
				helperItems.Mob.setAttribute('data-lvl', mobReader.state.level.toString())
			} catch(e) {}//nothing
		}
	}
}

const lastKnownLootPosition = {dropText: {x: undefined, y: undefined}, resetButton: {x: undefined, y: undefined}};
async function tryFindLoot() {
	if (lastKnownLootPosition.dropText.x === undefined) {
		console.log(`Attempting to capture Runemetrics dropsmenu`);
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
			lastKnownLootPosition.dropText = dropTextPosition;
			lastKnownLootPosition.resetButton = resetButtonPosition;

			alt1.overLaySetGroup('Loot');
			alt1.overLayRect(
				a1lib.mixColor(255, 255, 255),
				lastKnownLootPosition.dropText.x,
				lastKnownLootPosition.dropText.y,
				lastKnownLootPosition.resetButton.x -
					lastKnownLootPosition.dropText.x +
					22,
				lastKnownLootPosition.resetButton.y -
					lastKnownLootPosition.dropText.y -
					4,
				500,
				2
			);
		}
	} else {
		captureLoot(
			lastKnownLootPosition.dropText.x,
			lastKnownLootPosition.dropText.y,
			lastKnownLootPosition.resetButton.x + 22,
			lastKnownLootPosition.resetButton.y - 4
		);
	}
}

async function captureMap(x, y, w, h) {
	let mapImage = a1lib.captureHold(x, y, w, h);
	let mapDataRaw = mapImage.toData();
	let mapData = mapDataRaw.toPngBase64();
	globalThis.current_map_data = mapDataRaw;
	if (helperItems.Map.classList.contains('visible')) {
		if (helperItems.Map.querySelectorAll('img').length == 0) {
			let img = document.createElement('img');
			img.id = 'MapImage';
			img.src = 'data:image/png;base64,' + mapData;
			helperItems.Map.appendChild(img);
		} else {
			helperItems.Map.querySelector('#MapImage').setAttribute(
				'src',
				'data:image/png;base64,' + mapData
			);
		}
	}
}

async function captureLoot(x, y, x2, y2) {
	let lootImage = a1lib.captureHold(x, y, x2 - x, y2 - y);
	let lootData = lootImage.toData().toPngBase64();
	if (helperItems.Loot.querySelectorAll('img').length == 0) {
		let img = document.createElement('img');
		img.id = 'LootImage';
		img.src = 'data:image/png;base64,' + lootData
		helperItems.Loot.appendChild(img);
	} else {
		helperItems.Loot.querySelector('#LootImage').setAttribute(
			'src',
			'data:image/png;base64,' + lootData
		);
	}
}

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

	setInterval(tryFindMap, 400);
	setInterval(tryFindLoot, 400);
	setInterval(tryFindMonster, 400);
}

//const settingsObject = {
//	settingsHeader: sauce.createHeading('h2', 'Settings'),
//};

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed

		alt1.identifyAppUrl('./appconfig.json');
		//Object.values(settingsObject).forEach((val) => {
		//	helperItems.settings.before(val);
		//});
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
