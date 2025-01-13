// alt1 base libs, provides all the commonly used methods for image matching and capture
// also gives your editor info about the window.alt1 api
import * as a1lib from 'alt1';
import * as MobReader from 'alt1/targetmob';

// tell webpack that this file relies index.html, appconfig.json and icon.png, this makes webpack
// add these files to the output directory
// this works because in /webpack.config.js we told webpack to treat all html, json and imageimports
// as assets
import './index.html';
import './appconfig.json';
import './icon.png';
import './css/styles.css';

// utils
// byte array to hex string: https://www.xaymar.com/articles/2020/12/08/fastest-uint8array-to-hex-string-conversion-in-javascript/
// Pre-Init
const LUT_HEX_4b = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const LUT_HEX_8b = new Array(0x100);
for (let n = 0; n < 0x100; n++) {
	LUT_HEX_8b[n] = `${LUT_HEX_4b[(n >>> 4) & 0xF]}${LUT_HEX_4b[n & 0xF]}`;
}
// End Pre-Init
const _toHex = (buffer: Uint8Array | Uint8ClampedArray, length: number): string => {
	let out = '';
	for (let idx = 0, edx = length; idx < edx; idx++) {
		out += LUT_HEX_8b[buffer[idx]];
	}
	return out;
}
const toHex = (buffer: Uint8ClampedArray): string => { // for regular style arrays like ImageData.data
	return _toHex(buffer, buffer.length)
}
const arrayBufferToHex = (buffer: Uint8Array): string => { //for array buffers like Blob.arrayBuffer()
	let view = new Uint8Array(buffer);
	return _toHex(view, view.byteLength)
}

const timeout = async (x: number): Promise<void> => {
	return new Promise(resolve => setTimeout(resolve, x));
}
// make canvas.toBlob a promise
const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
	return new Promise(resolve => canvas.toBlob(resolve));
}
const getByID = (id: string) => {
	return document.getElementById(id);
};
const getCanvasByID = (id:string)=>{
	return <HTMLCanvasElement>getByID(id);
};
// end utils

const GRAY_THRESHOLD = 170; // grayscale value threshold for white vs black
const PIXEL_DIFF_THRESHOLD = 4; // number of pixels that can be different

const helperElements = {
	Output: getByID('output'),
	Mob: getByID('Mob'),
	settings: getByID('Settings'),
	resetButton: getByID('ResetPositions'),
	username: <HTMLInputElement>getByID('username'),
	messages: getByID('MessageList'),
	foundMob: getByID('FoundMob'),
	foundMap: getByID('FoundMap'),
	foundLoot: getByID('FoundLoot'),
	foundUsername: getByID('FoundUsername'),
};

const dataImages = a1lib.webpackImages({
	homeTeleport: require('./asset/data/map-corner.data.png'),
	lootButton: require('./asset/data/lootbutton.data.png'),
	runBorder: require('./asset/data/map-border-corner.data.png'),
	scrollTop: require('./asset/data/scrolltop.data.png'),
	resetButton: require('./asset/data/reset.data.png'),
	lootText: require('./asset/data/loottext.data.png'),
	dropText: require('./asset/data/droptext.data.png'),
});

const font = require('./asset/data/fonts/chatbox/12pt.fontmeta.json');

type Rect = {
	x: number, y: number, w: number, h:number
}
type LootTrackerState = {
	mapPos: Rect,
	lootPos: Rect,
	kc: number,
	mapData: ImageData,
	lootData: ImageData,
	prevLootData: ImageData,
	prevLootBW: boolean[],
	mobReader: MobReader.default,
	mobData: ImageData,
	mobName: string|undefined,
	hasFound: {
		loot: boolean,
		map: boolean,
		mob: boolean
	},
	username: string,
	usernameIsTyping: boolean,
	usernameTimeout: number|NodeJS.Timeout,
	usernameIsGood: boolean,
	tooltipIssues: {
		loot: boolean,
		map: boolean,
		mob: boolean,
		username: boolean
	},
	imgDataHistory: ImageData[],
	dev: boolean
};

