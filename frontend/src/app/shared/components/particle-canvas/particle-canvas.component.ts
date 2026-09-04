import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';

interface Particle {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  size: number;
  color: string;
}

@Component({
  selector: 'app-particle-canvas',
  standalone: true,
  template: `<canvas #canvas class="particle-canvas"></canvas>`,
  styles: [`
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      display: block;
    }
    .particle-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class ParticleCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouse: { x: number | null; y: number | null; radius: number } = {
    x: null,
    y: null,
    radius: 200
  };
  private animationFrameId = 0;
  private width = 0;
  private height = 0;

  constructor(
    private elementRef: ElementRef,
    private ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    this.ngZone.runOutsideAngular(() => {
      this.resize();
      window.addEventListener('resize', this.onResize);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseout', this.onMouseOut);
      this.animate();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseout', this.onMouseOut);
  }

  private onResize = (): void => {
    this.resize();
  };

  private onMouseMove = (event: MouseEvent): void => {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;
  };

  private onMouseOut = (): void => {
    this.mouse.x = null;
    this.mouse.y = null;
  };

  private resize(): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const canvas = this.canvasRef.nativeElement;
    this.width = host.clientWidth || window.innerWidth;
    this.height = host.clientHeight || window.innerHeight;
    canvas.width = this.width;
    canvas.height = this.height;
    this.init();
  }

  private init(): void {
    this.particles = [];
    const numberOfParticles = Math.floor((this.height * this.width) / 9000);
    for (let i = 0; i < numberOfParticles; i++) {
      const size = Math.random() * 2 + 1;
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        directionX: Math.random() * 0.4 - 0.2,
        directionY: Math.random() * 0.4 - 0.2,
        size,
        color: 'rgba(191, 128, 255, 0.8)'
      });
    }
  }

  private updateParticle(p: Particle): void {
    const ctx = this.ctx;

    if (p.x > this.width || p.x < 0) {
      p.directionX = -p.directionX;
    }
    if (p.y > this.height || p.y < 0) {
      p.directionY = -p.directionY;
    }

    if (this.mouse.x !== null && this.mouse.y !== null) {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < this.mouse.radius + p.size) {
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        const force = (this.mouse.radius - distance) / this.mouse.radius;
        p.x -= forceDirectionX * force * 5;
        p.y -= forceDirectionY * force * 5;
      }
    }

    p.x += p.directionX;
    p.y += p.directionY;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2, false);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  private connect(): void {
    const ctx = this.ctx;
    for (let a = 0; a < this.particles.length; a++) {
      for (let b = a; b < this.particles.length; b++) {
        const dx = this.particles[a].x - this.particles[b].x;
        const dy = this.particles[a].y - this.particles[b].y;
        const distance = dx * dx + dy * dy;

        if (distance < (this.width / 7) * (this.height / 7)) {
          const opacityValue = 1 - distance / 20000;
          let strokeStyle = `rgba(200, 150, 255, ${opacityValue})`;

          if (this.mouse.x !== null && this.mouse.y !== null) {
            const dxMouse = this.particles[a].x - this.mouse.x;
            const dyMouse = this.particles[a].y - this.mouse.y;
            const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
            if (distanceMouse < this.mouse.radius) {
              strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
            }
          }

          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(this.particles[a].x, this.particles[a].y);
          ctx.lineTo(this.particles[b].x, this.particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const ctx = this.ctx;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width, this.height);

    for (const particle of this.particles) {
      this.updateParticle(particle);
    }
    this.connect();
  };
}