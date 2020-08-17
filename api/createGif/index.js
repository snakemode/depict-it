const { GifFrame, GifUtil, GifCodec, BitmapImage } = require('gifwrap');
const Jimp = require("jimp");
const fetch = require('node-fetch');
const fs = require("fs");
const saveToAzure = require("../features/storage/saveToAzure");

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

module.exports = async function (context, req) {
    if (!req.body.stack
        || !req.body.stack.items
        || req.body.stack.items.length == 0) {
        return badRequest(context, "You must provide a stack to turn into a gif");
    }

    const frames = [];

    for (let stackItem of req.body.stack.items) {
        const frame = stackItem.type == "image"
            ? await imageFromUrl(stackItem.value)
            : await imageWithText(stackItem.value);

        frames.push(frame);
    }

    const gif = await gifFromFrames(frames);
    const filename = uuidv4() + "-temp.gif";

    const url = await saveToAzure(filename, gif);
    // fs.writeFileSync("C:\\dev\\depict-it\\test-output\\" + filename, gif);

    return gifResponse(context, url);
};

async function gifFromFrames(frames) {
    const codec = new GifCodec();
    const gif = await codec.encodeGif(frames, { loops: 3 });
    return gif.buffer;
}

async function imageFromUrl(url) {
    const response = await fetch(url);
    if (!response.status == 200) {
        throw "Failed to load image, cannot make a gif";
    }

    const imageBuffer = await response.buffer();
    const image = await Jimp.read(imageBuffer);

    await image.greyscale(); // Do better.

    return new GifFrame(new BitmapImage(image.bitmap), { delayCentisecs: 100 });
}

async function imageWithText(text) {
    const image = new Jimp(400, 400, 'white');
    let x = 10;
    let y = 10;

    const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    image.print(font, x, y, text);

    return new GifFrame(new BitmapImage(image.bitmap), { delayCentisecs: 100 });
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