const state:LootTrackerState = {
	mapPos: {x:undefined, y:undefined, w:undefined, h:undefined},
	lootPos: {x:undefined, y:undefined, w:undefined, h:undefined},
	kc: 0,
	mapData: null,
	lootData: null,
	prevLootData: null,
	prevLootBW: null,
	mobReader: new MobReader.default(),
	mobData: null,
	mobName: undefined,
	hasFound: {
		loot:false,
		map:false,
		mob:false
	},
	username: undefined,
	usernameIsTyping: false,
	usernameTimeout: -1,
	usernameIsGood: false,
	tooltipIssues: {
		loot: false,
		map: false,
		mob: false,
		username: false
	},
	imgDataHistory: [],
	dev: false
};
globalThis.lootTrackerState = state;

const addImageDataHistory = (img:ImageData) => {
	state.imgDataHistory.unshift(img);
	while (state.imgDataHistory.length > 10) {
		state.imgDataHistory.pop();
	}
};

globalThis.toggleDev = () => {
	state.dev = !state.dev;
};

const updateFoundElements = () => {
	helperElements.foundLoot.className =  state.hasFound.loot ? 'found' : '';
	helperElements.foundMap.className =  state.hasFound.map ? 'found' : '';
	helperElements.foundMob.className =  state.hasFound.mob ? 'found' : '';
	helperElements.foundUsername.className =  state.usernameIsGood ? 'found' : '';
};

const resetPositions = () => {
	state.mapPos = {x:undefined, y:undefined, w:undefined, h:undefined};
	state.lootPos = {x:undefined, y:undefined, w:undefined, h:undefined};
	state.mobName = undefined;
	state.hasFound.loot = false;
	state.hasFound.map = false;
	state.hasFound.mob = false;
	updateFoundElements();
};

const tryFindMap = async () => {
	if (!state.hasFound.map || state.mapPos.x === undefined) {
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
			state.mapPos = {
				x: homeTeleport.screenPosition[0].x,
				y: runIcon.screenPosition[0].y,
				w: runIcon.screenPosition[0].x + dataImages.runBorder.width - homeTeleport.screenPosition[0].x,
				h: homeTeleport.screenPosition[0].y + 28 - runIcon.screenPosition[0].y
			};

			alt1.overLaySetGroup('Map');
			alt1.overLayRect(
				a1lib.mixColor(255, 255, 255),
				state.mapPos.x,
				state.mapPos.y,
				state.mapPos.w,
				state.mapPos.h,
				1000,
				2
			);
			state.hasFound.map = true;
			updateFoundElements();
		}
	}
	if (state.hasFound.map) {
		await captureMap();
	}
};

const tryFindMonster = async () => {
	// NOTE not saving current location of MobReader, as it can move around if it is locked to the mob's head
	let img = a1lib.captureHoldFullRs();
	let mobstate = state.mobReader.read(img);
	if (mobstate !== null) {
		try {
			helperElements.Mob.innerText = mobstate.name;
			helperElements.Mob.classList.add('found');
			state.hasFound.mob = true;
			state.mobName = mobstate.name;
			state.mobData = img.toData(state.mobReader.lastpos.x-151, state.mobReader.lastpos.y-16, 220, 44);
			updateFoundElements();
		} catch(e) {}//nothing
	}
};

const tryFindLoot = async () => {
	if (!state.hasFound.loot || state.lootPos.x === undefined) {
		console.log(`Attempting to capture Runemetrics dropsmenu`);
		let client_screen = a1lib.captureHoldFullRs();

		const dropText = client_screen.findSubimage(dataImages.dropText);

		const resetButton = client_screen.findSubimage(dataImages.resetButton);

		if (
			dropText[0] !== undefined &&
			resetButton[0] !== undefined
		) {
			state.lootPos = {
				x: dropText[0].x,
				y: dropText[0].y,
				w: resetButton[0].x - dropText[0].x + 22,
				h: resetButton[0].y - dropText[0].y - 4
			};

			alt1.overLaySetGroup('Loot');
			alt1.overLayRect(
				a1lib.mixColor(255, 255, 255),
				state.lootPos.x,
				state.lootPos.y,
				state.lootPos.w,
				state.lootPos.h,
				500,
				2
			);
			state.hasFound.loot = true;
			updateFoundElements();
		}
	}
	if (state.hasFound.loot) {
		await captureLoot();
	}
};

