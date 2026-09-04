import { Component, Input } from '@angular/core';
import { ParticleCanvasComponent } from '../particle-canvas/particle-canvas.component';

@Component({
  selector: 'app-hero-background',
  standalone: true,
  imports: [ParticleCanvasComponent],
  template: `
    <div class="hero-bg {{ className }}">
      <app-particle-canvas></app-particle-canvas>
      <div class="hero-bg__content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .hero-bg {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    .hero-bg__content {
      position: relative;
      z-index: 2;
      height: 100%;
    }
  `]
})
export class HeroBackgroundComponent {
  @Input() className = '';
}