import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface TutorialSlide {
  imageUrl: string;
  text: string;
}

@Component({
  selector: 'app-tutorial-carousel-modal',
  templateUrl: './tutorial-carousel-modal.component.html',
  styleUrls: ['./tutorial-carousel-modal.component.scss']
})
export class TutorialCarouselModalComponent {
  @Input() isVisible = false;
  @Input() title = 'Tutorial';
  @Input() slides: TutorialSlide[] = [];
  @Input() closeText = 'Fechar';
  @Output() close = new EventEmitter<void>();

  currentSlideIndex = 0;
  slideDirection: 'left' | 'right' = 'right';

  get currentSlide(): TutorialSlide | null {
    return this.slides[this.currentSlideIndex] || null;
  }

  get isFirstSlide(): boolean {
    return this.currentSlideIndex === 0;
  }

  get isLastSlide(): boolean {
    return this.currentSlideIndex === this.slides.length - 1;
  }

  get totalSlides(): number {
    return this.slides.length;
  }

  onClose(): void {
    this.close.emit();
    this.reset();
  }


  onPrevious(): void {
    if (this.currentSlideIndex > 0) {
      this.slideDirection = 'left';
      this.currentSlideIndex--;
    }
  }

  onNext(): void {
    if (this.currentSlideIndex < this.slides.length - 1) {
      this.slideDirection = 'right';
      this.currentSlideIndex++;
    } else {
      this.onClose();
    }
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.slides.length) {
      this.slideDirection = index > this.currentSlideIndex ? 'right' : 'left';
      this.currentSlideIndex = index;
    }
  }

  private reset(): void {
    this.currentSlideIndex = 0;
  }
}

