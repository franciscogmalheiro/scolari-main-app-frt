import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-record-instructions',
  templateUrl: './record-instructions.component.html',
  styleUrls: ['./record-instructions.component.scss']
})
export class RecordInstructionsComponent {

  constructor(private router: Router) {}

  onNextClick(): void {
    this.router.navigate(['/score-game'], { queryParams: { mode: 'record' } });
  }
} 