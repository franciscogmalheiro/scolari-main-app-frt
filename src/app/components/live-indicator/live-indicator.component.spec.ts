import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveIndicatorComponent } from './live-indicator.component';

describe('LiveIndicatorComponent', () => {
  let component: LiveIndicatorComponent;
  let fixture: ComponentFixture<LiveIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiveIndicatorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 