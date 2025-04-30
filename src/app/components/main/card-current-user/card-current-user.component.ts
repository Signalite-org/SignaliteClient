import {Component, Input, signal} from '@angular/core';
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: 'app-card-current-user',
    imports: [
        NgOptimizedImage
    ],
  templateUrl: './card-current-user.component.html',
  styleUrl: './card-current-user.component.css'
})
export class CardCurrentUserComponent {
  @Input() userName = "";
  @Input() userImageURL: string = "../../../../assets/images/default-user.jpg";
}
