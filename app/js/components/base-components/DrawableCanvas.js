import { DrawableCanvasElement } from "./DrawableCanvasElement.js";

export const DrawableCanvas = {
    data: function() {    
      return {
        canvasId: "canvas-" + crypto.getRandomValues(new Uint32Array(1))[0],
        paletteId: "palette-" + crypto.getRandomValues(new Uint32Array(1))[0],
        canvas: null 
      }
    },
    mounted: function () {
      const element = document.getElementById(this.canvasId);
      if (element && !this.canvas) {
        this.canvas = new DrawableCanvasElement(this.canvasId).registerPaletteElements(this.paletteId);
      }
    },
    template: `
  <div class="drawable-canvas">
    <div v-bind:id="paletteId" class="palette">
      <div style="background-color: white;"></div>
      <div style="background-color: black;"></div>
      <div style="background-color: red;"></div>
      <div style="background-color: green;"></div>
      <div style="background-color: blue;"></div>
    </div>        
    <canvas v-bind:id="canvasId" class="paintCanvas" width="400" height="400"></canvas>  
    <button v-on:click="$emit('drawing-finished', canvas.toString())" class="form-button">Done!</button>
  </div>`
};