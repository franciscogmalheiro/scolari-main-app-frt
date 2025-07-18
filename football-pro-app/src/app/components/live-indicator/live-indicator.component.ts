import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-live-indicator',
  templateUrl: './live-indicator.component.html',
  styleUrls: ['./live-indicator.component.scss']
})
export class LiveIndicatorComponent {
  @Input() isRecording = false;
} 