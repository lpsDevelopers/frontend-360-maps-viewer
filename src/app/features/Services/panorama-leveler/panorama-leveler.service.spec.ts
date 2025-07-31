import { TestBed } from '@angular/core/testing';

import { PanoramaLevelerService } from './panorama-leveler.service';

describe('PanoramaLevelerService', () => {
  let service: PanoramaLevelerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanoramaLevelerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
