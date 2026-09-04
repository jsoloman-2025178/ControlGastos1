import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type GlowHorizonVariant = 'top' | 'bottom' | 'left' | 'right';

export interface GlowArcConfig {
  key: string;
  color: string;
  size: number;
  initialOffset?: number;
  blur?: number;
  boxShadow?: string;
  delay: number;
}

export const DEFAULT_ARC_CONFIGS: GlowArcConfig[] = [
  { key: 'white', color: '#FFFFFF', size: 132, boxShadow: '0px -4px 23px 0px #ffffffb5', delay: 1.2 },
  { key: 'purple', color: '#A558FB', size: 120, initialOffset: 10, blur: 31, delay: 0.6 },
  { key: 'blue', color: '#4922E5', size: 124, initialOffset: 10, blur: 21, delay: 0 },
  { key: 'black', color: '#000', size: 120, initialOffset: 10, blur: 51, delay: 0 }
];

const EASE_CURVE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DURATION = 2;

@Component({
  selector: 'app-glow-horizon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './glow-horizon.component.html',
  styleUrls: ['./glow-horizon.component.css']
})
export class GlowHorizonComponent {
  @Input() className = '';
  @Input() variant: GlowHorizonVariant = 'top';
  @Input() arcConfigs: GlowArcConfig[] = DEFAULT_ARC_CONFIGS;

  readonly ease = EASE_CURVE;
  readonly duration = DURATION;

  get arcConfigsOrDefault(): GlowArcConfig[] {
    return this.arcConfigs;
  }

  trackArcByKey(index: number, arc: GlowArcConfig): string {
    return arc.key;
  }
}