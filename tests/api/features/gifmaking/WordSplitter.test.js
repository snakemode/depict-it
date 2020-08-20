import { intToRGBA } from "jimp";
import WordSplitter from "../../../../api/features/gifmaking/WordSplitter";

describe("WordSplitter", () => {

    it("Returns one line when words are below the character cap", () => {
        const result = WordSplitter("Below character cap", 200);

        expect(result[0]).toBe("Below character cap");
    });

    it("Return two lines when two words pass over the character cap", () => {
        const result = WordSplitter("1234 6789", 4);

        expect(result[0]).toBe("1234");
        expect(result[1]).toBe("6789");
    });

    it("Returns two lines when three words are split but there's a word over the boundary", () => {
        const result = WordSplitter("My cat a very nice", 5);

        expect(result[0]).toBe("My");
        expect(result[1]).toBe("cat a");
        expect(result[2]).toBe("very");
        expect(result[3]).toBe("nice");
    });

    it("Returns lines when word is always too long", () => {
        const result = WordSplitter("Thisisaverylongword", 5);

        expect(result[0]).toBe("This-");
        expect(result[1]).toBe("-isa-");
        expect(result[2]).toBe("-ery-");
        expect(result[3]).toBe("-lon-");
        expect(result[4]).toBe("-word");
    });

});