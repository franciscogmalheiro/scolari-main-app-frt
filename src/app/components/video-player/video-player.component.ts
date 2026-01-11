import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MediaLibraryService, MediaItemDto } from '../../services/media-library.service';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit {
  videoUrl: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private mediaLibraryService: MediaLibraryService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const recordingCode = params['recordingCode'];
      const segmentName = params['segmentName'];
      
      if (recordingCode && segmentName) {
        // Decode the segmentName in case it was URL encoded
        const decodedSegmentName = decodeURIComponent(segmentName);
        this.loadVideo(recordingCode, decodedSegmentName);
      } else {
        this.errorMessage = 'Parâmetros inválidos.';
        this.isLoading = false;
      }
    });
  }

  private loadVideo(recordingCode: string, segmentName: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.mediaLibraryService.getMediaLibrary(recordingCode).subscribe({
      next: (mediaItems: MediaItemDto[]) => {
        // Find the item that matches the segmentName
        const matchingItem = mediaItems.find(item => {
          if (!item.presignedUrl) return false;
          // Extract segment name from presignedUrl (filename without extension)
          const urlParts = item.presignedUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const itemSegmentName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
          return itemSegmentName === segmentName;
        });

        if (matchingItem && matchingItem.presignedUrl) {
          this.videoUrl = matchingItem.presignedUrl;
        } else {
          this.errorMessage = 'Vídeo não encontrado.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading video:', error);
        this.errorMessage = 'Erro ao carregar o vídeo. Por favor, tenta novamente.';
        this.isLoading = false;
      }
    });
  }
}

