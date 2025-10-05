import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  buttonText: string;
  requiresAuth: boolean;
  disabled?: boolean;
  badge?: string;
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
    if (!this.isDisabled) {
      this.cardClick.emit(this.gameMode);
    }
  }

  get isDisabled(): boolean {
    // Check if the game mode is disabled due to user role
    if (this.gameMode.disabled) {
      return true;
    }
    // Check if authentication is required but user is not authenticated
    return this.gameMode.requiresAuth && !this.isAuthenticated;
  }

  getDisabledTooltip(): string {
    if (this.gameMode.disabled) {
      return 'This feature is not available for your user role. Please contact an administrator.';
    }
    if (this.gameMode.requiresAuth && !this.isAuthenticated) {
      return 'Please log in to access this feature.';
    }
    return '';
  }
}
