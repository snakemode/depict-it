export class DrawableCanvasElement {
    constructor(canvasElementId) {
        this.canvasElementId = canvasElementId;
        this.paintCanvas = document.getElementById(canvasElementId);
        this.paintContext = this.paintCanvas.getContext("2d");

        this.activeColour = "black";
        this.dragging = false;
        this.cursorPoint = { x: 0, y: 0 };

        this.paintCanvas.onmousedown = (e) => { this.onMouseDownHandler(e); };
        this.paintCanvas.onmouseup = (e) => { this.onMouseUpHandler(e); };
        this.paintCanvas.onmouseout = (e) => { this.onMouseUpHandler(e); };
        this.paintCanvas.onmousemove = (e) => { this.onMouseMoveHandler(e); };
                         
        const canvas = this.paintCanvas;

        document.body.addEventListener("touchstart", (e) => {
            if (e.target == canvas) {
                e.preventDefault();                 
                this.onMouseDownHandler(e); 
            }
        }, false);

        document.body.addEventListener("touchend", (e) => {
            if (e.target == canvas) { 
                e.preventDefault();
                this.onMouseUpHandler(e); 
            }
        }, false);
        
        document.body.addEventListener("touchmove", (e) => {
            if (e.target == canvas) { 
                e.preventDefault(); 
                this.onMouseMoveHandler(e); 
            }
        }, false);
        
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

    getLocationFrom(e) {        
        const location = { x: 0, y: 0 };

        if (e.constructor.name === "TouchEvent") {            
            const bounds = e.target.getBoundingClientRect();
            const touch = e.targetTouches[0];
            
            location.x = touch.pageX - bounds.left;
            location.y = touch.pageY - bounds.top;
        } else {            
            location.x = e.offsetX;
            location.y = e.offsetY;
        }

        return location;
    }

    onMouseDownHandler(e) {
        this.dragging = true;

        const location = this.getLocationFrom(e);
        this.cursorPoint.x = location.x;
        this.cursorPoint.y = location.y;

        this.paintContext.lineWidth = 1;
        this.paintContext.lineCap = 'round';
        this.paintContext.filter = 'blur(1px)';
        this.paintContext.beginPath();
        this.paintContext.moveTo(this.cursorPoint.x, this.cursorPoint.y);
        this.paintContext.strokeStyle = this.activeColour;
    }

    onMouseUpHandler(e) {
        this.dragging = false;
    }

    onMouseMoveHandler(e) {
        if(!this.dragging) return;

        const location = this.getLocationFrom(e);
        this.paintContext.lineTo(location.x, location.y);
        this.paintContext.stroke();
    }

    toString() {
        return this.paintCanvas.toDataURL("image/png");
    }
}