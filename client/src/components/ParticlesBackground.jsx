import React, { useEffect, useRef } from 'react';

export default function ParticlesBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];
    let waves = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const mouse = { x: null, y: null };
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMouseMove);

    const onClick = (e) => {
      waves.push({ x: e.clientX, y: e.clientY, radius: 0, maxRadius: 200, alpha: 0.9, speed: 5 });
      particles.forEach(p => {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220 && dist > 0) {
          const force = (220 - dist) / 220 * 4.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    };
    window.addEventListener('click', onClick);

    const COLORS = ['#ff2222', '#ff5500', '#ff0000', '#ff6622', '#cc0000'];

    class Particle {
      constructor(index, total) {
        // Grid-based initial distribution to spread evenly
        const cols = Math.ceil(Math.sqrt(total * (canvas.width / canvas.height)));
        const rows = Math.ceil(total / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        this.x = (col / cols) * canvas.width + (Math.random() - 0.5) * (canvas.width / cols);
        this.y = (row / rows) * canvas.height + (Math.random() - 0.5) * (canvas.height / rows);
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
        // Random base velocity, uniform magnitude
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 0.35;
        this.baseVx = Math.cos(angle) * speed;
        this.baseVy = Math.sin(angle) * speed;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.radius = Math.random() * 2 + 1.2;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        this.alpha = Math.random() * 0.45 + 0.3;
        this.depth = Math.random(); // parallax depth
      }

      update() {
        // Smooth mouse attraction
        if (mouse.x !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          const attractDist = 160;
          if (dist < attractDist && dist > 0) {
            const force = (attractDist - dist) / attractDist * 0.035;
            this.vx -= (dx / dist) * force;
            this.vy -= (dy / dist) * force;
          }
        }

        // Smooth return to base velocity (spring-like)
        this.vx += (this.baseVx - this.vx) * 0.02;
        this.vy += (this.baseVy - this.vy) * 0.02;

        // Hard speed cap for smoothness
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const maxSpeed = 3.5;
        if (speed > maxSpeed) {
          this.vx = (this.vx / speed) * maxSpeed;
          this.vy = (this.vy / speed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Seamless wrap-around edges
        if (this.x < -5) this.x = canvas.width + 5;
        if (this.x > canvas.width + 5) this.x = -5;
        if (this.y < -5) this.y = canvas.height + 5;
        if (this.y > canvas.height + 5) this.y = -5;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8 + this.radius * 2;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const TOTAL = 120;
    for (let i = 0; i < TOTAL; i++) particles.push(new Particle(i, TOTAL));

    function drawConnections() {
      const LINK_DIST = 140;
      const MOUSE_DIST = 180;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < LINK_DIST * LINK_DIST) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / LINK_DIST;
            ctx.save();
            ctx.globalAlpha = t * 0.38;
            ctx.strokeStyle = '#ff2200';
            ctx.lineWidth = t * 1.2;
            ctx.shadowColor = '#ff2200';
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Mouse beam connection
        if (mouse.x !== null) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < MOUSE_DIST * MOUSE_DIST) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / MOUSE_DIST;
            ctx.save();
            ctx.globalAlpha = t * 0.7;
            ctx.strokeStyle = '#ff4400';
            ctx.lineWidth = t * 1.5;
            ctx.shadowColor = '#ff2200';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    function drawWaves() {
      waves = waves.filter(w => w.alpha > 0.01);
      waves.forEach(w => {
        w.radius += w.speed;
        w.speed = Math.max(1.5, w.speed * 0.93);
        w.alpha *= 0.87;
        ctx.save();
        ctx.globalAlpha = w.alpha;
        ctx.strokeStyle = '#ff3300';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (w.radius > 20) {
          ctx.save();
          ctx.globalAlpha = w.alpha * 0.4;
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(w.x, w.y, w.radius * 0.55, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawConnections();
      particles.forEach(p => { p.update(); p.draw(); });
      drawWaves();
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
