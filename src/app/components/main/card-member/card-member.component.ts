import {Component, input, Input, signal, WritableSignal} from '@angular/core';
import {NgOptimizedImage} from "@angular/common";
import { UserBasicInfo } from '../../../_models/UserBasicInfo';

@Component({
  selector: 'app-card-member',
    imports: [
        NgOptimizedImage
    ],
  templateUrl: './card-member.component.html',
  styleUrl: './card-member.component.css'
})
export class CardMemberComponent {
  isOnline = input(false);
  user = input<UserBasicInfo>()
}
