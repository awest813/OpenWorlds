import "../styles/index.scss";
import { GameBootstrap } from "../core/GameBootstrap";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
// Keep wheel zoom on the ArcRotateCamera from scrolling the page (esp. when focus leaves the canvas).
canvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

await GameBootstrap.CreateAsync(canvas);