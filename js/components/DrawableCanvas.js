export class DrawableCanvas {
    constructor(canvasElementId) {
        this.canvasElementId = canvasElementId;
        this.paintCanvas = document.getElementById(canvasElementId);
        this.paintContext = this.paintCanvas.getContext("2d");

        this.activeColour = "black";
        this.dragging = false;
        this.cursorPoint = { x:0, y:0 };

        this.paintCanvas.onmousedown = (e) => { this.onMouseDownHandler(e); };
        this.paintCanvas.onmouseup = (e) => { this.onMouseUpHandler(e); };
        this.paintCanvas.onmousemove = (e) => { this.onMouseMoveHandler(e); };
    }

    registerPaletteElements(paletteContainer) {
        const palette = document.getElementById(paletteContainer);
        for (let colour of palette.children) {
            colour.addEventListener('click', (event) => { this.activeColour = event.target.style["background-color"]; });
        }
        return this; 
    }

    clear() {
        this.paintContext.clearRect(0, 0, 100000, 100000);
    }

    onMouseDownHandler(e) {
        this.dragging = true;
        this.cursorPoint.x = e.offsetX;
        this.cursorPoint.y = e.offsetY;

        this.paintContext.lineWidth = 10;
        this.paintContext.lineCap = 'round';
        this.paintContext.filter = 'blur(2px)';
        this.paintContext.beginPath();
        this.paintContext.moveTo(this.cursorPoint.x, this.cursorPoint.y);
        this.paintContext.strokeStyle = this.activeColour;
    }

    onMouseUpHandler(e) {
        this.dragging = false;
    }

    onMouseMoveHandler(e) {
        if(!this.dragging) return;

        this.paintContext.lineTo(e.offsetX, e.offsetY);
        this.paintContext.stroke();            
    }

    toString() {
        return this.paintCanvas.toDataURL("image/png");
    }
}