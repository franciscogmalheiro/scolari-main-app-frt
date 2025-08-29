import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordInstructionsComponent } from './record-instructions.component';

describe('RecordInstructionsComponent', () => {
  let component: RecordInstructionsComponent;
  let fixture: ComponentFixture<RecordInstructionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordInstructionsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordInstructionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 