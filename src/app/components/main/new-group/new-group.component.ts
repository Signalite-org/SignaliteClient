import { Component, computed, output, signal } from '@angular/core';
import { AccountService } from '../../../_services/account.service';
import { GroupService } from '../../../_services/group.service';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-new-group',
  imports: [FormsModule],
  templateUrl: './new-group.component.html',
  styleUrl: './new-group.component.css'
})
export class NewGroupComponent {
  constructor(private groupService: GroupService, private toastr: ToastrService) {

  }
  errorMessage = signal("")
  errorMessages = signal([""])
  groupName = signal("")
  groupNameLength = computed(() => this.groupName().length)
  close = output<void>()

  onCancel() {
    this.close.emit()
  }

  async onSubmit() {
    this.groupService.createGroup(this.groupName()).subscribe({
      next: () => {
        this.groupName.set("")
        this.errorMessage.set("")
        this.onCancel()
        this.toastr.success("New group created")
      },
      error: (error) => {
        this.errorMessage.set(error.message)
      }
    })
  }
}
