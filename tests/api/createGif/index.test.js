import { StackItem } from "../../../app/js/game/DepictIt.types";
import * as api from "../../../api/createGif/index";
const apiCall = api["default"];

describe("createGif API", () => {

    let context, request;
    beforeEach(() => {
        for (let key of ["AZURE_ACCOUNT", "AZURE_KEY", "AZURE_BLOBSTORAGE", "AZURE_CONTAINERNAME"]) {
            process.env[key] = "abc";
        }
        process.env.AZURE_BLOBSTORAGE = "https://scrawlimages.blob.core.windows.net";
        process.env.SKIP_AZURE_UPLOADS = true;

        context = {};
        request = {
            body: {}
        };
    });

    it("Returns 500 if no stack supplied", async () => {
        request.body = validRequest();

        await apiCall(context, request);

        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe("You must provide a stack to turn into a gif");
    });

    it("Returns 500 if empty stack supplied", async () => {
        request.body = validRequest();

        await apiCall(context, request);

        expect(context.res.status).toBe(400);
        expect(context.res.body.message).toBe("You must provide a stack to turn into a gif");
    });

    it("Returns 200 if valid stack supplied", async () => {
        request.body = validRequest([
            new StackItem("image", "http://placekitten.com/400/400")
        ]);

        await apiCall(context, request);

        expect(context.res.status).toBe(200);
    });

    it("Returns url of stored gif", async () => {
        request.body = validRequest([
            new StackItem("image", "http://placekitten.com/400/400")
        ]);

        await apiCall(context, request);

        expect(context.res.body.url).toBeDefined();
    });

    it("Generated Gif has url returned", async () => {
        request.body = validRequest([
            new StackItem("string", "Have a kitten"),
            new StackItem("image", "http://placekitten.com/400/400")
        ]);

        await apiCall(context, request);

        expect(context.res.body.url).toBeDefined();
    });

});

const validRequest = (items) => {
    items = items || [];
    return {
        stack: {
            items: [...items]
        }
    };
};