import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { GameSetupService } from './game-setup.service';

describe('GameSetupService', () => {
  let service: GameSetupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameSetupService]
    });
    service = TestBed.inject(GameSetupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get fields', () => {
    const mockFields = [
      {
        id: 1,
        name: 'Arneiros',
        address: 'Campo Luis Batista. 2640-200',
        matches: []
      }
    ];

    service.getFields().subscribe(fields => {
      expect(fields).toEqual(mockFields);
    });

    const req = httpMock.expectOne('/api/fields');
    expect(req.request.method).toBe('GET');
    req.flush(mockFields);
  });

  it('should get sports by field', () => {
    const mockSports = [
      {
        id: 1,
        code: 'FUTSAL',
        name: 'Futsal'
      },
      {
        id: 2,
        code: 'FOOTBALL',
        name: 'Football'
      }
    ];

    service.getSportsByField(1).subscribe(sports => {
      expect(sports).toEqual(mockSports);
    });

    const req = httpMock.expectOne('/api/field/1/sports');
    expect(req.request.method).toBe('GET');
    req.flush(mockSports);
  });
}); 