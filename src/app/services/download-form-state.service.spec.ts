import { TestBed } from '@angular/core/testing';
import { DownloadFormStateService, DownloadFormState } from './download-form-state.service';

describe('DownloadFormStateService', () => {
  let service: DownloadFormStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DownloadFormStateService]
    });
    service = TestBed.inject(DownloadFormStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should save and retrieve form state', () => {
    const mockState: DownloadFormState = {
      gameId: 'TEST123',
      voucherCode: 'VOUCHER456',
      isGameValid: true
    };

    service.saveFormState(mockState);
    const retrievedState = service.getFormState();

    expect(retrievedState).toEqual(mockState);
  });

  it('should clear form state', () => {
    const mockState: DownloadFormState = {
      gameId: 'TEST123',
      voucherCode: 'VOUCHER456',
      isGameValid: true
    };

    service.saveFormState(mockState);
    expect(service.hasFormState()).toBeTrue();

    service.clearFormState();
    expect(service.hasFormState()).toBeFalse();
    expect(service.getFormState()).toBeNull();
  });

  it('should check if form state exists', () => {
    expect(service.hasFormState()).toBeFalse();

    const mockState: DownloadFormState = {
      gameId: 'TEST123',
      voucherCode: 'VOUCHER456',
      isGameValid: true
    };

    service.saveFormState(mockState);
    expect(service.hasFormState()).toBeTrue();
  });

  it('should return null when no form state exists', () => {
    expect(service.getFormState()).toBeNull();
  });

  it('should create a copy of the state when saving', () => {
    const mockState: DownloadFormState = {
      gameId: 'TEST123',
      voucherCode: 'VOUCHER456',
      isGameValid: true
    };

    service.saveFormState(mockState);
    
    // Modify the original state
    mockState.gameId = 'MODIFIED';
    
    // The saved state should remain unchanged
    const retrievedState = service.getFormState();
    expect(retrievedState?.gameId).toBe('TEST123');
  });
});