const imgContainsLoot = (img:a1lib.ImgRefBind) => {
	const dropText = img.findSubimage(dataImages.dropText);
	return dropText[0] !== undefined;
};

const captureMap = async () => {
	let mapImage = a1lib.captureHold(state.mapPos.x, state.mapPos.y, state.mapPos.w, state.mapPos.h);
	state.mapData = mapImage.toData();
};

const captureLoot = async () => {
	let lootImage = a1lib.captureHold(state.lootPos.x, state.lootPos.y, state.lootPos.w, state.lootPos.h);
	if (imgContainsLoot(lootImage)) {
		state.lootData = lootImage.toData();
		compareLootImages();
	} else {
		state.lootPos = {x:undefined, y:undefined, w:undefined, h:undefined};
		state.hasFound.loot = false;
		await tryFindLoot();
	}
};

// converts one RGB pixel to a grayscale value
const grayscalePixel = (red: number, green: number, blue: number): number => {
	return (red * 6966 + green * 23436 + blue * 2366) >> 15;
};

// convert an ImageData to a boolean image (only true for black or false for white) based on they grayscale value of the pixel
// ultimately makes the image be black text on a white background
const binaryImage = (img: ImageData) => {
	let bwImg = [];
	let data = img.data;
	for (var i = 0; i < data.length; i += 4) {
		const red = 255 - data[i];
		const green = 255 - data[i + 1];
		const blue = 255 - data[i + 2];
		data[i+3] = 255; // just overwrite any alpha to fully opaque
		bwImg.push(grayscalePixel(red, green, blue) < GRAY_THRESHOLD);
	}
	return bwImg;
};

const binaryImageData = (img:boolean[], w:number, h:number) => {
	const data:number[] = [];
	for (let i=0; i<img.length; i++) {
		let v = img[i] ? 0 : 255;
		data.push(v);//r
		data.push(v);//g
		data.push(v);//b
		data.push(255);//a
	}
	return new ImageData(new Uint8ClampedArray(data), w,h);
};

// compares two ImageDatas, after they have been through binaryImage so they are just black and white
const compareImages = (image1:boolean[], image2:boolean[]):boolean => {
	let len = image1.length;
	// if size changed, consider as different
	if (len !== image2.length) return true;


	let diffs = 0;
	for (let i=0; i<len; i++) {
		if (image1[i] !== image2[i]) {
			diffs++;
			if (diffs >= PIXEL_DIFF_THRESHOLD) {
				return true;
			}
		}
	}
	return diffs >= PIXEL_DIFF_THRESHOLD;
};

const compareLootImages = () => {
	// binary the lootData image
	let lootBW = binaryImage(state.lootData);
	// if the previous is empty we can just skip anything else
	if (state.prevLootData === null) {
		state.prevLootData = state.lootData;
		state.prevLootBW = lootBW;
		return;
	}
	if (compareImages(state.prevLootBW, lootBW)) {
		if (state.dev) {
			updateDevCanvases(state.prevLootData, state.prevLootBW, state.lootData, lootBW);
		}
		state.kc++;
		// pass in the ImageDatas so it isn't relying on state
		sendToAPI(state.kc, state.mapData, state.mobData, state.prevLootData, state.lootData);
		state.prevLootData = state.lootData;
		state.prevLootBW = lootBW;
	}

};

