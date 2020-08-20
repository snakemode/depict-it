module.exports = function (words, minSplit, maxLength) {

    maxLength = maxLength || minSplit;

    const output = [];
    let buffer = "";

    for (let char of words) {
        buffer += char;

        if (buffer.length === 1 && char == " ") {
            buffer = buffer.trimLeft();
        }

        if (buffer.length === maxLength) {
            output.push(buffer);
            buffer = "";
            continue;
        }

        if (buffer.length >= minSplit && char === " ") {
            output.push(buffer);
            buffer = "";
        }
    }

    if (buffer.length > 0) {
        output.push(buffer);
    }

    for (let index in output) {
        output[index] = output[index].trim();
    }

    return output;
};