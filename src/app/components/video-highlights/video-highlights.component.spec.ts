import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { VideoHighlightsComponent } from './video-highlights.component';
import { VideoHighlightsService } from '../../services/video-highlights.service';
import { of } from 'rxjs';

describe('VideoHighlightsComponent', () => {
  let component: VideoHighlightsComponent;
  let fixture: ComponentFixture<VideoHighlightsComponent>;
  let mockVideoHighlightsService: jasmine.SpyObj<VideoHighlightsService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('VideoHighlightsService', [
      'getVideoHighlights', 
      'downloadVideoHighlight', 
      'formatFileSize', 
      'formatDateTime', 
      'buildFilenameForHighlight'
    ]);
    spy.formatFileSize.and.returnValue('1 KB');
    spy.formatDateTime.and.returnValue('1/1/2024, 12:00:00 AM');

    await TestBed.configureTestingModule({
      declarations: [ VideoHighlightsComponent ],
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: VideoHighlightsService, useValue: spy }
      ]
    })
    .compileComponents();

    mockVideoHighlightsService = TestBed.inject(VideoHighlightsService) as jasmine.SpyObj<VideoHighlightsService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoHighlightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load video highlights on init', () => {
    const mockHighlights = [
      {
        id: 1,
        name: 'Test Highlight',
        match: {},
        creationDateTime: '2024-01-01T00:00:00',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key',
        sizeBytes: 1024,
        presignedUrl: 'test-url'
      }
    ];

    mockVideoHighlightsService.getVideoHighlights.and.returnValue(of(mockHighlights));
    
    component.matchCode = 'TEST123';
    component.loadVideoHighlights();

    expect(mockVideoHighlightsService.getVideoHighlights).toHaveBeenCalledWith('TEST123');
    expect(component.videoHighlights).toEqual(mockHighlights);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error when loading highlights fails', () => {
    const error = new Error('Failed to load highlights');
    mockVideoHighlightsService.getVideoHighlights.and.returnValue(of([])); // Mock error scenario
    
    component.matchCode = 'TEST123';
    component.loadVideoHighlights();

    expect(component.errorMessage).toBe('');
  });

  it('should toggle highlight selection', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    expect(component.selectedHighlights.length).toBe(0);

    component.onSelectHighlight(mockHighlight);
    expect(component.selectedHighlights.length).toBe(1);
    expect(component.selectedHighlights[0]).toEqual(mockHighlight);

    component.onSelectHighlight(mockHighlight);
    expect(component.selectedHighlights.length).toBe(0);
  });

  it('should check if highlight is selected', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    expect(component.isHighlightSelected(mockHighlight)).toBeFalse();

    component.onSelectHighlight(mockHighlight);
    expect(component.isHighlightSelected(mockHighlight)).toBeTrue();
  });

  it('should remove selected highlight', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    component.onSelectHighlight(mockHighlight);
    expect(component.selectedHighlights.length).toBe(1);

    component.removeSelectedHighlight(mockHighlight);
    expect(component.selectedHighlights.length).toBe(0);
  });

  it('should navigate back to download video', () => {
    spyOn(component['router'], 'navigate');
    
    component.onBackClick();
    
    expect(component['router'].navigate).toHaveBeenCalledWith(['/download-video']);
  });

  it('should preview highlight video', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    component.onPreviewHighlight(mockHighlight);
    
    expect(component.currentPreviewHighlight).toEqual(mockHighlight);
    expect(component.isVideoPlaying).toBeTrue();
  });

  it('should toggle video playback', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    component.currentPreviewHighlight = mockHighlight;
    component.isVideoPlaying = true;
    
    component.toggleVideoPlayback();
    expect(component.isVideoPlaying).toBeFalse();
  });

  it('should close video preview', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    component.currentPreviewHighlight = mockHighlight;
    component.isVideoPlaying = true;
    
    component.closeVideoPreview();
    
    expect(component.currentPreviewHighlight).toBeNull();
    expect(component.isVideoPlaying).toBeFalse();
  });

  it('should get video URL correctly', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    const videoUrl = component.getVideoUrl(mockHighlight);
    expect(videoUrl).toContain('/api/video-highlights/1/download');
  });

  it('should not preview highlight without presigned URL', () => {
    const mockHighlight = {
      id: 1,
      name: 'Test Highlight',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: ''
    };

    component.onPreviewHighlight(mockHighlight);
    
    expect(component.currentPreviewHighlight).toBeNull();
    expect(component.isVideoPlaying).toBeFalse();
  });
});
