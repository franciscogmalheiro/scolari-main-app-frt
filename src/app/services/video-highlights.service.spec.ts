import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { VideoHighlightsService, VideoHighlight } from './video-highlights.service';
import { environment } from '../../environments/environment';

describe('VideoHighlightsService', () => {
  let service: VideoHighlightsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VideoHighlightsService]
    });
    service = TestBed.inject(VideoHighlightsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get video highlights for a match', () => {
    const matchCode = 'TEST123';
    const mockHighlights: VideoHighlight[] = [
      {
        id: 1,
        name: 'Test Highlight 1',
        match: {},
        creationDateTime: '2024-01-01T00:00:00',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key-1',
        sizeBytes: 1024,
        presignedUrl: 'test-url-1'
      },
      {
        id: 2,
        name: 'Test Highlight 2',
        match: {},
        creationDateTime: '2024-01-02T00:00:00',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key-2',
        sizeBytes: 2048,
        presignedUrl: 'test-url-2'
      }
    ];

    service.getVideoHighlights(matchCode).subscribe(highlights => {
      expect(highlights).toEqual(mockHighlights);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/video-highlights/match/code/${matchCode}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockHighlights);
  });

  it('should download a video highlight', () => {
    const highlightId = 1;
    const mockBlob = new Blob(['test video content'], { type: 'video/mp4' });

    service.downloadVideoHighlight(highlightId).subscribe(blob => {
      expect(blob).toEqual(mockBlob);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/video-highlights/${highlightId}/download`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('should format file size correctly', () => {
    expect(service.formatFileSize(0)).toBe('0 Bytes');
    expect(service.formatFileSize(1024)).toBe('1 KB');
    expect(service.formatFileSize(1048576)).toBe('1 MB');
    expect(service.formatFileSize(1073741824)).toBe('1 GB');
    expect(service.formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format date time correctly', () => {
    const testDate = '2024-01-01T12:00:00';
    const formatted = service.formatDateTime(testDate);
    expect(formatted).toContain('2024');
    expect(formatted).toContain('12:00');
  });

  it('should build filename for highlight correctly', () => {
    const highlight: VideoHighlight = {
      id: 1,
      name: 'Test Highlight Name!@#',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    const filename = service.buildFilenameForHighlight(highlight);
    expect(filename).toBe('Test_Highlight_Name_2024-01-01.mp4');
  });

  it('should handle special characters in highlight name', () => {
    const highlight: VideoHighlight = {
      id: 1,
      name: 'Goal! @ 45\' + 2"',
      match: {},
      creationDateTime: '2024-01-01T00:00:00',
      s3Bucket: 'test-bucket',
      s3Key: 'test-key',
      sizeBytes: 1024,
      presignedUrl: 'test-url'
    };

    const filename = service.buildFilenameForHighlight(highlight);
    expect(filename).toBe('Goal_45_2_2024-01-01.mp4');
  });
});


