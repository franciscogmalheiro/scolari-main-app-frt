import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-record-instructions',
  templateUrl: './record-instructions.component.html',
  styleUrls: ['./record-instructions.component.scss']
})
export class RecordInstructionsComponent implements OnInit {
  // Store the query parameters to preserve them
  private queryParams: any = {};

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Capture all query parameters when component loads
    this.route.queryParams.subscribe(params => {
      this.queryParams = { ...params };
      console.log('Record instructions received params:', this.queryParams);
    });
  }

  onNextClick(): void {
    // Preserve all query parameters when navigating to score game
    this.router.navigate(['/score-game'], { queryParams: this.queryParams });
  }
} 