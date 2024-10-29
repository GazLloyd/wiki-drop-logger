import * as MobReader from "alt1/targetmob";
import * as a1lib from "alt1/base";
import * as OCR from "alt1/ocr";
import { webpackImages, ImgRef } from "alt1/base";

var chatfont = require("alt1/fonts/aa_8px.fontmeta.json");

var imgs = webpackImages({
	detectimg: require("alt1/targetmob/imgs/detectimg.data.png")
});

export default class TargetMobReader extends MobReader.default {

	state: { hp: number, name: string, level: number } | null = null;
	lastpos: a1lib.PointLike | null = null;

	read(img?: ImgRef) {
		if (!img) { img = a1lib.captureHoldFullRs(); }
		var pos = img.findSubimage(imgs.detectimg);
		if (pos.length != 0) {
			var data = img.toData(pos[0].x - 151, pos[0].y - 16, 220, 44);
			var mobname = OCR.findReadLine(data, chatfont, [[255, 255, 255]], 62, 18, 20, 1);
			var mobhp = OCR.findReadLine(data, chatfont, [[255, 203, 5]], 92, 39, 20, 1);
			var moblvl = OCR.findReadLine(data, chatfont, [[0x04, 0xc3, 0x0b]], 182, 11, 20, 1)
			this.lastpos = pos[0];
			this.state = {
				name: mobname.text,
				hp: +mobhp.text,
				level: +moblvl.text
			};
		} else {
			this.state = null;
		}
		return this.state;
	}
}