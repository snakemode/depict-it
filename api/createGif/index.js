const { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');
const Jimp = require("jimp");
const fetch = require('node-fetch');
const fs = require("fs");
const saveToAzure = require("../features/storage/saveToAzure");

module.exports = async function (context, req) {
    if (!req.body.stack
        || !req.body.stack.items
        || req.body.stack.items.length == 0) {
        return badRequest(context, "You must provide a stack to turn into a gif");
    }

    const frames = [];

    frames.push((await imageFromFile("./features/gifmaking/title.gif")));

    for (let stackItem of req.body.stack.items) {
        const frame = stackItem.type == "image"
            ? await imageFromUrl(stackItem.value)
            : await imageWithText(stackItem.value);

        frames.push(frame);
    }

    const gif = await gifFromFrames(frames);
    const filename = req.body.stack.id + ".gif";

    const url = await saveToAzure(filename, gif, "shareables", "image/gif");

    return gifResponse(context, url);
};

async function gifFromFrames(frames) {
    const codec = new GifCodec();
    const gif = await codec.encodeGif(frames, { loops: 0 }); // 0 = infinite.
    return gif.buffer;
}

async function imageFromUrl(url) {
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

async function imageFromFile(path) {
    const image = await Jimp.read(path);
    return new GifFrame(new BitmapImage(image.bitmap), { delayCentisecs: 100 });
}

async function imageWithText(text) {
    const textFrame = await Jimp.read("./features/gifmaking/text.gif");
    let x = 35;
    let y = 80;

    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    textFrame.print(font, x, y, text);

    return new GifFrame(new BitmapImage(textFrame.bitmap), { delayCentisecs: 100 });
}

function gifResponse(context, pathToGeneratedGif) {
    context.res = {
        headers: { "content-type": "application/json" },
        body: { url: pathToGeneratedGif },
        status: 200
    };
}

function badRequest(context, message) {
    context.res = {
        headers: { "content-type": "application/json" },
        body: { message: message },
        status: 400
    };
}