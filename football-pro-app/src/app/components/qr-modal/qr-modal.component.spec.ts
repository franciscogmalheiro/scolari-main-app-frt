import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrModalComponent } from './qr-modal.component';

describe('QrModalComponent', () => {
  let component: QrModalComponent;
  let fixture: ComponentFixture<QrModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ QrModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
}); 