import { nanoid } from "nanoid";

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const darkToggle = document.getElementById('darkToggle');
const app = document.getElementById('app');

let DPR = Math.max(1, window.devicePixelRatio || 1);
let W = canvas.clientWidth;
let H = canvas.clientHeight;
let balls = [];

function resize() {
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);
resize();

function rand(min,max){ return Math.random()*(max-min)+min; }

function addBall({x,y,speed,angle,color}) {
  balls.push({
    id: nanoid(6),
    x: x ?? rand(40,W-40),
    y: y ?? rand(40,H-40),
    r: rand(10,26),
    vx: Math.cos(angle ?? rand(0,Math.PI*2)) * (speed ?? rand(0.6,2.4)),
    vy: Math.sin(angle ?? rand(0,Math.PI*2)) * (speed ?? rand(0.6,2.4)),
    color: color ?? `hsl(${rand(0,360)} 80% 60%)`,
  });
}

function clearBalls(){ balls = []; }

addBtn.addEventListener('click', () => addBall({}));
clearBtn.addEventListener('click', clearBalls);
darkToggle.addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  addBall({ x, y, speed:4 + Math.random()*4 });
});

// simple pan: drag to move canvas visually (translates CSS)
let dragging = false;
let startY=0, startX=0, originTop=0, originLeft=0;
const panel = document.getElementById('panel');
panel.addEventListener('pointerdown', (e) => {
  dragging = true;
  startX = e.clientX;
  startY = e.clientY;
  originLeft = panel.offsetLeft;
  originTop = panel.offsetTop;
  panel.setPointerCapture(e.pointerId);
});
panel.addEventListener('pointermove', (e) => {
  if(!dragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  panel.style.transform = `translate(${dx}px, ${dy}px)`;
});
panel.addEventListener('pointerup', (e) => {
  dragging = false;
  panel.style.transform = '';
  panel.releasePointerCapture(e.pointerId);
});
panel.addEventListener('pointercancel', () => { dragging = false; panel.style.transform = ''; });

function step(dt) {
  // physics
  for (let b of balls) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // walls
    if (b.x - b.r < 0) { b.x = b.r; b.vx *= -1; }
    if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -1; }
    if (b.y - b.r < 0) { b.y = b.r; b.vy *= -1; }
    if (b.y + b.r > H) { b.y = H - b.r; b.vy *= -1; }
  }
  // simple circle collisions (O(n^2) but small N)
  for (let i=0;i<balls.length;i++){
    for (let j=i+1;j<balls.length;j++){
      const a=balls[i], b=balls[j];
      const dx=a.x-b.x, dy=a.y-b.y;
      const dist = Math.hypot(dx,dy);
      const minDist = a.r + b.r;
      if (dist > 0 && dist < minDist) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = (minDist - dist) / 2;
        a.x += nx * overlap;
        a.y += ny * overlap;
        b.x -= nx * overlap;
        b.y -= ny * overlap;
        // swap velocities along normal
        const va = a.vx*nx + a.vy*ny;
        const vb = b.vx*nx + b.vy*ny;
        const pa = va, pb = vb;
        const swap = pb - pa;
        a.vx += swap * nx;
        a.vy += swap * ny;
        b.vx -= swap * nx;
        b.vy -= swap * ny;
      }
    }
  }
}

let last = performance.now();
function loop(now){
  const dt = Math.min(32, now - last) / 16.67; // normalized ~60fps units
  last = now;
  step(dt);
  render();
  requestAnimationFrame(loop);
}

function render(){
  ctx.clearRect(0,0,W,H);
  // background subtle grid
  ctx.fillStyle = getComputedStyle(document.body).classList.contains('dark') ? '#071426' : '#f8fffe';
  ctx.fillRect(0,0,W,H);

  for (let b of balls){
    // shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(2,6,23,0.08)';
    ctx.ellipse(b.x+2, b.y+3, b.r*1.05, b.r*0.6, 0, 0, Math.PI*2);
    ctx.fill();
    // main
    const g = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.3, b.r*0.1, b.x, b.y, b.r);
    g.addColorStop(0, '#ffffffaa');
    g.addColorStop(0.2, b.color);
    g.addColorStop(1, shade(b.color, -12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }
}

function shade(hslString, changeL){
  // crude convert hsl(...) and adjust lightness
  const m = /hsl\((\d+\.?\d*)\s*\d*%?\s*(\d+\.?\d*)%?\)/.exec(hslString);
  if(!m) return hslString;
  const h = +m[1], s = 80, l = Math.max(0, Math.min(100, +m[2] + changeL));
  return `hsl(${h} ${s}% ${l}%)`;
}

// preload few balls
for(let i=0;i<8;i++) addBall({});
requestAnimationFrame(loop);

