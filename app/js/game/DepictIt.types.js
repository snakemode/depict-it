export class Stack {
    constructor(ownerId, openingHint) {
        this.ownedBy = ownerId;
        this.heldBy = ownerId;
        this.items = [new StackItem("string", openingHint)];
        this.items[0].author = "SYSTEM";
        this.requires = "image";
    }

    add(item) {
        this.items.push(item);
        this.requires = item.type == "image" ? "string" : "image";
    }
}

export class StackItem {
    constructor(type, value) {
        this.type = type;   // "string" | "image"
        this.value = value; // "full text | url
    }
}