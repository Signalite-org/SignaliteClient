// heroicons.service.ts
import {inject, Injectable} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {SVG_ICONS} from '../components/local-icons';

@Injectable({
  providedIn: 'root',
})
export class HeroiconService {
  constructor(
    private matIconRegistry: MatIconRegistry = inject(MatIconRegistry),
    private domSanitizer: DomSanitizer = inject(DomSanitizer),
  ) {}

  registerIcons(): void {
    Object.entries(SVG_ICONS).forEach(([name, svg]) => {
      this.matIconRegistry.addSvgIconLiteral(
        name,
        this.domSanitizer.bypassSecurityTrustHtml(svg)
      );
    });
  }
}
