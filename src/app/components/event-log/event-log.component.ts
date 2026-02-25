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

interface DragEventData {
  index: number;
  team: 'A' | 'B' | null;
  eventType: 'goal' | 'highlight';
  targetTeam?: 'A' | 'B' | null;
  action?: 'move' | 'delete';
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
  @Output() dragDropEvent = new EventEmitter<DragEventData>();

  draggedEvent: { index: number; team: 'A' | 'B' | null; eventType: 'goal' | 'highlight' } | null = null;
  dragOverTarget: string | null = null;
  isDragging: boolean = false;
  touchStartX: number = 0;
  touchStartY: number = 0;
  touchElement: HTMLElement | null = null;
  dragPreviewX: number = 0;
  dragPreviewY: number = 0;
  draggedEventText: string = '';

  editEventClick(index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): void {
    this.editEvent.emit({ index, team, eventType });
  }

  onDragStart(event: DragEvent, index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): void {
    if (!this.isEditMode) return;
    this.draggedEvent = { index, team, eventType };
    this.isDragging = true;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
  }

  onDragEnd(): void {
    this.resetDragState();
  }

  isEventDragging(index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): boolean {
    return this.isDragging && 
           this.draggedEvent !== null &&
           this.draggedEvent.index === index &&
           this.draggedEvent.team === team &&
           this.draggedEvent.eventType === eventType;
  }

  onDragOver(event: DragEvent, target: string): void {
    if (!this.isEditMode || !this.draggedEvent) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverTarget = target;
  }

  onDragLeave(): void {
    this.dragOverTarget = null;
  }

  onDrop(event: DragEvent, target: string): void {
    event.preventDefault();
    if (!this.draggedEvent) {
      this.resetDragState();
      return;
    }

    let action: 'move' | 'delete' = 'move';
    let targetTeam: 'A' | 'B' | null = null;

    if (target === 'delete') {
      action = 'delete';
    } else if (target === 'teamA') {
      targetTeam = 'A';
    } else if (target === 'teamB') {
      targetTeam = 'B';
    } else if (target === 'highlight') {
      targetTeam = null;
    }

    // Only emit if the target is different from the source
    if (action === 'delete' || 
        (action === 'move' && (this.draggedEvent.team !== targetTeam || this.draggedEvent.eventType !== (targetTeam === null ? 'highlight' : 'goal')))) {
      this.dragDropEvent.emit({
        index: this.draggedEvent.index,
        team: this.draggedEvent.team,
        eventType: this.draggedEvent.eventType,
        targetTeam,
        action
      });
    }

    this.resetDragState();
  }

  isDragOver(target: string): boolean {
    return this.dragOverTarget === target;
  }

  isValidDropZone(target: string): boolean {
    if (!this.isDragging || !this.draggedEvent) return false;
    
    const { team, eventType } = this.draggedEvent;
    
    // Delete zone is always valid
    if (target === 'delete') return true;
    
    // For goals, can drop on opposite team or highlight
    if (eventType === 'goal') {
      if (target === 'teamA' && team !== 'A') return true;
      if (target === 'teamB' && team !== 'B') return true;
      if (target === 'highlight') return true;
    }
    
    // For highlights, can drop on either team
    if (eventType === 'highlight') {
      if (target === 'teamA' || target === 'teamB') return true;
    }
    
    return false;
  }

  // Touch event handlers for mobile support
  onTouchStart(event: TouchEvent, index: number, team: 'A' | 'B' | null, eventType: 'goal' | 'highlight'): void {
    if (!this.isEditMode) return;
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchElement = event.currentTarget as HTMLElement;
    this.draggedEvent = { index, team, eventType };
    this.isDragging = true;
    
    // Get the event text for the preview
    const eventItem = team === 'A' ? this.teamAEvents[index] : 
                     team === 'B' ? this.teamBEvents[index] : 
                     this.highlightEvents[index];
    this.draggedEventText = eventItem ? eventItem.text : '';
    
    // Set initial preview position
    this.dragPreviewX = touch.clientX;
    this.dragPreviewY = touch.clientY;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.draggedEvent) return;
    event.preventDefault(); // Prevent scrolling while dragging
    const touch = event.touches[0];
    
    // Update preview position to follow touch
    this.dragPreviewX = touch.clientX;
    this.dragPreviewY = touch.clientY;
    
    // Only update drag over if moved significantly (to avoid false triggers)
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    if (deltaX < 5 && deltaY < 5) return; // Minimum movement threshold
    
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Find which drop zone we're over
    let target: string | null = null;
    if (elementBelow) {
      const teamAElement = elementBelow.closest('.team-a-log');
      const teamBElement = elementBelow.closest('.team-b-log');
      const highlightElement = elementBelow.closest('.highlight-log');
      const deleteElement = elementBelow.closest('.delete-zone');
      
      if (deleteElement) {
        target = 'delete';
      } else if (teamAElement) {
        target = 'teamA';
      } else if (teamBElement) {
        target = 'teamB';
      } else if (highlightElement) {
        target = 'highlight';
      }
    }
    
    this.dragOverTarget = target;
  }

  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging || !this.draggedEvent) {
      this.resetDragState();
      return;
    }
    
    const touch = event.changedTouches[0];
    
    // Check if we moved enough to consider it a drag (not just a tap)
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    
    if (deltaX < 10 && deltaY < 10) {
      // Too small movement, treat as tap - don't drag
      this.resetDragState();
      return;
    }
    
    event.preventDefault();
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Determine drop target
    let target: string | null = null;
    if (elementBelow) {
      const teamAElement = elementBelow.closest('.team-a-log');
      const teamBElement = elementBelow.closest('.team-b-log');
      const highlightElement = elementBelow.closest('.highlight-log');
      const deleteElement = elementBelow.closest('.delete-zone');
      
      if (deleteElement) {
        target = 'delete';
      } else if (teamAElement) {
        target = 'teamA';
      } else if (teamBElement) {
        target = 'teamB';
      } else if (highlightElement) {
        target = 'highlight';
      }
    }
    
    if (target) {
      this.handleDrop(target);
    }
    
    this.resetDragState();
  }

  private handleDrop(target: string): void {
    if (!this.draggedEvent) return;

    let action: 'move' | 'delete' = 'move';
    let targetTeam: 'A' | 'B' | null = null;

    if (target === 'delete') {
      action = 'delete';
    } else if (target === 'teamA') {
      targetTeam = 'A';
    } else if (target === 'teamB') {
      targetTeam = 'B';
    } else if (target === 'highlight') {
      targetTeam = null;
    }

    // Only emit if the target is different from the source
    if (action === 'delete' || 
        (action === 'move' && (this.draggedEvent.team !== targetTeam || this.draggedEvent.eventType !== (targetTeam === null ? 'highlight' : 'goal')))) {
      this.dragDropEvent.emit({
        index: this.draggedEvent.index,
        team: this.draggedEvent.team,
        eventType: this.draggedEvent.eventType,
        targetTeam,
        action
      });
    }
  }

  private resetDragState(): void {
    this.draggedEvent = null;
    this.dragOverTarget = null;
    this.isDragging = false;
    this.touchElement = null;
    this.draggedEventText = '';
    this.dragPreviewX = 0;
    this.dragPreviewY = 0;
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
