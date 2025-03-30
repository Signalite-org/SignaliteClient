import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupFriendsSwitchComponent } from './group-friends-switch.component';

describe('GroupFriendsSwitchComponent', () => {
  let component: GroupFriendsSwitchComponent;
  let fixture: ComponentFixture<GroupFriendsSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupFriendsSwitchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupFriendsSwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
