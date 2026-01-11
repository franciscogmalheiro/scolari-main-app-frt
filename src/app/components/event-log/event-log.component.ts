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
  @Input() isMatchFinished: boolean = false;

  @Output() editEvent = new EventEmitter<EditEventData>();

  editEventClick(index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): void {
    this.editEvent.emit({ index, team, eventType });
  }

  getDisplayText(text: string): string {
    if (this.isMatchFinished) {
      // Show icons when match is finished
      return text;
    } else {
      // Remove icons when match is not finished (handles icons with optional whitespace before/after)
      return text.replace(/\s*<i class="fas fa-[^"]+"><\/i>\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
}
