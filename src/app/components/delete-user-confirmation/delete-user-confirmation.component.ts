import { Component, input, output } from '@angular/core';
import { GroupService } from '../../_services/group.service';
import { ToastrService } from 'ngx-toastr';
import { UserBasicInfo } from '../../_models/UserBasicInfo';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-delete-user-confirmation',
  imports: [FormsModule],
  templateUrl: './delete-user-confirmation.component.html',
  styleUrl: './delete-user-confirmation.component.css'
})
export class DeleteUserConfirmationComponent {
constructor(private groupService: GroupService, private toastr: ToastrService) {
    
  }
  groupId = input.required<number>()
  user = input.required<UserBasicInfo>()
  close = output<void>()
  userDeleted = output<number>()

  onCancel() {
    this.close.emit()
    console.log("user deleting: " + this.user().username)
    console.log("from group: " + this.groupId())
  }

  async onSubmit() {
    this.groupService.removeUserFromGroup(this.groupId(), this.user().id).subscribe({
      next: () => {
        this.toastr.success('User removed successfully');
        this.userDeleted.emit(this.user().id)
        this.onCancel()
      },
      error: (error) => {
        console.error('Error removing user from group:', error);
        this.toastr.error(error);
        this.onCancel()
      }
  });
}
}
