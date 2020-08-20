const { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');
const Jimp = require("jimp");
const fetch = require('node-fetch');

class GifCreator {
    constructor() {
    }

    async create(stack) {

        const title = await this.imageFromFile("./features/gifmaking/title.gif");
        const frames = [title];

        for (let stackItem of stack.items) {
            const frame = stackItem.type == "image"
                ? await this.imageFromUrl(stackItem.value)
                : await this.imageWithText(stackItem.value);

            frames.push(frame);
        }

        const gif = await this.gifFromFrames(frames);

        console.log("Created gif");
        return gif;
    }

    async gifFromFrames(frames) {
        const codec = new GifCodec();
        const gif = await codec.encodeGif(frames, { loops: 0 }); // 0 = infinite.
        return gif.buffer;
    }

    async imageFromUrl(url) {
        const response = await fetch(url);
        if (!response.status == 200) {
            throw "Failed to load image, cannot make a gif";
        }

        const imageBuffer = await response.buffer();
        const image = await Jimp.read(imageBuffer);

        const targetCanvas = new Jimp(400, 400, 'white');
        targetCanvas.blit(image, 0, 0)

        GifUtil.quantizeDekker(targetCanvas, 250);

        return new GifFrame(new BitmapImage(targetCanvas.bitmap), { delayCentisecs: 100 });
    }

    async imageFromFile(path) {
        const image = await Jimp.read(path);
        return new GifFrame(new BitmapImage(image.bitmap), { delayCentisecs: 100 });
    }

    async imageWithText(text) {
        const textFrame = await Jimp.read("./features/gifmaking/text.gif");
        let x = 35;
        let y = 80;

        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        textFrame.print(font, x, y, text);

        return new GifFrame(new BitmapImage(textFrame.bitmap), { delayCentisecs: 100 });
    }
}

module.exports = GifCreator;