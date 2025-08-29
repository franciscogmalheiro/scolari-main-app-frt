import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { MatchService, MatchDto } from './match.service';

describe('MatchService', () => {
  let service: MatchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MatchService]
    });
    service = TestBed.inject(MatchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a match', () => {
    const matchData: MatchDto = {
      fieldId: 1,
      teamAName: 'Team A',
      teamBName: 'Team B',
      sportId: 1
    };

    const mockResponse = {
      id: 123,
      fieldId: 1,
      teamAName: 'Team A',
      teamBName: 'Team B',
      sportId: 1,
      status: 'ACTIVE',
      createdAt: '2024-01-01T10:00:00Z'
    };

    service.createMatch(matchData).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/matches');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(matchData);
    req.flush(mockResponse);
  });

  it('should upload events', () => {
    const matchId = '123';
    const events = [
      {
        dateTime: '2024-01-01T10:00:00Z',
        eventName: 'start',
        team: null,
        result: '0-0'
      },
      {
        dateTime: '2024-01-01T10:15:00Z',
        eventName: 'goal',
        team: 'A',
        result: '1-0',
        elapsedTime: '15:00'
      }
    ];

    const mockResponse = { success: true, message: 'Events uploaded successfully' };

    service.uploadEvents(matchId, events).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`/api/upload/${matchId}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ events: events });
    req.flush(mockResponse);
  });
}); 