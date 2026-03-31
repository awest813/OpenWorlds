import "../styles/index.scss";
import { GameBootstrap } from "../core/GameBootstrap";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

await GameBootstrap.CreateAsync(canvas);