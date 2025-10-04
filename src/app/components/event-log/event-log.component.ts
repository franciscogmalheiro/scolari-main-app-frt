import { Component, Input, Output, EventEmitter } from '@angular/core';

interface EventItem {
  text: string;
  isUndone: boolean;
}

interface EditEventData {
  index: number;
  team: 'A' | 'B' | null;
  eventType: 'goal' | 'highlight';
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
  @Input() isEditMode: boolean = false;

  @Output() editEvent = new EventEmitter<EditEventData>();

  editEventClick(index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): void {
    this.editEvent.emit({ index, team, eventType });
  }
}
