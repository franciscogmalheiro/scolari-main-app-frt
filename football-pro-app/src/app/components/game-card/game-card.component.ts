import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  buttonText: string;
  requiresAuth: boolean;
}

@Component({
  selector: 'app-game-card',
  templateUrl: './game-card.component.html',
  styleUrls: ['./game-card.component.scss']
})
export class GameCardComponent {
  @Input() gameMode!: GameMode;
  @Input() isAuthenticated = false;
  @Output() cardClick = new EventEmitter<GameMode>();

  onCardClick(): void {
    if (!this.gameMode.requiresAuth || this.isAuthenticated) {
      this.cardClick.emit(this.gameMode);
    }
  }

  get isDisabled(): boolean {
    return this.gameMode.requiresAuth && !this.isAuthenticated;
  }
}
