import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-change-image',
  imports: [CommonModule,MatIconModule],
  templateUrl: './change-image.component.html',
  styleUrl: './change-image.component.css'
})
export class ChangeImageComponent {
  @Input() defaultImage?: string | null = null;
  @Input() shapeDefaultImage: 'circle' | 'rectangle' = 'circle';
  @Output() closed = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File>();
  @Output() defaultSelected = new EventEmitter<void>();

  isDragging = false;

  onBackgroundClick() {
    this.closed.emit();
  }

  onBoxClick(event: MouseEvent) {
    event.stopPropagation();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.imageSelected.emit(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.imageSelected.emit(file);
    }
  }

  selectDefaultImage() {
    this.defaultSelected.emit();
  }
}
