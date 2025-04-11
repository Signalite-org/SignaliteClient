import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-connection-quality-indicator',
  imports: [CommonModule],
  templateUrl: './connection-quality-indicator.component.html',
  styleUrl: './connection-quality-indicator.component.css',
  host: {
    '[class.poor]': 'quality === "poor"',
    '[class.medium]': 'quality === "medium"',
    '[class.good]': 'quality === "good"',
    '[class.unknown]': 'quality === "unknown"'
  }
})
export class ConnectionQualityIndicatorComponent {
  @Input() quality: 'good' | 'medium' | 'poor' | 'unknown' = 'unknown';
  @Input() showText: boolean = false;
  
  get qualityLevel(): number {
    switch (this.quality) {
      case 'good': return 3;
      case 'medium': return 2;
      case 'poor': return 1;
      default: return 0;
    }
  }
  
  getQualityText(): string {
    switch (this.quality) {
      case 'good': return 'Good';
      case 'medium': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  }
  
  getTooltip(): string {
    switch (this.quality) {
      case 'good': return 'Good connection quality';
      case 'medium': return 'Fair connection quality, video might be affected';
      case 'poor': return 'Poor connection quality, consider turning off video';
      default: return 'Connection quality unknown';
    }
  }
}
