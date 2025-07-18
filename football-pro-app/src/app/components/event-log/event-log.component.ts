import { Component, Input, Output, EventEmitter } from '@angular/core';

interface EventItem {
  text: string;
  isUndone: boolean;
}

@Component({
  selector: 'app-event-log',
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.scss']
})
export class EventLogComponent {
  @Input() teamAEvents: EventItem[] = [];
  @Input() teamBEvents: EventItem[] = [];
  @Input() highlightEvents: EventItem[] = [];
  @Input() showControls: boolean = false;
  @Input() teamAScore: number = 0;
  @Input() teamBScore: number = 0;
  @Input() teamAColor: string = '#ff6b35';
  @Input() teamBColor: string = '#007bff';

  @Output() undoTeamA = new EventEmitter<void>();
  @Output() undoTeamB = new EventEmitter<void>();
}
