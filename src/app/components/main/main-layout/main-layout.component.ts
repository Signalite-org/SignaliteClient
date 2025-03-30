import { Component, Renderer2, ElementRef } from '@angular/core';
import {TopLeftComponent} from './top/top-left/top-left.component';
import {TopCenterComponent} from './top/top-center/top-center.component';
import {TopRightComponent} from './top/top-right/top-right.component';

@Component({
  selector: 'app-main-layout',
  imports: [TopLeftComponent, TopCenterComponent, TopRightComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  constructor(private renderer: Renderer2, private el: ElementRef) {}

  hideRightColumn: boolean = false;
  hideLeftColumn: boolean = false;
  private visibleClass: string = '';
  private hiddenClass: string = 'hidden';
  private testSwitch: number = -1;

  private updateLayout() {
    const content = this.el.nativeElement.querySelector('#content');
    if(this.hideLeftColumn && this.hideRightColumn){
      this.renderer.setStyle(content, 'grid-template-columns','1fr');
    } else if(this.hideRightColumn) {
      this.renderer.setStyle(content, 'grid-template-columns', 'max-content minmax(0, 1fr)');
    } else {
      this.renderer.setStyle(content, 'grid-template-columns', 'max-content minmax(0, 1fr) min-content');
    }
  }

  get rightColumnVisibility() {
    if(this.hideRightColumn) {
      return this.hiddenClass;
    }
    return this.visibleClass;
  }

  get leftColumnVisibility() {
    if(this.hideLeftColumn) {
      return this.hiddenClass;
    }
    return this.visibleClass;
  }

  private switchRightColumn(): void {
    this.hideRightColumn = !this.hideRightColumn;
  }

  private layoutAllVisible() {
    this.hideRightColumn = false;
    this.hideLeftColumn = false;
  }

  private layoutRightHidden() {
    this.hideRightColumn = true;
    this.hideLeftColumn = false;
  }

  private layoutCenterOnly() {
    this.hideRightColumn = true;
    this.hideLeftColumn = true;
  }

  testSwitchColumns(): void {
    this.testSwitch = (this.testSwitch + 1) % 3;
    if(this.testSwitch == 0) {
      this.layoutRightHidden();
    } else if(this.testSwitch == 1) {
      this.layoutCenterOnly();
    } else {
      this.layoutAllVisible();
    }
    this.updateLayout();
  }
}
