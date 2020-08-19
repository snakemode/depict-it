const GifCreator = require("../features/gifmaking/GifCreator");
const saveToAzure = require("../features/storage/saveToAzure");

module.exports = async function (context, req) {
    if (!req.body.stack
        || !req.body.stack.items
        || req.body.stack.items.length == 0) {
        return badRequest(context, "You must provide a stack to turn into a gif");
    }

    const creator = new GifCreator();
    const gif = await creator.create(req.body.stack);

    const filename = req.body.stack.id + ".gif";
    const url = await saveToAzure(filename, gif, "shareables", "image/gif");

    return gifResponse(context, url);
};


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