import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopCenterComponent } from './top-center.component';

describe('TopCenterComponent', () => {
  let component: TopCenterComponent;
  let fixture: ComponentFixture<TopCenterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopCenterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
