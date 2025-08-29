import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamEditModalComponent } from './team-edit-modal.component';

describe('TeamEditModalComponent', () => {
  let component: TeamEditModalComponent;
  let fixture: ComponentFixture<TeamEditModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TeamEditModalComponent]
    });
    fixture = TestBed.createComponent(TeamEditModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
