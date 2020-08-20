function WordSplitter(words, minSplit, maxLength) {
    maxLength = maxLength || minSplit;

    let buffer = "";
    const output = [];

    for (let char of words) {
        if (skipLeadingSpace(buffer, char)) {
            continue;
        }

        buffer += char;

        if (hardBreak(buffer, maxLength)
            || softBreak(buffer, char, minSplit)) {
            output.push(buffer);
            buffer = "";
        }
    }

    if (buffer.length > 0) {
        output.push(buffer);
    }

    trimLines(output);

    return output;
};

const skipLeadingSpace = (buffer, char) => (buffer.length === 0 && char == " ");
const hardBreak = (buffer, maxLength) => (buffer.length === maxLength);
const softBreak = (buffer, char, minSplit) => (buffer.length >= minSplit && char === " ");

function trimLines(output) {
    for (let index in output) {
        output[index] = output[index].trim();
    }
}

module.exports = WordSplitter;