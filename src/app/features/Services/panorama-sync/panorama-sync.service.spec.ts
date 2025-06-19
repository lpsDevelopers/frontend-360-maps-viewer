import { TestBed } from '@angular/core/testing';

import { PanoramaSyncService } from './panorama-sync.service';

describe('PanoramaSyncService', () => {
  let service: PanoramaSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanoramaSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