const updateDevCanvases = (prevLootData:ImageData, prevLootBW:boolean[], lootData:ImageData, lootBW:boolean[]) => {
	const cnvbef = getCanvasByID('canvas-before'), cnvbefbw = getCanvasByID('canvas-before-bw'), cnvaf = getCanvasByID('canvas-after'), cnvafbw = getCanvasByID('canvas-after-bw'), cnvdiff = getCanvasByID('canvas-diff'), numele = getByID('dev-diff');
	const ctxbef = cnvbef.getContext('2d'), ctxbefbw = cnvbefbw.getContext('2d'), ctxaf = cnvaf.getContext('2d'), ctxafbw = cnvafbw.getContext('2d'), ctxdiff = cnvdiff.getContext('2d');
	let w = prevLootData.width, h = prevLootData.height;

	cnvbef.width = w;
	cnvbef.height = h;
	ctxbef.putImageData(prevLootData, 0, 0);
	
	cnvbefbw.width = w;
	cnvbefbw.height = h;
	ctxbefbw.putImageData(binaryImageData(prevLootBW,w,h), 0, 0);

	cnvaf.width = w;
	cnvaf.height = h;
	ctxaf.putImageData(lootData, 0, 0);
	
	cnvafbw.width = w;
	cnvafbw.height = h;
	ctxafbw.putImageData(binaryImageData(lootBW,w,h), 0, 0);

	let len = prevLootBW.length, diffimg = [];
	// if size changed, consider as different
	if (len !== lootBW.length) {
		numele.innerText = `Images are different sizes: ${len} to ${lootBW.length}`
	} else {
		let diffs = 0;
		for (let i=0; i<len; i++) {
			let d = prevLootBW[i] === lootBW[i];
			diffimg.push(d);
			if (!d) {
				diffs++;
			}
		}
		cnvdiff.width = w;
		cnvdiff.height = h;
		ctxdiff.putImageData(binaryImageData(diffimg,w,h), 0, 0);
		numele.innerText = `Number of diffs: ${diffs}`

	}

	addImageDataHistory(lootData);
};

// username functions
const finishedUsernameTyping = async () => {
	while (state.usernameIsTyping) {
		await timeout(200);
	}
	return true;
}
const usernameIsGood = () => {
	let uname = state.username;
	if (uname === undefined || uname === null || uname === '' || uname === 'undefined' || uname === 'null') {
		state.usernameIsGood = false;
		helperElements.settings.classList.add('needsUsername');
	} else {
		state.usernameIsGood = true;
		helperElements.settings.classList.remove('needsUsername');
	}
	state.tooltipIssues.username = !state.usernameIsGood;
	tooltipUpdate();
	updateFoundElements();
	return state.usernameIsGood;
}
const setUsername = (ev?:Event) => {
	let uname = helperElements.username.value;
	uname = uname.trim();
	window.localStorage.setItem('username', uname);
	state.username = uname;
	usernameIsGood();
	if (ev !== undefined && ev !== null) {
		// this is the event
		clearTimeout(state.usernameTimeout);
		if (ev.type === 'input') {
			state.usernameIsTyping = true;
			state.usernameTimeout = setTimeout(() => { // intentionally a setTimeout and not the timeout helper
				state.usernameIsTyping = false;
			}, 3000);
		} else if (ev.type === 'change') { //change triggered when pressing the enter key or unfocusing the element
			state.usernameIsTyping = false;
		}
	}
}

// waits for the username to be entered and valid
const getUsername = async () => {
	while (true) {
		await finishedUsernameTyping();
		if (usernameIsGood()) {
			return state.username;
		}
		await timeout(200);
	}
}
//end username functions

const tooltipUpdate = () => {
	const tooltipStr = [];
	if (state.tooltipIssues.username) {
		tooltipStr.push('- Username is missing or not valid');
	}
	if (state.tooltipIssues.loot) {
		tooltipStr.push('- Loot interface not found (is it visible and unobscured?)');
	}
	if (state.tooltipIssues.mob) {
		tooltipStr.push('- Target information not found (is it visible and unobscured?)');
	}
	if (state.tooltipIssues.map) {
		tooltipStr.push('- Game map not found');
	}
	if (tooltipStr.length > 0) {
		tooltipStr.unshift('Issues found, data submission paused!');
		alt1.setTooltip(tooltipStr.join('\n'));
	} else {
		alt1.clearTooltip();
	}
};

const addMessage = (msg:string) => {
	const div = document.createElement('div');
	div.innerText = msg;
	helperElements.messages.after(div);
	return div;
};


