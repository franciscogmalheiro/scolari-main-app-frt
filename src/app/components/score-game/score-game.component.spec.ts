import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreGameComponent } from './score-game.component';

describe('ScoreGameComponent', () => {
  let component: ScoreGameComponent;
  let fixture: ComponentFixture<ScoreGameComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ScoreGameComponent]
    });
    fixture = TestBed.createComponent(ScoreGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