const hasFoundAllThings = (mapData:ImageData|null, mobData:ImageData|null, prevLootData:ImageData|null, lootData:ImageData|null) => {
	state.tooltipIssues.loot = !state.hasFound.loot || lootData === null || prevLootData === null;
	state.tooltipIssues.map = !state.hasFound.map || mapData === null;
	state.tooltipIssues.mob = !state.hasFound.mob || mobData === null;
	state.tooltipIssues.username = !state.usernameIsGood;
	tooltipUpdate();
	return !(state.tooltipIssues.loot || state.tooltipIssues.map || state.tooltipIssues.mob); //username is allowed to be invalid as we can wait for it
};

const sendToAPI = async (kcid:number, mapData:ImageData, mobData:ImageData, prevLootData:ImageData, lootData:ImageData) => {
	if (!hasFoundAllThings(mapData, mobData, prevLootData, lootData)) return; // check for everything
	await getUsername();
	let data = {
		monsterName: state.mobName,
		username: state.username,
		loot: {},
		mapPng: arrayBufferToHex(await mapData.toFileBytes('image/png')),
		targetPng: arrayBufferToHex(await mobData.toFileBytes('image/png')),
		beforePng: arrayBufferToHex(await prevLootData.toFileBytes('image/png')),
		afterPng: arrayBufferToHex(await lootData.toFileBytes('image/png'))
	}

	const div = addMessage(`Submitted kill ${kcid}`);
	div.className = 'pending';

	console.log(`sending request for username: ${data.username} - mob: ${data.monsterName} - lootdiff: ${JSON.stringify(data.loot)} - map bytes length: ${data.mapPng.length} - before bytes length: ${data.beforePng.length} - after bytes length: ${data.afterPng.length}`)
	let r = await fetch('https://chisel.weirdgloop.org/droplogs-alt1/submit', {method:'POST', body: JSON.stringify(data)});
	let jsr = await r.json();
	console.log(r.status, jsr);
	if (jsr.success) {
		div.className = 'success';
		div.innerText += ' - success!'
	} else {
		div.className = 'failure';
		div.innerText += ' - failure'
		div.setAttribute('title', jsr.error+'\n'+jsr.details);
	}
};


export const startApp = () => {
	if (!window.alt1) {
		helperElements.Output.insertAdjacentHTML(
			'beforeend',
			`<div>You need to run this page in alt1 to capture the screen</div>`
		);
		return;
	}
	if (!alt1.permissionPixel) {
		helperElements.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Page is not installed as app or capture permission is not enabled</p></div>`
		);
		return;
	}
	if (!alt1.permissionOverlay) {
		helperElements.Output.insertAdjacentHTML(
			'beforeend',
			`<div><p>Attempted to use Overlay but app overlay permission is not enabled. Please enable "Show Overlay" permission in Alt1 settinsg (wrench icon in corner).</p></div>`
		);
		return;
	}

	helperElements.username.value = localStorage.getItem('username');
	setUsername();
	helperElements.username.addEventListener('input', setUsername);
	helperElements.username.addEventListener('change', setUsername);
	document.querySelectorAll('.toggle').forEach((el:HTMLElement)=>{
		el.addEventListener('click', (ev)=>{
			let tog = document.getElementById(el.getAttribute('data-toggle'));
			if (tog !== null && tog.classList.contains('visible')) {
				tog.className = 'hidden';
				el.innerText = '[show]';
			} else {
				tog.className = 'visible';
				el.innerText = '[hide]';
			}
		});
	});

	setInterval(tryFindMap, 400);
	setInterval(tryFindLoot, 400);
	setInterval(tryFindMonster, 400);
	helperElements.resetButton.addEventListener('click', (ev)=>{resetPositions()});
};

window.onload = function () {
	//check if we are running inside alt1 by checking if the alt1 global exists
	if (window.alt1) {
		//tell alt1 about the app
		//this makes alt1 show the add app button when running inside the embedded browser
		//also updates app settings if they are changed

		alt1.identifyAppUrl('./appconfig.json');
		startApp();
	} else {
		let addappurl = `alt1://addapp/${
			new URL('./appconfig.json', document.location.href).href
		}`;
		helperElements.Output.insertAdjacentHTML(
			'beforeend',
			`
			Alt1 not detected, click <a href='${addappurl}'>here</a> to add this app to Alt1
		`
		);
	}
};